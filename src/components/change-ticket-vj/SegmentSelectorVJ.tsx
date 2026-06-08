import React from 'react';
import { Plane, MapPin, Calendar, Clock } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import type { VJTrip } from '@/types/changeTicketVJ';

interface Props {
  trips: VJTrip[];
  selected: number | null;
  onSelect: (segNo: number) => void;
  readOnly?: boolean;
  markAll?: boolean;
}

function fmt(dt?: string): { date: string; time: string } {
  if (!dt) return { date: '', time: '' };
  const [d, t] = dt.split(' ');
  return { date: d || '', time: t || '' };
}

export const SegmentSelectorVJ: React.FC<Props> = ({
  trips,
  selected,
  onSelect,
  readOnly = false,
  markAll = false,
}) => {
  return (
    <RadioGroup
      value={selected != null ? String(selected) : ''}
      onValueChange={(v) => onSelect(Number(v))}
      className="space-y-2"
    >
      {trips.map((trip, idx) => {
        const segNo = Number(trip.seg_no ?? idx + 1);
        const isSelected = markAll || selected === segNo;
        const dep = fmt(trip.departure_time);
        const arr = fmt(trip.arrival_time);
        return (
          <label
            key={`${segNo}-${idx}`}
            className={[
              'flex items-start gap-3 border rounded-lg p-3 transition-colors cursor-pointer',
              isSelected
                ? 'border-red-300 bg-red-50'
                : 'border-gray-200 bg-white hover:bg-gray-50',
              readOnly ? 'cursor-default' : '',
            ].join(' ')}
          >
            {!readOnly && !markAll && (
              <RadioGroupItem value={String(segNo)} className="mt-1" />
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 text-sm font-semibold text-gray-800">
                <Plane className="h-4 w-4 text-red-500" />
                <span>{trip.flight_no || `SEG ${segNo}`}</span>
                {isSelected && (
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-red-100 text-red-700">
                    {markAll ? 'Sẽ thay thế' : 'Sẽ đổi'}
                  </span>
                )}
              </div>
              <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-700">
                <span className="inline-flex items-center gap-1 font-semibold">
                  <MapPin className="h-3 w-3 text-red-500" />
                  {trip.origin}
                  <span className="text-gray-400">→</span>
                  {trip.destination}
                </span>
                {dep.date && (
                  <span className="inline-flex items-center gap-1">
                    <Calendar className="h-3 w-3 text-gray-500" />
                    {dep.date}
                  </span>
                )}
                {(dep.time || arr.time) && (
                  <span className="inline-flex items-center gap-1">
                    <Clock className="h-3 w-3 text-gray-500" />
                    {dep.time}
                    {arr.time ? ` - ${arr.time}` : ''}
                  </span>
                )}
              </div>
            </div>
          </label>
        );
      })}
    </RadioGroup>
  );
};
