import { defineConfig } from '@playwright/test'
import { existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
export default defineConfig({
  testDir: './e2e', testMatch: '**/*.e2e.ts', fullyParallel: false, workers: 1,
  use: { baseURL: 'http://127.0.0.1:5174', timezoneId: 'Asia/Seoul', viewport: { width: 390, height: 844 },
    launchOptions: { ...(existsSync('/usr/bin/chromium') ? { executablePath: '/usr/bin/chromium' } : {}), args: ['--no-sandbox', '--use-fake-device-for-media-stream'] }, trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  webServer: [
    { command: 'node server/index.mjs', url: 'http://127.0.0.1:3002/api/health', reuseExistingServer: false, env: { API_PORT:'3002', DB_PATH:path.join(tmpdir(),'receiptory-e2e.sqlite'), APP_ORIGINS:'http://127.0.0.1:5174,http://localhost:5174', COOKIE_SECURE:'false' } },
    { command: 'npm run dev -- --port 5174 --strictPort', url: 'http://127.0.0.1:5174', reuseExistingServer: false, env: { RECEIPTORY_API_PROXY_PORT:'3002', VITE_SHARED_DEFAULT:'0', VITE_API_URL:'' } },
  ],
})
