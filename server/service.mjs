import http from 'node:http'
import { DatabaseSync } from 'node:sqlite'
import { randomBytes, randomUUID, createHash, scryptSync, timingSafeEqual } from 'node:crypto'
import { mkdirSync, existsSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'
import { settle } from '../src/engine/settlement.ts'
import { MockTransferProvider } from './transfer-provider.mjs'
const sha = value => createHash('sha256').update(value).digest('hex')
const fail = (message, status = 400) => { throw Object.assign(new Error(message), { status }) }
const text = (v, max = 80) => { if (typeof v !== 'string' || !v.trim() || v.trim().length > max) fail('입력 내용을 확인해 주세요.'); return v.trim() }
const json = v => JSON.stringify(v)
export function createService({ dbPath = ':memory:', origins = ['http://127.0.0.1:5173', 'http://localhost:5173'], secureCookies = false, staticDir = path.resolve('dist'), now = Date.now, transferProvider = new MockTransferProvider() } = {}) {
  if (dbPath !== ':memory:') mkdirSync(path.dirname(dbPath), { recursive: true })
  const db = new DatabaseSync(dbPath)
  db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;
    CREATE TABLE IF NOT EXISTS actors(id TEXT PRIMARY KEY, kind TEXT NOT NULL, name TEXT NOT NULL, email TEXT UNIQUE, password TEXT);
    CREATE TABLE IF NOT EXISTS sessions(hash TEXT PRIMARY KEY, actor TEXT NOT NULL REFERENCES actors(id), expires INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS settlements(id TEXT PRIMARY KEY, data TEXT NOT NULL, expires INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS participants(sid TEXT REFERENCES settlements(id) ON DELETE CASCADE, mid TEXT, actor TEXT REFERENCES actors(id), invite TEXT, PRIMARY KEY(sid,mid), UNIQUE(sid,actor));
    CREATE TABLE IF NOT EXISTS archives(actor TEXT REFERENCES actors(id), sid TEXT REFERENCES settlements(id) ON DELETE CASCADE, PRIMARY KEY(actor,sid));
    CREATE TABLE IF NOT EXISTS photos(id TEXT PRIMARY KEY, sid TEXT REFERENCES settlements(id) ON DELETE CASCADE, actor TEXT REFERENCES actors(id), name TEXT, mime TEXT, data BLOB, at TEXT);
    CREATE TABLE IF NOT EXISTS notifications(id TEXT PRIMARY KEY, actor TEXT REFERENCES actors(id), message TEXT, sid TEXT, at TEXT, seen INTEGER DEFAULT 0);`)
  const getActor = id => db.prepare('SELECT id,kind,name,email FROM actors WHERE id=?').get(id)
  const load = id => { const row = db.prepare('SELECT * FROM settlements WHERE id=?').get(id); if (!row) fail('정산을 찾지 못했어요.', 404); return JSON.parse(row.data) }
  const save = s => db.prepare('UPDATE settlements SET data=? WHERE id=?').run(json(s), s.id)
  const participants = sid => db.prepare('SELECT * FROM participants WHERE sid=?').all(sid)
  const participant = (sid, actor) => { const p = db.prepare('SELECT * FROM participants WHERE sid=? AND actor=?').get(sid, actor); if (!p) fail('먼저 참여해 주세요.', 403); return p }
  const archive = (actor, sid) => { if (getActor(actor)?.kind === 'member') db.prepare('INSERT OR IGNORE INTO archives VALUES(?,?)').run(actor,sid) }
  const notify = (actor, sid, message) => { if (actor) db.prepare('INSERT INTO notifications(id,actor,message,sid,at) VALUES(?,?,?,?,?)').run(randomUUID(),actor,message,sid,new Date(now()).toISOString()) }
  function transaction(work) { db.exec('BEGIN IMMEDIATE'); try { const r = work(); db.exec('COMMIT'); return r } catch(e) { db.exec('ROLLBACK'); throw e } }
  function migrate(oldId, newId) {
    if (!oldId || oldId === newId || getActor(oldId)?.kind !== 'guest') return
    transaction(() => {
      for (const p of db.prepare('SELECT * FROM participants WHERE actor=?').all(oldId)) {
        if (db.prepare('SELECT 1 FROM participants WHERE sid=? AND actor=?').get(p.sid,newId)) fail('이 정산에 이미 다른 역할로 참여 중인 계정이에요.',409)
        db.prepare('UPDATE participants SET actor=? WHERE sid=? AND mid=?').run(newId,p.sid,p.mid); archive(newId,p.sid)
      }
      db.prepare('UPDATE sessions SET actor=? WHERE actor=?').run(newId,oldId)
    })
  }
  function summary(s, actor) {
    const p = participant(s.id, actor.id), ps = participants(s.id)
    const joined = Object.fromEntries(ps.map(x => [x.mid,x.actor]))
    const visibleAccounts = new Set([p.mid, ...s.transfers.filter(t=>t.from===p.mid).map(t=>t.to)])
    const result = settle(s.members.map(m=>m.id), s.expenses)
    const completeActors = ps.every(x=>x.actor)
    const roomKey = sha(completeActors ? ps.map(x=>x.actor).sort().join('|') : s.id)
    return { ...s, roomKey, myMemberId:p.mid, owner:s.ownerMemberId===p.mid,
      members:s.members.map(m=>({ id:m.id,name:m.name,emoji:m.emoji,joined:!!joined[m.id], ...(visibleAccounts.has(m.id) ? {account:m.account??''}: {}) })),
      balances:result.balances, archived:!!db.prepare('SELECT 1 FROM archives WHERE actor=? AND sid=?').get(actor.id,s.id), paymentProviderConnected:transferProvider.connected,
      memory:actor.kind==='member' ? { comments:s.comments,emotions:s.emotions,photos:db.prepare('SELECT photos.id,photos.name,photos.at,actors.name AS uploader FROM photos JOIN actors ON actors.id=photos.actor WHERE sid=?').all(s.id) } : null }
  }
  const locks = new Set(), rates = new Map()
  function limit(req, auth) {
    const key = `${req.socket.remoteAddress}:${auth?'auth':'write'}`, state = rates.get(key), time = now()
    if (!state || time-state.time>600000) rates.set(key,{time,count:1})
    else if (++state.count > (auth ? 40 : 200)) fail('잠시 후 다시 시도해 주세요.',429)
    if (rates.size>5000) for (const [k,v] of rates) if (time-v.time>600000) rates.delete(k)
  }
  async function body(req) {
    if (!req.headers['content-type']?.startsWith('application/json')) fail('JSON 형식으로 보내 주세요.',415)
    let size=0, chunks=[]
    for await (const chunk of req) { size+=chunk.length; if(size>12*1024*1024) fail('파일이 너무 커요.',413); chunks.push(chunk) }
    try { const b=JSON.parse(Buffer.concat(chunks).toString()); if (!b || typeof b!=='object' || Array.isArray(b)) fail('입력 형식이 잘못됐어요.'); return b } catch { fail('입력 형식이 잘못됐어요.') }
  }
  function session(req) {
    const token = req.headers.cookie?.match(/(?:^|;\s*)receiptory=([a-f0-9]{64})(?:;|$)/)?.[1]
    if (!token) return null
    const row=db.prepare('SELECT actor FROM sessions WHERE hash=? AND expires>?').get(sha(token),now()); return row ? getActor(row.actor):null
  }
  function login(res, actor) {
    const token=randomBytes(32).toString('hex'); db.prepare('INSERT INTO sessions VALUES(?,?,?)').run(sha(token),actor.id,now()+30*86400000)
    res.setHeader('Set-Cookie',`receiptory=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=2592000${secureCookies?'; Secure':''}`)
    return {user:getActor(actor.id)}
  }
  function checkInvite(sid, token, actor) {
    const s=load(sid); if(s.expiresAt<=now()) fail('정산 링크가 만료됐어요.',410)
    const p=db.prepare('SELECT * FROM participants WHERE sid=? AND invite=?').get(sid,sha(text(token,100)))
    if(!p) fail('초대 링크를 확인해 주세요.',404)
    if(p.actor && p.actor!==actor?.id) fail('이미 참여한 친구의 링크예요.',409)
    return {s,p}
  }
  const server=http.createServer(async(req,res)=>{
    res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');res.setHeader('X-Frame-Options','DENY');res.setHeader('Cache-Control','no-store')
    const origin=req.headers.origin
    if(origin && origins.includes(origin)) {res.setHeader('Access-Control-Allow-Origin',origin);res.setHeader('Access-Control-Allow-Credentials','true');res.setHeader('Vary','Origin')}
    const send=(data,status=200)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8'});res.end(json(data))}
    try {
      const url=new URL(req.url,'http://localhost'), route=url.pathname, method=req.method, write=!['GET','HEAD','OPTIONS'].includes(method)
      if(method==='OPTIONS') {if(!origins.includes(origin)) fail('허용되지 않은 요청이에요.',403);res.setHeader('Access-Control-Allow-Methods','GET,POST,OPTIONS');res.setHeader('Access-Control-Allow-Headers','Content-Type');res.writeHead(204);res.end();return}
      if(!route.startsWith('/api/')) {
        if(!['GET','HEAD'].includes(method)) fail('지원하지 않는 요청이에요.',405)
        const relative=decodeURIComponent(route).replace(/^\/+/,''), file=path.resolve(staticDir,relative||'index.html')
        if(!file.startsWith(path.resolve(staticDir)+path.sep)) fail('찾을 수 없어요.',404)
        if(!existsSync(file)||!statSync(file).isFile()) fail('찾을 수 없어요.',404)
        const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.wasm':'application/wasm','.gz':'application/gzip','.svg':'image/svg+xml','.png':'image/png','.woff2':'font/woff2','.txt':'text/plain'}
        res.setHeader('Content-Type',mime[path.extname(file)]??'application/octet-stream');if(route.startsWith('/assets/'))res.setHeader('Cache-Control','public, max-age=31536000, immutable');res.end(method==='HEAD'?undefined:readFileSync(file));return
      }
      if(write) {if(!origin||!origins.includes(origin)) fail('허용되지 않은 요청이에요.',403);limit(req,/\/(register|login|guest)$/.test(route))}
      // Read the body before mutable database state to avoid lost updates from concurrent selections.
      const b=write?await body(req):{}, actor=session(req)
      if(route==='/api/health'&&method==='GET') return send({ok:true,paymentProviderConnected:transferProvider.connected})
      if(route==='/api/me'&&method==='GET') return send({user:actor})
      if(route==='/api/guest'&&method==='POST') {
        if(actor) return send({user:actor})
        const id=randomUUID();db.prepare('INSERT INTO actors(id,kind,name) VALUES(?,?,?)').run(id,'guest',text(b.name,20));return send(login(res,{id}))
      }
      if(route==='/api/register'&&method==='POST') {
        const name=text(b.name,20), email=text(b.email,254).toLowerCase(), password=text(b.password,128)
        if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||password.length<10) fail('이메일과 10자 이상의 비밀번호를 확인해 주세요.')
        if(db.prepare('SELECT 1 FROM actors WHERE email=?').get(email)) fail('사용할 수 없는 이메일이에요.',409)
        const salt=randomBytes(16).toString('hex'), hash=scryptSync(password,salt,64).toString('hex')
        if(actor?.kind==='guest') {db.prepare('UPDATE actors SET kind=?,name=?,email=?,password=? WHERE id=?').run('member',name,email,`${salt}:${hash}`,actor.id);for(const p of db.prepare('SELECT sid FROM participants WHERE actor=?').all(actor.id)) archive(actor.id,p.sid);return send(login(res,actor))}
        const id=randomUUID();db.prepare('INSERT INTO actors VALUES(?,?,?,?,?)').run(id,'member',name,email,`${salt}:${hash}`);return send(login(res,{id}))
      }
      if(route==='/api/login'&&method==='POST') {
        const email=text(b.email,254).toLowerCase(), password=text(b.password,128), found=db.prepare('SELECT * FROM actors WHERE email=?').get(email)
        const [salt,hash]=found?.password?.split(':')??['0'.repeat(32),'0'.repeat(128)]
        if(!timingSafeEqual(scryptSync(password,salt,64),Buffer.from(hash,'hex'))||!found) fail('이메일 또는 비밀번호를 확인해 주세요.',401)
        migrate(actor?.id,found.id);return send(login(res,found))
      }
      if(route==='/api/logout'&&method==='POST') {const token=req.headers.cookie?.match(/receiptory=([a-f0-9]{64})/)?.[1];if(token)db.prepare('DELETE FROM sessions WHERE hash=?').run(sha(token));res.setHeader('Set-Cookie','receiptory=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0');return send({ok:true})}
      if(route==='/api/invitation'&&method==='POST') {const {s,p}=checkInvite(text(b.settlementId),b.token,actor);return send({invitation:{name:s.members.find(m=>m.id===p.mid).name,title:s.title,places:s.expenses.map(e=>e.place),expiresAt:s.expiresAt,joined:!!p.actor}})}
      if(!actor) fail('비회원 이름을 입력하거나 로그인해 주세요.',401)
      if(route==='/api/settlements'&&method==='POST') {
        if(!Array.isArray(b.members)||b.members.length<1||b.members.length>8||new Set(b.members.map(m=>m.id)).size!==b.members.length) fail('친구는 1~8명으로 구성해 주세요.')
        const members=b.members.map(m=>({id:text(m.id),name:text(m.name,20),emoji:typeof m.emoji==='string'?m.emoji.slice(0,8):'🌷',account:m.id===b.ownerMemberId?String(m.account??'').slice(0,80):''}))
        if(!members.some(m=>m.id===b.ownerMemberId)||!Array.isArray(b.expenses)||!b.expenses.length||b.expenses.length>30)fail('결제자와 장소를 확인해 주세요.')
        const expenses=structuredClone(b.expenses)
        for(const e of expenses) {text(e.id);text(e.place,80);if(!Number.isFinite(Date.parse(e.at)))fail('일시를 확인해 주세요.');if(e.receipt){e.receipt.confirmedMemberIds=[];e.receipt.items.forEach(i=>{i.selectedMemberIds=[]})}}
        if(new Set(expenses.map(e=>e.id)).size!==expenses.length)fail('중복된 지출이에요.')
        const calculated=settle(members.map(m=>m.id),expenses), id=randomUUID()
        const s={id,title:text(b.title,60),date:expenses.map(e=>e.at).sort()[0],expiresAt:now()+30*86400000,ownerMemberId:b.ownerMemberId,members,expenses,transfers:calculated.transfers.map(t=>({...t,id:randomUUID(),status:'pending'})),comments:[],emotions:[]}
        const invitations=[]
        transaction(()=>{db.prepare('INSERT INTO settlements VALUES(?,?,?)').run(id,json(s),s.expiresAt);for(const m of members){const token=randomBytes(32).toString('hex'), owner=m.id===s.ownerMemberId;db.prepare('INSERT INTO participants VALUES(?,?,?,?)').run(id,m.id,owner?actor.id:null,sha(token));if(!owner)invitations.push({memberId:m.id,name:m.name,token})}archive(actor.id,id)})
        return send({settlement:summary(s,actor),invitations},201)
      }
      if(route==='/api/records'&&method==='GET') {if(actor.kind!=='member')fail('기록방은 회원가입 후 이용할 수 있어요.',403);return send({records:db.prepare('SELECT sid FROM archives WHERE actor=?').all(actor.id).map(r=>summary(load(r.sid),actor))})}
      if(route==='/api/notifications'&&method==='GET')return send({notifications:db.prepare('SELECT id,message,sid AS settlementId,at,seen FROM notifications WHERE actor=? ORDER BY at DESC LIMIT 50').all(actor.id)})
      if(route==='/api/notifications/read'&&method==='POST'){db.prepare('UPDATE notifications SET seen=1 WHERE actor=?').run(actor.id);return send({ok:true})}
      const match=route.match(/^\/api\/settlements\/([^/]+)(?:\/(.*))?$/)
      if(!match)fail('찾을 수 없어요.',404)
      const [,sid,action='']=match
      if(action==='claim'&&method==='POST') {
        transaction(()=>{const {s,p}=checkInvite(sid,b.token,actor);if(db.prepare('SELECT 1 FROM participants WHERE sid=? AND actor=? AND mid<>?').get(sid,actor.id,p.mid))fail('이미 다른 역할로 참여했어요.',409);db.prepare('UPDATE participants SET actor=? WHERE sid=? AND mid=?').run(actor.id,sid,p.mid);archive(actor.id,sid);if(!p.actor)for(const other of participants(sid))if(other.actor!==actor.id)notify(other.actor,sid,`${s.members.find(m=>m.id===p.mid).name}님이 참여했어요.`)})
        return send({settlement:summary(load(sid),actor)})
      }
      const s=load(sid), p=participant(sid,actor.id)
      if(s.expiresAt<=now()&&!db.prepare('SELECT 1 FROM archives WHERE actor=? AND sid=?').get(actor.id,sid))fail('정산 링크가 만료됐어요.',410)
      if(!action&&method==='GET')return send({settlement:summary(s,actor)})
      if(method!=='POST'&&!action.startsWith('photos/'))fail('지원하지 않는 요청이에요.',405)
      if(action.startsWith('invites/')&&method==='POST') {
        if(p.mid!==s.ownerMemberId)fail('만든 친구만 초대 링크를 발급할 수 있어요.',403)
        const mid=action.slice(8), target=participants(sid).find(x=>x.mid===mid);if(!target||target.actor)fail('이미 참여했거나 존재하지 않는 친구예요.',409)
        const token=randomBytes(32).toString('hex');db.prepare('UPDATE participants SET invite=? WHERE sid=? AND mid=?').run(sha(token),sid,mid);return send({invitation:{memberId:mid,name:s.members.find(m=>m.id===mid).name,token}})
      }
      if(action==='account') {s.members.find(m=>m.id===p.mid).account=typeof b.account==='string'?b.account.trim().slice(0,80):'';save(s);return send({settlement:summary(s,actor)})}
      const menu=action.match(/^expenses\/([^/]+)\/selection$/)
      if(menu) {
        const e=s.expenses.find(e=>e.id===menu[1]);if(!e?.receipt)fail('메뉴 영수증이 없어요.',404)
        if(b.confirm===true&&e.receipt.confirmedMemberIds.includes(p.mid))return send({settlement:summary(s,actor)})
        if(e.receipt.confirmedMemberIds.length===s.members.length||s.transfers.some(t=>t.status!=='pending')||locks.has(sid))fail('확정된 메뉴는 바꿀 수 없어요.',409)
        if(b.confirm===true) {if(!e.receipt.confirmedMemberIds.includes(p.mid))e.receipt.confirmedMemberIds.push(p.mid)}
        else {const item=e.receipt.items.find(i=>i.id===b.itemId);if(!item||item.kind!=='menu'||typeof b.selected!=='boolean')fail('메뉴 선택을 확인해 주세요.');item.selectedMemberIds=item.selectedMemberIds.filter(id=>id!==p.mid);if(b.selected)item.selectedMemberIds.push(p.mid);e.receipt.confirmedMemberIds=e.receipt.confirmedMemberIds.filter(id=>id!==p.mid)}
        s.transfers=settle(s.members.map(m=>m.id),s.expenses).transfers.map(t=>({...t,id:randomUUID(),status:'pending'}));save(s);return send({settlement:summary(s,actor)})
      }
      const transfer=action.match(/^transfers\/([^/]+)\/(report|confirm)$/)
      if(transfer) {
        const t=s.transfers.find(t=>t.id===transfer[1]);if(!t)fail('송금 항목이 바뀌었어요. 새로고침해 주세요.',409)
        if(s.expenses.some(e=>e.receipt&&e.receipt.confirmedMemberIds.length!==s.members.length))fail('모두 메뉴를 확정한 뒤 송금을 확인해 주세요.',409)
        if(transfer[2]==='report') {
          if(t.from!==p.mid)fail('보내는 친구만 확인할 수 있어요.',403)
          if(t.status==='pending') {
            if(locks.has(sid))fail('처리 중이에요. 잠시 뒤 확인해 주세요.',409)
            locks.add(sid)
            try {const result=await transferProvider.reportSent({idempotencyKey:t.id,settlementId:sid,from:t.from,to:t.to,amount:t.amount});const latest=load(sid);const target=latest.transfers.find(x=>x.id===t.id);if(!target)fail('송금 항목이 변경됐어요.',409);if(result.state!=='reported')fail('송금 상태를 확인할 수 없어요.',502);target.status='reported';target.providerReference=result.reference;save(latest);notify(participants(sid).find(x=>x.mid===t.to)?.actor,sid,'보냈어요. 받은 금액을 확인해 주세요.')}finally{locks.delete(sid)}
          }
        }else{if(t.to!==p.mid)fail('받는 친구만 확인할 수 있어요.',403);if(t.status==='pending')fail('보냈어요 확인이 먼저 필요해요.',409);if(t.status!=='confirmed'){t.status='confirmed';save(s);notify(participants(sid).find(x=>x.mid===t.from)?.actor,sid,'받았어요. 송금 확인이 완료됐어요.')}}
        return send({settlement:summary(load(sid),actor)})
      }
      if(actor.kind!=='member')fail('사진과 추억 기록은 회원가입 후 이용할 수 있어요.',403)
      if(action==='archive') {archive(actor.id,sid);return send({settlement:summary(s,actor)})}
      if(action==='comments') {s.comments.push({id:randomUUID(),name:actor.name,text:text(b.text,100),at:new Date(now()).toISOString()});save(s);return send({settlement:summary(s,actor)})}
      if(action==='emotions') {s.emotions.push({id:randomUUID(),text:text(b.text,40)});save(s);return send({settlement:summary(s,actor)})}
      if(action==='photos') {
        const data=Buffer.from(text(b.data,12*1024*1024),'base64'), mime=b.mime
        const signatures={'image/jpeg':data[0]===255&&data[1]===216&&data[2]===255,'image/png':data.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])),'image/webp':data.subarray(0,4).toString()==='RIFF'&&data.subarray(8,12).toString()==='WEBP','image/gif':/^GIF8[79]a/.test(data.subarray(0,6).toString())}
        if(!signatures[mime]||data.length>8*1024*1024||db.prepare('SELECT COUNT(*) AS n FROM photos WHERE sid=?').get(sid).n>=50)fail('8MB 이하의 사진을 최대 50장까지 올릴 수 있어요.')
        db.prepare('INSERT INTO photos VALUES(?,?,?,?,?,?,?)').run(randomUUID(),sid,actor.id,text(b.name,100),mime,data,new Date(now()).toISOString());return send({settlement:summary(s,actor)})
      }
      if(action.startsWith('photos/')&&method==='GET'){const photo=db.prepare('SELECT * FROM photos WHERE sid=? AND id=?').get(sid,action.slice(7));if(!photo)fail('사진이 없어요.',404);res.setHeader('Content-Type',photo.mime);res.end(photo.data);return}
      fail('찾을 수 없어요.',404)
    } catch(e) {send({error:e.status?e.message:'처리하지 못했어요. 잠시 후 다시 시도해 주세요.'},e.status??500)}
  })
  const cleanup=setInterval(()=>{const time=now();db.prepare('DELETE FROM sessions WHERE expires<?').run(time);db.prepare('DELETE FROM settlements WHERE expires<? AND id NOT IN(SELECT sid FROM archives)').run(time)},3600000);cleanup.unref()
  return {server,db,close:async()=>{clearInterval(cleanup);await new Promise(resolve=>server.close(resolve));db.close()}}
}
