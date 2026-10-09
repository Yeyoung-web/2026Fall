import 'fake-indexeddb/auto'
import { beforeEach, expect, it } from 'vitest'
import { createMeeting, getPhotos, loadData, resetData, savePhotos, saveRoom, updateMeeting } from './storage'
import { shouldSuggestName } from './models'
const entry = () => ({ title: '단골 카페', date: '2026-01-01T03:00:00Z', emotions: [], expenses: [{
  id: crypto.randomUUID(), place: '카페', amount: 101, payments: [{ memberId: 'a', amount: 101 }],
  at: '2026-01-01T03:00:00Z', category: 'cafe' as const, split: { type: 'equal' as const },
}] })
beforeEach(async () => { await resetData() })
it('같은 멤버의 3회 만남을 하나의 방에 저장하고 방 이름을 보존한다', async () => {
  await createMeeting(['a', 'b'], entry())
  await createMeeting(['b', 'a'], entry())
  await createMeeting(['a', 'b'], entry())
  const data = await loadData()
  expect(data.rooms).toHaveLength(1)
  expect(data.meetings).toHaveLength(3)
  expect(shouldSuggestName(data.rooms[0], data.meetings)).toBe(true)
  await saveRoom({ ...data.rooms[0], name: '단골들' })
  expect((await loadData()).rooms[0].name).toBe('단골들')
})
it('잘못된 정산을 저장하지 않고 반응·댓글·사진 Blob을 보존한다', async () => {
  const invalid = entry(); invalid.expenses[0].payments[0].amount = 1
  await expect(createMeeting(['a', 'b'], invalid)).rejects.toThrow()
  expect((await loadData()).rooms).toHaveLength(0)
  const meeting = await createMeeting(['a', 'b'], entry())
  await updateMeeting(meeting.id, m => ({ ...m, reactions: { '♡': ['a'] }, comments: [{ id: 'comment', memberId: 'b', text: '또 만나자', at: m.date }] }))
  await savePhotos([{ id: 'photo', meetingId: meeting.id, uploaderId: 'b', fileName: 'photo.jpg', blob: new Blob(['photo bytes'], { type: 'image/jpeg' }), match: 'unmatched' }])
  const data = await loadData()
  expect(data.meetings[0].reactions['♡']).toEqual(['a'])
  expect(data.meetings[0].comments[0].text).toBe('또 만나자')
  expect(await (await getPhotos(meeting.id))[0].blob.text()).toBe('photo bytes')
  await resetData()
  expect((await loadData()).meetings).toHaveLength(0)
  expect(await getPhotos(meeting.id)).toHaveLength(0)
})
