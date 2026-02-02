import React, { useMemo, useState, useEffect } from 'react';
import { format, parse } from 'date-fns';
import { vi } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Search, Calendar, TrendingDown, Plane } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface LowFareDay {
  ngày: string;
  giá_vé_gốc: number;
  loại_vé: string;
}

interface CheapestOtherFlight {
  airlineName: string;
  price: number;
  route: string;
  totalFlights: number;
}

interface LowFareChartProps {
  departureData: LowFareDay[];
  returnData: LowFareDay[];
  tripType: 'OW' | 'RT';
  onSearchWithDates: (departureDate: string, returnDate: string) => void;
  isLoading?: boolean;
  initialDepartureDate?: string; // yyyy-MM-dd format
  initialReturnDate?: string; // yyyy-MM-dd format
  cheapestOtherFlight?: CheapestOtherFlight | null;
  onShowOtherAirlines?: () => void;
}

const formatVND = (value: number) => {
  return new Intl.NumberFormat('vi-VN').format(value) + '₫';
};

// Parse date from dd/MM/yyyy format to Date object
const parseDate = (dateStr: string): Date => {
  return parse(dateStr, 'dd/MM/yyyy', new Date());
};

// Convert to yyyy-MM-dd format for API
const toApiFormat = (dateStr: string): string => {
  const date = parseDate(dateStr);
  return format(date, 'yyyy-MM-dd');
};

// Get color based on price relative to min/max
const getPriceColor = (
  price: number,
  minPrice: number,
  maxPrice: number
): string => {
  if (maxPrice === minPrice) return 'hsl(120, 90%, 50%)';

  let ratio = (price - minPrice) / (maxPrice - minPrice);

  // 👇 Giãn mạnh vùng rẻ
  if (ratio < 0.3) {
    ratio = ratio / 0.3;          // 0 → 1 trong vùng rẻ
    ratio = Math.pow(ratio, 0.35);
  } else {
    ratio = 1; // mấy giá cao cho đỏ hết, đỡ quan tâm
  }

  const hue = 120 - ratio * 120;
  const lightness = 70 - ratio * 35;

  return `hsl(${hue}, 95%, ${lightness}%)`;
};

// Get bar height based on price relative to min/max
const getBarHeight = (price: number, minPrice: number, maxPrice: number): number => {
  if (maxPrice === minPrice) return 35; // Default height if all same price
  
  const ratio = (price - minPrice) / (maxPrice - minPrice);
  // Height ranges from 15px (cheapest) to 45px (most expensive)
  return 15 + (ratio * 30);
};

