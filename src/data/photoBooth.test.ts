import { expect, it } from 'vitest'
import { annualSummary, classifyPlace, isPhotoBooth, preferredCover, safeQrUrl, sortBoothPhotos } from './photoBooth'
import type { Meeting, Photo } from './models'
it('설정의 7종 키워드와 지점명·공백을 매칭한다', () => {
  for (const name of ['인생네컷 성수점', '포토이즘', '하루필름 홍대점', '포토그레이', '포토시그니처', '셀프 포토부스', '우리 네 컷', '인생 네컷']) expect(isPhotoBooth(name)).toBe(true)
  expect(isPhotoBooth(' PHOTO BOOTH 성수점 ', ['photo booth'])).toBe(true)
  expect(isPhotoBooth('셀프 촬영', ['', '   '])).toBe(false)
})
it('일반 장소는 자동 분류하지 않고 포토부스는 우선한다', () => {
  for (const place of ['카페', '동네 식당', '네이버', '사진 전시관', '']) expect(isPhotoBooth(place)).toBe(false)
  expect(classifyPlace('포토이즘 홍대점', 'other')).toBe('photobooth')
  expect(classifyPlace('작은 카페', 'cafe')).toBe('cafe')
})
it('QR은 http(s) 링크만 허용하고 실행 코드·상대경로·자격증명 링크를 거부한다', () => {
  expect(safeQrUrl(' https://example.com/download?id=1 ')).toBe('https://example.com/download?id=1')
  for (const url of ['javascript:alert(1)', 'data:text/html,hello', 'file:///etc/passwd', '/download', 'not a URL', 'https://user:pass@example.com']) expect(() => safeQrUrl(url)).toThrow()
})
it('일반 대표 사진보다 네컷을 우선하고 네컷 선택은 존중한다', () => {
  const photos = [{ id: 'normal' }, { id: 'booth1', kind: 'photobooth' }, { id: 'booth2', kind: 'photobooth' }] as Photo[]
  expect(preferredCover(photos, 'normal')?.id).toBe('booth1')
  expect(preferredCover(photos, 'booth2')?.id).toBe('booth2')
  expect(preferredCover(photos.slice(0, 1), 'normal')?.id).toBe('normal')
})
it('네컷 앨범은 만남 시간순이며 연간 개수는 한국 날짜로 집계한다', () => {
  const meetings = [{ id: 'a', date: '2025-01-01T03:00:00Z', emotions: ['웃음'] }, { id: 'b', date: '2025-12-31T16:00:00Z', emotions: [] }] as unknown as Meeting[]
  const photos = [{ id: 'late', meetingId: 'b', kind: 'photobooth' }, { id: 'early', meetingId: 'a', kind: 'photobooth' }, { id: 'normal', meetingId: 'a' }] as Photo[]
  expect(sortBoothPhotos(photos, meetings).map(p => p.id)).toEqual(['early', 'late'])
  expect(annualSummary(meetings, photos, 2025)).toMatchObject({ memories: 1, photos: 2, photoBoothCount: 1, emotionCount: 1 })
  expect(annualSummary(meetings, photos, 2026).photoBoothCount).toBe(1)
})
