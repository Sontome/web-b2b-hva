import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../integrations/supabase/types';
import { supabase } from '../integrations/supabase/client';
import { CARE_AIRLINES, CARE_TYPES, QUEUE_STATUSES, type CareFilters, type CareTab, type CareRow, type LogRow, literalCareSearch, careDateBoundary, validateCareFilters, careCsv } from '../lib/mailCare';
type Client = SupabaseClient<Database>;
const common = 'id,salutation,customer_name,email,phone,pnr,trip1,day1,time1,trip2,day2,time2,trip3,day3,time3,trip4,day4,time4,ticket_sent_at,airline,type_care,attempts,kakao_status,kakao_response,leg_key';
export const CARE_COLUMNS = { queue: `${common},status,send_after,lease_until,smtp_started_at,kakao_done,last_error,created_at,updated_at,skip_mail`, log: `${common},queue_id,mail_status,mail_message_id,mail_error,attachments_count,queued_at,finished_at` };
function filtered(tab: CareTab, f: CareFilters, client: Client, head = false) {
  validateCareFilters(f, tab);
  let q = client.from(tab === 'queue' ? 'mail_queue_care' : 'mail_queue_care_log').select<string, CareRow>(head ? 'id' : CARE_COLUMNS[tab], { count: 'exact', head });
  if (tab === 'queue') q = q.filter('status', 'in', `(${QUEUE_STATUSES.join(',')})`);
  for (const key of ['pnr', 'customer_name', 'email'] as const) if (f[key].trim()) q = q.ilike(key, literalCareSearch(f[key]));
  for (const key of ['airline', 'type_care'] as const) if (f[key] !== 'all') q = q.eq(key, f[key]);
  if (f.status !== 'all') q = q.filter(tab === 'queue' ? 'status' : 'mail_status', 'eq', f.status);
  if (tab === 'log' && f.kakao_status.trim()) q = q.eq('kakao_status', f.kakao_status.trim());
  const time = tab === 'queue' ? 'send_after' : 'finished_at';
  if (f.from) q = q.gte(time, careDateBoundary(f.from));
  if (f.to) q = q.lt(time, careDateBoundary(f.to, true));
  return q;
}
export async function fetchCareList(tab: CareTab, f: CareFilters, page: number, size: number, signal?: AbortSignal, client: Client = supabase) {
  if (![20, 50, 100].includes(size) || page < 1) throw new Error('Phân trang không hợp lệ.');
  let q = filtered(tab, f, client).order(tab === 'queue' ? 'send_after' : 'finished_at', { ascending: tab === 'queue' }).order('id', { ascending: true }).range((page - 1) * size, page * size - 1);
  if (signal) q = q.abortSignal(signal);
  const { data, error, count } = await q;
  if (error) throw error;
  return { rows: (data ?? []) as unknown as CareRow[], total: count ?? 0 };
}
async function countCare(tab: CareTab, f: CareFilters, signal?: AbortSignal, client: Client = supabase) {
  let q = filtered(tab, f, client, true); if (signal) q = q.abortSignal(signal);
  const { error, count } = await q; if (error) throw error; return count ?? 0;
}
export async function fetchQueueCounts(signal?: AbortSignal, client: Client = supabase) {
  const f: CareFilters = { pnr:'',customer_name:'',email:'',airline:'all',type_care:'all',status:'all',kakao_status:'',from:'',to:'' };
  const [pending, sending] = await Promise.all(QUEUE_STATUSES.map(status => countCare('queue', { ...f, status }, signal, client)));
  return { pending, sending };
}
export interface CareGroup { name: string; total: number; sent: number; failed: number; uncertain: number }
export async function fetchCareReport(f: CareFilters, signal?: AbortSignal, client: Client = supabase) {
  const tasks: { key: string; filters: CareFilters }[] = ['sent','failed','uncertain','skipped_duplicate','skipped_no_email'].map(status => ({ key: status, filters: { ...f, status } }));
  for (const [field, names] of [['airline', CARE_AIRLINES], ['type_care', CARE_TYPES]] as const) for (const name of names.filter(name => f[field] === 'all' || f[field] === name)) for (const status of ['all','sent','failed','uncertain']) tasks.push({ key: `${field}:${name}:${status}`, filters: { ...f, [field]: name, status } });
  const counts: Record<string, number> = {}; let cursor = 0;
  // Four bounded workers; report counts never poll alongside the 15-second queue feed.
  await Promise.all(Array.from({ length: 4 }, async () => { while (cursor < tasks.length) { const task = tasks[cursor++]; counts[task.key] = await countCare('log', task.filters, signal, client); } }));
  const groups = (field: string, names: readonly string[]): CareGroup[] => names.filter(name => f[field as 'airline' | 'type_care'] === 'all' || f[field as 'airline' | 'type_care'] === name).map(name => ({ name, total: counts[`${field}:${name}:all`], sent: counts[`${field}:${name}:sent`], failed: counts[`${field}:${name}:failed`], uncertain: counts[`${field}:${name}:uncertain`] }));
  return { counts, airlines: groups('airline', CARE_AIRLINES), types: groups('type_care', CARE_TYPES) };
}
export async function fetchCareDetail(tab: CareTab, id: string, signal?: AbortSignal, client: Client = supabase) {
  let q = client.from(tab === 'queue' ? 'mail_queue_care' : 'mail_queue_care_log').select<string, CareRow>(CARE_COLUMNS[tab]).eq('id', id);
  if (signal) q = q.abortSignal(signal); const { data, error } = await q.maybeSingle(); if (error) throw error; return data as CareRow | null;
}
export async function exportCareReport(f: CareFilters, signal: AbortSignal, client: Client = supabase) {
  const rows: LogRow[] = []; const snapshot = new Date().toISOString();
  for (let offset = 0; ; offset += 1000) {
    if (signal.aborted) throw new DOMException('Đã hủy xuất báo cáo', 'AbortError');
    const { data, error, count } = await filtered('log', f, client).lte('finished_at', snapshot).order('finished_at', { ascending: false }).order('id', { ascending: true }).range(offset, offset + 999).abortSignal(signal);
    if (error) throw error;
    const batch = (data ?? []) as unknown as LogRow[]; rows.push(...batch);
    if (!batch.length || rows.length >= (count ?? 0)) break;
  }
  return { csv: careCsv(rows), total: rows.length };
}
