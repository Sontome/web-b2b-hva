import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Copy, GraduationCap, Plane, ShoppingCart, Users } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import type { MultiCityFlight } from '@/services/vnaMultiCityApi';

interface Props {
  flight: MultiCityFlight;
  showStuCheck?: boolean;
  onCheckStu?: () => void;
}

const formatPrice = (p: number) => new Intl.NumberFormat('ko-KR').format(p);
const formatDate = (d: string) => {
  const [day, month] = (d || '').split('/');
  return month ? `${day}/${month}` : d;
};

export const VnaMultiCityCard: React.FC<Props> = ({ flight, showStuCheck, onCheckStu }) => {
  const { profile } = useAuth();
  const { toast } = useToast();

  // Same fee settings as VNA round-trip
  const adjustedPrice = React.useMemo(() => {
    const p = flight.price + (profile?.price_vna || 0) + (profile?.price_rt_vna || 0);
    return Math.round(p / 100) * 100;
  }, [flight.price, profile?.price_vna, profile?.price_rt_vna]);

  const isADT = flight.baggageType === 'ADT';
  const prefix = flight.baggageType === 'STU' ? 'VNairlines DHS' : 'VNairlines';
  const baggage = isADT ? `${prefix} 10kg xách tay, 23kg ký gửi` : `${prefix} 10kg xách tay, 46kg ký gửi`;
  const classes = flight.legs.map((l) => l.ticketClass).join('-');
  const red = isADT ? 'text-red-600' : '';

  const handleCopy = () => {
    const lines = flight.legs.map(
      (l) => `Chặng ${l.index}: ${l.from}-${l.to} ${l.departureTime} ngày ${formatDate(l.departureDate)}`,
    );
    const text = `${lines.join('\n')}\n\n${baggage}, giá vé = ${formatPrice(adjustedPrice)}w`;
    navigator.clipboard
      .writeText(text)
      .then(() => toast({ title: 'Đã copy thông tin chuyến bay', description: 'Thông tin chuyến bay đã được copy vào clipboard' }))
      .catch(() => toast({ title: 'Lỗi copy', description: 'Không thể copy thông tin chuyến bay', variant: 'destructive' }));
  };

  return (
    <Card className={`chase-border-card hover:shadow-lg transition-all duration-300 mb-4 animate-fade-in relative ${isADT ? 'border-red-500 border-2' : ''}`}>
      <CardContent className="p-6">
        <div className="flex flex-col space-y-4">
          <div className="flex justify-between items-start">
            <div>
              <div className="text-2xl font-bold text-blue-600 mb-1">{formatPrice(adjustedPrice)} KRW</div>
              <div className={`text-sm ${isADT ? 'text-red-600 font-semibold' : 'text-gray-600 dark:text-gray-400'}`}>
                Nhiều chặng: {classes}
              </div>
              <div className="flex items-center text-sm text-gray-500 mt-1">
                <Users className="w-4 h-4 mr-1" />
                Còn {flight.availableSeats} ghế
              </div>
            </div>
            <TooltipProvider delayDuration={150}>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary" className="bg-blue-500 hover:bg-blue-600 text-white">Vietnam Airlines</Badge>
                <Button variant="outline" size="sm" onClick={handleCopy} className="p-2" aria-label="Copy">
                  <Copy className="w-4 h-4" />
                </Button>
                {showStuCheck && onCheckStu && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        aria-label="Check giá STU"
                        onClick={onCheckStu}
                        className="h-9 w-9 inline-flex items-center justify-center rounded-md bg-white/80 hover:bg-indigo-50 transition-colors shadow-sm"
                      >
                        <GraduationCap className="h-5 w-5 text-indigo-600" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>Check giá STU</TooltipContent>
                  </Tooltip>
                )}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span tabIndex={0}>
                      <Button variant="outline" size="sm" disabled aria-label="Giữ vé">
                        <ShoppingCart className="w-4 h-4" />
                      </Button>
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>Chức năng giữ vé nhiều chặng đang được phát triển</TooltipContent>
                </Tooltip>
              </div>
            </TooltipProvider>
          </div>

          <div className="space-y-2">
            {flight.legs.map((l) => (
              <div key={l.index} className="flex items-start gap-2 text-sm">
                <Plane className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                <div className={red}>
                  <span className="font-semibold">Chặng {l.index}:</span>{' '}
                  <span className="font-medium">{l.from}-{l.to}</span> {l.departureTime} ngày {formatDate(l.departureDate)}
                  {l.arrivalTime && <> → {l.arrivalTime}{l.arrivalDate && l.arrivalDate !== l.departureDate ? ` ngày ${formatDate(l.arrivalDate)}` : ''}</>}
                  <span className="text-gray-500"> · {l.flightNumber} · Hạng {l.ticketClass}</span>
                  {l.stops > 0 && l.stop1 && <span className="text-gray-500"> · dừng {l.stop1}{l.waitTime ? ` (chờ ${l.waitTime})` : ''}</span>}
                </div>
              </div>
            ))}
          </div>

          <div className="border-t pt-4">
            <div className={`text-sm ${isADT ? 'text-red-600 font-semibold' : 'text-gray-600 dark:text-gray-400'}`}>
              {baggage}, giá vé = {formatPrice(adjustedPrice)}w
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
