import { allocateExpense, type Expense } from './settlement.ts'
export interface ReceiptItem { id: string; name: string; quantity: number; amount: number; kind: 'menu' | 'discount'; selectedMemberIds: string[] }
export interface MenuReceipt { items: ReceiptItem[]; total: number; confirmedMemberIds: string[] }
/** Amount is the entire row total, including quantity. Discounts use gross burden as weights. */
export function allocateReceipt(ids: string[], expense: Expense): Record<string, number> {
  const receipt = expense.receipt!
  if (!receipt.items.length || receipt.items.length > 100 || new Set(receipt.items.map(i => i.id)).size !== receipt.items.length) throw new Error('메뉴 행을 확인해 주세요.')
  if (!Array.isArray(receipt.confirmedMemberIds) || receipt.confirmedMemberIds.some(id => !ids.includes(id))) throw new Error('확정 멤버가 올바르지 않아요.')
  const gross = Object.fromEntries(ids.map(id => [id, 0]))
  let total = 0, discount = 0
  for (const item of receipt.items) {
    if (!item.id || !item.name.trim() || item.name.length > 80 || !Number.isSafeInteger(item.quantity) || item.quantity < 1 || !Number.isSafeInteger(item.amount) || !Array.isArray(item.selectedMemberIds) || new Set(item.selectedMemberIds).size !== item.selectedMemberIds.length || item.selectedMemberIds.some(id => !ids.includes(id))) throw new Error('메뉴 이름·수량·금액·참여자를 확인해 주세요.')
    if (item.kind === 'discount') { if (item.amount > 0) throw new Error('할인은 음수로 입력해 주세요.'); discount -= item.amount }
    else if (item.kind === 'menu' && item.amount >= 0) {
      total += item.amount
      const shares = allocateExpense(ids, { ...expense, receipt: undefined, amount: item.amount, payments: [{ memberId: expense.payments[0].memberId, amount: item.amount }], split: { type: 'participants', memberIds: item.selectedMemberIds.length ? item.selectedMemberIds : ids } })
      for (const id of ids) gross[id] += shares[id]
    } else throw new Error('메뉴 금액은 0원 이상이어야 해요.')
    if (!Number.isSafeInteger(total) || !Number.isSafeInteger(discount)) throw new Error('금액이 너무 커요.')
  }
  if (discount > total || receipt.total !== total - discount || expense.amount !== receipt.total) throw new Error('영수증 총액과 메뉴 합계가 달라요.')
  if (!total) return gross
  return allocateExpense(ids, { ...expense, receipt: undefined, split: { type: 'weights', weights: gross } })
}
