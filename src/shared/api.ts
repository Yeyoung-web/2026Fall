import type { Expense, Balance } from '../engine/settlement'
export interface User { id: string; kind: 'guest' | 'member'; name: string; email?: string }
export interface Invitation { memberId: string; name: string; token: string }
export interface SharedSettlement {
  id: string; title: string; date: string; expiresAt: number; roomKey: string; owner: boolean; ownerMemberId: string; myMemberId: string;
  members: {id: string; name: string; emoji: string; joined: boolean; account?: string}[]; expenses: Expense[]; balances: Balance[];
  transfers: {id: string; from: string; to: string; amount: number; status: 'pending' | 'reported' | 'confirmed'}[]; archived: boolean;
  memory: null | {comments: {id: string; text: string; name: string}[]; emotions: {id: string; text: string}[]; photos: {id: string; name: string; uploader: string}[]}
}
export const apiBase = import.meta.env.VITE_API_URL ?? ''
export async function api<T>(route: string, body?: unknown): Promise<T> {
  const res = await fetch(apiBase + '/api' + route, { credentials: 'include', ...(body !== undefined ? { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(body) } : {}) })
  if (!res.headers.get('content-type')?.includes('application/json')) throw new Error('공유 정산 서버가 아직 연결되지 않았어요. 로컬 데모에서 OCR을 테스트할 수 있어요.')
  const data = await res.json(); if (!res.ok) throw new Error(data.error ?? '요청에 실패했어요.'); return data
}
export function route() { const p=new URLSearchParams(location.hash.slice(1));return {id:p.get('settlement')??'',token:p.get('invite')??''} }
export function invitationUrl(sid: string, token: string) {return location.origin + location.pathname + '#settlement=' + encodeURIComponent(sid) + '&invite=' + encodeURIComponent(token)}
