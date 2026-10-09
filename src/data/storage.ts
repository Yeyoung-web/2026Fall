import { openDB, type DBSchema } from 'idb'
import { INITIAL_MEMBERS, roomForMembers, type Member, type Room, type Meeting, type Photo } from './models'
import { settle } from '../engine/settlement'
interface ReceiptoryDB extends DBSchema {
  members: { key: string; value: Member }
  rooms: { key: string; value: Room }
  meetings: { key: string; value: Meeting }
  photos: { key: string; value: Photo; indexes: { 'by-meeting': string } }
}
const dbPromise = () => openDB<ReceiptoryDB>('receiptory', 1, {
  upgrade(db) {
    db.createObjectStore('members', { keyPath: 'id' })
    db.createObjectStore('rooms', { keyPath: 'id' })
    db.createObjectStore('meetings', { keyPath: 'id' })
    db.createObjectStore('photos', { keyPath: 'id' }).createIndex('by-meeting', 'meetingId')
  },
})
export async function loadData() {
  const db = await dbPromise()
  const tx = db.transaction(['members', 'rooms', 'meetings'], 'readwrite')
  if (await tx.objectStore('members').count() === 0)
    for (const member of INITIAL_MEMBERS) await tx.objectStore('members').put(member)
  const members = await tx.objectStore('members').getAll()
  const rooms = await tx.objectStore('rooms').getAll()
  const meetings = await tx.objectStore('meetings').getAll()
  await tx.done
  db.close()
  return { members, rooms, meetings: meetings.sort((a, b) => b.date.localeCompare(a.date)) }
}
export async function createMeeting(memberIds: string[], meeting: Omit<Meeting, 'id' | 'roomId' | 'paidMemberIds' | 'reactions' | 'comments'>) {
  settle(memberIds, meeting.expenses) // Validate before any write.
  const room = roomForMembers(memberIds)
  const entry: Meeting = { ...meeting, id: crypto.randomUUID(), roomId: room.id, paidMemberIds: [], reactions: {}, comments: [] }
  const db = await dbPromise()
  const tx = db.transaction(['rooms', 'meetings'], 'readwrite')
  if (!await tx.objectStore('rooms').get(room.id)) await tx.objectStore('rooms').put(room)
  await tx.objectStore('meetings').put(entry)
  await tx.done
  db.close()
  return entry
}
export async function saveRoom(room: Room) { const db = await dbPromise(); await db.put('rooms', room); db.close() }
export async function saveMember(member: Member) { const db = await dbPromise(); await db.put('members', member); db.close() }
export async function updateMeeting(id: string, update: (meeting: Meeting) => Meeting) {
  const db = await dbPromise()
  const tx = db.transaction('meetings', 'readwrite')
  const current = await tx.store.get(id)
  if (!current) throw new Error('만남을 찾을 수 없어요.')
  await tx.store.put(update(current))
  await tx.done
  db.close()
}
export async function getPhotos(meetingId: string) { const db = await dbPromise(); const result = await db.getAllFromIndex('photos', 'by-meeting', meetingId); db.close(); return result }
export async function savePhotos(photos: Photo[]) {
  const db = await dbPromise(), tx = db.transaction('photos', 'readwrite')
  for (const photo of photos) await tx.store.put(photo)
  await tx.done
  db.close()
}
export async function resetData() {
  const db = await dbPromise(), tx = db.transaction(['members', 'rooms', 'meetings', 'photos'], 'readwrite')
  for (const name of ['members', 'rooms', 'meetings', 'photos'] as const) await tx.objectStore(name).clear()
  for (const member of INITIAL_MEMBERS) await tx.objectStore('members').put(member)
  await tx.done
  db.close()
}
export async function importDemo(meetings: Meeting[], photos: Photo[]) {
  const db = await dbPromise(), tx = db.transaction(['members', 'rooms', 'meetings', 'photos'], 'readwrite')
  for (const m of INITIAL_MEMBERS) if (!await tx.objectStore('members').get(m.id)) await tx.objectStore('members').put(m)
  const room = roomForMembers(INITIAL_MEMBERS.map(m => m.id))
  if (!await tx.objectStore('rooms').get(room.id)) await tx.objectStore('rooms').put({ ...room, name: '우리의 사계절' })
  for (const m of meetings) if (!await tx.objectStore('meetings').get(m.id)) await tx.objectStore('meetings').put(m)
  for (const p of photos) if (!await tx.objectStore('photos').get(p.id)) await tx.objectStore('photos').put(p)
  await tx.done
  db.close()
}
export async function getPhotosForMeetings(meetingIds: string[]) {
  const db = await dbPromise()
  const photos = (await Promise.all(meetingIds.map(id => db.getAllFromIndex('photos', 'by-meeting', id)))).flat()
  db.close()
  return photos
}
