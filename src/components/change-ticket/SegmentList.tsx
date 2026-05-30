import React from 'react';
import { Trash2, Plane, CheckCircle2, Clock, Calendar, MapPin } from 'lucide-react';
import type { Segment } from '@/types/changeTicket';

interface Props {
  segments: Segment[];
  selected: number[];
  onToggle: (segNo: number) => void;
  readOnly?: boolean;
  highlightHolding?: boolean;
}

function getField(s: Segment, ...keys: string[]): string {
  for (const k of keys) {
    const v = s[k];
    if (v !== undefined && v !== null && v !== '') return String(v);
  }
  return '';
}

/** "1805" -> "18:05", passes through "18:05" unchanged */
function formatTime(t: string): string {
  if (!t) return '';
  if (t.includes(':')) return t;
  const s = t.padStart(4, '0');
  return `${s.slice(0, 2)}:${s.slice(2, 4)}`;
}

export const SegmentList: React.FC<Props> = ({
  segments,
  selected,
  onToggle,
  readOnly = false,
  highlightHolding = false,
}) => {
  return (
    <div className="space-y-2">
      {segments.map((seg, idx) => {
        const segNo = typeof seg.seg_no === 'number' ? seg.seg_no : idx + 1;
        const flown = (seg.status || '').toUpperCase() === 'FLOWN';
        const holding = (seg.status || '').toUpperCase() === 'HOLDING';
        const willDelete = selected.includes(segNo);
        const carrier = getField(seg, 'carrier', 'airline');
        const flightNoRaw = getField(seg, 'flight_no', 'flight_number', 'flightNumber');
        const flightNo = flightNoRaw
          ? (carrier && !flightNoRaw.startsWith(carrier) ? `${carrier}${flightNoRaw}` : flightNoRaw)
          : '';
        const cls = getField(seg, 'booking_class', 'class', 'rbd');
        const from = getField(seg, 'from_airport', 'from', 'dep', 'origin');
        const to = getField(seg, 'to_airport', 'to', 'arr', 'destination');
        const date = getField(seg, 'day', 'dep_date', 'date', 'depdate');
        const arrDate = getField(seg, 'arrival_day', 'arr_date', 'arrdate');
        const time = formatTime(getField(seg, 'departure_time', 'dep_time', 'time', 'deptime'));
        const arrTime = formatTime(getField(seg, 'arrival_time', 'arr_time', 'arrtime'));
        const status = (seg.status || '').toString() || (holding ? 'HOLDING' : 'CONFIRMED');

        return (
          <div
            key={`${segNo}-${idx}`}
            className={[
              'border rounded-lg p-3 transition-colors',
              willDelete
                ? 'border-red-300 bg-red-50'
                : holding && highlightHolding
                ? 'border-emerald-300 bg-emerald-50'
                : 'border-gray-200 bg-white',
            ].join(' ')}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 text-sm font-semibold text-gray-800">
                  <Plane className="h-4 w-4 text-blue-500" />
                  <span><span className="inline-block -translate-y-[8px]">{flightNo || `SEG ${segNo}`}</span></span>
                  {cls && (
                    <span className="px-1.5 py-0.5 rounded bg-gray-100 text-xs font-medium text-gray-700">
                      <span className="inline-block -translate-y-[8px]">{cls}</span>
                    </span>
                  )}
                </div>
                <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-700">
                  <span className="inline-flex items-center gap-1 font-semibold text-gray-800">
                    <MapPin className="h-3 w-3 text-blue-500" />
                    <span className="inline-block -translate-y-[8px]">{from}</span> <span className="text-gray-400"><span className="inline-block -translate-y-[8px]">→</span></span> <span className="inline-block -translate-y-[8px]">{to}</span>
                  </span>
                  {date && (
                    <span className="inline-flex items-center gap-1">
                      <Calendar className="h-3 w-3 text-gray-500" />
                      <span className="inline-block -translate-y-[8px]">{date}
                      {arrDate && arrDate !== date ? ` → ${arrDate}` : ''}</span>
                    </span>
                  )}
                  {time && (
                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-3 w-3 text-gray-500" />
                      <span className="inline-block -translate-y-[8px]">{time}
                      {arrTime ? ` - ${arrTime}` : ''}</span>
                    </span>
                  )}
                </div>
                <div className="mt-1 flex items-center gap-2">
                  <span
                    className={[
                      'inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold',
                      flown
                        ? 'bg-gray-200 text-gray-700'
                        : holding
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-blue-100 text-blue-700',
                    ].join(' ')}
                  >
                    <span className="inline-block -translate-y-[8px]">{flown ? 'Đã bay' : holding ? 'Đang giữ chỗ' : status}</span>
                  </span>
                  {willDelete && (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-red-100 text-red-700">
                      Sẽ xoá
                    </span>
                  )}
                </div>
              </div>
              {!readOnly && (
                <button
                  type="button"
                  disabled={flown}
                  onClick={() => onToggle(segNo)}
                  className={[
                    'shrink-0 inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium border transition-colors',
                    flown
                      ? 'opacity-50 cursor-not-allowed border-gray-200 text-gray-400'
                      : willDelete
                      ? 'border-red-300 bg-red-100 text-red-700 hover:bg-red-200'
                      : 'border-gray-300 text-gray-700 hover:bg-gray-50',
                  ].join(' ')}
                >
                  {willDelete ? (
                    <>
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Bỏ chọn
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-3.5 w-3.5" />
                      Xoá segment
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
