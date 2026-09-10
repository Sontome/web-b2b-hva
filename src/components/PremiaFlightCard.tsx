import React from 'react';
import { Button } from '@/components/ui/button';
import { Copy, Users, Plane } from 'lucide-react';
import { toast } from 'sonner';
import type { PremiaTrip, PremiaLeg } from '@/services/premiaService';

const fmtKRW = new Intl.NumberFormat('ko-KR');

/** Hành lý theo mã "hành_lý_vna" của Premia */
export const premiaBaggageLine = (code?: string): string => {
  const c = (code || '').trim().toUpperCase();
  if (c === 'YS') return 'Premia 10kg xách tay, 46kg ký gửi';
  return 'Premia 10kg xách tay, 30kg ký gửi';
};

export const calcPremiaFinalPrice = (
  trip: PremiaTrip,
  tripType: 'OW' | 'RT',
  oneWayFee = 0,
  roundTripFee = 0,
) => {
  const base = Number(trip.thông_tin_chung?.giá_vé ?? 0) || 0;
  const fee = tripType === 'OW' ? oneWayFee : roundTripFee;
  return base + fee;
};

const ddmm = (date?: string) => (date || '').split('/').slice(0, 2).join('/');

const buildRouteText = (leg?: PremiaLeg) => {
  if (!leg) return '';
  const stop = leg.điểm_dừng_1 ? `-${leg.điểm_dừng_1}` : '';
  return `${leg.nơi_đi}${stop}-${leg.nơi_đến} ${leg.giờ_cất_cánh} ngày ${ddmm(leg.ngày_cất_cánh)}`;
};

export interface PremiaFlightCardProps {
  trip: PremiaTrip;
  tripType: 'OW' | 'RT';
  oneWayFee?: number;
  roundTripFee?: number;
  isReference?: boolean;
}

export const PremiaFlightCard: React.FC<PremiaFlightCardProps> = ({
  trip,
  tripType,
  oneWayFee = 0,
  roundTripFee = 0,
  isReference = false,
}) => {
  const finalPrice = calcPremiaFinalPrice(trip, tripType, oneWayFee, roundTripFee);
  const roundedPrice = Math.round(finalPrice / 100) * 100;
  const seats = trip.thông_tin_chung?.số_ghế_còn ?? '9';
  const baggageLine = premiaBaggageLine(trip.thông_tin_chung?.hành_lý_vna);

  const ticketClasses =
    tripType === 'RT' && trip.chiều_về
      ? `Khứ hồi: ${trip.chiều_đi?.loại_vé || ''}-${trip.chiều_về?.loại_vé || ''}`
      : `Một chiều: ${trip.chiều_đi?.loại_vé || ''}`;

  const copyText = [
    buildRouteText(trip.chiều_đi),
    trip.chiều_về ? buildRouteText(trip.chiều_về) : '',
    `${baggageLine}, giá vé = ${fmtKRW.format(roundedPrice)}w`,
    isReference ? 'Vé hãng Premia tham khảo' : '',
  ]
    .filter(Boolean)
    .join('\n');

  const handleCopy = () => {
    navigator.clipboard.writeText(copyText);
    toast.success('Đã copy thông tin chuyến bay');
  };

  return (
    <div className="relative border border-gray-200 rounded-lg p-4 bg-white h-full overflow-hidden">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <div className="text-2xl font-bold text-gray-800 mb-1">
            {fmtKRW.format(roundedPrice)} KRW
          </div>
          <div className="text-xs text-gray-600">{ticketClasses}</div>
          <div className="text-sm text-gray-600 flex items-center gap-1 mt-1">
            <Users className="h-4 w-4" /> Còn {seats} ghế
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="bg-purple-600 text-white px-2 py-0.5 rounded text-xs font-bold">PREMIA</span>
          <Button size="sm" variant="outline" className="p-2" onClick={handleCopy} title="Copy">
            <Copy className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="text-sm text-gray-700 space-y-1 mb-2">
        <div className="flex items-center">
          <Plane className="w-4 h-4 text-primary mr-2" />
          <span>{buildRouteText(trip.chiều_đi)}</span>
        </div>
        {trip.chiều_về && (
          <div className="flex items-center">
            <Plane className="w-4 h-4 text-primary mr-2 rotate-180" />
            <span>{buildRouteText(trip.chiều_về)}</span>
          </div>
        )}
      </div>

      <div className="border-t pt-2 text-sm text-gray-600">
        {baggageLine}, giá vé = {fmtKRW.format(roundedPrice)}w
      </div>

      {isReference && (
        <div className="pointer-events-none absolute top-0 right-0 z-20 h-24 w-24 overflow-hidden">
          <div className="absolute top-[18px] right-[-42px] w-[150px] rotate-45 bg-gradient-to-r from-red-600 to-rose-500 text-white text-[9px] font-bold text-center leading-tight py-1 shadow-lg">
            Vé Premia
            <br />
            tham khảo
          </div>
        </div>
      )}
    </div>
  );
};

export default PremiaFlightCard;
