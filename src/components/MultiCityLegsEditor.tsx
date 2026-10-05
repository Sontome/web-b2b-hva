import React from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Plane, Plus, Trash2 } from 'lucide-react';
import { format, startOfDay } from 'date-fns';
import { cn } from '@/lib/utils';
import type { MultiCityLegInput } from '@/services/vnaMultiCityApi';

export interface AirportOption { code: string; name: string; city: string }

interface Props {
  legs: MultiCityLegInput[];
  onChange: (legs: MultiCityLegInput[]) => void;
  koreanAirports: AirportOption[];
  vietnameseAirports: AirportOption[];
}

export const MIN_LEGS = 2;
export const MAX_LEGS = 4;

/** Allowed destinations: last leg of a 3+ leg trip → Korea; everything else → Vietnam. */
export const destinationOptionsFor = (
  i: number,
  total: number,
  kr: AirportOption[],
  vn: AirportOption[],
) => (i === total - 1 && total >= 3 ? kr : vn);

/** Clear destinations that are not allowed for their position and dates that break ordering. Never auto-fills values. */
export const normalizeLegs = (
  legs: MultiCityLegInput[],
  kr: AirportOption[],
  vn: AirportOption[],
): MultiCityLegInput[] => {
  const out: MultiCityLegInput[] = [];
  legs.forEach((leg, i) => {
    const origin = i === 0 && leg.origin && !kr.some((a) => a.code === leg.origin) ? '' : leg.origin;
    const allowed = destinationOptionsFor(i, legs.length, kr, vn).filter((a) => a.code !== origin);
    const destination = allowed.some((a) => a.code === leg.destination) ? leg.destination : '';
    const prevDate = i > 0 ? out[i - 1].date : undefined;
    const date = leg.date && prevDate && startOfDay(leg.date) < startOfDay(prevDate) ? undefined : leg.date;
    out.push({ origin, destination, date });
  });
  return out;
};

export const MultiCityLegsEditor: React.FC<Props> = ({ legs, onChange, koreanAirports, vietnameseAirports }) => {
  const today = startOfDay(new Date());
  const [openIdx, setOpenIdx] = React.useState<number | null>(null);

  const update = (next: MultiCityLegInput[]) => onChange(normalizeLegs(next, koreanAirports, vietnameseAirports));

  const setLeg = (i: number, patch: Partial<MultiCityLegInput>) =>
    update(
      legs.map((l, idx) => {
        if (idx === i) return { ...l, ...patch };
        // Choosing a destination pre-fills the next leg's origin (user can still change it afterwards)
        if (patch.destination !== undefined && idx === i + 1) return { ...l, origin: patch.destination };
        return l;
      }),
    );

  const isKR = (c: string) => koreanAirports.some((a) => a.code === c);

  const addLeg = () => {
    if (legs.length >= MAX_LEGS) return;
    const last = legs[legs.length - 1];
    if (last && last.destination && isKR(last.destination)) {
      // Trip currently returns to Korea: move that return to the new last leg,
      // leave the previous leg's destination and the new leg's origin empty.
      const next = legs.map((l, idx) => (idx === legs.length - 1 ? { ...l, destination: '' } : l));
      update([...next, { origin: '', destination: last.destination, date: undefined }]);
    } else {
      update([...legs, { origin: last?.destination ?? '', destination: '', date: undefined }]);
    }
  };

  const removeLeg = (i: number) => {
    if (legs.length <= MIN_LEGS) return;
    update(legs.filter((_, idx) => idx !== i));
  };

  const allAirports = [...koreanAirports, ...vietnameseAirports];

  return (
    <div className="space-y-3">
      {legs.map((leg, i) => {
        const destOptions = destinationOptionsFor(i, legs.length, koreanAirports, vietnameseAirports).filter(
          (a) => a.code !== leg.origin,
        );
        const prevDate = i > 0 ? legs[i - 1].date : undefined;
        const minDate = prevDate ? startOfDay(prevDate) : today;
        return (
          <div key={i} className="rounded-lg border border-gray-200 p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-blue-700">Chặng {i + 1}</span>
              {i >= 2 && legs.length > MIN_LEGS && (
                <Button type="button" variant="ghost" size="sm" onClick={() => removeLeg(i)} className="h-7 px-2 text-red-600">
                  <Trash2 className="h-3.5 w-3.5 mr-1" /> Xóa
                </Button>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-gray-600 font-medium flex items-center gap-1.5">
                  <Plane className="w-3.5 h-3.5 text-blue-600" /> Nơi đi
                </Label>
                <Select value={leg.origin} onValueChange={(v) => setLeg(i, { origin: v })}>
                  <SelectTrigger className="h-10 text-sm border-gray-300">
                    <SelectValue placeholder="Chọn sân bay đi" />
                  </SelectTrigger>
                  <SelectContent>
                    {(i === 0 ? koreanAirports : allAirports)
                      .filter((a) => a.code !== leg.destination)
                      .map((a) => (
                        <SelectItem key={a.code} value={a.code}>{a.code} - {a.name}</SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-gray-600 font-medium flex items-center gap-1.5">
                  <Plane className="w-3.5 h-3.5 text-blue-600 rotate-90" /> Nơi đến
                </Label>
                <Select value={leg.destination} onValueChange={(v) => setLeg(i, { destination: v })}>
                  <SelectTrigger className="h-10 text-sm border-gray-300">
                    <SelectValue placeholder="Chọn sân bay đến" />
                  </SelectTrigger>
                  <SelectContent>
                    {destOptions.map((a) => (
                      <SelectItem key={a.code} value={a.code}>{a.code} - {a.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-gray-600 font-medium flex items-center gap-1.5">
                  <CalendarIcon className="w-3.5 h-3.5 text-blue-600" /> Ngày đi
                </Label>
                <Popover open={openIdx === i} onOpenChange={(o) => setOpenIdx(o ? i : null)}>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className={cn(
                        'w-full justify-start text-left font-normal h-10 text-sm border-gray-300 hover:border-blue-500',
                        !leg.date && 'text-muted-foreground',
                      )}
                    >
                      <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                      {leg.date ? format(leg.date, 'dd/MM/yyyy') : <span className="text-xs">Chọn ngày</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={leg.date}
                      onSelect={(d) => {
                        setLeg(i, { date: d });
                        setOpenIdx(null);
                      }}
                      disabled={(d) => d < minDate}
                      defaultMonth={leg.date || prevDate || today}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>
        );
      })}
      {legs.length < MAX_LEGS && (
        <Button type="button" variant="outline" size="sm" onClick={addLeg} className="border-blue-300 text-blue-700 hover:bg-blue-50">
          <Plus className="h-4 w-4 mr-1" /> Thêm chặng
        </Button>
      )}
    </div>
  );
};
