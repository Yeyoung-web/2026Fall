import { expect, it } from 'vitest'
import { extractMetadata, matchPhoto } from './photoMatching'
import type { Expense } from '../engine/settlement'
const expenses = [{ id: 'lunch', at: '2026-01-01T03:00:00Z' }, { id: 'coffee', at: '2026-01-01T05:00:00Z' }] as Expense[]
const photo = (takenAt: string) => ({ takenAt, latitude: 37.5, longitude: 127 })
it('가장 가까운 지출을 연결하고 ±90분 경계를 포함한다', () => {
  expect(matchPhoto(photo('2026-01-01T03:50:00Z'), expenses)).toBe('lunch')
  expect(matchPhoto(photo('2026-01-01T04:50:00Z'), expenses)).toBe('coffee')
  expect(matchPhoto(photo('2026-01-01T01:30:00Z'), expenses)).toBe('lunch')
  expect(matchPhoto(photo('2026-01-01T01:29:59Z'), expenses)).toBeUndefined()
  expect(matchPhoto(photo('2026-01-01T06:30:00Z'), expenses)).toBe('coffee')
  expect(matchPhoto(photo('2026-01-01T06:30:01Z'), expenses)).toBeUndefined()
})
it('동일 거리라면 이른 지출을 선택하며 배열 순서에 영향받지 않는다', () => {
  expect(matchPhoto(photo('2026-01-01T04:00:00Z'), [...expenses].reverse())).toBe('lunch')
})
it('촬영 시각 또는 GPS가 없으면 직접 장소를 지정한다', () => {
  expect(matchPhoto({}, expenses)).toBeUndefined()
  expect(matchPhoto({ takenAt: '2026-01-01T03:00:00Z' }, expenses)).toBeUndefined()
  expect(matchPhoto({ latitude: 37, longitude: 127 }, expenses)).toBeUndefined()
  expect(matchPhoto(photo('invalid'), expenses)).toBeUndefined()
})
it('메타데이터가 없는 파일도 안전하게 수동 매칭으로 진행한다', async () => {
  expect(await extractMetadata(new Blob(['not an exif image']))).toEqual({})
})
it('실제 EXIF JPEG 바이트에서 촬영 시각, 시간대, GPS를 추출한다', async () => {
  const tiff = new Uint8Array(256), view = new DataView(tiff.buffer)
  const u16 = (at: number, v: number) => view.setUint16(at, v, true)
  const u32 = (at: number, v: number) => view.setUint32(at, v, true)
  const entry = (at: number, tag: number, type: number, count: number, value: number) => { u16(at, tag); u16(at + 2, type); u32(at + 4, count); u32(at + 8, value) }
  tiff.set([73, 73]); u16(2, 42); u32(4, 8)
  u16(8, 2); entry(10, 0x8769, 4, 1, 38); entry(22, 0x8825, 4, 1, 70)
  u16(38, 2); entry(40, 0x9003, 2, 20, 150); entry(52, 0x9011, 2, 7, 170)
  u16(70, 4); entry(72, 1, 2, 2, 78); entry(84, 2, 5, 3, 180); entry(96, 3, 2, 2, 69); entry(108, 4, 5, 3, 204)
  tiff.set(new TextEncoder().encode('2026:01:01 12:00:00\0'), 150)
  tiff.set(new TextEncoder().encode('+09:00\0'), 170)
  for (const [start, parts] of [[180, [37, 30, 0]], [204, [127, 0, 0]]] as const)
    parts.forEach((part, i) => { u32(start + i * 8, part); u32(start + i * 8 + 4, 1) })
  const length = tiff.length + 8
  const jpeg = new Uint8Array([255, 216, 255, 225, length >> 8, length & 255, 69, 120, 105, 102, 0, 0, ...tiff, 255, 217])
  const result = await extractMetadata(new Blob([jpeg]))
  expect(result.takenAt).toBe('2026-01-01T03:00:00.000Z')
  expect(result.latitude).toBe(37.5)
  expect(result.longitude).toBe(127)
})
