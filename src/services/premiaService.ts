export interface PremiaLeg {
  hãng: string;
  id: string;
  nơi_đi: string;
  nơi_đến: string;
  giờ_cất_cánh: string;
  ngày_cất_cánh: string;
  thời_gian_bay: string;
  thời_gian_chờ: string;
  giờ_hạ_cánh: string;
  ngày_hạ_cánh: string;
  số_hiệu_máy_bay: string;
  số_điểm_dừng: string;
  điểm_dừng_1?: string;
  điểm_dừng_2?: string;
  loại_vé: string;
  giá_vé_gốc?: number;
  BookingKey?: string;
}

export interface PremiaTrip {
  chiều_đi: PremiaLeg;
  chiều_về?: PremiaLeg;
  thông_tin_chung?: {
    giá_vé?: string | number;
    giá_vé_gốc?: string | number;
    phí_nhiên_liệu?: string | number;
    thuế_phí_công_cộng?: string | number;
    số_ghế_còn?: string | number;
    hành_lý_vna?: string;
    [k: string]: any;
  };
}

export interface PremiaSearchResult {
  status_code: number;
  body: PremiaTrip[];
  session_key?: string;
  error?: string;
  trạng_thái?: string;
}

const PREMIA_BASE = 'https://apilive.hanvietair.com/premia';

export const searchPremiaFlights = async (searchData: {
  departure: string;
  arrival: string;
  departureDate: string;
  returnDate?: string;
  tripType: 'OW' | 'RT';
  adults?: number;
  children?: number;
  infants?: number;
}): Promise<PremiaSearchResult> => {
  const body: Record<string, unknown> = {
    adt: String(searchData.adults || 1),
    chd: String(searchData.children || 0),
    inf: String(searchData.infants || 0),
    dep0: searchData.departure,
    arr0: searchData.arrival,
    depdate0: searchData.departureDate,
    sochieu: searchData.tripType,
    depdate1: searchData.tripType === 'RT' ? (searchData.returnDate || '') : '',
  };
  console.log('[PREMIA_SEARCH_REQUEST]', body);
  try {
    const res = await fetch(`${PREMIA_BASE}/check-ve-v3`, {
      method: 'POST',
      headers: { accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      console.log('[PREMIA_SEARCH_ERROR]', res.status);
      return { status_code: res.status, body: [], error: `HTTP ${res.status}` };
    }
    const data = await res.json();
    console.log('[PREMIA_SEARCH_RESPONSE]', data);
    const list: PremiaTrip[] = data?.body ?? [];
    return {
      status_code: data?.status_code ?? 200,
      body: list,
      session_key: data?.session_key,
      trạng_thái: data?.trạng_thái,
    };
  } catch (err: any) {
    console.log('[PREMIA_SEARCH_EXCEPTION]', err?.message);
    return { status_code: 500, body: [], error: err?.message || 'Network error' };
  }
};
