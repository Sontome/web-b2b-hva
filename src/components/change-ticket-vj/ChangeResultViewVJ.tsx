import React from 'react';
import { ArrowDown, Plane, MapPin, Calendar, Clock } from 'lucide-react';
import type { VJTrip } from '@/types/changeTicketVJ';

function fmt(dt?: string): { date: string; time: string } {
  if (!dt) return { date: '', time: '' };
  const [d, t] = dt.split(' ');
  return { date: d || '', time: t || '' };
}

const TripCard: React.FC<{ trip: VJTrip; tone: 'old' | 'new' }> = ({
  trip,
  tone,
}) => {
  const dep = fmt(trip.departure_time);
  const arr = fmt(trip.arrival_time);
  const cls =
    tone === 'old'
      ? 'border-gray-300 bg-gray-50'
      : 'border-emerald-300 bg-emerald-50';
  return (
    <div className={`border rounded-lg p-3 ${cls}`}>
      <div className="flex items-center gap-2 text-sm font-semibold text-gray-800">
        <Plane
          className={`h-4 w-4 ${tone === 'new' ? 'text-emerald-600' : 'text-gray-500'}`}
        />
        <span className="inline-block -translate-y-[8px]">{trip.flight_no || '—'}</span>
      </div>
      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-700">
        <span className="inline-flex items-center gap-1 font-semibold">
          <MapPin className="h-3 w-3 text-blue-500" />
          <span className="inline-block -translate-y-[8px]">{trip.origin}</span>
          <span className="text-gray-400 inline-block -translate-y-[8px]">→</span>
          <span className="inline-block -translate-y-[8px]">{trip.destination}</span>
        </span>
        {dep.date && (
          <span className="inline-flex items-center gap-1">
            <Calendar className="h-3 w-3 text-gray-500" />
            <span className="inline-block -translate-y-[8px]">{dep.date}</span>
          </span>
        )}
        {(dep.time || arr.time) && (
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3 w-3 text-gray-500" />
            <span className="inline-block -translate-y-[8px]">
              {dep.time}
              {arr.time ? ` - ${arr.time}` : ''}
            </span>
          </span>
        )}
      </div>
    </div>
  );
};

export const ChangeResultViewVJ: React.FC<{
  oldTrips: VJTrip[];
  newTrips: VJTrip[];
}> = ({ oldTrips, newTrips }) => {
  return (
    <div className="space-y-3">
      {oldTrips.length > 0 && (
        <div>
          <div className="text-base font-bold text-gray-800 mb-2">
            <span className="inline-block -translate-y-[8px]">Hành trình cũ</span>
          </div>
          <div className="space-y-2">
            {oldTrips.map((t, i) => (
              <TripCard key={`old-${i}`} trip={t} tone="old" />
            ))}
          </div>
        </div>
      )}
      {oldTrips.length > 0 && newTrips.length > 0 && (
        <div className="flex justify-center">
          <ArrowDown className="h-5 w-5 text-gray-400" />
        </div>
      )}
      {newTrips.length > 0 && (
        <div>
          <div className="text-base font-bold text-emerald-700 mb-2">
            <span className="inline-block -translate-y-[8px]">Hành trình mới</span>
          </div>
          <div className="space-y-2">
            {newTrips.map((t, i) => (
              <TripCard key={`new-${i}`} trip={t} tone="new" />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
