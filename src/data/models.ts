import type { Expense } from '../engine/settlement'
export interface Member { id: string; name: string; emoji: string; account: string }
export interface Room { id: string; memberIds: string[]; name: string; namingDismissed: boolean }
export interface Comment { id: string; memberId: string; text: string; at: string }
export interface Meeting {
  id: string; roomId: string; title: string; date: string; expenses: Expense[];
  emotions: string[]; paidMemberIds: string[]; reactions: Record<string, string[]>;
  comments: Comment[]; coverPhotoId?: string; demo?: boolean; qrLinks?: { id: string; url: string; savedAt: string }[]
}
export interface Photo {
  id: string; meetingId: string; uploaderId: string; fileName: string; blob: Blob;
  takenAt?: string; latitude?: number; longitude?: number; expenseId?: string;
  match: 'auto' | 'manual' | 'unmatched'; demo?: boolean; kind?: 'memory' | 'photobooth'
}
export const INITIAL_MEMBERS: Member[] = [
  { id: 'a', name: '예영', emoji: '🐰', account: '' },
  { id: 'b', name: '서연', emoji: '🐻', account: '' },
  { id: 'c', name: '민준', emoji: '🐱', account: '' },
  { id: 'd', name: '지우', emoji: '🐶', account: '' },
]
export const categoryLabels = { cafe: '카페', restaurant: '식당', bar: '술집', stay: '숙소', other: '기타', photobooth: '포토부스' }
export const categoryStickers = { cafe: '☕', restaurant: '🍜', bar: '🍻', stay: '🏡', other: '🌷', photobooth: '🎞' }
export function roomKey(memberIds: string[]) {
  if (!memberIds.length || new Set(memberIds).size !== memberIds.length) throw new Error('서로 다른 멤버를 선택해 주세요.')
  return JSON.stringify([...memberIds].sort())
}
export function roomForMembers(memberIds: string[]): Room {
  return { id: roomKey(memberIds), memberIds: [...memberIds].sort(), name: '', namingDismissed: false }
}
export function shouldSuggestName(room: Room, meetings: Meeting[]) {
  return !room.name && !room.namingDismissed && meetings.filter(m => m.roomId === room.id).length >= 3
}
export function displayRoomName(room: Room, members: Member[]) {
  return room.name || room.memberIds.map(id => members.find(m => m.id === id)?.name ?? '친구').join(' · ')
}
export const won = (n: number) => n.toLocaleString('ko-KR')
export const dateLabel = (date: string) => new Intl.DateTimeFormat('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Asia/Seoul' }).format(new Date(date))
