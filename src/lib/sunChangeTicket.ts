// Pure helpers for the SunPQ change-ticket flow (no React, no network).
/* eslint-disable @typescript-eslint/no-explicit-any */

export type SunSeg = Record<string, any>;

export interface SunDT {
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
}

const pad = (n: string | number) => String(n).padStart(2, '0');

/** Parse local date/time strings from the API without timezone conversion. */
export function parseSunDateTime(raw: unknown): SunDT | null {
  if (typeof raw !== 'string' || !raw.trim()) return null;
  const s = raw.trim();
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T\s]+(\d{1,2}):(\d{2}))?/);
  if (m) return { date: `${m[1]}-${pad(m[2])}-${pad(m[3])}`, time: m[4] ? `${pad(m[4])}:${m[5]}` : '' };
  m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:[T\s]+(\d{1,2}):(\d{2}))?/);
  if (m) return { date: `${m[3]}-${pad(m[2])}-${pad(m[1])}`, time: m[4] ? `${pad(m[4])}:${m[5]}` : '' };
  // Broken form like "19 00:15:00/12/2026"
  m = s.match(/^(\d{1,2})\s+(\d{1,2}):(\d{2})(?::\d{2})?\/(\d{1,2})\/(\d{4})$/);
  if (m) return { date: `${m[5]}-${pad(m[4])}-${pad(m[1])}`, time: `${pad(m[2])}:${m[3]}` };
  return null;
}

export interface SunSegView {
  from: string;
  to: string;
  flight: string;
  depDate: string;
  depTime: string;
  arrDate: string;
  arrTime: string;
  bookingClass: string;
  status: string;
}

export function segView(seg: SunSeg): SunSegView {
  const dep =
    parseSunDateTime(seg?.departure_info?.datetime) ||
    parseSunDateTime(seg?.departure_datetime) ||
    parseSunDateTime(seg?.departure_time) ||
    parseSunDateTime(seg?.flight_date);
  const arr =
    parseSunDateTime(seg?.arrival_info?.datetime) ||
    parseSunDateTime(seg?.arrival_datetime) ||
    parseSunDateTime(seg?.arrival_time);
  const carrier = seg?.carrier ?? '';
  const num = seg?.flight_number ?? '';
  return {
    from: seg?.departure_info?.code || seg?.departure || seg?.from || '',
    to: seg?.arrival_info?.code || seg?.arrival || seg?.to || '',
    flight: `${carrier}${num}`,
    depDate: dep?.date || '',
    depTime: dep?.time || '',
    arrDate: arr?.date || '',
    arrTime: arr?.time || '',
    bookingClass: seg?.booking_class || '',
    status: seg?.flight_status || '',
  };
}

export const segLabel = (seg: SunSeg) => {
  const v = segView(seg);
  return `${v.from}-${v.to} ${v.flight} ${v.depDate}${v.depTime ? ' ' + v.depTime : ''}`.trim();
};

export const isValidSeg = (seg: unknown): seg is SunSeg =>
  !!seg && typeof seg === 'object' && !Array.isArray(seg);

export interface SunCheckData {
  pnr: string;
  status?: string;
  currency?: string;
  chieudi: SunSeg[];
  chieuve: SunSeg[];
  passengers: any[];
}

export function normalizePnr(raw: string) {
  return (raw || '').trim().toUpperCase();
}
export const isValidPnr = (p: string) => /^[A-Z0-9]{6}$/.test(p);

/** Returns parsed data or an error message. */
export function parseCheckResponse(httpOk: boolean, json: any, fallbackPnr: string):
  | { ok: true; data: SunCheckData }
  | { ok: false; error: string } {
  const msg = json?.message || json?.detail || json?.error;
  if (!httpOk) return { ok: false, error: typeof msg === 'string' ? msg : 'Kiểm tra vé thất bại' };
  if (!json || typeof json !== 'object') return { ok: false, error: 'Phản hồi không hợp lệ' };
  if (json.success !== true) return { ok: false, error: typeof msg === 'string' ? msg : 'Kiểm tra vé thất bại' };
  const d = json.data;
  if (!d || typeof d !== 'object') return { ok: false, error: 'Thiếu dữ liệu vé' };
  const chieudi = (Array.isArray(d.chieudi) ? d.chieudi : []).filter(isValidSeg);
  const chieuve = (Array.isArray(d.chieuve) ? d.chieuve : []).filter(isValidSeg);
  if (chieudi.length + chieuve.length === 0) return { ok: false, error: 'PNR không có chặng bay' };
  return {
    ok: true,
    data: {
      pnr: d.pnr || fallbackPnr,
      status: d.status,
      currency: d.currency,
      chieudi,
      chieuve,
      passengers: Array.isArray(d.passengers) ? d.passengers : [],
    },
  };
}

export interface SunNewGroups {
  out: SunSeg[];
  back: SunSeg[];
}
export function newSegmentsFromTrip(trip: any): SunNewGroups {
  const out = (trip?.chiều_đi?.list_itinerary ?? []).filter(isValidSeg);
  const back = (trip?.chiều_về?.list_itinerary ?? []).filter(isValidSeg);
  return { out, back };
}

/** Toggle by object identity; a third selection is ignored. */
export function toggleSunSelection(selected: SunSeg[], seg: SunSeg): SunSeg[] {
  if (selected.includes(seg)) return selected.filter((s) => s !== seg);
  return selected.length >= 2 ? selected : [...selected, seg];
}

