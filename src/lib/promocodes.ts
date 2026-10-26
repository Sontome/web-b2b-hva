export const PROMO_AIRLINES = { VJ: 'Vietjet', VNA: 'Vietnam Airlines', SUN: 'Sun PhuQuoc Airways', PRE: 'Air Premia' } as const;
export type PromoStatus = 'all' | 'active' | 'upcoming' | 'expired' | 'disabled';
export const PROMO_STATUSES = { active: 'Đang hiệu lực', upcoming: 'Chưa bắt đầu', expired: 'Hết hạn', disabled: 'Đã tắt' } as const;
export interface PromoForm { airline: string; code: string; enabled: boolean; start: string; end: string; note: string }
export interface PromoTiming { enabled: boolean; valid_from: string | null; valid_until: string | null }
export const PROMO_NOTICE = 'Đã lưu thay đổi. Hệ thống tìm vé cập nhật trong tối đa khoảng 30 phút.';
export const airlineName = (code: string) => PROMO_AIRLINES[code as keyof typeof PROMO_AIRLINES] ?? code;
export const canManagePromos = (role: unknown) => role === 'admin';
export function promoStatus(row: PromoTiming, now: number) {
  if (!row.enabled) return 'disabled';
  if (row.valid_until !== null && now >= Date.parse(row.valid_until)) return 'expired';
  if (row.valid_from !== null && now < Date.parse(row.valid_from)) return 'upcoming';
  return 'active';
}
const VN_OFFSET = 7 * 3600_000;
export function utcToVietnamInput(value: string | null) {
  if (!value) return '';
  const ms = Date.parse(value);
  if (!Number.isFinite(ms)) return '';
  return new Date(ms + VN_OFFSET).toISOString().slice(0, 19);
}
export function vietnamInputToUtc(value: string): string | null {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(value);
  if (!match) throw new Error('Ngày giờ không hợp lệ.');
  const [, y, m, d, h, min, sec = '00'] = match;
  const local = `${y}-${m}-${d}T${h}:${min}:${sec}`;
  const ms = Date.parse(`${local}Z`);
  if (!Number.isFinite(ms) || new Date(ms).toISOString().slice(0, 19) !== local) throw new Error('Ngày giờ không hợp lệ.');
  return new Date(ms - VN_OFFSET).toISOString();
}
export function formatPromoTime(value: string | null) {
  if (value === null) return 'Không giới hạn';
  const local = utcToVietnamInput(value);
  if (!local) return '—';
  return `${local.slice(8, 10)}/${local.slice(5, 7)}/${local.slice(0, 4)} ${local.slice(11, 16)}`;
}
export function promoPayload(form: PromoForm) {
  if (!form.airline.trim()) throw new Error('Vui lòng chọn hãng bay.');
  if (!form.code) throw new Error('Vui lòng nhập mã khuyến mãi.');
  if (/[\s\p{Cc}\p{Cf}]/u.test(form.code)) throw new Error('Mã không được chứa khoảng trắng, ký tự ẩn hoặc ký tự điều khiển.');
  const valid_from = vietnamInputToUtc(form.start);
  const valid_until = vietnamInputToUtc(form.end);
  if (valid_from && valid_until && valid_until <= valid_from) throw new Error('Kết thúc phải sau bắt đầu.');
  return { airline: form.airline, code: form.code, enabled: form.enabled, valid_from, valid_until, note: form.note || null };
}
export function promoError(error: unknown) {
  const e = error as { code?: string; message?: string } | null;
  if (e?.code === '23505') return 'Mã này đã tồn tại cho hãng đã chọn.';
  if (e?.code === '42501' || e?.code === 'PGRST301') return 'Bạn không có quyền quản lý Promocode. Vui lòng kiểm tra lại tài khoản Admin.';
  return e?.message || 'Không thể lưu thay đổi. Vui lòng thử lại.';
}
export const escapePromoSearch = (value: string) => `%${value.replace(/[\\%_]/g, '\\$&')}%`;
