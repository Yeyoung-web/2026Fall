import { describe, it, expect } from 'vitest'
import { allocateExpense, settle, type Expense } from './settlement'
import { sampleReceipt } from '../receipts/samples'
const make = (receipt = sampleReceipt(0)): Expense => ({ id: 'e', place: 'p', at: '2025-01-01', category: 'restaurant', amount: receipt.total, payments: [{ memberId: 'a', amount: receipt.total }], split: { type: 'equal' }, receipt })
describe('영수증 배분', () => {
  it('선택한 메뉴·공용 메뉴와 할인 비율', () => {
    const e = make(); e.receipt!.items[0].selectedMemberIds = ['b']; e.receipt!.items[1].selectedMemberIds = ['a']
    expect(allocateExpense(['a','b'], e)).toEqual({ a: 6160, b: 15840 })
    expect(settle(['a','b'], [e]).transfers).toEqual([{ from: 'b', to: 'a', amount: 15840 }])
  })
  it('수량을 행 금액에 두 번 곱하지 않는다', () => expect(allocateExpense(['a','b'], make())).toEqual({ a: 11000, b: 11000 }))
  it('1원도 잃지 않고 결제자가 나머지를 부담한다', () => {
    for (let gross = 1; gross < 30; gross++) for (let discount = 0; discount <= gross; discount++) {
      const receipt = { items: [{id:'1',name:'식사',quantity:1,amount:gross,kind:'menu' as const,selectedMemberIds:['b','c']}, {id:'2',name:'할인',quantity:1,amount:-discount,kind:'discount' as const,selectedMemberIds:[]}], total:gross-discount, confirmedMemberIds:[] }
      const s = allocateExpense(['a','b','c'], make(receipt)); expect(Object.values(s).reduce((n,v)=>n+v,0)).toBe(gross-discount); expect(Object.values(s).every(v=>v>=0)).toBe(true)
    }
  })
  it('총액 불일치와 과다 할인을 거절한다', () => {const e=make();e.receipt!.items[0].amount=1;expect(()=>allocateExpense(['a','b'],e)).toThrow()})
  it('존재하지 않는 선택자를 거절한다', () => {const e=make();e.receipt!.items[0].selectedMemberIds=['x'];expect(()=>allocateExpense(['a','b'],e)).toThrow()})
  it('여러 결제자를 지원한다', () => {const e=make();e.payments=[{memberId:'a',amount:15000},{memberId:'b',amount:7000}];expect(settle(['a','b'],[e]).transfers).toEqual([{from:'b',to:'a',amount:4000}])})
})
