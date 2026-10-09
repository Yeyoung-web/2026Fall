import exifr from 'exifr'
import type { Expense } from '../engine/settlement'
export interface PhotoMetadata { takenAt?: string; latitude?: number; longitude?: number }
export function matchPhoto(metadata: PhotoMetadata, expenses: Expense[]): string | undefined {
  // Without both time and GPS, ask the uploader to confirm the place manually.
  if (!metadata.takenAt || metadata.latitude === undefined || metadata.longitude === undefined) return undefined
  const time = new Date(metadata.takenAt).getTime()
  if (!Number.isFinite(time)) return undefined
  const candidates = expenses.map(e => ({ id: e.id, time: new Date(e.at).getTime() }))
    .filter(e => Math.abs(e.time - time) <= 90 * 60 * 1000)
    .sort((a, b) => Math.abs(a.time - time) - Math.abs(b.time - time) || a.time - b.time || a.id.localeCompare(b.id))
  return candidates[0]?.id
}
export async function extractMetadata(blob: Blob): Promise<PhotoMetadata> {
  try {
    const metadata = await exifr.parse(await blob.arrayBuffer(), { gps: true, tiff: true, exif: true, pick: ['DateTimeOriginal', 'CreateDate', 'OffsetTimeOriginal', 'latitude', 'longitude', 'GPSLatitude', 'GPSLongitude', 'GPSLatitudeRef', 'GPSLongitudeRef'] })
    if (!metadata) return {}
    const date = metadata.DateTimeOriginal ?? metadata.CreateDate
    let takenAt: string | undefined
    if (date instanceof Date && Number.isFinite(date.getTime())) {
      // exifr decodes the wall clock into local Date; explicit EXIF offset wins.
      const offset = metadata.OffsetTimeOriginal
      if (typeof offset === 'string' && /^[+-]\d{2}:\d{2}$/.test(offset)) {
        const wall = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}T${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}:${String(date.getSeconds()).padStart(2, '0')}${offset}`
        const adjusted = new Date(wall)
        if (Number.isFinite(adjusted.getTime())) takenAt = adjusted.toISOString()
      } else takenAt = date.toISOString()
    }
    const latitude = typeof metadata.latitude === 'number' && Math.abs(metadata.latitude) <= 90 ? metadata.latitude : undefined
    const longitude = typeof metadata.longitude === 'number' && Math.abs(metadata.longitude) <= 180 ? metadata.longitude : undefined
    return { takenAt, latitude, longitude }
  } catch { return {} } // Metadata-less or malformed EXIF remains a usable manual upload.
}
export async function validateImage(file: File) {
  if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type)) throw new Error('JPG, PNG, WebP, GIF 사진을 선택해 주세요. HEIC는 JPG로 변환해 주세요.')
  if (file.size > 20 * 1024 * 1024) throw new Error('사진 한 장은 20MB 이하로 올려 주세요.')
  const bitmap = await createImageBitmap(file)
  const valid = bitmap.width > 0 && bitmap.height > 0
  bitmap.close()
  if (!valid) throw new Error('이 사진을 읽을 수 없어요.')
}
