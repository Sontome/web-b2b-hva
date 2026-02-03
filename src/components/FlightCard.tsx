import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Plane, Clock, Users, Copy, ShoppingCart } from 'lucide-react';
import { Flight } from '@/services/flightApi';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useHoverSound } from '@/hooks/useHoverSound';

interface FlightCardProps {
  flight: Flight;
  priceMode: 'Page' | 'Live';
  onHoldTicket?: (flight: Flight) => void;
}

export const FlightCard: React.FC<FlightCardProps> = ({ flight, priceMode, onHoldTicket }) => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const { playClickSound } = useHoverSound();
  const [adjustedPrice, setAdjustedPrice] = useState(flight.price);

  useEffect(() => {
    // Apply airline-specific markup
    const vjMarkup = profile?.price_vj || 0;
    const vnaMarkup = profile?.price_vna || 0;
    
    let priceWithMarkup = flight.price;
    
    // Add airline-specific markup
    if (flight.airline === 'VJ') {
      priceWithMarkup += vjMarkup;
    } else if (flight.airline === 'VNA') {
      priceWithMarkup += vnaMarkup;
    }
    
    // Apply trip type fees based on airline
    const isRoundTrip = !!flight.return;
    if (flight.airline === 'VJ') {
      if (isRoundTrip) {
        priceWithMarkup += profile?.price_rt_vj || 0;
      } else {
        priceWithMarkup += profile?.price_ow_vj || 0;
      }
    } else if (flight.airline === 'VNA') {
      if (isRoundTrip) {
        priceWithMarkup += profile?.price_rt_vna || 0;
      } else {
        priceWithMarkup += profile?.price_ow_vna || 0;
      }
    }
    
    // Round to nearest hundred
    const roundedPrice = Math.round(priceWithMarkup / 100) * 100;
    setAdjustedPrice(roundedPrice);
  }, [flight.price, flight.airline, profile?.price_vj, profile?.price_vna, profile?.price_ow_vj, profile?.price_rt_vj, profile?.price_ow_vna, profile?.price_rt_vna, flight.return]);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ko-KR').format(price);
  };

  const formatDate = (dateStr: string) => {
    const [day, month, year] = dateStr.split('/');
    return `${day}/${month}`;
  };

  const getFlightType = () => {
    // For one-way flights, only check departure
    if (!flight.return) {
      const isDirect = flight.departure.stops === 0;
      return isDirect ? 'Bay thẳng' : `${flight.departure.stops} điểm dừng`;
    }
    
    // For round-trip flights, check both departure and return
    const isDepartureDirectOne = flight.departure.stops === 0;
    const isReturnDirectOne = flight.return.stops === 0;
    
    if (isDepartureDirectOne && isReturnDirectOne) {
      return 'Bay thẳng';
    } else if (!isDepartureDirectOne && !isReturnDirectOne) {
      return `${flight.departure.stops} điểm dừng - ${flight.return.stops} điểm dừng`;
    } else if (!isDepartureDirectOne) {
      return `${flight.departure.stops} điểm dừng - Bay thẳng`;
    } else {
      return `Bay thẳng - ${flight.return.stops} điểm dừng`;
    }
  };

  const getBaggageInfo = () => {
    if (flight.airline === 'VJ') {
      return 'Vietjet 7kg xách tay, 20kg ký gửi';
    } else {
      // VNA baggage based on hành_lý_vna field
      if (flight.baggageType === 'ADT') {
        return 'VNairlines 10kg xách tay, 23kg ký gửi';
      } else {
        return 'VNairlines 10kg xách tay, 46kg ký gửi';
      }
    }
  };

  const getTicketClass = () => {
    if (flight.airline === 'VJ') {
      // For VietJet, if it's one-way, only show departure ticket class
      if (!flight.return) {
        return flight.ticketClass;
      }
      // For round trip, show both ticket classes
      return `${flight.ticketClass}-${flight.return.ticketClass}`;
    } else {
      // For VNA, if it's one-way, only show the departure ticket class
      if (!flight.return) {
        return flight.ticketClass;
      }
      // For round trip, show both
      return `${flight.ticketClass}-${flight.return.ticketClass}`;
    }
  };

  const getTripTypeLabel = () => {
    return flight.return ? 'Khứ hồi' : 'Một chiều';
  };

  const formatFlightWithStops = (isReturn = false) => {
    const departureInfo = isReturn ? flight.return?.departure : flight.departure;
    const arrivalInfo = isReturn ? flight.return?.arrival : flight.arrival;
    const stopInfo = isReturn ? flight.return?.stopInfo : flight.stopInfo;
    const landingTime = isReturn ? flight.return?.landingTime : flight.landingTime;
    const landingDate = isReturn ? flight.return?.landingDate : flight.landingDate;
    const stops = isReturn ? flight.return?.stops : flight.departure.stops;
    
    if (!departureInfo || !arrivalInfo) return '';
    
    // Direct flight - simple format
    if (!stops || stops === 0 || !stopInfo?.stop1) {
      return `${departureInfo.airport}-${arrivalInfo.airport} ${departureInfo.time} ngày ${formatDate(departureInfo.date)}`;
    }
    
    // Flight with stops - detailed format
    const legLabel = isReturn ? 'Chiều về' : 'Chiều đi';
    const leg1 = `Chặng 1: ${departureInfo.airport} → ${stopInfo.stop1}: ${departureInfo.time} ngày ${formatDate(departureInfo.date)} (chờ ${stopInfo.waitTime})`;
    const leg2Landing = landingTime && landingDate ? `${landingTime} ngày ${formatDate(landingDate)}` : arrivalInfo.time;
    const leg2 = `Chặng 2: ${stopInfo.stop1} → ${arrivalInfo.airport}: ${leg2Landing}`;
    
    return `${legLabel}:\n${leg1}\n${leg2}`;
  };

  const hasStops = (isReturn = false) => {
    const stops = isReturn ? flight.return?.stops : flight.departure.stops;
    const stopInfo = isReturn ? flight.return?.stopInfo : flight.stopInfo;
    return stops && stops > 0 && stopInfo?.stop1;
  };

  const handleCopyFlight = () => {
    const outboundLine = formatFlightWithStops(false);
    const returnLine = flight.return ? formatFlightWithStops(true) : '';
    
    const copyText = `${outboundLine}${returnLine ? `\n\n${returnLine}` : ''}

${getBaggageInfo()}, giá vé = ${formatPrice(adjustedPrice)}w`;

    navigator.clipboard.writeText(copyText).then(() => {
      toast({
        title: "Đã copy thông tin chuyến bay",
        description: "Thông tin chuyến bay đã được copy vào clipboard",
      });
    }).catch(() => {
      toast({
        title: "Lỗi copy",
        description: "Không thể copy thông tin chuyến bay",
        variant: "destructive",
      });
    });
  };

  const isADT = flight.airline === 'VNA' && flight.baggageType === 'ADT';

  return (
    <Card 
      className={`chase-border-card hover:shadow-lg hover:scale-[1.02] transition-all duration-300 mb-4 opacity-0 animate-fade-in relative ${isADT ? 'border-red-500 border-2' : ''}`}
      onMouseEnter={playClickSound}
    >
      <CardContent className="p-6">
        {/* Hold Ticket Icon Button */}
        {onHoldTicket && (
          <Button 
            onClick={() => onHoldTicket(flight)}
            size="icon"
            variant="ghost"
            className="absolute top-4 right-4 z-10 bg-white/80 hover:bg-white/90 dark:bg-gray-800/80 dark:hover:bg-gray-800/90"
            title="Giữ vé"
          >
            <ShoppingCart className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </Button>
        )}

        <div className="flex flex-col space-y-4">
          {/* Price and Main Info */}
          <div className="flex justify-between items-start">
            <div>
              <div className="text-2xl font-bold text-blue-600 mb-1 transition-colors duration-200">
                {formatPrice(adjustedPrice)} KRW
              </div>
              <div className={`text-sm transition-colors duration-200 ${isADT ? 'text-red-600 font-semibold' : 'text-gray-600 dark:text-gray-400'}`}>
                {getTripTypeLabel()}: {getTicketClass()} - {getFlightType()}
              </div>
              <div className="flex items-center text-sm text-gray-500 mt-1 transition-colors duration-200">
                <Users className="w-4 h-4 mr-1" />
                Còn {flight.availableSeats} ghế
              </div>
            </div>
            <div className="flex items-center space-x-2 mr-12">
              <Badge 
                variant={flight.airline === 'VJ' ? 'default' : 'secondary'}
                className={`transition-all duration-200 ${flight.airline === 'VJ' ? 'bg-red-500 hover:bg-red-600' : 'bg-blue-500 hover:bg-blue-600 text-white'}`}
              >
                {flight.airline === 'VJ' ? 'VietJet' : 'Vietnam Airlines'}
              </Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyFlight}
                className="p-2 transition-all duration-200 hover:scale-105"
              >
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Flight Details */}
          <div className="space-y-3">
            {/* Outbound Flight */}
            {hasStops(false) ? (
              <div className="text-sm space-y-1">
                <div className={`font-semibold ${isADT ? 'text-red-600' : 'text-foreground'}`}>
                  Chiều đi:
                </div>
                <div className="flex items-start space-x-2 ml-2">
                  <Plane className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                  <div className="space-y-1">
                    <div className={isADT ? 'text-red-600' : ''}>
                      Chặng 1: {flight.departure.airport} → {flight.stopInfo?.stop1}: {flight.departure.time} ngày {formatDate(flight.departure.date)} (chờ {flight.stopInfo?.waitTime})
                    </div>
                    <div className={isADT ? 'text-red-600' : ''}>
                      Chặng 2: {flight.stopInfo?.stop1} → {flight.arrival.airport}: {flight.landingTime || flight.arrival.time} ngày {formatDate(flight.landingDate || flight.arrival.date)}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center space-x-2">
                  <Plane className="w-4 h-4 text-primary" />
                  <span className={`font-medium ${isADT ? 'text-red-600' : ''}`}>
                    {flight.departure.airport}-{flight.arrival.airport}
                  </span>
                  <span className={isADT ? 'text-red-600' : ''}>{flight.departure.time}</span>
                  <span className={isADT ? 'text-red-600' : ''}>ngày {formatDate(flight.departure.date)}</span>
                </div>
              </div>
            )}

            {/* Return Flight (if applicable) */}
            {flight.return && (
              hasStops(true) ? (
                <div className="text-sm space-y-1">
                  <div className={`font-semibold ${isADT ? 'text-red-600' : 'text-foreground'}`}>
                    Chiều về:
                  </div>
                  <div className="flex items-start space-x-2 ml-2">
                    <Plane className="w-4 h-4 text-primary mt-0.5 flex-shrink-0 transform rotate-180" />
                    <div className="space-y-1">
                      <div className={isADT ? 'text-red-600' : ''}>
                        Chặng 1: {flight.return.departure.airport} → {flight.return.stopInfo?.stop1}: {flight.return.departure.time} ngày {formatDate(flight.return.departure.date)} (chờ {flight.return.stopInfo?.waitTime})
                      </div>
                      <div className={isADT ? 'text-red-600' : ''}>
                        Chặng 2: {flight.return.stopInfo?.stop1} → {flight.return.arrival.airport}: {flight.return.landingTime || flight.return.arrival.time} ngày {formatDate(flight.return.landingDate || flight.return.arrival.date)}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center space-x-2">
                    <Plane className="w-4 h-4 text-primary transform rotate-180" />
                    <span className={`font-medium ${isADT ? 'text-red-600' : ''}`}>
                      {flight.return.departure.airport}-{flight.return.arrival.airport}
                    </span>
                    <span className={isADT ? 'text-red-600' : ''}>{flight.return.departure.time}</span>
                    <span className={isADT ? 'text-red-600' : ''}>ngày {formatDate(flight.return.departure.date)}</span>
                  </div>
                </div>
              )
            )}
          </div>

          {/* Baggage and Price Info */}
          <div className={`border-t pt-4 transition-all duration-200`}>
            <div className={`text-sm ${isADT ? 'text-red-600 font-semibold' : 'text-gray-600 dark:text-gray-400'}`}>
              {getBaggageInfo()}, giá vé = {formatPrice(adjustedPrice)}w
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
