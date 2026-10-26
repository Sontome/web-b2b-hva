import { supabase } from '@/integrations/supabase/client';
import { escapePromoSearch, type PromoStatus, type promoPayload } from '@/lib/promocodes';
import type { Database } from '@/integrations/supabase/types';
export type PromoRow = Database['public']['Tables']['airline_promo_codes']['Row'];
export interface PromoFilters { airline: string; status: PromoStatus; search: string; page: number }
export const PROMO_PAGE_SIZE = 20;
const COLUMNS = 'id,airline,code,enabled,valid_from,valid_until,note,created_at,updated_at' as const;
export async function fetchPromos(filters: PromoFilters, signal?: AbortSignal, client = supabase, now = new Date().toISOString()) {
  let query = client.from('airline_promo_codes').select(COLUMNS, { count: 'exact' });
  if (filters.airline !== 'all') query = query.eq('airline', filters.airline);
  // Search input is passed as a single filter value, never interpolated in an OR expression.
  if (filters.search) query = query.ilike('code', escapePromoSearch(filters.search));
  switch (filters.status) {
    case 'disabled': query = query.eq('enabled', false); break;
    case 'expired': query = query.eq('enabled', true).lte('valid_until', now); break;
    case 'upcoming': query = query.eq('enabled', true).or(`valid_until.is.null,valid_until.gt.${now}`).gt('valid_from', now); break;
    case 'active': query = query.eq('enabled', true).or(`valid_until.is.null,valid_until.gt.${now}`).or(`valid_from.is.null,valid_from.lte.${now}`); break;
  }
  const offset = (filters.page - 1) * PROMO_PAGE_SIZE;
  query = query.order('airline').order('code').order('id').range(offset, offset + PROMO_PAGE_SIZE - 1);
  if (signal) query = query.abortSignal(signal);
  const { data, count, error } = await query;
  if (error) throw error;
  if (count === null) throw new Error('Không tải được tổng số kết quả.');
  return { rows: data ?? [], total: count, now: Date.parse(now) };
}
export type PromoWrite = ReturnType<typeof promoPayload>;
export async function savePromo(id: string | null, payload: PromoWrite, client = supabase) {
  const query = id ? client.from('airline_promo_codes').update(payload).eq('id', id) : client.from('airline_promo_codes').insert(payload);
  const { data, error } = await query.select(COLUMNS).single();
  if (error) throw error;
  if (!data) throw new Error('Không thể xác nhận thay đổi đã lưu.');
  return data;
}
export async function togglePromo(id: string, enabled: boolean, client = supabase) {
  const { data, error } = await client.from('airline_promo_codes').update({ enabled }).eq('id', id).select(COLUMNS).single();
  if (error) throw error;
  return data;
}
export async function deletePromo(id: string, client = supabase) {
  const { data, error } = await client.from('airline_promo_codes').delete().eq('id', id).select('id').single();
  if (error) throw error;
  return data;
}
