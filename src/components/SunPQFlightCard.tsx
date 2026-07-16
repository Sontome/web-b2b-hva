import React from 'react';
import { Button } from '@/components/ui/button';
import { Copy, Users } from 'lucide-react';
import { toast } from 'sonner';
import type { SunPQTrip, SunPQLeg } from '@/types/sunpq';
import { applyTicketRules, formatNotesLine } from '@/utils/ticketRuleEngine';
import type { RuleSegmentInput, TicketRulesDataset } from '@/types/ticketRules';

const fmtKRW = new Intl.NumberFormat('de-DE');

// Booking-class priority tiers used across preview & sorting.
// Tier 0 = high priority (V,Y,W,B,H,K,L,M,N,Q,T,O,R,U)
// Tier 1 = low priority (S,G,A,X)
// Tier 2 = anything else
export const SUNPQ_HIGH_TIER_CLASSES = ['V','Y','W','B','H','K','L','M','N','Q','T','O','R','U'];
export const SUNPQ_LOW_TIER_CLASSES = ['S','G','A','X'];

export const sunpqClassTier = (cls?: string | null): number => {
  const c = (cls || '').trim().toUpperCase();
  if (!c) return 2;
  if (SUNPQ_HIGH_TIER_CLASSES.includes(c)) return 0;
  if (SUNPQ_LOW_TIER_CLASSES.includes(c)) return 1;
  return 2;
};

export const sunpqTripTier = (trip: SunPQTrip): number => {
  const out = sunpqClassTier(trip.chiều_đi?.loại_vé);
  const ret = trip.chiều_về ? sunpqClassTier(trip.chiều_về?.loại_vé) : out;
  // Worst tier across legs so a mixed trip is ranked by the weaker leg
  return Math.max(out, ret);
};

export const buildSunPQSegments = (trip: SunPQTrip, tripType: 'OW' | 'RT'): RuleSegmentInput[] => {
  const segs: RuleSegmentInput[] = [];
  const pushLeg = (leg: SunPQLeg | undefined, legIndex: number | null) => {
    if (!leg) return;
    const itin = leg.list_itinerary || [];
    const legSize = Math.max(itin.length, 1);
    if (itin.length > 0) {
      itin.forEach((it, i) => {
        segs.push({
          airline: it.carrier || leg.hãng || 'SUN',
          from: it.departure,
          to: it.arrival,
          departure_time: undefined,
          arrival_time: undefined,
          departure_date: it.flight_date,
          segment_order: i + 1,
          leg_index: legIndex,
          leg_size: legSize,
          booking_class: it.booking_class || leg.loại_vé || null,
        });
      });
    } else {
      segs.push({
        airline: leg.hãng || 'SUN',
        from: leg.nơi_đi,
        to: leg.nơi_đến,
        departure_time: leg.giờ_cất_cánh,
        arrival_time: leg.giờ_hạ_cánh,
        departure_date: leg.ngày_cất_cánh,
        segment_order: 1,
        leg_index: legIndex,
        leg_size: 1,
        booking_class: leg.loại_vé || null,
      });
    }
  };
  if (tripType === 'RT') {
    pushLeg(trip.chiều_đi, 0);
    pushLeg(trip.chiều_về, 1);
  } else {
    pushLeg(trip.chiều_đi, null);
  }
  return segs;
};

const buildRouteText = (leg?: SunPQTrip['chiều_đi']) => {
  if (!leg) return '';
  const stop = leg.điểm_dừng_1 ? `-${leg.điểm_dừng_1}` : '';
  const ddmm = (leg.ngày_cất_cánh || '').split('/').slice(0, 2).join('/');
  return `${leg.nơi_đi}${stop}-${leg.nơi_đến} ${leg.giờ_cất_cánh} ngày ${ddmm}`;
};

export const calcSunPQFinalPrice = (
  trip: SunPQTrip,
  tripType: 'OW' | 'RT',
  oneWayFee = 0,
  roundTripFee = 0,
) => {
  const base =
    Number(
      trip.thông_tin_chung?.giá_vé ??
        trip.thông_tin_chung?.giá_vé_gốc ??
        ((trip.chiều_đi?.giá_vé_gốc || 0) + (trip.chiều_về?.giá_vé_gốc || 0))
    ) || 0;
  const fee = tripType === 'OW' ? oneWayFee : roundTripFee;
  return base + fee;
};

