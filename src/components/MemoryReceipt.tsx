import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { toBlob } from 'html-to-image'
import { settle } from '../engine/settlement'
import { categoryStickers, dateLabel, won, type Meeting, type Member, type Photo } from '../data/models'
import { updateMeeting } from '../data/storage'
import { preferredCover } from '../data/photoBooth'
import { transferApps } from '../config/transferApps'
import { usePhotoUrl } from './PhotoSection'
export default function MemoryReceipt({ meeting, members, photos, onChange }: {
  meeting: Meeting; members: Member[]; photos: Photo[];
  onChange: (work: () => Promise<unknown>, message?: string) => Promise<void>
}) {
  const [emotion, setEmotion] = useState(''), [exporting, setExporting] = useState(false)
  const [exportError, setExportError] = useState(''), [developing, setDeveloping] = useState(false)
  const completed = members.every(m => meeting.paidMemberIds.includes(m.id))
  const wasComplete = useRef(completed)
  const [lastStamp, setLastStamp] = useState('')
  const sheet = useRef<HTMLDivElement>(null), exportContent = useRef<HTMLDivElement>(null)
  const cover = preferredCover(photos, meeting.coverPhotoId)
  const coverUrl = usePhotoUrl(cover)
  const { balances, transfers } = settle(members.map(m => m.id), meeting.expenses)
  useEffect(() => {
    if (completed && !wasComplete.current) {
      setDeveloping(true)
      const timer = setTimeout(() => setDeveloping(false), 2300)
      wasComplete.current = completed
      return () => clearTimeout(timer)
    }
    wasComplete.current = completed
  }, [completed])
  async function exportPng() {
    if (!sheet.current || !exportContent.current) return
    setExporting(true); setExportError('')
    try {
      await document.fonts.ready
      for (const image of Array.from(sheet.current.querySelectorAll('img'))) if (!image.complete) await image.decode()
      const content = exportContent.current
      const scale = Math.min(1, 600 / content.scrollHeight)
      content.style.transform = `translate(-50%, -50%) scale(${scale})`
      const blob = await toBlob(sheet.current, { width: 360, height: 640, pixelRatio: 3, backgroundColor: '#f6f1e7', preferredFontFormat: 'woff2', cacheBust: false })
      if (!blob) throw new Error('PNG를 만들지 못했어요.')
      const url = URL.createObjectURL(blob), link = document.createElement('a')
      link.href = url; link.download = `Receiptory-${meeting.title.replace(/[\\/:*?"<>|]/g, '-')}.png`
      link.click(); setTimeout(() => URL.revokeObjectURL(url), 10000)
    } catch { setExportError('사진을 불러온 뒤 다시 저장해 주세요. 브라우저가 PNG 저장을 지원하는지도 확인해 주세요.') }
    finally { setExporting(false) }
  }
  async function copyAccount(account: string) {
    await onChange(async () => { await navigator.clipboard.writeText(account) }, '계좌번호를 복사했어요.')
  }
  function body(exportMode = false) {
    return <div className={`receipt-paper ${completed ? 'developed' : 'pending'} ${developing && !exportMode ? 'developing' : ''}`}>
      <div className="receipt-topline"><span>MEMORY RECEIPT</span><span>NO. {meeting.id.replace(/[^0-9]/g, '').slice(-4).padStart(4, '0')}</span></div>
      <div className="receipt-brand">RECEIPTORY</div><p className="receipt-subtitle">Every receipt has a story</p>
      {coverUrl ? <figure className={`receipt-cover ${cover?.kind === 'photobooth' ? 'booth-cover' : ''}`}><img src={coverUrl} alt={cover?.fileName ?? meeting.title} loading={exportMode ? 'eager' : 'lazy'} /><figcaption>{cover?.kind === 'photobooth' ? 'FOUR FRAMES, ONE STORY ♡' : cover?.demo ? 'ILLUSTRATED DEMO MEMORY' : 'OUR MOMENT ON FILM'}</figcaption></figure> : <div className="receipt-placeholder"><span>✳</span><p>사진보다 먼저,<br />마음에 담긴 하루.</p></div>}
      <p className="receipt-date">{dateLabel(meeting.date)}</p><h2>{meeting.title}</h2><p className="receipt-members">{members.map(m => `${m.emoji} ${m.name}`).join(' · ')}</p>
      <div className="dashed" />
      <div className="receipt-expenses">{meeting.expenses.map(e => <p className="expense-line" key={e.id}><span>{categoryStickers[e.category]} {e.place}</span><small>{won(e.amount)}</small></p>)}</div>
      {meeting.emotions.length > 0 && <><div className="dashed" /><p className="receipt-section-label">마음으로 계산한 것들</p><div className="emotion-items">{meeting.emotions.map((line, i) => <p key={`${line}-${i}`}><span>♡</span> {line}<small>PRICELESS</small></p>)}</div></>}
      <div className="dashed" /><div className="receipt-total"><span>각자의 몫</span><div>{balances.map(b => <p key={b.memberId}><span>{members.find(m => m.id === b.memberId)?.name}</span><small>{won(b.owed)}원</small></p>)}</div></div>
      <div className="receipt-stamps">{members.map((m, index) => <div key={m.id} className={`character-stamp ${meeting.paidMemberIds.includes(m.id) ? 'stamped' : ''} ${lastStamp === m.id && !exportMode ? 'stamp-pop' : ''}`} style={{ '--stamp-rotate': `${[-9, 5, -4, 8][index % 4]}deg` } as CSSProperties}><span>{m.emoji}</span><small>{m.name}</small><em>{meeting.paidMemberIds.includes(m.id) ? '마음 전달 완료' : '마음 전달 대기'}</em></div>)}</div>
      <div className="barcode" /><p className="receipt-bottom">정산하면, 추억이 된다.</p><p className="receipt-subtitle">THANK YOU FOR BEING PART OF MY STORY ♡</p>
    </div>
  }
  return <><div className="receipt-stage">{body()}</div><p className={`develop-status ${completed ? 'complete' : ''}`} role="status">{completed ? '✳ 우리의 추억이 현상되었어요' : `🎞 ${meeting.paidMemberIds.length}/${members.length}명이 마음을 전했어요`}</p>
    <div className="complete-controls">{members.map(m => <button key={m.id} aria-label={`${m.name} 송금 완료`} aria-pressed={meeting.paidMemberIds.includes(m.id)} className={meeting.paidMemberIds.includes(m.id) ? 'checked' : ''} onClick={() => { setLastStamp(meeting.paidMemberIds.includes(m.id) ? '' : m.id); void onChange(() => updateMeeting(meeting.id, current => ({ ...current, paidMemberIds: current.paidMemberIds.includes(m.id) ? current.paidMemberIds.filter(id => id !== m.id) : [...current.paidMemberIds, m.id] }))) }}>{m.emoji} {m.name} <span>{meeting.paidMemberIds.includes(m.id) ? '✓' : '○'}</span></button>)}</div>
    <div className="receipt-actions"><button className="secondary compact" disabled={exporting} onClick={() => void exportPng()}>{exporting ? '현상 중…' : '↓ 영수증 PNG 저장'}</button><small>1080 × 1920 · 스토리 사이즈</small></div>{exportError && <p className="error" role="alert">{exportError}</p>}
    <details className="settlement-details"><summary>조용히 정산하기 <span>{transfers.length}번의 송금 ▾</span></summary><p className="hint">앱은 돈을 보관하거나 이체하지 않아요. 직접 송금한 뒤 위에서 완료를 체크해 주세요. 받을 돈이 있는 친구도 수령을 확인해요.</p>{transfers.length ? transfers.map((t, i) => { const from = members.find(m => m.id === t.from)!, to = members.find(m => m.id === t.to)!; return <div className="transfer" key={i}><div><span>{from.emoji} {from.name} → {to.emoji} {to.name}</span><small>{won(t.amount)}원</small></div>{to.account ? <button className="secondary compact" onClick={() => void copyAccount(to.account)}>계좌번호 복사</button> : <p className="hint">{to.name}의 계좌를 프로필에서 등록해 주세요.</p>}<div className="transfer-apps">{transferApps.map(app => app.url && /^https:\/\//.test(app.url) ? <a href={app.url} target="_blank" rel="noopener noreferrer" key={app.label}>{app.label} 열기 ↗</a> : <span key={app.label}>{app.label} 링크 준비 중</span>)}</div></div> }) : <p className="hint">보낼 돈이 없어요. 함께한 마음만 확인해 주세요 ♡</p>}</details>
    <form className="emotion-form" onSubmit={e => { e.preventDefault(); if (emotion.trim()) { const value = emotion.trim(); void onChange(() => updateMeeting(meeting.id, current => ({ ...current, emotions: [...current.emotions, value] }))); setEmotion('') } }}><label>오늘의 감정 한 줄<input aria-label={`${meeting.title} 감정 항목`} maxLength={40} placeholder="예: 웃음 측정 불가" value={emotion} onChange={e => setEmotion(e.target.value)} /></label><button className="icon-button" aria-label="감정 추가">＋</button></form>
    <div className="export-offscreen" aria-hidden="true"><div className="export-sheet" ref={sheet}><div className="export-content" ref={exportContent}>{body(true)}</div></div></div>
  </>
}
