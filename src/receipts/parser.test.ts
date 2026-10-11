import { it, expect } from 'vitest'
import { parseReceipt } from './parser'
import { receiptSamples } from './samples'
it('메뉴명, 수량, 행 금액, 할인, 총액을 읽는다', () => { const r=parseReceipt(receiptSamples[0].text);expect(r.receipt.total).toBe(22000);expect(r.receipt.items[0]).toMatchObject({name:'떡볶이',quantity:2,amount:16000});expect(r.receipt.items[3].amount).toBe(-3000) })
it('단가와 수량 열도 처리한다', () => expect(parseReceipt('Coffee 4,000 2 8,000\nTOTAL 8,000').receipt.items[0]).toMatchObject({name:'Coffee',quantity:2,amount:8000}))
it('메타데이터와 잘못 읽힌 숫자를 제외한다', () => expect(parseReceipt('TEL 02-123-4567\n2025-01-01\n커피 3O0O\n합계 3000').receipt.items).toHaveLength(0))
it('합계 불일치를 알린다', () => expect(parseReceipt('음료 1 3000\n합계 4000').warnings).toContain('메뉴 합계와 영수증 총액이 달라요.'))
it('총액이 없으면 합계와 경고를 제공한다', () => {const r=parseReceipt('Tea 5000');expect(r.receipt.total).toBe(5000);expect(r.warnings).toHaveLength(2)})
