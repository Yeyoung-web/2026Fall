import { expect, it } from 'vitest'
import { roomKey, roomForMembers, shouldSuggestName, type Meeting } from './models'
it('멤버 순서에 무관하게 같은 기록방을 사용한다', () => {
  expect(roomKey(['b', 'a', 'c'])).toBe(roomKey(['c', 'b', 'a']))
  expect(roomKey(['a', 'bc'])).not.toBe(roomKey(['ab', 'c']))
  expect(roomKey(['a', 'b'])).not.toBe(roomKey(['a', 'c']))
})
it('3회째부터 이름을 제안하고 이름 또는 거절이 있으면 멈춘다', () => {
  const room = roomForMembers(['a', 'b'])
  const meetings = Array.from({ length: 3 }, (_, i) => ({ id: String(i), roomId: room.id } as Meeting))
  expect(shouldSuggestName(room, meetings.slice(0, 2))).toBe(false)
  expect(shouldSuggestName(room, meetings)).toBe(true)
  expect(shouldSuggestName({ ...room, name: '친구들' }, meetings)).toBe(false)
  expect(shouldSuggestName({ ...room, namingDismissed: true }, meetings)).toBe(false)
})
