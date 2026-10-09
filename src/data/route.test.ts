import { expect, it } from 'vitest'
import { routePoints } from './route'
import type { Photo } from './models'
import type { Expense } from '../engine/settlement'
it('GPS 사진을 시간순으로 잇고 같은 장소의 여러 멤버 사진은 하나로 묶는다', () => {
  const expenses = [{ id: 'a', place: '점심', category: 'restaurant', at: '2026-01-01T03:00:00Z' }, { id: 'b', place: '카페', category: 'cafe', at: '2026-01-01T04:00:00Z' }] as Expense[]
  const photos = [
    { id: '2', expenseId: 'b', latitude: 37.52, longitude: 127.02, takenAt: '2026-01-01T04:10:00Z' },
    { id: '1', expenseId: 'a', latitude: 37.51, longitude: 127.01, takenAt: '2026-01-01T03:10:00Z' },
    { id: '3', expenseId: 'a', latitude: 37.5101, longitude: 127.0101, takenAt: '2026-01-01T03:11:00Z' },
    { id: 'bad', latitude: 100, longitude: 190, takenAt: '2026-01-01' },
    { id: 'missing' },
  ] as Photo[]
  expect(routePoints(photos, expenses).map(p => p.label)).toEqual(['점심', '카페'])
  expect(routePoints(photos, expenses)[0].latitude).toBe(37.51)
})
it('GPS를 만들지 않고 위치가 없는 만남은 빈 경로로 남긴다', () => {
  expect(routePoints([{ id: 'x', takenAt: '2026-01-01' }] as Photo[], [])).toEqual([])
})
