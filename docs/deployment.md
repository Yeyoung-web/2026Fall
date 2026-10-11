# 배포와 테스트

GitHub Pages는 정적 앱을 제공합니다. 첫 화면은 **로컬 데모**이며 영수증 OCR, 편집 표, 메뉴 배분, 사진·네컷·동선을 테스트할 수 있습니다. 데이터는 그 브라우저 IndexedDB에만 저장됩니다. `?demo=1`로 명시적으로 열 수 있습니다.

`?shared=1` 또는 친구별 `#settlement=…&invite=…` 링크는 공유 정산 화면입니다. GitHub Pages에는 API가 없으므로 서버 미연결 안내를 보여 줍니다. API 서버를 실제 배포하기 전에는 다른 기기 간 정산 링크가 동작하지 않습니다.

## 앱과 API를 함께 배포

```bash
docker compose up -d --build
```

Docker 빌드는 Node.js 24에서 테스트·빌드 후 비특권 사용자로 앱과 HTTP/SQLite API를 실행합니다. Docker의 앱 기본 화면은 공유 정산입니다. `receiptory-data` named volume에 DB와 사진을 보관합니다. 데이터가 있는 상태에서 `docker compose down -v`를 사용하지 마세요.

공개 운영에는 직접 정한 서버와 HTTPS 주소가 필요합니다. 같은 origin에서 앱과 API를 제공하는 HTTPS 리버스 프록시를 구성하고 `.env`에 실제 `APP_ORIGINS=https://실제주소`와 `COOKIE_SECURE=true`를 설정합니다. 예시 주소를 그대로 운영하지 마세요. 앱은 127.0.0.1:3001에 바인딩되므로 프록시는 그 주소로 연결합니다. SQLite는 영구 디스크의 단일 인스턴스에서 실행하고 백업을 별도로 마련하세요.

별도 프론트엔드에서 API를 쓰려면 빌드할 때 `VITE_API_URL`을 공식 배포한 API 주소로 설정하고 API `APP_ORIGINS`에 프론트 주소를 추가합니다. 현재 쿠키는 SameSite=Lax이므로 다른 사이트 도메인으로 분리하는 배포 대신 같은 origin을 권장합니다.

## GitHub Pages

Repository Settings → Pages → Source: GitHub Actions. main push는 `.github/workflows/pages.yml`에서 `npm ci` → `npm run test` → `npm run build` → Pages 업로드·배포를 수행합니다. `base: './'`와 OCR 자산의 상대 경로는 `/2026Fall/`에서 작동합니다. Pages에는 별도 API·데이터베이스가 생성되지 않습니다.

## 개발

```bash
npm ci
npm run dev:api       # 별도 터미널: API 3001
npm run dev           # Vite 5173, /api 프록시
npm run test
npm run build
npm run test:e2e
```

Playwright는 전용 API 3002/Vite 5174 및 OS 임시 DB를 사용합니다. 개발 DB를 재사용하지 않습니다. 서버와 브라우저 프로세스는 새 클라우드 작업에서 다시 시작해야 합니다.
