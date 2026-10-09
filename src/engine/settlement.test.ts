import { describe, expect, it } from 'vitest'
import { allocateExpense, calculateBalances, minimizeTransfers, settle, type Expense } from './settlement'
const ids = ['A', 'B', 'C', 'D']
const expense = (amount: number, payer = 'A', split: Expense['split'] = { type: 'equal' }): Expense => ({
  id: crypto.randomUUID(), amount, payments: [{ memberId: payer, amount }],
  at: '2026-01-01T12:00:00+09:00', place: '카페', category: 'cafe', split,
})
function verify(balances: { memberId: string; net: number }[]) {
  const transfers = minimizeTransfers(balances)
  const remaining = Object.fromEntries(balances.map(b => [b.memberId, b.net]))
  for (const t of transfers) { expect(t.amount).toBeGreaterThan(0); remaining[t.from] += t.amount; remaining[t.to] -= t.amount }
  expect(Object.values(remaining).every(n => n === 0)).toBe(true)
  expect(transfers.length).toBeLessThanOrEqual(Math.max(0, balances.length - 1))
  return transfers
}
describe('원 단위 분배', () => {
  it('요청한 4명 예시를 정확히 정산한다', () => {
    const result = settle(ids, [expense(400000), expense(120000, 'B'), expense(40000, 'C')])
    expect(result.balances.map(b => b.owed)).toEqual([140000, 140000, 140000, 140000])
    expect(result.transfers).toEqual([
      { from: 'D', to: 'A', amount: 140000 }, { from: 'C', to: 'A', amount: 100000 }, { from: 'B', to: 'A', amount: 20000 },
    ])
  })
  it('균등 분할 나머지는 결제자가 부담한다', () => {
    expect(allocateExpense(ids, expense(101, 'B'))).toEqual({ A: 25, B: 26, C: 25, D: 25 })
  })
  it('항목별 참여자를 선택한다', () => {
    expect(allocateExpense(ids, expense(101, 'A', { type: 'participants', memberIds: ['A', 'C'] }))).toEqual({ A: 51, B: 0, C: 50, D: 0 })
  })
  it('특정 멤버를 제외한다', () => {
    expect(allocateExpense(ids, expense(100, 'A', { type: 'exclude', memberIds: ['D'] }))).toEqual({ A: 34, B: 33, C: 33, D: 0 })
  })
  it('제외된 결제자에게도 원 단위 나머지만 귀속한다', () => {
    expect(allocateExpense(ids, expense(101, 'D', { type: 'exclude', memberIds: ['D'] }))).toEqual({ A: 33, B: 33, C: 33, D: 2 })
  })
  it('비율로 분배한다', () => {
    expect(allocateExpense(ids, expense(101, 'B', { type: 'weights', weights: { A: 3, B: 1 } }))).toEqual({ A: 75, B: 26, C: 0, D: 0 })
  })
  it('여러 결제자의 낸 돈을 합산하고 첫 결제자에게 나머지를 준다', () => {
    const e = { ...expense(103, 'A', { type: 'multiple' }), payments: [{ memberId: 'B', amount: 60 }, { memberId: 'C', amount: 43 }] }
    expect(calculateBalances(ids, [e])).toEqual([
      { memberId: 'A', paid: 0, owed: 25, net: -25 }, { memberId: 'B', paid: 60, owed: 28, net: 32 },
      { memberId: 'C', paid: 43, owed: 25, net: 18 }, { memberId: 'D', paid: 0, owed: 25, net: -25 },
    ])
  })
  it('잘못된 금액, 결제 합, 분배 규칙을 거부한다', () => {
    for (const amount of [-1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1]) expect(() => allocateExpense(ids, expense(amount))).toThrow()
    expect(() => allocateExpense(ids, { ...expense(100), payments: [{ memberId: 'A', amount: 99 }] })).toThrow()
    expect(() => allocateExpense(ids, expense(100, 'X'))).toThrow()
    expect(() => allocateExpense(ids, expense(100, 'A', { type: 'participants', memberIds: [] }))).toThrow()
    expect(() => allocateExpense(ids, expense(100, 'A', { type: 'weights', weights: { A: 0.5 } }))).toThrow()
    expect(() => allocateExpense(['A', 'A'], expense(100))).toThrow()
  })
  it('큰 정수와 다양한 금액에서도 합계가 보존된다', () => {
    for (const amount of [0, 1, 2, 3, 9999, Number.MAX_SAFE_INTEGER]) {
      const shares = allocateExpense(ids, expense(amount, 'C', { type: 'weights', weights: { A: 7, B: 3, C: 1, D: 2 } }))
      expect(Object.values(shares).reduce((a, b) => a + BigInt(b), 0n)).toBe(BigInt(amount))
    }
  })
  it('누적 금액 오버플로를 거부한다', () => {
    expect(() => calculateBalances(ids, [expense(Number.MAX_SAFE_INTEGER), expense(1)])).toThrow()
  })
})
describe('최소 송금', () => {
  it('이미 정산되었거나 혼자인 경우 송금이 없다', () => {
    expect(settle(['A'], [expense(100)]).transfers).toEqual([])
    expect(settle(ids, []).transfers).toEqual([])
  })
  it('그리디가 놓치는 독립적인 0원 그룹을 찾아 최소화한다', () => {
    const b = [-8, -7, -5, 10, 10].map((net, i) => ({ memberId: String(i), net }))
    // Three exact pairs need 3 transfers; greedy consumes +4 then +6 for -10 and needs 4.
    const partition = [-10, -6, -4, 4, 6, 10].map((net, i) => ({ memberId: String(i), net }))
    expect(verify(partition)).toHaveLength(3)
    expect(verify(b)).toHaveLength(4)
  })
  it('모든 작은 순액 조합에서 독립적인 부분집합 최적값과 일치한다', () => {
    // Independent oracle: minimum transfers = n - maximum zero-sum groups.
    function oracle(v: number[]): number {
      const n = v.length, groups = new Map<number, number>([[0, 0]])
      const full = (1 << n) - 1
      for (let mask = 1; mask <= full; mask++) {
        let best = -Infinity
        for (let sub = mask; sub > 0; sub = (sub - 1) & mask) {
          const sum = v.reduce((s, x, i) => s + ((sub & (1 << i)) ? x : 0), 0)
          if (sum === 0) best = Math.max(best, 1 + (groups.get(mask ^ sub) ?? -Infinity))
        }
        groups.set(mask, best)
      }
      return n - groups.get(full)!
    }
    for (let a = -3; a <= 3; a++) for (let b = -3; b <= 3; b++) for (let c = -3; c <= 3; c++) {
      const v = [a, b, c, -a - b - c].filter(Boolean)
      const bs = v.map((net, i) => ({ memberId: String(i), net }))
      expect(verify(bs).length).toBe(oracle(v))
    }
  })
  it('합계가 0이 아닌 순액을 거부한다', () => {
    expect(() => minimizeTransfers([{ memberId: 'A', net: 1 }])).toThrow()
  })
})