export interface SunPQFlightCardProps {
  trip: SunPQTrip;
  tripType: 'OW' | 'RT';
  oneWayFee?: number;
  roundTripFee?: number;
  rulesDataset?: TicketRulesDataset | null;
  onBook?: (trip: SunPQTrip) => void;
  /** Replace the "Giữ vé" button label/action, e.g. "Xem tất cả vé SunPQ" */
  bookLabel?: string;
}

/**
 * Returns null when a rule hides the ticket.
 */
export const SunPQFlightCard: React.FC<SunPQFlightCardProps> = ({
  trip,
  tripType,
  oneWayFee = 0,
  roundTripFee = 0,
  rulesDataset,
  onBook,
  bookLabel = 'Giữ vé',
}) => {
  const baseFinal = calcSunPQFinalPrice(trip, tripType, oneWayFee, roundTripFee);
  const seats = trip.thông_tin_chung?.số_ghế_còn ?? '9';

  const _segs = buildSunPQSegments(trip, tripType);
  const effects = applyTicketRules({ segments: _segs, raw: trip }, rulesDataset);
  if (effects.hidden) return null;
  const finalPrice = effects.priceOverride ?? baseFinal;
  const roundedPrice = Math.round(finalPrice / 100) * 100;
  const notesLine = formatNotesLine(effects.notes);
  const baggageLine = effects.baggage || 'SunPQ 7kg xách tay, 23kg ký gửi';

  const ticketClasses =
    tripType === 'OW'
      ? `Một chiều: ${trip.chiều_đi?.loại_vé || ''}`
      : `Khứ hồi: ${trip.chiều_đi?.loại_vé || ''}-${trip.chiều_về?.loại_vé || ''}`;

  const copyText = [
    buildRouteText(trip.chiều_đi),
    trip.chiều_về ? buildRouteText(trip.chiều_về) : '',
    `${baggageLine}, giá vé = ${fmtKRW.format(roundedPrice)}w`,
    notesLine,
  ]
    .filter(Boolean)
    .join('\n');

  const handleCopy = () => {
    navigator.clipboard.writeText(copyText);
    toast.success('Đã copy thông tin chuyến bay');
  };

  return (
    <div className={`border-2 rounded-lg p-4 bg-white ${effects.highlight ? 'border-red-500' : 'border-orange-400'}`}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <span className="bg-orange-500 text-white px-2 py-0.5 rounded text-xs font-bold">SUNPQ</span>
          <span className="text-2xl font-bold text-gray-800">{fmtKRW.format(finalPrice)} KRW</span>
        </div>
        <div className="text-sm text-gray-600 flex items-center gap-1">
          <Users className="h-4 w-4" /> Còn {seats} ghế
        </div>
      </div>

      <div className="text-sm text-gray-700 mb-2">
        <div>{buildRouteText(trip.chiều_đi)}</div>
        {trip.chiều_về && <div>{buildRouteText(trip.chiều_về)}</div>}
        <div className="text-xs text-gray-500 mt-1">{ticketClasses}</div>
      </div>

      <pre className="bg-orange-50 border border-orange-200 rounded p-3 font-sans font-medium text-xl text-black whitespace-pre-line mb-3">
        {copyText}
      </pre>
      {notesLine && <div className="text-red-600 font-semibold text-sm mb-2">{notesLine}</div>}

      <div className="flex gap-2 justify-end">
        <Button size="sm" variant="outline" onClick={handleCopy}>
          <Copy className="h-4 w-4 mr-1" /> Copy
        </Button>
        {onBook && (
          <Button
            size="sm"
            className="bg-green-600 hover:bg-green-700 text-white"
            onClick={() => onBook(trip)}
          >
            {bookLabel}
          </Button>
        )}
      </div>
    </div>
  );
};

export default SunPQFlightCard;
