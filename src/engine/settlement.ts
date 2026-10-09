/** All money is represented as integer Korean won; no UI or storage dependencies. */
export type SplitRule =
  | { type: 'equal' }
  | { type: 'participants'; memberIds: string[] }
  | { type: 'weights'; weights: Record<string, number> }
  | { type: 'exclude'; memberIds: string[] }
  | { type: 'multiple' } // Multiple payers, equal burden; payers also work with every other rule.
export interface Payment { memberId: string; amount: number }
export interface Expense {
  id: string
  amount: number
  payments: Payment[]
  at: string
  place: string
  category: 'cafe' | 'restaurant' | 'bar' | 'stay' | 'other'
  split: SplitRule
}
export interface Balance { memberId: string; paid: number; owed: number; net: number }
export interface Transfer { from: string; to: string; amount: number }

function money(value: number) {
  if (!Number.isSafeInteger(value) || value < 0) throw new Error('금액은 0 이상의 안전한 정수(원)여야 해요.')
}
function checkedAdd(a: number, b: number) {
  const sum = a + b
  money(sum)
  return sum
}
function membersValid(memberIds: string[]) {
  if (!memberIds.length || memberIds.some(id => !id) || new Set(memberIds).size !== memberIds.length)
    throw new Error('참여자 ID는 비어 있지 않고 중복되지 않아야 해요.')
}

/** Floor weighted shares with BigInt. Remainder is charged to the first payer.
 * With excluded/nonparticipating payers this intentionally adds a rounding-only burden.
 * Payment order therefore explicitly specifies the rounding owner. */
export function allocateExpense(memberIds: string[], expense: Expense): Record<string, number> {
  membersValid(memberIds)
  money(expense.amount)
  if (!expense.payments.length) throw new Error('결제자가 필요해요.')
  let paid = 0
  for (const payment of expense.payments) {
    if (!memberIds.includes(payment.memberId)) throw new Error('결제자는 참여 멤버여야 해요.')
    money(payment.amount)
    paid = checkedAdd(paid, payment.amount)
  }
  if (paid !== expense.amount) throw new Error('결제 금액의 합이 지출 금액과 같아야 해요.')
  const shares = Object.fromEntries(memberIds.map(id => [id, 0]))
  let weights: Record<string, number>
  const rule = expense.split
  if (rule.type === 'weights') {
    if (Object.keys(rule.weights).some(id => !memberIds.includes(id))) throw new Error('알 수 없는 참여자예요.')
    weights = Object.fromEntries(memberIds.map(id => [id, rule.weights[id] ?? 0]))
    if (Object.values(weights).some(w => !Number.isSafeInteger(w) || w < 0))
      throw new Error('가중치는 0 이상의 정수로 입력해 주세요.')
  } else {
    if ((rule.type === 'participants' || rule.type === 'exclude') &&
      (new Set(rule.memberIds).size !== rule.memberIds.length || rule.memberIds.some(id => !memberIds.includes(id))))
      throw new Error('분배 대상이 올바르지 않아요.')
    weights = Object.fromEntries(memberIds.map(id => [id,
      rule.type === 'participants' ? Number(rule.memberIds.includes(id)) :
      rule.type === 'exclude' ? Number(!rule.memberIds.includes(id)) : 1]))
  }
  const sum = Object.values(weights).reduce((acc, w) => acc + BigInt(w), 0n)
  if (sum === 0n) throw new Error('부담할 참여자를 한 명 이상 선택해 주세요.')
  let allocated = 0
  for (const id of memberIds) {
    shares[id] = Number(BigInt(expense.amount) * BigInt(weights[id]) / sum)
    allocated += shares[id]
  }
  shares[expense.payments[0].memberId] += expense.amount - allocated
  return shares
}

export function calculateBalances(memberIds: string[], expenses: Expense[]): Balance[] {
  membersValid(memberIds)
  const balances = memberIds.map(memberId => ({ memberId, paid: 0, owed: 0, net: 0 }))
  let total = 0
  for (const expense of expenses) {
    total = checkedAdd(total, expense.amount)
    const shares = allocateExpense(memberIds, expense)
    for (const b of balances) {
      b.owed = checkedAdd(b.owed, shares[b.memberId])
      for (const p of expense.payments.filter(p => p.memberId === b.memberId)) b.paid = checkedAdd(b.paid, p.amount)
      b.net = b.paid - b.owed
    }
  }
  return balances
}

/** Greedy gives an upper bound (<= n-1), but is not always globally minimal.
 * Exact cancellation search improves it; pruning uses nonzero/2 and debtor/creditor
 * lower bounds. Exponential worst case, appropriate for small friend groups.
 * A search solution may route money through an intermediary to minimize count. */
export function minimizeTransfers(balances: Pick<Balance, 'memberId' | 'net'>[]): Transfer[] {
  if (new Set(balances.map(b => b.memberId)).size !== balances.length ||
      balances.some(b => !b.memberId || !Number.isSafeInteger(b.net))) throw new Error('순액이 올바르지 않아요.')
  if (balances.reduce((sum, b) => sum + BigInt(b.net), 0n) !== 0n) throw new Error('순액의 합은 0원이어야 해요.')
  const nodes = balances.filter(b => b.net !== 0).map(b => ({ ...b }))
    .sort((a, b) => a.net - b.net || a.memberId.localeCompare(b.memberId))
  const greedy = nodes.map(b => ({ ...b }))
  let best: Transfer[] = []
  let d = 0
  let c = greedy.findIndex(b => b.net > 0)
  while (d < greedy.length && greedy[d].net < 0 && c >= 0 && c < greedy.length) {
    const amount = Math.min(-greedy[d].net, greedy[c].net)
    best.push({ from: greedy[d].memberId, to: greedy[c].memberId, amount })
    greedy[d].net += amount
    greedy[c].net -= amount
    if (!greedy[d].net) d++
    if (!greedy[c].net) c++
  }
  const values = nodes.map(b => b.net)
  const memo = new Map<string, number>()
  function search(path: Transfer[]) {
    const nonzero = values.filter(Boolean)
    if (!nonzero.length) { if (path.length < best.length) best = [...path]; return }
    const lower = Math.max(nonzero.filter(v => v < 0).length, nonzero.filter(v => v > 0).length)
    if (path.length + lower >= best.length) return
    const key = values.join(',')
    if ((memo.get(key) ?? Infinity) <= path.length) return
    memo.set(key, path.length)
    const i = values.findIndex(v => v !== 0)
    const value = values[i]
    const tried = new Set<number>()
    for (let j = i + 1; j < values.length; j++) {
      if ((value < 0) === (values[j] < 0) || values[j] === 0 || tried.has(values[j])) continue
      tried.add(values[j])
      const other = values[j]
      values[i] = 0
      values[j] = other + value
      path.push({ from: nodes[value < 0 ? i : j].memberId, to: nodes[value < 0 ? j : i].memberId, amount: Math.abs(value) })
      search(path)
      path.pop()
      values[i] = value
      values[j] = other
      if (other + value === 0) break
    }
  }
  search([])
  return best
}

export function settle(memberIds: string[], expenses: Expense[]) {
  const balances = calculateBalances(memberIds, expenses)
  return { balances, transfers: minimizeTransfers(balances) }
}
