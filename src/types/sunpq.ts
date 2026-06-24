export interface SunPQItinerarySegment {
  trip_id: number;
  segment_id: number;
  departure: string;
  arrival: string;
  flight_date: string;
  flight_number: number;
  elapse_flying_time: string;
  duration: string;
  carrier: string;
  booking_class: string;
  fare_basis: string;
  break_point: string;
  flight_status: string;
}

export interface SunPQLeg {
  hãng: string;
  nơi_đi: string;
  nơi_đến: string;
  giờ_cất_cánh: string;
  ngày_cất_cánh: string;
  thời_gian_bay: string;
  giờ_hạ_cánh: string;
  ngày_hạ_cánh: string;
  số_hiệu_máy_bay: string;
  số_điểm_dừng: string;
  loại_vé: string;
  giá_vé_gốc: number;
  BookingKey?: string;
  list_itinerary: SunPQItinerarySegment[];
  điểm_dừng_1?: string;
}

export interface SunPQTrip {
  chiều_đi: SunPQLeg;
  chiều_về?: SunPQLeg;
  thông_tin_chung?: {
    giá_vé?: string | number;
    số_ghế_còn?: string | number;
    giá_vé_gốc?: string | number;
    [k: string]: any;
  };
}

export type SunPQPaxType = 'ADULT' | 'CHILD' | 'INFANT';

export interface SunPQPassenger {
  pax_id: number;
  type: SunPQPaxType;
  title: 'MR' | 'MRS' | 'MSTR' | 'MISS';
  first_name: string;
  last_name: string;
  parent_id: number | null;
  date_of_birth?: string;
}

export interface SunPQBookingPayload {
  list_itinerary: SunPQItinerarySegment[];
  list_passenger: SunPQPassenger[];
  contact_info: { email: string; phone_number: string; full_name: string };
  promo_code: string;
  corporate_code: string;
  currency: string;
  send_email: boolean;
}

export interface SunPQSearchResult {
  status_code: number;
  body: SunPQTrip[];
  lowerfare?: { chiều_đi: any[]; chiều_về: any[]; currency?: string } | null;
  error?: string;
}