export type SunPairing =
  | { ok: true; old: SunSeg[]; next: SunSeg[] }
  | { ok: false; reason: 'selection' | 'direction' };

/** Use source membership/order, not click order or inferred routes. */
export function pairSunSegments(
  oldGroups: SunNewGroups, newGroups: SunNewGroups,
  oldSelected: SunSeg[], newSelected: SunSeg[],
): SunPairing {
  const valid = (groups: SunNewGroups, selected: SunSeg[]) =>
    selected.length >= 1 && selected.length <= 2 && new Set(selected).size === selected.length &&
    selected.every((s) => [...groups.out, ...groups.back].filter((item) => item === s).length === 1);
  if (oldSelected.length !== newSelected.length || !valid(oldGroups, oldSelected) || !valid(newGroups, newSelected))
    return { ok: false, reason: 'selection' };
  const chosen = (source: SunSeg[], selected: SunSeg[]) => source.filter((s) => selected.includes(s));
  const oldOut = chosen(oldGroups.out, oldSelected), newOut = chosen(newGroups.out, newSelected);
  if (oldSelected.length === 2 && oldOut.length !== newOut.length)
    return { ok: false, reason: 'direction' };
  return {
    ok: true,
    old: [...oldOut, ...chosen(oldGroups.back, oldSelected)],
    next: [...newOut, ...chosen(newGroups.back, newSelected)],
  };
}

export function buildChangePayload(pnr: string, old: SunSeg[], next: SunSeg[]) {
  if (old.length < 1 || old.length > 2 || old.length !== next.length ||
      new Set(old).size !== old.length || new Set(next).size !== next.length)
    throw new Error('Invalid SUN segment pairs');
  // Pass the original objects through untouched (JSON.stringify serializes them as-is).
  return { pnr, old_itinerary: [...old], new_itinerary: [...next] };
}

export interface SunChangeResult {
  trace_id?: string;
  pnr_number: string;
  currency: string;
  chenhlech_giagoc: number;
  chenhlech_thuephi: number;
  phi_doi_ve: number;
  tong_giathaydoi: number;
  pax_pricing: any[];
  list_itinerary: SunSeg[];
}

const num = (v: unknown) => (typeof v === 'number' ? v : typeof v === 'string' && v.trim() !== '' ? Number(v) : NaN);

export function parseChangeResponse(httpOk: boolean, json: any, pnr: string):
  | { ok: true; data: SunChangeResult }
  | { ok: false; error: string } {
  const msg = json?.message || json?.detail || json?.error;
  if (!httpOk || !json || json.success !== true || !json.data || typeof json.data !== 'object')
    return { ok: false, error: typeof msg === 'string' ? msg : 'Đổi vé không thành công' };
  const d = json.data;
  const vals = [d.chenhlech_giagoc, d.chenhlech_thuephi, d.phi_doi_ve, d.tong_giathaydoi].map(num);
  if (vals.some((v) => !Number.isFinite(v))) return { ok: false, error: 'Phản hồi thiếu dữ liệu giá' };
  return {
    ok: true,
    data: {
      trace_id: json.trace_id,
      pnr_number: d.pnr_number || pnr,
      currency: d.currency || '',
      chenhlech_giagoc: vals[0],
      chenhlech_thuephi: vals[1],
      phi_doi_ve: vals[2],
      tong_giathaydoi: vals[3],
      pax_pricing: Array.isArray(d.pax_pricing) ? d.pax_pricing : [],
      list_itinerary: (Array.isArray(d.list_itinerary) ? d.list_itinerary : []).filter(isValidSeg),
    },
  };
}

export type FeeKey = 'chenhlech_giagoc' | 'chenhlech_thuephi' | 'phi_doi_ve';
export const FEE_KEYS: FeeKey[] = ['chenhlech_giagoc', 'chenhlech_thuephi', 'phi_doi_ve'];

/** Validate a user edit: must be a finite number not below the API's original value. */
export function validateFeeEdit(input: string, original: number): { ok: true; value: number } | { ok: false; error: string } {
  const s = input.replace(/[\s,]/g, '');
  if (!/^-?\d+(\.\d+)?$/.test(s)) return { ok: false, error: 'Giá trị không hợp lệ' };
  const v = Number(s);
  if (!Number.isFinite(v)) return { ok: false, error: 'Giá trị không hợp lệ' };
  if (v < original) return { ok: false, error: 'Không được thấp hơn giá gốc' };
  return { ok: true, value: v };
}

/** Displayed total = API total + sum(edited - original). */
export function adjustedTotal(orig: SunChangeResult, edits: Partial<Record<FeeKey, number>>) {
  let t = orig.tong_giathaydoi;
  for (const k of FEE_KEYS) if (edits[k] !== undefined) t += (edits[k] as number) - orig[k];
  return t;
}

export const paxTypeLabel = (t: unknown) =>
  t === 'ADULT' ? 'Người lớn' : t === 'CHILD' ? 'Trẻ em' : t === 'INFANT' ? 'Em bé' : String(t ?? '');

export const sameFlight = (a: SunSeg, b: SunSeg) => {
  const x = segView(a), y = segView(b);
  return x.from === y.from && x.to === y.to && x.depDate === y.depDate && String(a?.flight_number ?? '') === String(b?.flight_number ?? '');
};
