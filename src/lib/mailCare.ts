import type { Database } from '../integrations/supabase/types';
export type CareTab = 'queue' | 'log';
export type QueueRow = Database['public']['Tables']['mail_queue_care']['Row'];
export type LogRow = Database['public']['Tables']['mail_queue_care_log']['Row'];
export type CareRow = QueueRow | LogRow;
export const CARE_AIRLINES = ['VJ', 'VNA', 'SUN', 'SPA', 'PRE'] as const;
export const CARE_TYPES = ['AT12H', 'BF24H', 'AT24H'] as const;
export const QUEUE_STATUSES = ['pending', 'sending'] as const;
export const LOG_STATUSES = ['sent', 'failed', 'uncertain', 'skipped_duplicate', 'skipped_no_email'] as const;
export const CARE_REFRESH_MS = 15000;
export const careAdmin = (role: unknown) => role === 'admin';
export const STATUS_LABELS: Record<string, string> = { pending: 'Chờ gửi', sending: 'Đang gửi', sent: 'Thành công', failed: 'Thất bại', uncertain: 'Không xác định', skipped_duplicate: 'Bỏ qua do trùng', skipped_no_email: 'Không có email' };
export interface CareFilters { pnr: string; customer_name: string; email: string; airline: string; type_care: string; status: string; kakao_status: string; from: string; to: string }
export const vietnamDay = (offset = 0, now = Date.now()) => new Date(now + 7 * 3600000 + offset * 86400000).toISOString().slice(0, 10);
export const initialCareFilters = (tab: CareTab): CareFilters => ({ pnr: '', customer_name: '', email: '', airline: 'all', type_care: 'all', status: 'all', kakao_status: '', from: tab === 'log' ? vietnamDay(-29) : '', to: tab === 'log' ? vietnamDay() : '' });
export function careDateBoundary(day: string, nextDay = false) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) throw new Error('Ngày không hợp lệ.');
  const date = new Date(`${day}T00:00:00+07:00`);
  if (!Number.isFinite(date.getTime()) || vietnamDay(0, date.getTime()) !== day) throw new Error('Ngày không hợp lệ.');
  return new Date(date.getTime() + (nextDay ? 86400000 : 0)).toISOString();
}
export function validateCareFilters(f: CareFilters, tab: CareTab) {
  if (tab === 'log' && (!f.from || !f.to)) throw new Error('Vui lòng chọn đủ khoảng ngày báo cáo.');
  if (f.from) careDateBoundary(f.from);
  if (f.to) careDateBoundary(f.to);
  if (f.from && f.to && f.from > f.to) throw new Error('Ngày kết thúc phải từ ngày bắt đầu trở đi.');
}
export const literalCareSearch = (text: string) => `%${text.trim().replace(/[\\%_]/g, '\\$&')}%`;
export function careTime(value: string | null | undefined) { if (!value) return '—'; const date = new Date(value); return Number.isFinite(date.getTime()) ? new Intl.DateTimeFormat('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', dateStyle: 'short', timeStyle: 'medium' }).format(date) : '—'; }
export function careSegments(row: CareRow) {
  return [1, 2, 3, 4].flatMap(n => { const trip = row[`trip${n}` as 'trip1']; const day = row[`day${n}` as 'day1']; const time = row[`time${n}` as 'time1']; return trip || day || time ? [{ n, trip, day, time }] : []; });
}
export const careSuccessRate = (sent: number, total: number) => total ? Math.round(sent / total * 1000) / 10 : 0;
export function csvCell(value: unknown) {
  let text = value == null ? '' : String(value);
  if (/^[\s]*[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}
export const CARE_CSV_COLUMNS = ['pnr', 'salutation', 'customer_name', 'email', 'phone', 'airline', 'type_care', 'trip1', 'day1', 'time1', 'trip2', 'day2', 'time2', 'trip3', 'day3', 'time3', 'trip4', 'day4', 'time4', 'ticket_sent_at', 'mail_status', 'mail_message_id', 'mail_error', 'attachments_count', 'kakao_status', 'kakao_response', 'attempts', 'queued_at', 'finished_at', 'leg_key'] as const;
export function careCsv(rows: LogRow[]) { return '\ufeff' + [CARE_CSV_COLUMNS.map(csvCell).join(','), ...rows.map(row => CARE_CSV_COLUMNS.map(key => csvCell(key === 'kakao_response' ? JSON.stringify(row[key] ?? '') : key.endsWith('_at') ? careTime(row[key] as string | null) : row[key])).join(','))].join('\r\n'); }
