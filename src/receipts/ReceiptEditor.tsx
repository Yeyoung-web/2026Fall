import { useEffect, useRef, useState } from 'react'
import { createWorker, OEM, PSM, type Worker } from 'tesseract.js'
import type { MenuReceipt } from '../engine/receipt'
import type { Member } from '../data/models'
import { parseReceipt } from './parser'
import { receiptSamples, sampleImage } from './samples'
import './receipt.css'
export default function ReceiptEditor({ members, shared = false, onApply }: { members: Member[]; shared?: boolean; onApply: (receipt: MenuReceipt, place?: string) => void }) {
  const [raw, setRaw] = useState(''), [receipt, setReceipt] = useState<MenuReceipt>({ items: [], total: 0, confirmedMemberIds: [] })
  const [verified, setVerified] = useState(false), [busy, setBusy] = useState(false), [progress, setProgress] = useState(''), [error, setError] = useState(''), [preview, setPreview] = useState(''), [place, setPlace] = useState<string>()
  const worker = useRef<Worker | null>(null), job = useRef(0), blobUrl = useRef('')
  useEffect(() => () => { job.current++; void worker.current?.terminate(); if (blobUrl.current) URL.revokeObjectURL(blobUrl.current) }, [])
  function update(next: MenuReceipt) { setReceipt(next); setVerified(false) }
  function parse(text: string) { setRaw(text); update(parseReceipt(text).receipt) }
  async function cancel() { job.current++; const w = worker.current; worker.current = null; if (w) await w.terminate(); setBusy(false); setProgress('OCR을 취소했어요.') }
  async function scan(file?: File) {
    if (!file) return
    setError(''); setVerified(false)
    if (!/^image\/(jpeg|png|webp|gif)$/.test(file.type) || file.size > 8 * 1024 * 1024) { setError('8MB 이하의 JPG·PNG·WebP·GIF 사진을 올려 주세요.'); return }
    const current = ++job.current; setBusy(true); setPlace(undefined)
    try {
      const bitmap = await createImageBitmap(file)
      if (bitmap.width * bitmap.height > 20000000) { bitmap.close(); throw new Error('사진은 2천만 화소 이하로 올려 주세요.') }
      const scale = Math.min(1, 2400 / Math.max(bitmap.width, bitmap.height)), canvas = document.createElement('canvas')
      canvas.width = Math.round(bitmap.width * scale); canvas.height = Math.round(bitmap.height * scale); canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height); bitmap.close()
      if (blobUrl.current) URL.revokeObjectURL(blobUrl.current)
      blobUrl.current = URL.createObjectURL(file); setPreview(blobUrl.current)
      const asset = new URL('ocr/', new URL(import.meta.env.BASE_URL, location.href)).href
      const w = await createWorker('kor+eng', OEM.LSTM_ONLY, { workerPath: asset + 'worker.min.js', corePath: asset + 'tesseract-core-lstm.wasm.js', langPath: asset, workerBlobURL: false, logger: m => { if (job.current === current) setProgress(`${m.status} ${Math.round((m.progress ?? 0) * 100)}%`) } })
      if (job.current !== current) { await w.terminate(); return }
      worker.current = w; await w.setParameters({ tessedit_pageseg_mode: PSM.SINGLE_BLOCK, preserve_interword_spaces: '1' })
      const { data } = await w.recognize(canvas)
      if (job.current === current) { parse(data.text); setProgress('텍스트 추출 완료 · 원본과 대조해 주세요.') }
      await w.terminate(); if (worker.current === w) worker.current = null
    } catch (e) { if (job.current === current) setError(e instanceof Error ? e.message : 'OCR에 실패했어요. 아래 표를 직접 입력할 수 있어요.'); await worker.current?.terminate(); worker.current = null }
    finally { if (job.current === current) setBusy(false) }
  }
  const sum = receipt.items.reduce((n, i) => n + i.amount, 0), mismatch = sum !== receipt.total
  const valid = receipt.items.length > 0 && receipt.items.every(i => i.name.trim() && Number.isSafeInteger(i.quantity) && i.quantity > 0 && Number.isSafeInteger(i.amount) && (i.kind === 'discount' ? i.amount <= 0 : i.amount >= 0)) && Number.isSafeInteger(receipt.total) && receipt.total >= 0
  return <details className="receipt-editor"><summary>🧾 영수증으로 메뉴별 정산하기</summary>
    <p className="hint">사진은 이 브라우저에서 읽어요. OCR 결과는 틀릴 수 있으니 반드시 수정·확인해 주세요.</p>
    <label>영수증 이미지 업로드<input type="file" accept="image/jpeg,image/png,image/webp,image/gif" disabled={busy} onChange={e => void scan(e.target.files?.[0])} /></label>
    <div className="chips">{receiptSamples.map((sample, i) => <button type="button" className="secondary compact" key={sample.name} disabled={busy} onClick={() => { parse(sample.text); setPlace(sample.place); setPreview(sampleImage(i)); setProgress('OCR 없이 샘플을 불러왔어요.') }}>{sample.name}</button>)}</div>
    {preview && <img className="ocr-preview" src={preview} alt="편집 전 영수증 원본" />}{progress && <p role="status" className="hint">{progress}</p>}{busy && <button type="button" className="secondary" onClick={() => void cancel()}>OCR 취소</button>}
    {error && <p className="error" role="alert">{error}</p>}
    <label>추출 텍스트 (직접 수정 가능)<textarea rows={4} value={raw} onChange={e => setRaw(e.target.value)} /></label><button className="secondary compact" type="button" disabled={busy} onClick={() => parse(raw)}>텍스트 다시 파싱</button>
    <div className="menu-table-wrap"><table className="menu-table"><thead><tr><th>메뉴명</th><th>수량</th><th>행 금액 (원)</th><th>할인</th><th /></tr></thead><tbody>{receipt.items.map((item, index) => {
      const patch = (p: Partial<typeof item>) => update({ ...receipt, items: receipt.items.map(i => i.id === item.id ? { ...i, ...p } : i) })
      return <tr key={item.id}><td><input aria-label={`메뉴 ${index + 1} 이름`} maxLength={80} value={item.name} onChange={e => patch({ name: e.target.value })} /></td><td><input aria-label={`메뉴 ${index + 1} 수량`} type="number" min="1" value={item.quantity} onChange={e => patch({ quantity: Number(e.target.value) })} /></td><td><input aria-label={`메뉴 ${index + 1} 금액`} type="number" step="1" value={item.amount} onChange={e => patch({ amount: Number(e.target.value) })} /></td><td><input aria-label={`메뉴 ${index + 1} 할인`} type="checkbox" checked={item.kind === 'discount'} onChange={e => patch({ kind: e.target.checked ? 'discount' : 'menu', amount: e.target.checked ? -Math.abs(item.amount) : Math.abs(item.amount), selectedMemberIds: [] })} /></td><td><button type="button" className="text-button" aria-label={`메뉴 ${index + 1} 삭제`} onClick={() => update({ ...receipt, items: receipt.items.filter(i => i.id !== item.id) })}>×</button></td></tr>
    })}</tbody></table></div>
    <button type="button" className="secondary compact" onClick={() => update({ ...receipt, items: [...receipt.items, { id: crypto.randomUUID(), name: '', quantity: 1, amount: 0, kind: 'menu', selectedMemberIds: [] }] })}>＋ 메뉴 행 추가</button>
    <label>영수증 총액<input aria-label="영수증 총액" type="number" min="0" step="1" value={receipt.total} onChange={e => update({ ...receipt, total: Number(e.target.value) })} /></label>
    <p className={mismatch ? 'error' : 'hint'} role={mismatch ? 'alert' : undefined}>메뉴 합계 {sum.toLocaleString('ko-KR')}원{mismatch && ' · 영수증 총액과 달라요. 수정해 주세요.'}</p>
    <p className="hint">금액은 수량을 포함한 행 전체 금액이에요. 할인은 부담 금액 비율대로 나눠요. 아무도 고르지 않은 메뉴는 전원 균등 분할해요.</p>
    {shared ? <p className="hint">생성 후 각 친구가 참여하고 자기 메뉴를 고른 뒤 확정해요.</p> : receipt.items.filter(i => i.kind === 'menu').map(item => <fieldset key={item.id}><legend>{item.name || '메뉴'} · 먹은 친구</legend><div className="chips">{members.map(member => <label className="choice" key={member.id}><input type="checkbox" checked={item.selectedMemberIds.includes(member.id)} onChange={() => update({ ...receipt, items: receipt.items.map(i => i.id === item.id ? { ...i, selectedMemberIds: i.selectedMemberIds.includes(member.id) ? i.selectedMemberIds.filter(id => id !== member.id) : [...i.selectedMemberIds, member.id] } : i) })} />{member.name}</label>)}</div></fieldset>)}
    <label className="choice"><input type="checkbox" checked={verified} onChange={e => setVerified(e.target.checked)} />원본과 메뉴·수량·금액을 확인했어요</label>
    <button type="button" className="primary full" disabled={busy || mismatch || !valid || !verified} onClick={() => onApply({ ...receipt, confirmedMemberIds: shared ? [] : members.map(m => m.id) }, place)}>이 메뉴로 정산하기</button>
  </details>
}