const SingleChart: React.FC<{
  data: LowFareDay[];
  label: string;
  selectedDate: string | null;
  onSelectDate: (date: string) => void;
  disabledBefore?: string;
  minPrice: number;
  maxPrice: number;
}> = ({ data, label, selectedDate, onSelectDate, disabledBefore, minPrice, maxPrice }) => {
  if (!data || data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-20 text-gray-400">
        <Calendar className="w-6 h-6 mb-1 opacity-50" />
        <span className="text-xs">Không có dữ liệu</span>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
        <span>{label}</span>
        {selectedDate && (
          <span className="text-blue-600 font-semibold">
            (Đã chọn: {selectedDate})
          </span>
        )}
      </div>
      <div className="flex gap-1 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-gray-300">
        <TooltipProvider delayDuration={0}>
          {data.map((day, index) => {
            const isDisabled = disabledBefore 
              ? parseDate(day.ngày) <= parseDate(disabledBefore)
              : false;
            const isSelected = selectedDate === day.ngày;
            const barHeight = getBarHeight(day.giá_vé_gốc, minPrice, maxPrice);
            const barColor = getPriceColor(day.giá_vé_gốc, minPrice, maxPrice);
            const dateObj = parseDate(day.ngày);
            const dayOfWeek = format(dateObj, 'EEE', { locale: vi });
            const dayNum = format(dateObj, 'dd');
            
            return (
              <Tooltip key={index}>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => !isDisabled && onSelectDate(day.ngày)}
                    disabled={isDisabled}
                    className={`flex flex-col items-center min-w-[36px] transition-all duration-200 ${
                      isDisabled 
                        ? 'opacity-30 cursor-not-allowed' 
                        : 'cursor-pointer hover:scale-105'
                    } ${isSelected ? 'ring-2 ring-blue-500 rounded-lg bg-blue-50' : ''}`}
                  >
                    <div 
                      className="w-6 rounded-t-sm transition-all duration-200"
                      style={{ 
                        height: `${barHeight}px`,
                        backgroundColor: isDisabled ? '#ccc' : barColor,
                      }}
                    />
                    <div className="text-[10px] text-gray-500 mt-1">{dayOfWeek}</div>
                    <div className="text-xs font-medium text-gray-700">{dayNum}</div>
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="bg-gray-900 text-white">
                  <div className="text-center">
                    <div className="font-semibold">{day.ngày}</div>
                    <div className="text-yellow-300 font-bold">{formatVND(day.giá_vé_gốc)}</div>
                    <div className="text-xs text-gray-300">{day.loại_vé}</div>
                  </div>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </TooltipProvider>
      </div>
    </div>
  );
};

// Convert yyyy-MM-dd to dd/MM/yyyy
const toDisplayFormat = (dateStr: string): string => {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-');
  return `${day}/${month}/${year}`;
};

const LowFareChart: React.FC<LowFareChartProps> = ({
  departureData,
  returnData,
  tripType,
  onSearchWithDates,
  isLoading = false,
  initialDepartureDate,
  initialReturnDate,
  cheapestOtherFlight,
  onShowOtherAirlines,
}) => {
  // Pre-select initial dates
  const [selectedDepartureDate, setSelectedDepartureDate] = useState<string | null>(
    initialDepartureDate ? toDisplayFormat(initialDepartureDate) : null
  );
  const [selectedReturnDate, setSelectedReturnDate] = useState<string | null>(
    initialReturnDate ? toDisplayFormat(initialReturnDate) : null
  );

  // Update selected dates when initial dates change
  useEffect(() => {
    if (initialDepartureDate) {
      setSelectedDepartureDate(toDisplayFormat(initialDepartureDate));
    }
    if (initialReturnDate) {
      setSelectedReturnDate(toDisplayFormat(initialReturnDate));
    }
  }, [initialDepartureDate, initialReturnDate]);

  // Calculate min/max prices for each direction
  const { depMin, depMax, retMin, retMax } = useMemo(() => {
    const depPrices = departureData.map(d => d.giá_vé_gốc);
    const retPrices = returnData.map(d => d.giá_vé_gốc);
    
    return {
      depMin: depPrices.length > 0 ? Math.min(...depPrices) : 0,
      depMax: depPrices.length > 0 ? Math.max(...depPrices) : 0,
      retMin: retPrices.length > 0 ? Math.min(...retPrices) : 0,
      retMax: retPrices.length > 0 ? Math.max(...retPrices) : 0,
    };
  }, [departureData, returnData]);

  // Find cheapest combo
  const cheapestCombo = useMemo(() => {
    if (!departureData.length) return null;
    
    let minTotal = Infinity;
    let bestDep = departureData[0];
    let bestRet = returnData.length > 0 ? returnData[0] : null;

    if (tripType === 'OW') {
      // For one-way, just find cheapest departure
      departureData.forEach(dep => {
        if (dep.giá_vé_gốc < minTotal) {
          minTotal = dep.giá_vé_gốc;
          bestDep = dep;
        }
      });
      return { departure: bestDep, return: null, total: minTotal };
    }

    // For round trip, find cheapest combo
    departureData.forEach(dep => {
      const depDate = parseDate(dep.ngày);
      
      returnData.forEach(ret => {
        const retDate = parseDate(ret.ngày);
        // Return date must be after departure date
        if (retDate > depDate) {
          const total = dep.giá_vé_gốc + ret.giá_vé_gốc;
          if (total < minTotal) {
            minTotal = total;
            bestDep = dep;
            bestRet = ret;
          }
        }
      });
    });

    return { departure: bestDep, return: bestRet, total: minTotal };
  }, [departureData, returnData, tripType]);

  // Auto-suggest cheapest combo
  useEffect(() => {
    if (cheapestCombo && !selectedDepartureDate && !selectedReturnDate) {
      // Don't auto-select, just show suggestion
    }
  }, [cheapestCombo]);

  const handleSelectCheapestCombo = () => {
    if (cheapestCombo) {
      setSelectedDepartureDate(cheapestCombo.departure.ngày);
      if (cheapestCombo.return) {
        setSelectedReturnDate(cheapestCombo.return.ngày);
      }
    }
  };

  const handleDepartureDateSelect = (date: string) => {
    setSelectedDepartureDate(date);
    // Reset return date if it's before or equal to new departure date
    if (selectedReturnDate && tripType === 'RT') {
      const depDate = parseDate(date);
      const retDate = parseDate(selectedReturnDate);
      if (retDate <= depDate) {
        setSelectedReturnDate(null);
      }
    }
  };

  const handleReturnDateSelect = (date: string) => {
    setSelectedReturnDate(date);
  };

  const handleSearch = () => {
    if (!selectedDepartureDate) return;
    
    const depApiDate = toApiFormat(selectedDepartureDate);
    const retApiDate = selectedReturnDate ? toApiFormat(selectedReturnDate) : '';
    
    onSearchWithDates(depApiDate, retApiDate);
  };

  const canSearch = selectedDepartureDate && (tripType === 'OW' || selectedReturnDate);
  const hasData = departureData.length > 0 || returnData.length > 0;

  if (!hasData) {
    return null;
  }

  return (
    <div className="bg-white rounded-xl shadow-md p-4 mb-6 border border-gray-100">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <TrendingDown className="w-5 h-5 text-green-600" />
          <h3 className="text-lg font-semibold text-gray-800">Giá rẻ theo tháng (VietJet)</h3>
        </div>
        
        {cheapestCombo && (
          <button
            onClick={handleSelectCheapestCombo}
            className="text-sm bg-green-50 text-green-700 px-3 py-1.5 rounded-full hover:bg-green-100 transition-colors flex items-center gap-1"
          >
            <span>💡</span>
            <span>
              Combo rẻ nhất: {cheapestCombo.departure.ngày}
              {cheapestCombo.return && ` → ${cheapestCombo.return.ngày}`}
              {' '}({formatVND(cheapestCombo.total)})
            </span>
          </button>
        )}
      </div>

      <div className="space-y-4">
        {/* Departure chart */}
        <SingleChart
          data={departureData}
          label="✈️ Chiều đi"
          selectedDate={selectedDepartureDate}
          onSelectDate={handleDepartureDateSelect}
          minPrice={depMin}
          maxPrice={depMax}
        />

        {/* Return chart (only for round trip) */}
        {tripType === 'RT' && (
          <SingleChart
            data={returnData}
            label="✈️ Chiều về"
            selectedDate={selectedReturnDate}
            onSelectDate={handleReturnDateSelect}
            disabledBefore={selectedDepartureDate || undefined}
            minPrice={retMin}
            maxPrice={retMax}
          />
        )}
      </div>

      {/* Other Airlines Cheapest Box */}
      {/* cheapestOtherFlight && onShowOtherAirlines && (
        <div 
          className="mt-4 bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-lg p-3 cursor-pointer hover:shadow-md transition-all duration-300"
          onClick={onShowOtherAirlines}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Plane className="w-5 h-5 text-purple-600" />
              <span className="font-medium text-purple-700">
                Hãng khác rẻ nhất: {cheapestOtherFlight.airlineName}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-purple-600">
                {cheapestOtherFlight.totalFlights} chuyến
              </span>
              <span className="font-bold text-purple-700">
                {new Intl.NumberFormat('ko-KR').format(cheapestOtherFlight.price)} KRW
              </span>
            </div>
          </div>
        </div>
      ) */}

      {/* Search button */}
      {canSearch && (
        <div className="mt-4 flex justify-center">
          <Button
            onClick={handleSearch}
            disabled={isLoading}
            className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-6 py-2 rounded-lg shadow-md flex items-center gap-2"
          >
            <Search className="w-4 h-4" />
            <span>
              Tìm kiếm {selectedDepartureDate}
              {selectedReturnDate && ` → ${selectedReturnDate}`}
            </span>
          </Button>
        </div>
      )}

      {/* Legend */}
      <div className="mt-4 flex items-center justify-center gap-4 text-xs text-gray-500">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: 'hsl(120, 70%, 45%)' }} />
          <span>Rẻ nhất</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: 'hsl(60, 70%, 45%)' }} />
          <span>Trung bình</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: 'hsl(0, 70%, 45%)' }} />
          <span>Đắt nhất</span>
        </div>
      </div>
    </div>
  );
};

export default LowFareChart;
