// VNA multi-city (trip_type "MD") search via /vna/check-ve-v4. VNA only — no other airlines.

export interface MultiCityLegInput {
  origin: string;
  destination: string;
  date: Date | undefined;
}

export interface MultiCitySearchData {
  legs: MultiCityLegInput[];
  passengers: number;
  ptcCode: 'VFR' | 'ADT' | 'STU';
}

export interface MultiCityLeg {
  index: number; // 1-based
  flightNumber: string;
  from: string;
  to: string;
  departureTime: string;
  departureDate: string;
  arrivalTime: string;
  arrivalDate: string;
  ticketClass: string;
  stops: number;
  stop1?: string;
  waitTime?: string;
}

export interface MultiCityFlight {
  id: string;
  legs: MultiCityLeg[];
  price: number;
  availableSeats: number;
  baggageType: string;
}

const ymd = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export const buildMultiCityPayload = (data: MultiCitySearchData) => {
  const legs = data.legs.map((l) => ({
    date: l.date ? ymd(l.date) : '',
    destination: l.destination,
    origin: l.origin,
  }));
  return {
    trip_type: 'MD',
    origin: legs[0]?.origin ?? '',
    destination: legs[0]?.destination ?? '',
    legs,
    adult: data.passengers,
    child: 0,
    infant: 0,
    cabin_class: 'Y',
    ptc_code: data.ptcCode,
  };
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const parseLeg = (raw: any, index: number): MultiCityLeg => ({
  index,
  flightNumber: raw?.id ? `VN${raw.id}` : '',
  from: raw?.nơi_đi ?? '',
  to: raw?.nơi_đến ?? '',
  departureTime: raw?.giờ_cất_cánh ?? '',
  departureDate: raw?.ngày_cất_cánh ?? '',
  arrivalTime: raw?.giờ_hạ_cánh ?? '',
  arrivalDate: raw?.ngày_hạ_cánh ?? '',
  ticketClass: raw?.loại_vé ?? '',
  stops: parseInt(raw?.số_điểm_dừng ?? '0') || 0,
  stop1: raw?.điểm_dừng_1 || undefined,
  waitTime: raw?.thời_gian_chờ || undefined,
});

export const fetchVNAMultiCity = async (data: MultiCitySearchData): Promise<MultiCityFlight[]> => {
  const response = await fetch('https://apilive.hanvietair.com/vna/check-ve-v4', {
    method: 'POST',
    headers: { accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify(buildMultiCityPayload(data)),
  });
  if (!response.ok) throw new Error(`Vietnam Airlines MD API error: ${response.status}`);
  const json = await response.json();
  if (json?.status_code !== 200 || !Array.isArray(json?.body)) return [];

  const result: MultiCityFlight[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  json.body.forEach((item: any, i: number) => {
    const legs: MultiCityLeg[] = [];
    for (let n = 1; n <= 4; n++) {
      const raw = item?.[`chặng_${n}`];
      if (raw) legs.push(parseLeg(raw, n));
    }
    if (legs.length === 0) return;
    const info = item?.thông_tin_chung ?? {};
    result.push({
      id: `vna-md-${i}-${legs.map((l) => l.flightNumber).join('-')}`,
      legs,
      price: parseInt(info.giá_vé) || 0,
      availableSeats: parseInt(info.số_ghế_còn) || 0,
      baggageType: info.hành_lý_vna ?? '',
    });
  });
  return result;
};
