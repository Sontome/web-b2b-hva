import type { SunPQBookingPayload, SunPQSearchResult, SunPQTrip } from '@/types/sunpq';

const SUNPQ_BASE = 'https://apilive.hanvietair.com/spa';

const logTag = (tag: string, payload: any) => console.log(`[${tag}]`, payload);

export const searchSunPQFlights = async (searchData: {
  departure: string;
  arrival: string;
  departureDate: string;
  returnDate?: string;
  tripType: 'OW' | 'RT';
  adults?: number;
  children?: number;
  infants?: number;
}): Promise<SunPQSearchResult> => {
  const body: Record<string, unknown> = {
    departure: searchData.departure,
    arrival: searchData.arrival,
    dep_date: searchData.departureDate,
    trip_type: searchData.tripType,
    adt: searchData.adults || 1,
    chd: searchData.children || 0,
    inf: searchData.infants || 0,
    promo_code: '',
    currency: 'KRW',
  };
  if (searchData.tripType === 'RT') {
    body.arr_date = searchData.returnDate || searchData.departureDate;
  }
  logTag('SUNPQ_SEARCH_REQUEST', body);
  try {
    const res = await fetch(`${SUNPQ_BASE}/check-ve-v3`, {
      method: 'POST',
      headers: { accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const txt = await res.text();
      logTag('SUNPQ_SEARCH_ERROR', { status: res.status, txt });
      return { status_code: res.status, body: [], error: `HTTP ${res.status}` };
    }
    const data = await res.json();
    logTag('SUNPQ_SEARCH_RESPONSE', data);
    const list: SunPQTrip[] = data?.data?.body ?? data?.body ?? [];
    const lf = data?.data?.lowerfare ?? data?.lowerfare ?? null;
    return { status_code: data.success ? 200 : 404, body: list, lowerfare: lf };
  } catch (err: any) {
    logTag('SUNPQ_SEARCH_EXCEPTION', err?.message);
    return { status_code: 500, body: [], error: err?.message || 'Network error' };
  }
};

export const bookingSunPQ = async (payload: SunPQBookingPayload) => {
  logTag('SUNPQ_BOOKING_REQUEST', payload);
  const res = await fetch(`${SUNPQ_BASE}/booking`, {
    method: 'POST',
    headers: { accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  logTag('SUNPQ_BOOKING_RESPONSE', data);
  if (!res.ok) throw new Error(data?.message || `HTTP ${res.status}`);
  return data as { success: boolean; pnr?: string; message?: string };
};

export const checkSunPQPnr = async (pnr: string) => {
  logTag('SUNPQ_CHECKPNR_REQUEST', { pnr });
  const res = await fetch(`${SUNPQ_BASE}/checkpnr`, {
    method: 'POST',
    headers: { accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({ pnr }),
  });
  const data = await res.json().catch(() => ({}));
  logTag('SUNPQ_CHECKPNR_RESPONSE', data);
  if (!res.ok) throw new Error(data?.message || `HTTP ${res.status}`);
  return data;
};
