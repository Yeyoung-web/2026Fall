import { settle, type Expense } from './engine/settlement'
const sample: Expense[] = [400000, 120000, 40000].map((amount, i) => ({
  id: String(i), amount, payments: [{ memberId: ['A', 'B', 'C'][i], amount }],
  at: '2026-10-09T12:00:00+09:00', place: '우리의 여행', category: 'other', split: { type: 'equal' },
}))
export default function App() {
  const result = settle(['A', 'B', 'C', 'D'], sample)
  return <main><p>RECEIPTORY</p><h1>정산하면,<br />추억이 된다.</h1><p>정산 엔진 준비 완료</p>
    {result.transfers.map(t => <p key={t.from}>{t.from} → {t.to} {t.amount.toLocaleString('ko-KR')}원</p>)}
  </main>
}
