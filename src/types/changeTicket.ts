export interface Segment {
  seg_no: number;
  flight_no?: string;
  flight_number?: string;
  booking_class?: string;
  from?: string;
  to?: string;
  dep_date?: string;
  dep_time?: string;
  arr_time?: string;
  status?: string;
  [key: string]: unknown;
}

export interface PreChangeResponse {
  seg: Segment[];
  pnr?: string;
  [key: string]: unknown;
}

export interface ChangePrice {
  penalty_total?: number | string;
  GRD_TOTAL?: number | string;
  total_new?: number | string;
  [key: string]: unknown;
}

export interface ChangeTicketResponse {
  status: string;
  search_command?: string;
  seg_new?: Segment[];
  new_price?: ChangePrice;
  message?: string;
  namelist?: string[];
  [key: string]: unknown;
}

export interface ChangePnrRequest {
  pnr: string;
  seg_del: string;
  dep: string;
  arr: string;
  depdate: string;
  deptime: string;
  deptimedone: string;
  arrdate?: string;
  arrtime?: string;
  arrtimedone?: string;
}

export interface FlightContext {
  dep: string;
  arr: string;
  depdate: string;
  deptime: string;
  deptimedone: string;
  arrdate?: string;
  arrtime?: string;
  arrtimedone?: string;
  isRoundTrip: boolean;
}
