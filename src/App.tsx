import LocalDemo from './LocalDemo'
import SharedApp from './shared/SharedApp'
export default function App() {
  const params = new URLSearchParams(location.search)
  const shared = params.get('demo') !== '1' && (params.get('shared') === '1' || location.hash.includes('settlement=') || import.meta.env.VITE_SHARED_DEFAULT === '1')
  return shared ? <SharedApp /> : <><div className="local-mode-banner">이 기기에 저장되는 로컬 데모 · OCR·메뉴 정산을 테스트할 수 있어요. <a href="?shared=1">공유 정산 열기 ↗</a></div><LocalDemo /></>
}
