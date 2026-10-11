import { execFileSync } from 'node:child_process'
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
const require = createRequire(import.meta.url)
function ocrAssets(): Plugin {
  const js = path.dirname(require.resolve('tesseract.js/package.json')), core = path.dirname(require.resolve('tesseract.js-core/package.json'))
  const files: Record<string, string> = { 'worker.min.js': path.join(js, 'dist/worker.min.js'), 'tesseract-core-lstm.wasm.js': path.join(core, 'tesseract-core-lstm.wasm.js'), 'tesseract-core-lstm.wasm': path.join(core, 'tesseract-core-lstm.wasm'), 'TESSERACT-JS-LICENSE.txt': path.join(js, 'LICENSE.md'), 'TESSERACT-CORE-LICENSE.txt': path.join(core, 'LICENSE') }
  return { name: 'self-hosted-ocr', configureServer(server) { server.middlewares.use((req, res, next) => { const name = req.url?.split('?')[0].replace(/^\/ocr\//, ''); if (!req.url?.startsWith('/ocr/') || !name || !files[name]) return next(); res.setHeader('Content-Type', name.endsWith('.js') ? 'text/javascript' : name.endsWith('.wasm') ? 'application/wasm' : 'text/plain'); res.end(readFileSync(files[name])) }) }, generateBundle() { let revision=process.env.GITHUB_SHA; if(!revision) { try { revision=execFileSync('git',['rev-parse','HEAD'],{stdio:['ignore','pipe','ignore']}).toString().trim() } catch { revision='unversioned' } }; this.emitFile({type:'asset',fileName:'build-info.json',source:JSON.stringify({revision})}); for (const [name, file] of Object.entries(files)) this.emitFile({ type: 'asset', fileName: `ocr/${name}`, source: readFileSync(file) }) } }
}
export default defineConfig({ plugins: [react(), ocrAssets()], base: './', server: { proxy: { '/api': `http://127.0.0.1:${process.env.RECEIPTORY_API_PROXY_PORT ?? '3001'}` } } })
