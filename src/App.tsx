import { useCallback, useEffect, useState } from 'react'
import PhotoSection from './components/PhotoSection'
import MeetingForm from './components/MeetingForm'
import { getPhotos, loadData, resetData, saveMember, saveRoom, updateMeeting } from './data/storage'
import { dateLabel, displayRoomName, shouldSuggestName, won, type Member, type Meeting, type Photo, type Room } from './data/models'
import { settle } from './engine/settlement'

type Data = { members: Member[]; rooms: Room[]; meetings: Meeting[] }
export default function App() {
  const [data, setData] = useState<Data>({ members: [], rooms: [], meetings: [] })
  const [loading, setLoading] = useState(true), [error, setError] = useState(''), [notice, setNotice] = useState('')
  const [roomId, setRoomId] = useState<string>(), [newMeeting, setNewMeeting] = useState(false)
  const [activeMember, setActiveMember] = useState('a'), [tab, setTab] = useState<'rooms' | 'memories'>('rooms')
  const [settings, setSettings] = useState(false), [reset, setReset] = useState(false)
  const refresh = useCallback(async () => {
    try { setData(await loadData()); setError('') } catch { setError('기록을 열지 못했어요. 브라우저의 저장 공간 권한을 확인해 주세요.') } finally { setLoading(false) }
  }, [])
  useEffect(() => { void refresh() }, [refresh])
  useEffect(() => { if (notice) { const timer = setTimeout(() => setNotice(''), 3500); return () => clearTimeout(timer) } }, [notice])
  async function action(work: () => Promise<unknown>, message?: string) {
    try { await work(); await refresh(); if (message) setNotice(message) } catch (e) { setError(e instanceof Error ? e.message : '저장하지 못했어요. 저장 공간을 확인해 주세요.') }
  }
  const room = data.rooms.find(r => r.id === roomId)
  const visible = room ? data.meetings.filter(m => m.roomId === room.id) : data.meetings
  const member = data.members.find(m => m.id === activeMember)
  return <><header className="site-header"><button className="brand" onClick={() => { setRoomId(undefined); setTab('rooms') }}><span className="brand-mark">r.</span>receiptory<span className="brand-dot">✳</span></button><button className="profile-button" onClick={() => setSettings(true)} aria-label="친구와 계좌 설정">{member?.emoji ?? '🐰'}<span>우리의 프로필</span></button></header>
    <main className={room ? 'room-main' : ''}>
      {error && <div role="alert" className="error">{error}<button className="text-button" onClick={refresh}>다시 열기</button></div>}
      {room ? <><button className="text-button back" onClick={() => setRoomId(undefined)}>← 기록방으로</button><p className="eyebrow">OUR LITTLE ARCHIVE</p><h1 className="room-title">{displayRoomName(room, data.members)}</h1><p className="muted">{room.memberIds.map(id => data.members.find(m => m.id === id)?.emoji).join(' ')} · 함께한 {visible.length}번의 하루</p>
        {shouldSuggestName(room, data.meetings) && <NamingPrompt room={room} onSave={r => action(() => saveRoom(r))} />}
        <div className="section-heading"><h2>함께 쌓은 추억</h2><button className="primary compact" onClick={() => setNewMeeting(true)}>＋ 만남 기록</button></div>
        <Actor members={data.members.filter(m => room.memberIds.includes(m.id))} active={activeMember} onChange={setActiveMember} />
        <div className="feed">{visible.map(m => <MemoryEntry key={m.id} meeting={m} members={data.members.filter(member => room.memberIds.includes(member.id))} actor={room.memberIds.includes(activeMember) ? activeMember : room.memberIds[0]} onChange={action} />)}</div>
      </> : <>
        <section className="hero"><div className="hero-copy"><p className="eyebrow"><span className="tiny-star">✳</span> LITTLE MOMENTS, LONG MEMORIES</p><h1>정산하면,<br /><span>추억이 된다.</span></h1><p className="hero-description">계산은 가볍게, 기억은 오래.<br />친구들과 보낸 하루를 한 장의 영수증에 담아요.</p><button className="primary" disabled={loading} onClick={() => setNewMeeting(true)}>＋ 새로운 만남 기록하기 <span>↗</span></button><p className="hero-note">우리의 모든 순간은, 소중하니까.</p></div>
        <div className="hero-visual" aria-label="감성 영수증 디자인 예시"><span className="float-note note-top">a day worth keeping ♡</span><div className="sample-receipt"><div className="receipt-brand">RECEIPTORY</div><p className="receipt-subtitle">기억하고 싶은 하루의 영수증</p><div className="sample-photo"><span>☕</span><small>COFFEE & CONVERSATIONS</small></div><h3>커피는 식어도,<br />우리의 이야기는 따뜻해.</h3><div className="dashed" /><p className="sample-line"><span>함께 웃은 시간</span><span>측정 불가</span></p><p className="sample-line"><span>다음에 또 만날 약속</span><span>1개</span></p><div className="dashed" /><div className="barcode" /><p className="receipt-subtitle">FOR THE MEMORIES, NOT THE MONEY</p></div><span className="float-note note-bottom">✳ keep this feeling</span><span className="hero-flower">✺</span></div></section>
        <section className="stats-strip"><span>✳ <strong>{data.meetings.length}</strong>개의 하루</span><span>♡ <strong>{data.rooms.length}</strong>개의 기록방</span><span>우리 사이에 쌓인, 작은 행복들</span></section>
        <div className="section-heading archive-heading"><div><p className="eyebrow">COLLECTED WITH LOVE</p><h2>{tab === 'rooms' ? '우리의 기록방' : '모든 추억'}</h2></div><div className="view-tabs"><button className={tab === 'rooms' ? 'active' : ''} onClick={() => setTab('rooms')}>기록방</button><button className={tab === 'memories' ? 'active' : ''} onClick={() => setTab('memories')}>추억 모아보기</button></div></div>
        {loading ? <p className="empty">기억을 꺼내는 중…</p> : tab === 'rooms' ? <div className="room-grid">{data.rooms.map((r, index) => {
          const meetings = data.meetings.filter(m => m.roomId === r.id)
          return <button key={r.id} className={`room-card room-color-${index % 3}`} onClick={() => setRoomId(r.id)}><div className="room-illustration"><span className="room-sticker">{['🌷', '☕', '🌙'][index % 3]}</span><span className="room-caption">{['the days we shared', 'our kind of happiness', 'little things, big feelings'][index % 3]}</span><div className="avatar-row">{r.memberIds.map(id => <span key={id}>{data.members.find(m => m.id === id)?.emoji}</span>)}</div></div><div className="room-info"><p className="eyebrow">{meetings.length} MEMORIES</p><h3>{displayRoomName(r, data.members)}</h3><p>{meetings[0] ? dateLabel(meetings[0].date) + '의 기억' : '첫 기억을 기다리고 있어요'}<span>↗</span></p></div></button>
        })}{!data.rooms.length && <div className="empty"><span>✉</span><h3>아직 꺼내 볼 추억이 없어요.</h3><p>첫 만남을 기록하면 친구들의 기록방이 생겨요.</p><button className="secondary" onClick={() => setNewMeeting(true)}>첫 번째 하루 기록하기</button></div>}</div> : <><Actor members={data.members} active={activeMember} onChange={setActiveMember} /><div className="feed">{visible.map(m => { const r = data.rooms.find(r => r.id === m.roomId)!; return <MemoryEntry key={m.id} meeting={m} members={data.members.filter(member => r.memberIds.includes(member.id))} actor={r.memberIds.includes(activeMember) ? activeMember : r.memberIds[0]} onChange={action} /> })}</div></>}
        <section className="demo-panel"><div><span>🎞</span><h3>친구 넷의 1년, 미리 만나 볼까요?</h3><p>9번의 만남과 사계절의 기억이 담긴 데모예요.</p></div><div className="demo-actions"><button className="secondary" disabled>데모 준비 중</button><button className="text-button" onClick={() => setReset(true)}>초기화</button></div></section>
      </>}
      <footer><span className="footer-brand">receiptory ✳</span><p>소중한 건 금액이 아니라, 함께한 마음.</p><small>기록은 이 브라우저에만 저장돼요.</small></footer>
    </main>
    {notice && <div className="toast" role="status">{notice}</div>}
    {newMeeting && data.members.length > 0 && <MeetingForm members={data.members} onClose={() => setNewMeeting(false)} onCreated={m => { setNewMeeting(false); setRoomId(m.roomId); void refresh(); setNotice('우리의 하루가 기록되었어요 ♡') }} />}
    {settings && <Settings members={data.members} actor={activeMember} onActor={setActiveMember} onClose={() => setSettings(false)} onSave={m => action(() => saveMember(m), '친구 정보를 저장했어요.')} />}
    {reset && <div className="dialog-backdrop"><section className="dialog small" role="dialog" aria-modal="true" aria-labelledby="reset-title"><h2 id="reset-title">모든 기억을 지울까요?</h2><p>사진, 댓글, 기록방을 포함한 이 브라우저의 모든 기록이 삭제돼요. 되돌릴 수 없어요.</p><div className="button-row"><button className="secondary" onClick={() => setReset(false)}>간직할래요</button><button className="primary" onClick={() => { void action(resetData, '기록을 초기화했어요.'); setReset(false); setRoomId(undefined); setActiveMember('a') }}>모두 초기화</button></div></section></div>}
  </>
}
function Actor({ members, active, onChange }: { members: Member[]; active: string; onChange: (id: string) => void }) {
  return <label className="actor-control">누구의 마음으로 기록할까요?<select aria-label="기록하는 친구" value={members.some(m => m.id === active) ? active : members[0]?.id} onChange={e => onChange(e.target.value)}>{members.map(m => <option key={m.id} value={m.id}>{m.emoji} {m.name}</option>)}</select></label>
}
function NamingPrompt({ room, onSave }: { room: Room; onSave: (r: Room) => void }) {
  const [name, setName] = useState('')
  return <form className="naming-prompt" onSubmit={e => { e.preventDefault(); if (name.trim()) onSave({ ...room, name: name.trim() }) }}><h3>세 번이나 함께했네요 ♡<br />방 이름을 지어 줄까요?</h3><label>기록방 이름<input required maxLength={30} placeholder="예: 우리의 사계절" value={name} onChange={e => setName(e.target.value)} /></label><div className="button-row"><button className="primary compact">이 이름으로 간직하기</button><button type="button" className="text-button" onClick={() => onSave({ ...room, namingDismissed: true })}>다음에 할게요</button></div></form>
}
function MemoryEntry({ meeting, members, actor, onChange }: { meeting: Meeting; members: Member[]; actor: string; onChange: (work: () => Promise<unknown>, message?: string) => Promise<void> }) {
  const [comment, setComment] = useState('')
  const [photos, setPhotos] = useState<Photo[]>([])
  const refreshPhotos = useCallback(async () => { setPhotos(await getPhotos(meeting.id)) }, [meeting.id])
  useEffect(() => { void refreshPhotos().catch(() => undefined) }, [refreshPhotos])
  const total = meeting.expenses.reduce((sum, e) => sum + e.amount, 0)
  const { balances } = settle(members.map(m => m.id), meeting.expenses)
  return <article className="memory-entry"><div className="simple-receipt"><p className="eyebrow">{dateLabel(meeting.date)}</p><h2>{meeting.title}</h2><p>{members.map(m => m.emoji + ' ' + m.name).join(' · ')}</p><div className="dashed" />{meeting.expenses.map(e => <p className="expense-line" key={e.id}><span>{e.place}</span><small>{won(e.amount)}원</small></p>)}<div className="dashed" /><p className="expense-line"><span>함께한 하루</span><small>총 {won(total)}원</small></p><p className="hint">{balances.map(b => `${members.find(m => m.id === b.memberId)?.name} ${won(b.owed)}원`).join(' · ')}</p></div>
    <PhotoSection meeting={meeting} members={members} actor={actor} photos={photos} onRefresh={refreshPhotos} onChange={onChange} />
    <div className="reactions">{['♡', '🥹', '😂', '✨'].map(emoji => <button key={emoji} className={meeting.reactions[emoji]?.includes(actor) ? 'reacted' : ''} aria-label={`${emoji} 반응`} aria-pressed={meeting.reactions[emoji]?.includes(actor) ?? false} onClick={() => void onChange(() => updateMeeting(meeting.id, current => { const list = current.reactions[emoji] ?? []; return { ...current, reactions: { ...current.reactions, [emoji]: list.includes(actor) ? list.filter(id => id !== actor) : [...list, actor] } } }))}>{emoji} <small>{meeting.reactions[emoji]?.length || ''}</small></button>)}</div>
    <div className="comments">{meeting.comments.map(c => <p key={c.id}><strong>{members.find(m => m.id === c.memberId)?.name}</strong> {c.text}</p>)}</div><form className="comment-form" onSubmit={e => { e.preventDefault(); if (comment.trim()) { void onChange(() => updateMeeting(meeting.id, current => ({ ...current, comments: [...current.comments, { id: crypto.randomUUID(), memberId: actor, text: comment.trim(), at: new Date().toISOString() }] }))); setComment('') } }}><input aria-label={`${meeting.title}에 짧은 댓글`} maxLength={100} placeholder="이날의 마음을 한 줄로 남겨요" value={comment} onChange={e => setComment(e.target.value)} /><button aria-label="댓글 남기기">↑</button></form>
  </article>
}
function Settings({ members, actor, onActor, onClose, onSave }: { members: Member[]; actor: string; onActor: (id: string) => void; onClose: () => void; onSave: (m: Member) => Promise<void> }) {
  const [drafts, setDrafts] = useState(members)
  return <div className="dialog-backdrop"><section className="dialog" role="dialog" aria-modal="true" aria-labelledby="settings-title"><div className="section-heading"><h2 id="settings-title">우리의 프로필</h2><button className="icon-button" onClick={onClose} aria-label="프로필 닫기">✕</button></div><p className="hint">한 기기에서 친구를 바꾸며 시연할 수 있어요. 실제 계정 로그인과 온라인 공유는 제공하지 않아요.</p><Actor members={members} active={actor} onChange={onActor} />{drafts.map(m => <form key={m.id} className="member-form" onSubmit={async e => { e.preventDefault(); await onSave(m) }}><span>{m.emoji}</span><label>이름<input required maxLength={20} value={m.name} onChange={e => setDrafts(drafts.map(d => d.id === m.id ? { ...d, name: e.target.value } : d))} /></label><label>은행 · 계좌번호<input maxLength={80} placeholder="예: 은행명 000-000-000" value={m.account} onChange={e => setDrafts(drafts.map(d => d.id === m.id ? { ...d, account: e.target.value } : d))} /></label><button className="secondary compact">저장</button></form>)}<button className="secondary full" onClick={() => setDrafts([...drafts, { id: crypto.randomUUID(), name: '', emoji: '🐹', account: '' }])}>＋ 친구 추가</button><p className="hint">새 친구는 이름을 입력하고 저장해 주세요. 계좌 정보도 이 브라우저에만 저장돼요.</p></section></div>
}
