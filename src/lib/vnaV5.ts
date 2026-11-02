import type { Flight } from '@/services/flightApi';

export interface VnaSegment {
  hãng: string;
  id: string;
  nơi_đi: string;
  nơi_đến: string;
  giờ_cất_cánh: string;
  ngày_cất_cánh: string;
  giờ_hạ_cánh: string;
  ngày_hạ_cánh: string;
  thời_gian_bay: string;
  thời_gian_chờ: string;
  số_hiệu_máy_bay: string;
  số_điểm_dừng: string;
  điểm_dừng_1: string;
  điểm_dừng_2: string;
  loại_vé: string;
}

export interface VnaItineraryV5 {
  chiều_đi: VnaSegment[];
  chiều_về?: VnaSegment[];
  thông_tin_chung: {
    giá_vé: string;
    số_ghế_còn: string;
    hành_lý_vna: string;
    [key: string]: unknown;
  };
}

export const formatVnaSegment = (s: VnaSegment) =>
  `${s.ngày_cất_cánh.split('/').slice(0, 2).join('/')} ${s.giờ_cất_cánh}(${s.nơi_đi}) → ${s.ngày_hạ_cánh.split('/').slice(0, 2).join('/')} ${s.giờ_hạ_cánh}(${s.nơi_đến})`;

export const formatVnaDirection = (segments: VnaSegment[]) => segments.map(formatVnaSegment).join('\n\n');

// Both timestamps are local to the same transfer airport, so no timezone conversion is needed.
export function vnaWaitTime(previous: VnaSegment, next: VnaSegment): string {
  if (previous.nơi_đến !== next.nơi_đi) return '';
  const localTimestamp = (date: string, time: string) => {
    const [d, m, y] = date.split('/').map(Number);
    const [h, min] = time.split(':').map(Number);
    return Date.UTC(y, m - 1, d, h, min);
  };
  const minutes = (localTimestamp(next.ngày_cất_cánh, next.giờ_cất_cánh) - localTimestamp(previous.ngày_hạ_cánh, previous.giờ_hạ_cánh)) / 60000;
  return Number.isFinite(minutes) && minutes >= 0 ? `${Math.floor(minutes / 60)}h ${minutes % 60}m` : '';
}

export function parseVnaV5(body: VnaItineraryV5[], ptcCode: 'ADT' | 'VFR' | 'STU', city: (airport: string) => string): Flight[] {
  return body.flatMap((itinerary, index) => {
    const out = itinerary.chiều_đi;
    const back = itinerary.chiều_về;
    if (!Array.isArray(out) || !out.length || out.some(s => s.hãng !== 'VNA')) return [];
    if (back !== undefined && (!Array.isArray(back) || back.some(s => s.hãng !== 'VNA'))) return [];
    const summarize = (segments: VnaSegment[]) => {
      const first = segments[0];
      const last = segments[segments.length - 1];
      if (!first || !last) throw new Error('Không có chặng bay VNA');
      return {
        departure: { time: first.giờ_cất_cánh, date: first.ngày_cất_cánh, airport: first.nơi_đi, city: city(first.nơi_đi), stops: segments.length - 1 },
        arrival: { time: last.giờ_hạ_cánh, date: last.ngày_hạ_cánh, airport: last.nơi_đến, city: city(last.nơi_đến) },
        ticketClass: segments.map(s => s.loại_vé).join('/'),
        stops: segments.length - 1,
        stopInfo: segments.length > 1 ? { stop1: first.nơi_đến, waitTime: vnaWaitTime(first, segments[1]) } : undefined,
        landingTime: last.giờ_hạ_cánh,
        landingDate: last.ngày_hạ_cánh,
      };
    };
    const summary = summarize(out);
    const minutes = out.reduce((sum, s) => sum + (Number(s.thời_gian_bay) || 0), 0);
    const info = itinerary.thông_tin_chung;
    if (!info) return [];
    return [{
      ...summary, id: `vna-v5-${index}`, airline: 'VNA' as const,
      flightNumber: out.map(s => s.số_hiệu_máy_bay).join('/'),
      return: back?.length ? summarize(back) : undefined,
      duration: `${Math.floor(minutes / 60)}h ${minutes % 60}m`,
      price: Number(info.giá_vé) || 0, availableSeats: Number(info.số_ghế_còn) || 0,
      baggageType: info.hành_lý_vna, currency: 'VND', aircraft: '', ptcCode,
      vnaItinerary: itinerary,
    }];
  });
}
