import { createService } from './service.mjs'
const origins=(process.env.APP_ORIGINS??'http://localhost:5173,http://127.0.0.1:5173,http://localhost:3001,http://127.0.0.1:3001').split(',')
const secureCookies=process.env.COOKIE_SECURE==='true'
if(process.env.NODE_ENV==='production'&&origins.some(o=>o.startsWith('https://'))&&!secureCookies)throw new Error('HTTPS 운영에는 COOKIE_SECURE=true가 필요합니다.')
const app=createService({dbPath:process.env.DB_PATH??'/tmp/receiptory-server/receiptory.sqlite',origins,secureCookies})
app.server.listen(Number(process.env.API_PORT??3001),'0.0.0.0',()=>console.log('Receiptory API ready · real payments disabled'))
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>void app.close().then(()=>process.exit(0)))
