import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Plane, Users, Copy } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useHoverSound } from '@/hooks/useHoverSound';

// Airline code to name mapping
export const AIRLINE_NAMES: Record<string, string> = {
  'OZ': 'Asiana',
  'TW': 'Tway',
  'LJ': 'Jin Air',
  'BX': 'Air Busan',
  'KE': 'Korean Air',
  '7C': 'Jeju',
  'YP': 'Premia',
  'RS': 'Air Seoul',
};

// Baggage info for each airline
export const AIRLINE_BAGGAGE: Record<string, { carryOn: string; checked?: string }> = {
  '7C': { carryOn: '10kg', checked: '15kg' },
  'YP': { carryOn: '10kg', checked: '23kg' },
  'LJ': { carryOn: '10kg', checked: '15kg' },
  'TW': { carryOn: '10kg' },
  'KE': { carryOn: '10kg', checked: '23kg' },
  'OZ': { carryOn: '10kg', checked: '23kg' },
  'RS': { carryOn: '10kg', checked: '15kg' },
  'BX': { carryOn: '10kg', checked: '15kg' },
};

// Define which airlines go in each column
const LEFT_COLUMN_AIRLINES = ['OZ', 'TW', 'LJ', 'BX']; // Asiana, Tway, Jin Air, Air Busan
const RIGHT_COLUMN_AIRLINES = ['KE', '7C', 'YP', 'RS']; // Korean Air, Jeju, Premia, Air Seoul

export interface OtherFlight {
  id: string;
  airline: string;
  airlineName: string;
  departure: {
    time: string;
    airport: string;
    city: string;
    date: string;
    stops: number;
  };
  arrival: {
    time: string;
    airport: string;
    city: string;
    date: string;
  };
  return?: {
    departure: {
      time: string;
      airport: string;
      city: string;
      date: string;
      stops: number;
    };
    arrival: {
      time: string;
      airport: string;
      city: string;
      date: string;
    };
    ticketClass: string;
    stops: number;
    stopInfo?: {
      stop1: string;
      waitTime: string;
    };
    landingTime?: string;
    landingDate?: string;
  };
  duration: string;
  price: number; // Original price
  adjustedPrice: number; // Price with markup applied
  currency: string;
  availableSeats: number;
  ticketClass: string;
  stopInfo?: {
    stop1: string;
    waitTime: string;
  };
  landingTime?: string;
  landingDate?: string;
  baggageInfo: {
    carryOn: string;
    checked?: string;
  };
}

interface OtherFlightCardProps {
  flight: OtherFlight;
}

