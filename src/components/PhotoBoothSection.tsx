import { useEffect, useId, useRef, useState } from 'react'
import type { Html5Qrcode } from 'html5-qrcode'
import type { Meeting, Photo } from '../data/models'
import { hasPhotoBooth, isPhotoBooth, safeQrUrl } from '../data/photoBooth'
import { validateImage } from '../data/photoMatching'
import { savePhotos, updateMeeting } from '../data/storage'
import { PhotoImage } from './PhotoSection'
type Change = (work: () => Promise<unknown>, message?: string) => Promise<void>
const expiryNotice = 'QR 링크는 기간이 지나면 만료돼요. 사진을 저장한 뒤 아래에서 올려 주세요.'
export default function PhotoBoothSection({ meeting, actor, photos, onRefresh, onChange }: {
  meeting: Meeting; actor: string; photos: Photo[]; onRefresh: () => Promise<void>; onChange: Change
}) {
  const [scanner, setScanner] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState('')
  const boothPhotos = photos.filter(p => p.kind === 'photobooth')
  async function upload(files: FileList | null) {
    if (!files?.length) return
    setBusy(true); setError('')
    try {
      if (files.length > 20) throw new Error('한 번에 20장까지 올릴 수 있어요.')
      const expense = meeting.expenses.find(e => e.category === 'photobooth' || isPhotoBooth(e.place))
      const additions: Photo[] = []
      for (const file of Array.from(files)) {
        await validateImage(file)
        additions.push({ id: crypto.randomUUID(), meetingId: meeting.id, uploaderId: actor, fileName: file.name, blob: file,
          expenseId: expense?.id, takenAt: expense?.at ?? meeting.date, match: expense ? 'manual' : 'unmatched', kind: 'photobooth' })
      }
      await savePhotos(additions)
      await onRefresh()
    } catch (e) { setError(e instanceof Error ? e.message : '네컷을 저장하지 못했어요.') }
    finally { setBusy(false) }
  }
  return <section className="booth-section">
    {hasPhotoBooth(meeting) && <div className="booth-banner"><span>🎞</span><div><strong>네컷 찍었네요!</strong><p>오늘 카드에 붙일까요?</p></div><span>♡</span></div>}
    <details><summary>네컷 붙이기 <span>{boothPhotos.length}장 ▾</span></summary><div className="booth-content"><p className="hint">{expiryNotice}</p><div className="two-columns"><button className="secondary compact" onClick={() => setScanner(true)}>▦ QR 스캔</button><label className="upload-button booth-upload">{busy ? '저장 중…' : '＋ 네컷 이미지 업로드'}<input aria-label={`${meeting.title} 네컷 이미지 업로드`} type="file" multiple accept="image/jpeg,image/png,image/webp,image/gif" disabled={busy} onChange={e => { void upload(e.target.files); e.target.value = '' }} /></label></div>{error && <p className="error" role="alert">{error}</p>}
      {(meeting.qrLinks ?? []).map(link => <div className="saved-qr" key={link.id}><span>▦</span><div><small>저장한 QR 링크</small><a href={safeQrUrl(link.url)} target="_blank" rel="noopener noreferrer">{new URL(link.url).hostname} ↗</a></div><button className="text-button" onClick={() => void onChange(() => updateMeeting(meeting.id, current => ({ ...current, qrLinks: (current.qrLinks ?? []).filter(qr => qr.id !== link.id) })))}>링크 삭제</button></div>)}
      {!!boothPhotos.length && <div className="mini-film-row">{boothPhotos.map(p => <PhotoImage key={p.id} photo={p} />)}</div>}
      <p className="hint">네컷은 일반 사진보다 먼저 영수증에 붙여요. QR 없이 바로 이미지를 올려도 좋아요.</p>
    </div></details>
    {scanner && <QrScanner meeting={meeting} onClose={() => setScanner(false)} onChange={onChange} />}
  </section>
}
function QrScanner({ meeting, onClose, onChange }: { meeting: Meeting; onClose: () => void; onChange: Change }) {
  const readerId = `qr-${useId().replace(/[^a-zA-Z0-9]/g, '')}`
  const reader = useRef<Html5Qrcode | undefined>(undefined)
  const canStop = useRef<() => boolean>(() => false)
  const disposed = useRef(false), handled = useRef(false), startTask = useRef<Promise<void> | undefined>(undefined)
  const [decoded, setDecoded] = useState(''), [error, setError] = useState(''), [busy, setBusy] = useState(false), [camera, setCamera] = useState(false)
  useEffect(() => {
    disposed.current = false
    return () => {
      disposed.current = true
      void Promise.resolve(startTask.current).catch(() => undefined).then(async () => {
        const scanner = reader.current
        if (!scanner) return
        if (canStop.current()) await scanner.stop().catch(() => undefined)
        try { scanner.clear() } catch { /* Reader was already cleared. */ }
      })
    }
  }, [])
  async function getReader() {
    if (!reader.current) {
      const { Html5Qrcode, Html5QrcodeSupportedFormats, Html5QrcodeScannerState } = await import('html5-qrcode')
      if (disposed.current) throw new Error('스캐너가 닫혔어요.')
      reader.current = new Html5Qrcode(readerId, { formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE], verbose: false })
      canStop.current = () => reader.current?.getState() === Html5QrcodeScannerState.SCANNING || reader.current?.getState() === Html5QrcodeScannerState.PAUSED
    }
    return reader.current
  }
  async function receive(text: string) {
    if (disposed.current || handled.current) return
    handled.current = true
    if (canStop.current()) await reader.current!.stop().catch(() => undefined)
    if (disposed.current) return
    setCamera(false)
    try { setDecoded(safeQrUrl(text)); setError('') }
    catch (e) { setError(e instanceof Error ? e.message : '웹 링크를 읽지 못했어요.'); handled.current = false }
  }
  async function startCamera() {
    setBusy(true); setError(''); setDecoded(''); handled.current = false
    const task = (async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error('카메라는 HTTPS 연결에서 사용할 수 있어요. QR 이미지로 읽거나 링크를 직접 입력해 주세요.')
        const scanner = await getReader()
        await scanner.start({ facingMode: 'environment' }, { fps: 8, qrbox: { width: 220, height: 220 } }, text => void receive(text), () => undefined)
        // start() resolves before the library's video 'playing' callback.
        // Keep the surface mounted until playback is ready, then allow stopping.
        const video = document.getElementById(readerId)?.querySelector('video')
        if (video && !handled.current) await video.play()
        if (!disposed.current && !handled.current) setCamera(true)
      } catch (e) {
        if (!disposed.current) setError(e instanceof Error && e.message.includes('HTTPS') ? e.message : '카메라를 열지 못했어요. 카메라 권한을 허용하거나 QR 이미지를 선택해 주세요.')
      } finally { if (!disposed.current) setBusy(false) }
    })()
    startTask.current = task
    await task
  }
  async function scanFile(file?: File) {
    if (!file) return
    setBusy(true); setError(''); setDecoded(''); handled.current = false
    try {
      const scanner = await getReader()
      if (canStop.current()) await scanner.stop()
      if (!disposed.current) setCamera(false)
      const text = await scanner.scanFile(file, true)
      await receive(text)
    } catch { if (!disposed.current) setError('QR을 찾지 못했어요. 선명한 QR 이미지를 선택하거나 링크를 직접 입력해 주세요.') }
    finally { if (!disposed.current) setBusy(false) }
  }
  async function closeScanner() {
    setBusy(true)
    await Promise.resolve(startTask.current).catch(() => undefined)
    if (canStop.current()) await reader.current!.stop().catch(() => undefined)
    try { reader.current?.clear() } catch { /* Already stopped. */ }
    onClose()
  }
  async function saveAndOpen() {
    let url: string
    try { url = safeQrUrl(decoded) } catch (e) { setError(e instanceof Error ? e.message : '링크를 확인해 주세요.'); return }
    // Reserve a tab during the user gesture, save first, then navigate. No provider URL guesses.
    const tab = window.open('about:blank', '_blank')
    if (tab) tab.opener = null
    setBusy(true); setError('')
    try {
      await updateMeeting(meeting.id, current => ({ ...current, qrLinks: (current.qrLinks ?? []).some(link => link.url === url) ? current.qrLinks : [...(current.qrLinks ?? []), { id: crypto.randomUUID(), url, savedAt: new Date().toISOString() }] }))
      if (tab) tab.location.href = url
      await onChange(async () => undefined, tab ? 'QR 링크를 저장하고 새 탭으로 열었어요.' : '링크를 저장했어요. 새 탭이 차단되면 저장한 링크를 눌러 주세요.')
      await closeScanner()
    } catch { tab?.close(); setError('QR 링크를 저장하지 못했어요. 다시 시도해 주세요.'); setBusy(false) }
  }
  return <div className="dialog-backdrop"><section className="dialog small qr-dialog" role="dialog" aria-modal="true" aria-labelledby={`${readerId}-title`}><div className="section-heading"><h2 id={`${readerId}-title`}>네컷 QR 읽기</h2><button className="icon-button" onClick={() => void closeScanner()} aria-label="QR 스캐너 닫기">✕</button></div><p className="hint">{expiryNotice}</p><div id={readerId} className="qr-reader" /><div className="two-columns"><button className="secondary compact" disabled={busy || camera} onClick={() => void startCamera()}>{camera ? 'QR을 비춰 주세요' : '카메라로 스캔'}</button><label className="upload-button booth-upload">QR 이미지로 읽기<input aria-label="QR 이미지로 읽기" type="file" accept="image/*" disabled={busy} onChange={e => { void scanFile(e.target.files?.[0]); e.target.value = '' }} /></label></div><label className="qr-link-label">읽은 링크 / 직접 붙여넣기<input aria-label="읽은 QR 링크" type="url" placeholder="https://…" value={decoded} onChange={e => setDecoded(e.target.value)} /></label>{decoded && <p className="hint">다운로드 페이지 주소인지 확인한 뒤 저장해 주세요.</p>}{error && <p role="alert" className="error">{error}</p>}<button className="primary full" disabled={busy || !decoded.trim()} onClick={() => void saveAndOpen()}>{busy ? '읽는 중…' : '링크 저장하고 새 탭 열기 ↗'}</button></section></div>
}
