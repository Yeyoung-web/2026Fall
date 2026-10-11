import type { MenuReceipt, ReceiptItem } from '../engine/receipt'
export function parseReceipt(raw: string) {
  const items: ReceiptItem[] = [], ignoredLines: string[] = [], warnings: string[] = ['OCR은 틀릴 수 있어요. 메뉴·수량·금액을 직접 확인해 주세요.']
  let total: number | undefined
  for (const original of raw.split(/\r?\n/)) {
    const line = original.normalize('NFKC').replace(/[−–]/g, '-').trim()
    if (!line) continue
    const last = line.match(/(-?\d[\d,]*)\s*(?:원|KRW)?\s*$/i)
    if (!last) { ignoredLines.push(original); continue }
    const amount = Number(last[1].replaceAll(',', ''))
    if (/^(?:총\s*(?:액|합계)|합\s*계|결제\s*금액|TOTAL)\s*[:：]?\s*/i.test(line)) { total = amount; continue }
    if (/사업자|전화|TEL|주소|카드|승인|부가세|과세|면세|VAT|SUBTOTAL|소계|\d{2,4}[-/.]\d{1,2}[-/.]\d{1,2}/i.test(line)) { ignoredLines.push(original); continue }
    let name = line.slice(0, last.index).trim().replace(/[₩￦]$/, '').trim()
    let quantity = 1
    const qty = name.match(/\s+(\d+)\s*$/)
    if (qty) { quantity = Number(qty[1]); name = name.slice(0, qty.index).trim(); name = name.replace(/\s+\d[\d,]*$/, '').trim() }
    const discount = amount < 0 || /할인|쿠폰|DISCOUNT/i.test(name)
    if (!name || !Number.isSafeInteger(amount) || !quantity) { ignoredLines.push(original); continue }
    items.push({ id: `ocr-${items.length}`, name, quantity, amount: discount ? -Math.abs(amount) : amount, kind: discount ? 'discount' : 'menu', selectedMemberIds: [] })
  }
  const sum = items.reduce((n, i) => n + i.amount, 0)
  if (total === undefined) { total = Math.max(0, sum); warnings.push('총액을 찾지 못했어요. 영수증 총액을 직접 입력해 주세요.') }
  if (sum !== total) warnings.push('메뉴 합계와 영수증 총액이 달라요.')
  return { receipt: { items, total, confirmedMemberIds: [] } as MenuReceipt, warnings, ignoredLines }
}
