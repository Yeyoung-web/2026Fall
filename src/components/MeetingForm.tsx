import ReceiptEditor from '../receipts/ReceiptEditor'
import type { MenuReceipt } from '../engine/receipt'
import { useState, type FormEvent } from 'react'
import { allocateExpense, type Expense, type SplitRule } from '../engine/settlement'
import { categoryLabels, type Member, type Meeting } from '../data/models'
import { classifyPlace, isPhotoBooth } from '../data/photoBooth'
import { createMeeting } from '../data/storage'
interface DraftExpense { receipt?: MenuReceipt; id: string; place: string; amount: string; at: string; payer: string; type: SplitRule['type']; selected: string[]; weights: Record<string, string>; payments: Record<string, string>; category: Expense['category'] }
const localNow = () => { const d = new Date(); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16) }
const draft = (members: Member[]): DraftExpense => ({ id: crypto.randomUUID(), place: '', amount: '', at: localNow(), payer: members[0].id, type: 'equal', selected: members.map(m => m.id), weights: {}, payments: {}, category: 'restaurant' })
export default function MeetingForm({ members, initialMemberIds, onCreated, onClose, submitMeeting }: { submitMeeting?: (ids: string[], draft: { title: string; date: string; expenses: Expense[]; emotions: string[] }) => Promise<Meeting>; members: Member[]; initialMemberIds?: string[]; onCreated: (m: Meeting) => void; onClose: () => void }) {
  const defaults = initialMemberIds ? members.filter(m => initialMemberIds.includes(m.id)) : members
  const [title, setTitle] = useState('')
  const [selected, setSelected] = useState(defaults.map(m => m.id))
  const [items, setItems] = useState<DraftExpense[]>([draft(defaults)])
  const [error, setError] = useState(''), [busy, setBusy] = useState(false)
  const active = members.filter(m => selected.includes(m.id))
  function patch(id: string, update: Partial<DraftExpense>) { setItems(items.map(e => e.id === id ? { ...e, ...update } : e)) }
  async function submit(event: FormEvent) {
    event.preventDefault(); setError(''); setBusy(true)
    try {
      if (!selected.length) throw new Error('멤버를 한 명 이상 선택해 주세요.')
      if (!title.trim()) throw new Error('만남 이름을 적어 주세요.')
      const expenses: Expense[] = items.map(e => {
        const amount = Number(e.amount)
        if (!e.place.trim() || (e.receipt ? amount < 0 : amount <= 0)) throw new Error('장소와 1원 이상의 금액을 적어 주세요.')
        const split: SplitRule = e.type === 'weights' ? { type: 'weights', weights: Object.fromEntries(active.map(m => [m.id, Number(e.weights[m.id] ?? 1)])) } :
          e.type === 'participants' || e.type === 'exclude' ? { type: e.type, memberIds: e.selected.filter(id => selected.includes(id)) } : { type: e.type }
        const expense: Expense = { id: e.id, place: e.place.trim(), amount, at: new Date(e.at).toISOString(), category: classifyPlace(e.place, e.category), split, receipt: e.receipt,
          payments: e.type === 'multiple' ? active.map(m => ({ memberId: m.id, amount: Number(e.payments[m.id] || 0) })).filter(p => p.amount > 0) : [{ memberId: e.payer, amount }] }
        allocateExpense(selected, expense)
        return expense
      })
      const meeting = await (submitMeeting ?? createMeeting)(selected, { title: title.trim(), date: expenses.map(e => e.at).sort()[0], expenses, emotions: [] })
      onCreated(meeting)
    } catch (e) { setError(e instanceof Error ? e.message : '저장하지 못했어요.'); setBusy(false) }
  }
  return <section className="dialog-backdrop"><div className="dialog" role="dialog" aria-modal="true" aria-labelledby="new-title">
    <div className="section-heading"><div><p className="eyebrow">NEW MEMORY</p><h2 id="new-title">어떤 하루였나요?</h2></div><button type="button" className="icon-button" aria-label="만남 만들기 닫기" onClick={onClose}>✕</button></div>
    <form onSubmit={submit}>
      <label>만남 이름<input required maxLength={60} placeholder="예: 떡볶이와 끝없는 수다" value={title} onChange={e => setTitle(e.target.value)} /></label>
      <fieldset><legend>함께한 친구들</legend><div className="chips">{members.map(m => <label className={`choice ${selected.includes(m.id) ? 'selected' : ''}`} key={m.id}><input type="checkbox" checked={selected.includes(m.id)} onChange={() => setSelected(selected.includes(m.id) ? selected.filter(id => id !== m.id) : [...selected, m.id])} />{m.emoji} {m.name}</label>)}</div></fieldset>
      {items.map((e, index) => <fieldset className="expense-form" key={e.id}><legend>장소 {index + 1}</legend>
        <div className="two-columns"><label>장소명<input required maxLength={60} placeholder="우리의 단골집" value={e.place} onChange={v => patch(e.id, { place: v.target.value, category: classifyPlace(v.target.value, e.category === 'photobooth' ? 'other' : e.category) })} /></label><label>장소 종류<select value={e.category} onChange={v => patch(e.id, { category: v.target.value as Expense['category'] })}>{Object.entries(categoryLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label></div>
        <div className="two-columns"><label>금액 (원)<input required type="number" min={e.receipt ? 0 : 1} step="1" value={e.amount} onChange={v => patch(e.id, { amount: v.target.value })} /></label><label>일시<input required type="datetime-local" value={e.at} onChange={v => patch(e.id, { at: v.target.value })} /></label></div>
        {isPhotoBooth(e.place) && <p className="hint">🎞 포토부스 키워드를 발견해서 자동 분류했어요.</p>}<label>어떻게 나눌까요?<select value={e.type} onChange={v => patch(e.id, { type: v.target.value as SplitRule['type'], selected: v.target.value === 'exclude' ? [] : selected })}><option value="equal">균등 분할</option><option value="participants">항목별 참여자 선택</option><option value="weights">비율 · 가중치</option><option value="exclude">특정 인원 제외</option><option value="multiple">여러 명이 나눠 결제</option></select></label>
        {e.type !== 'multiple' && <label>결제자<select value={e.payer} onChange={v => patch(e.id, { payer: v.target.value })}>{active.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}</select></label>}
        {(e.type === 'participants' || e.type === 'exclude') && <fieldset><legend>{e.type === 'exclude' ? '제외할 친구' : '부담할 친구'}</legend><div className="chips">{active.map(m => <label key={m.id} className="choice"><input type="checkbox" checked={e.selected.includes(m.id)} onChange={() => patch(e.id, { selected: e.selected.includes(m.id) ? e.selected.filter(id => id !== m.id) : [...e.selected, m.id] })} />{m.name}</label>)}</div></fieldset>}
        {e.type === 'weights' && <div className="two-columns">{active.map(m => <label key={m.id}>{m.name} 가중치<input type="number" min="0" step="1" value={e.weights[m.id] ?? '1'} onChange={v => patch(e.id, { weights: { ...e.weights, [m.id]: v.target.value } })} /></label>)}</div>}
        {e.type === 'multiple' && <><p className="hint">합계가 지출 금액과 같아야 해요. 위에서 처음으로 금액을 입력한 친구가 나머지를 부담해요.</p><div className="two-columns">{active.map(m => <label key={m.id}>{m.name} 결제액<input type="number" min="0" step="1" value={e.payments[m.id] ?? ''} onChange={v => patch(e.id, { payments: { ...e.payments, [m.id]: v.target.value } })} /></label>)}</div></>}
        <ReceiptEditor members={active} shared={!!submitMeeting} onApply={(receipt, place) => patch(e.id, { receipt, amount: String(receipt.total), ...(place && !e.place ? { place, category: classifyPlace(place, e.category) } : {}) })} />
        {e.receipt && <p className="hint">✓ 메뉴 {e.receipt.items.length}개 적용 · <button type="button" className="text-button" onClick={() => patch(e.id, { receipt: undefined })}>메뉴 정산 해제</button></p>}
        <p className="hint">원 단위 나머지는 결제자에게 귀속돼요.</p>{items.length > 1 && <button className="text-button" type="button" onClick={() => setItems(items.filter(i => i.id !== e.id))}>이 장소 삭제</button>}
      </fieldset>)}
      <button type="button" className="secondary full" onClick={() => setItems([...items, draft(active.length ? active : members)])}>＋ 장소 추가</button>
      {error && <p role="alert" className="error">{error}</p>}<button className="primary full" disabled={busy}>{busy ? '기록 중…' : '우리의 만남 기록하기'}</button>
    </form>
  </div></section>
}