const OtherFlightCard: React.FC<OtherFlightCardProps> = ({ flight }) => {
  const { toast } = useToast();
  const { playClickSound } = useHoverSound();

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ko-KR').format(price);
  };

  const formatDate = (dateStr: string) => {
    const [day, month, year] = dateStr.split('/');
    return `${day}/${month}`;
  };

  const getFlightType = () => {
    if (!flight.return) {
      const isDirect = flight.departure.stops === 0;
      return isDirect ? 'Bay thẳng' : `${flight.departure.stops} điểm dừng`;
    }
    
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
    const baggage = flight.baggageInfo;
    if (baggage.checked) {
      return `${flight.airlineName} ${baggage.carryOn} xách tay, ${baggage.checked} ký gửi`;
    }
    return `${flight.airlineName} ${baggage.carryOn} xách tay`;
  };

  const getTripTypeLabel = () => {
    return flight.return ? 'Khứ hồi' : 'Một chiều';
  };

  const getTicketClass = () => {
    if (!flight.return) {
      return flight.ticketClass;
    }
    return `${flight.ticketClass}-${flight.return.ticketClass}`;
  };

  const hasStops = (isReturn = false) => {
    const stops = isReturn ? flight.return?.stops : flight.departure.stops;
    const stopInfo = isReturn ? flight.return?.stopInfo : flight.stopInfo;
    return stops && stops > 0 && stopInfo?.stop1;
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

  const handleCopyFlight = () => {
    const outboundLine = formatFlightWithStops(false);
    const returnLine = flight.return ? formatFlightWithStops(true) : '';
    
    const copyText = `${outboundLine}${returnLine ? `\n\n${returnLine}` : ''}

${getBaggageInfo()}, giá vé = ${formatPrice(flight.adjustedPrice)}w`;

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

  // Get airline color based on code
  const getAirlineColor = (code: string) => {
    const colors: Record<string, string> = {
      'OZ': 'bg-orange-500 hover:bg-orange-600',
      'TW': 'bg-pink-500 hover:bg-pink-600',
      'LJ': 'bg-yellow-500 hover:bg-yellow-600 text-gray-900',
      'BX': 'bg-teal-500 hover:bg-teal-600',
      'KE': 'bg-sky-700 hover:bg-sky-800',
      '7C': 'bg-orange-600 hover:bg-orange-700',
      'YP': 'bg-purple-500 hover:bg-purple-600',
      'RS': 'bg-blue-400 hover:bg-blue-500',
    };
    return colors[code] || 'bg-gray-500 hover:bg-gray-600';
  };

  return (
    <Card 
      className="hover:shadow-lg hover:scale-[1.02] transition-all duration-300 mb-3 opacity-0 animate-fade-in"
      onMouseEnter={playClickSound}
    >
      <CardContent className="p-4">
        <div className="flex flex-col space-y-3">
          {/* Price and Main Info */}
          <div className="flex justify-between items-start">
            <div>
              <div className="text-xl font-bold text-blue-600 mb-1">
                {formatPrice(flight.adjustedPrice)} KRW
              </div>
              <div className="text-sm text-gray-600">
                {getTripTypeLabel()}: {getTicketClass()} - {getFlightType()}
              </div>
              <div className="flex items-center text-sm text-gray-500 mt-1">
                <Users className="w-4 h-4 mr-1" />
                Còn {flight.availableSeats} ghế
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Badge className={`${getAirlineColor(flight.airline)} text-white`}>
                {flight.airlineName}
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
          <div className="space-y-2">
            {/* Outbound Flight */}
            {hasStops(false) ? (
              <div className="text-sm space-y-1">
                <div className="font-semibold text-foreground">Chiều đi:</div>
                <div className="flex items-start space-x-2 ml-2">
                  <Plane className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                  <div className="space-y-1">
                    <div>
                      Chặng 1: {flight.departure.airport} → {flight.stopInfo?.stop1}: {flight.departure.time} ngày {formatDate(flight.departure.date)} (chờ {flight.stopInfo?.waitTime})
                    </div>
                    <div>
                      Chặng 2: {flight.stopInfo?.stop1} → {flight.arrival.airport}: {flight.landingTime || flight.arrival.time} ngày {formatDate(flight.landingDate || flight.arrival.date)}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center text-sm">
                <Plane className="w-4 h-4 text-primary mr-2" />
                <span className="font-medium">{flight.departure.airport}-{flight.arrival.airport}</span>
                <span className="ml-2">{flight.departure.time}</span>
                <span className="ml-2">ngày {formatDate(flight.departure.date)}</span>
              </div>
            )}

            {/* Return Flight */}
            {flight.return && (
              hasStops(true) ? (
                <div className="text-sm space-y-1">
                  <div className="font-semibold text-foreground">Chiều về:</div>
                  <div className="flex items-start space-x-2 ml-2">
                    <Plane className="w-4 h-4 text-primary mt-0.5 flex-shrink-0 rotate-180" />
                    <div className="space-y-1">
                      <div>
                        Chặng 1: {flight.return.departure.airport} → {flight.return.stopInfo?.stop1}: {flight.return.departure.time} ngày {formatDate(flight.return.departure.date)} (chờ {flight.return.stopInfo?.waitTime})
                      </div>
                      <div>
                        Chặng 2: {flight.return.stopInfo?.stop1} → {flight.return.arrival.airport}: {flight.return.landingTime || flight.return.arrival.time} ngày {formatDate(flight.return.landingDate || flight.return.arrival.date)}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center text-sm">
                  <Plane className="w-4 h-4 text-primary mr-2 rotate-180" />
                  <span className="font-medium">{flight.return.departure.airport}-{flight.return.arrival.airport}</span>
                  <span className="ml-2">{flight.return.departure.time}</span>
                  <span className="ml-2">ngày {formatDate(flight.return.departure.date)}</span>
                </div>
              )
            )}
          </div>

          {/* Baggage Info */}
          <div className="border-t pt-2 text-sm text-gray-600">
            {getBaggageInfo()}, giá vé = {formatPrice(flight.adjustedPrice)}w
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

interface OtherAirlinesModalProps {
  isOpen: boolean;
  onClose: () => void;
  flights: OtherFlight[];
  allowedAirlines: string[];
}

export const OtherAirlinesModal: React.FC<OtherAirlinesModalProps> = ({
  isOpen,
  onClose,
  flights,
  allowedAirlines,
}) => {
  // Filter flights by allowed airlines and group by airline
  const groupedFlights = React.useMemo(() => {
    const filtered = flights.filter(f => allowedAirlines.includes(f.airline));
    
    const grouped: Record<string, OtherFlight[]> = {};
    filtered.forEach(flight => {
      if (!grouped[flight.airline]) {
        grouped[flight.airline] = [];
      }
      grouped[flight.airline].push(flight);
    });

    // Sort each airline's flights by price
    Object.keys(grouped).forEach(airline => {
      grouped[airline].sort((a, b) => a.adjustedPrice - b.adjustedPrice);
    });

    return grouped;
  }, [flights, allowedAirlines]);

  // Get airlines for each column (only those with flights)
  const leftColumnAirlines = LEFT_COLUMN_AIRLINES.filter(
    code => allowedAirlines.includes(code) && groupedFlights[code]?.length > 0
  );
  const rightColumnAirlines = RIGHT_COLUMN_AIRLINES.filter(
    code => allowedAirlines.includes(code) && groupedFlights[code]?.length > 0
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-gray-800">
            Vé hãng khác ({flights.filter(f => allowedAirlines.includes(f.airline)).length} chuyến bay)
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-4">
          {/* Left Column */}
          <div className="space-y-4">
            {leftColumnAirlines.map(airlineCode => (
              <div key={airlineCode} className="bg-gray-50 rounded-lg p-3">
                <h3 className="text-lg font-semibold mb-3" style={{ 
                  color: airlineCode === 'LJ' ? '#EAB308' : 
                         airlineCode === 'OZ' ? '#F97316' :
                         airlineCode === 'TW' ? '#EC4899' :
                         airlineCode === 'BX' ? '#14B8A6' : '#6B7280'
                }}>
                  {AIRLINE_NAMES[airlineCode]} ({groupedFlights[airlineCode]?.length || 0} chuyến)
                </h3>
                <div className="space-y-2">
                  {groupedFlights[airlineCode]?.map(flight => (
                    <OtherFlightCard key={flight.id} flight={flight} />
                  ))}
                </div>
              </div>
            ))}
            {leftColumnAirlines.length === 0 && (
              <div className="text-center text-gray-500 py-8">
                Không có vé từ các hãng Asiana, Tway, Jin Air, Air Busan
              </div>
            )}
          </div>

          {/* Right Column */}
          <div className="space-y-4">
            {rightColumnAirlines.map(airlineCode => (
              <div key={airlineCode} className="bg-gray-50 rounded-lg p-3">
                <h3 className="text-lg font-semibold mb-3" style={{ 
                  color: airlineCode === 'KE' ? '#0369A1' : 
                         airlineCode === '7C' ? '#EA580C' :
                         airlineCode === 'YP' ? '#A855F7' :
                         airlineCode === 'RS' ? '#60A5FA' : '#6B7280'
                }}>
                  {AIRLINE_NAMES[airlineCode]} ({groupedFlights[airlineCode]?.length || 0} chuyến)
                </h3>
                <div className="space-y-2">
                  {groupedFlights[airlineCode]?.map(flight => (
                    <OtherFlightCard key={flight.id} flight={flight} />
                  ))}
                </div>
              </div>
            ))}
            {rightColumnAirlines.length === 0 && (
              <div className="text-center text-gray-500 py-8">
                Không có vé từ các hãng Korean Air, Jeju, Premia, Air Seoul
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
