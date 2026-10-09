import { useEffect, useRef, useState } from 'react'
import { categoryStickers, type Meeting, type Member, type Photo } from '../data/models'
import { extractMetadata, matchPhoto, validateImage } from '../data/photoMatching'
import { savePhotos, updateMeeting } from '../data/storage'
export function usePhotoUrl(photo?: Photo) {
  const [url, setUrl] = useState<string>()
  useEffect(() => {
    if (!photo) { setUrl(undefined); return }
    const next = URL.createObjectURL(photo.blob)
    setUrl(next)
    return () => URL.revokeObjectURL(next)
  }, [photo])
  return url
}
export function PhotoImage({ photo, className = '' }: { photo: Photo; className?: string }) {
  const url = usePhotoUrl(photo)
  return <img className={className} src={url} alt={photo.fileName} loading="lazy" />
}
export default function PhotoSection({ meeting, members, actor, photos, onRefresh, onChange }: {
  meeting: Meeting; members: Member[]; actor: string; photos: Photo[]; onRefresh: () => Promise<void>;
  onChange: (work: () => Promise<unknown>, message?: string) => Promise<void>
}) {
  const [busy, setBusy] = useState(false), [error, setError] = useState('')
  const input = useRef<HTMLInputElement>(null)
  async function upload(files: FileList | null) {
    if (!files?.length) return
    setBusy(true); setError('')
    try {
      if (files.length > 20) throw new Error('한 번에 20장까지 올릴 수 있어요.')
      const additions: Photo[] = []
      for (const file of Array.from(files)) {
        await validateImage(file)
        const metadata = await extractMetadata(file)
        const expenseId = matchPhoto(metadata, meeting.expenses)
        additions.push({ id: crypto.randomUUID(), meetingId: meeting.id, uploaderId: actor, fileName: file.name, blob: file, ...metadata, expenseId, match: expenseId ? 'auto' : 'unmatched' })
      }
      await savePhotos(additions)
      await onRefresh()
    } catch (e) { setError(e instanceof Error ? e.message : '사진을 저장하지 못했어요. 저장 공간을 확인해 주세요.') }
    finally { setBusy(false); if (input.current) input.current.value = '' }
  }
  return <details className="photo-section"><summary>사진으로 기억하기 <span>{photos.length}장 ▾</span></summary><div className="photo-content"><p className="hint">촬영 시각 ±90분과 GPS가 있는 사진을 장소에 모아요. 정보가 없거나 장소가 다르면 직접 골라 주세요.</p><label className="upload-button">{busy ? '사진을 기억하는 중…' : '＋ 사진 여러 장 올리기'}<input ref={input} aria-label={`${meeting.title} 사진 업로드`} disabled={busy} type="file" multiple accept="image/jpeg,image/png,image/webp,image/gif" onChange={e => void upload(e.target.files)} /></label>{error && <p className="error" role="alert">{error}</p>}
      {[...meeting.expenses.map(e => ({ id: e.id, label: `${categoryStickers[e.category]} ${e.place}` })), { id: '', label: '📎 장소를 골라 주세요' }].map(group => {
        const grouped = photos.filter(p => (p.expenseId ?? '') === group.id)
        if (!grouped.length) return null
        return <section key={group.id} className="photo-place"><h4>{group.label} <small>{grouped.length}장</small></h4><div className="photo-grid">{grouped.map(p => <div key={p.id} className="photo-tile"><PhotoImage photo={p} /><p>{members.find(m => m.id === p.uploaderId)?.emoji} {members.find(m => m.id === p.uploaderId)?.name}<small>{p.match === 'auto' ? '자동 연결' : p.match === 'manual' ? '직접 연결' : '장소 미지정'}</small></p><label>사진의 장소<select value={p.expenseId ?? ''} onChange={e => { const expenseId = e.target.value || undefined; void onChange(async () => { await savePhotos([{ ...p, expenseId, match: expenseId ? 'manual' : 'unmatched' }]); await onRefresh() }) }}><option value="">장소 선택</option>{meeting.expenses.map(e => <option key={e.id} value={e.id}>{e.place}</option>)}</select></label><button className="text-button" onClick={() => void onChange(() => updateMeeting(meeting.id, m => ({ ...m, coverPhotoId: p.id })), '대표 사진을 바꿨어요.')} disabled={meeting.coverPhotoId === p.id}>{meeting.coverPhotoId === p.id ? '✓ 대표 사진' : '대표 사진으로'}</button></div>)}</div></section>
      })}
    </div></details>
}
