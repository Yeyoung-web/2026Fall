import { photoBoothKeywords } from '../config/photoBooth'
import type { Expense } from '../engine/settlement'
import type { Meeting, Photo } from './models'
const normalize = (value: string) => value.normalize('NFKC').toLocaleLowerCase('ko-KR').replace(/[\s_-]+/g, '')
export function isPhotoBooth(place: string, keywords = photoBoothKeywords): boolean {
  const name = normalize(place)
  return !!name && keywords.some(keyword => !!normalize(keyword) && name.includes(normalize(keyword)))
}
export function classifyPlace(place: string, fallback: Expense['category']): Expense['category'] {
  return isPhotoBooth(place) ? 'photobooth' : fallback
}
export function hasPhotoBooth(meeting: Meeting) {
  return meeting.expenses.some(e => e.category === 'photobooth' || isPhotoBooth(e.place))
}
export function safeQrUrl(value: string): string {
  let url: URL
  try { url = new URL(value.trim()) } catch { throw new Error('QR에 웹 링크가 없어요. 사진 다운로드 페이지의 주소인지 확인해 주세요.') }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password)
    throw new Error('http 또는 https 웹 링크만 저장할 수 있어요.')
  return url.href
}
export function preferredCover(photos: Photo[], coverPhotoId?: string): Photo | undefined {
  const selected = photos.find(p => p.id === coverPhotoId)
  if (selected?.kind === 'photobooth') return selected
  return photos.find(p => p.kind === 'photobooth') ?? selected ?? photos[0]
}
export function sortBoothPhotos(photos: Photo[], meetings: Meeting[]) {
  const dates = new Map(meetings.map(m => [m.id, m.date]))
  return photos.filter(p => p.kind === 'photobooth').sort((a, b) =>
    (dates.get(a.meetingId) ?? '').localeCompare(dates.get(b.meetingId) ?? '') || (a.takenAt ?? '').localeCompare(b.takenAt ?? '') || a.id.localeCompare(b.id))
}
export function annualSummary(meetings: Meeting[], photos: Photo[], year: number) {
  const yearOf = (date: string) => new Intl.DateTimeFormat('en', { year: 'numeric', timeZone: 'Asia/Seoul' }).format(new Date(date))
  const selected = meetings.filter(m => yearOf(m.date) === String(year))
  const ids = new Set(selected.map(m => m.id))
  return { meetings: selected, memories: selected.length, photos: photos.filter(p => ids.has(p.meetingId)).length,
    photoBoothCount: photos.filter(p => ids.has(p.meetingId) && p.kind === 'photobooth').length,
    emotionCount: selected.reduce((sum, m) => sum + m.emotions.length, 0) }
}
