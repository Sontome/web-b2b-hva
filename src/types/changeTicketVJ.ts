export interface VJTrip {
  seg_no?: number;
  flight_no?: string;
  origin?: string;
  destination?: string;
  departure_time?: string;
  arrival_time?: string;
  [k: string]: unknown;
}

export interface PreChangeVJResponse {
  trips?: VJTrip[];
  pnr?: string;
  passengers?: VJPassenger[];
  [k: string]: unknown;
}

export interface VJPassenger {
  full_name?: string;
  type?: string;
  [k: string]: unknown;
}

export interface VJQuotation {
  total_price_change?: number;
  fare_difference?: number;
  change_fee?: number;
  reservationCredits?: number;
  [k: string]: unknown;
}

export interface ChangeVJResponse {
  success?: boolean;
  flow?: string;
  pnr?: string;
  message?: string;
  data?: {
    trips?: VJTrip[];
    quotation?: VJQuotation;
    [k: string]: unknown;
  };
  [k: string]: unknown;
}

export interface ChangeVJRequest {
  pnr: string;
  dep: string;
  arr: string;
  dep_date: string;
  new_flight_no: string;
  arr_date: string | null;
  new_flight_arr_no: string | null;
  segdel: number;
}

export interface VJFlightContext {
  dep: string;
  arr: string;
  dep_date: string;
  new_flight_no: string;
  arr_date: string | null;
  new_flight_arr_no: string | null;
  isRoundTrip: boolean;
}
