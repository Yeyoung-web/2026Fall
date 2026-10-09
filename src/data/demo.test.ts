import { expect, it } from 'vitest'
import { buildDemo } from './demo'
import { INITIAL_MEMBERS } from './models'
import { settle } from '../engine/settlement'
import { matchPhoto } from './photoMatching'
import 'fake-indexeddb/auto'
import { importDemo, loadData, resetData, createMeeting, getPhotos } from './storage'
it('9번의 만남, 항목 2–5건, 감정, 사진 GPS와 다섯 분배 규칙이 준비된다', () => {
  const demo = buildDemo()
  expect(demo.meetings).toHaveLength(9)
  const rules = new Set<string>()
  for (const meeting of demo.meetings) {
    expect(meeting.expenses.length).toBeGreaterThanOrEqual(2)
    expect(meeting.expenses.length).toBeLessThanOrEqual(5)
    expect(meeting.emotions.length).toBeGreaterThan(0)
    const { balances } = settle(INITIAL_MEMBERS.map(m => m.id), meeting.expenses)
    expect(balances.reduce((sum, b) => sum + b.net, 0)).toBe(0)
    meeting.expenses.forEach(e => rules.add(e.split.type))
    for (const photo of demo.photos.filter(p => p.meetingId === meeting.id)) expect(matchPhoto(photo, meeting.expenses)).toBe(photo.expenseId)
  }
  expect(rules.size).toBe(5)
  expect(demo.photos.filter(p => p.kind === 'photobooth')).toHaveLength(4)
  expect(demo.meetings.filter(m => m.expenses.some(e => e.category === 'photobooth'))).toHaveLength(4)
})
it('데모는 중복되지 않고 기존 사용자 만남과 사진을 보존한다', async () => {
  await resetData()
  const own = await createMeeting(['a', 'b'], { title: '내 기록', date: '2026-01-01', expenses: [], emotions: [] })
  const demo = buildDemo()
  await importDemo(demo.meetings, demo.photos)
  await importDemo(demo.meetings, demo.photos)
  expect((await loadData()).meetings).toHaveLength(10)
  expect((await loadData()).meetings.some(m => m.id === own.id)).toBe(true)
  expect(await getPhotos(demo.meetings[0].id)).toHaveLength(demo.photos.filter(p => p.meetingId === demo.meetings[0].id).length)
})
