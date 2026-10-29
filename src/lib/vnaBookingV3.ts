import { format } from 'date-fns';
import type { MultiCityFlight } from '@/services/vnaMultiCityApi';

export interface VnaFormPassenger {
  Họ: string;
  Tên: string;
  Giới_tính: 'nam' | 'nữ';
  type: 'người_lớn' | 'trẻ_em';
  Ngày_sinh?: Date;
  infant?: Omit<VnaFormPassenger, 'type' | 'infant'>;
}

const name = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').trim().replace(/\s+/g, ' ').toUpperCase();
const person = (p: Omit<VnaFormPassenger, 'type' | 'infant'>) => ({
  first_name: name(p.Họ),
  last_name: name(p.Tên),
  gender: p.Giới_tính === 'nam' ? 'M' : 'F',
  ...(p.Ngày_sinh ? { dob: format(p.Ngày_sinh, 'dd/MM/yyyy') } : {}),
});

export function buildVnaBookingV3(flight: MultiCityFlight, passengers: VnaFormPassenger[], ptcCode: 'ADT' | 'VFR' | 'STU', email: string, phone: string, userId: string) {
  if (!userId) throw new Error('Vui lòng đăng nhập để giữ vé');
  if (!email.trim() || !phone.trim()) throw new Error('Vui lòng nhập email và số điện thoại gửi mặt vé');
  if (!passengers.length || passengers.length > flight.availableSeats) throw new Error('Số hành khách vượt quá số ghế còn lại');
  const adults = passengers.filter(p => p.type === 'người_lớn');
  const children = passengers.filter(p => p.type === 'trẻ_em');
  // Put infant-associated adults first so API positional pairing remains correct.
  const orderedAdults = [...adults.filter(p => p.infant?.Họ.trim() || p.infant?.Tên.trim()), ...adults.filter(p => !p.infant?.Họ.trim() && !p.infant?.Tên.trim())];
  for (const p of passengers) {
    if (!p.Họ.trim() || !p.Tên.trim()) throw new Error('Vui lòng điền đầy đủ thông tin hành khách');
    if (p.type === 'trẻ_em' && !p.Ngày_sinh) throw new Error('Vui lòng chọn ngày sinh cho trẻ em');
    if (p.type === 'trẻ_em' && (p.infant?.Họ.trim() || p.infant?.Tên.trim())) throw new Error('Em bé phải đi kèm người lớn');
  }
  const infants = orderedAdults.flatMap(p => {
    if (!p.infant?.Họ.trim() && !p.infant?.Tên.trim()) return [];
    if (!p.infant?.Họ.trim() || !p.infant.Tên.trim() || !p.infant.Ngày_sinh) throw new Error('Vui lòng điền đầy đủ thông tin trẻ sơ sinh');
    return [person(p.infant)];
  });
  if (!flight.legs.length) throw new Error('Không có chặng bay để giữ vé');
  const itinerary: Record<string, unknown> = { ...flight.listItinerary };
  for (const leg of flight.legs) {
    if (!/^VN\d{1,4}$/.test(leg.flightNumber) || !/^[A-Z]$/.test(leg.ticketClass) || !/^[A-Z]{3}$/.test(leg.from) || !/^[A-Z]{3}$/.test(leg.to)) throw new Error('Thông tin chuyến bay hoặc hạng vé không hợp lệ');
    const [d, m, y] = leg.departureDate.split('/').map(Number);
    const date = new Date(Date.UTC(y, m - 1, d));
    if (!/^\d{2}\/\d{2}\/\d{4}$/.test(leg.departureDate) || date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) throw new Error('Ngày bay không hợp lệ');
    const key = `chặng_${leg.index}`;
    const raw = itinerary[key];
    itinerary[key] = {
      ...(raw && typeof raw === 'object' ? raw : {}),
      hãng: 'VNA', số_hiệu_máy_bay: leg.flightNumber, loại_vé: leg.ticketClass,
      nơi_đi: leg.from, nơi_đến: leg.to, ngày_cất_cánh: leg.departureDate,
      giờ_cất_cánh: leg.departureTime, ngày_hạ_cánh: leg.arrivalDate, giờ_hạ_cánh: leg.arrivalTime,
    };
  }
  const params = new URLSearchParams({ doituong: ptcCode, email: email.trim(), phone: phone.trim(), id_f2: userId });
  return {
    url: `https://apilive.hanvietair.com/vna/booking-v3?${params}`,
    body: { passengers: { adults: orderedAdults.map(person), children: children.map(person), infants }, list_itinerary: itinerary },
  };
}
