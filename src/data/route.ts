import type { Expense } from '../engine/settlement'
import type { Photo } from './models'
export interface RoutePoint { latitude: number; longitude: number; label: string; category: Expense['category']; at: string }
export function routePoints(photos: Photo[], expenses: Expense[]): RoutePoint[] {
  const sorted = photos.filter(p => Number.isFinite(p.latitude) && Number.isFinite(p.longitude) && Math.abs(p.latitude!) <= 90 && Math.abs(p.longitude!) <= 180)
    .map(p => ({ photo: p, expense: expenses.find(e => e.id === p.expenseId) }))
    .map(p => ({ ...p, at: p.photo.takenAt ?? p.expense?.at ?? '' }))
    .filter(p => Number.isFinite(new Date(p.at).getTime()))
    .sort((a, b) => a.at.localeCompare(b.at) || a.photo.id.localeCompare(b.photo.id))
  const seen = new Set<string>()
  const points: RoutePoint[] = []
  for (const { photo, expense, at } of sorted) {
    const key = expense?.id ?? `${photo.latitude},${photo.longitude}`
    if (seen.has(key)) continue
    seen.add(key)
    points.push({ latitude: photo.latitude!, longitude: photo.longitude!, label: expense?.place ?? '사진을 찍은 곳', category: expense?.category ?? 'other', at })
  }
  return points
}
