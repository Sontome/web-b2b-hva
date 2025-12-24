import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Plane, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

export interface SearchFormData {
  from: string;
  to: string;
  departureDate: Date | undefined;
  returnDate: Date | undefined;
  passengers: number;
  tripType: 'one_way' | 'round_trip';
}

interface FlightSearchFormProps {
  onSearch: (data: SearchFormData) => void;
  loading: boolean;
}

// Korean airports
const koreanAirports = [
  { code: 'ICN', name: 'Incheon', city: 'Seoul' },
  { code: 'PUS', name: 'Busan', city: 'Busan' },
  { code: 'TAE', name: 'Daegu', city: 'Daegu' },
];

// Vietnamese airports
const vietnameseAirports = [
  { code: 'HAN', name: 'Hà Nội', city: 'Hà Nội' },
  { code: 'SGN', name: 'Hồ Chí Minh', city: 'Hồ Chí Minh' },
  { code: 'DAD', name: 'Đà Nẵng', city: 'Đà Nẵng' },
  { code: 'HPH', name: 'Hải Phòng', city: 'Hải Phòng' },
  { code: 'VCA', name: 'Cần Thơ', city: 'Cần Thơ' },
  { code: 'CXR', name: 'Nha Trang (Cam Ranh)', city: 'Nha Trang' },
  { code: 'DLI', name: 'Đà Lạt', city: 'Đà Lạt' },
  { code: 'VDH', name: 'Đồng Hới', city: 'Đồng Hới' },
  { code: 'BMV', name: 'Buôn Ma Thuột', city: 'Buôn Ma Thuột' },
  { code: 'VII', name: 'Vinh', city: 'Vinh' },
  { code: 'UIH', name: 'Quy Nhơn (Phù Cát)', city: 'Quy Nhơn' },
  { code: 'THD', name: 'Thanh Hóa (Thọ Xuân)', city: 'Thanh Hóa' },
  { code: 'PQC', name: 'Phú Quốc', city: 'Phú Quốc' },
  { code: 'PXU', name: 'Pleiku', city: 'Pleiku' },
  { code: 'HUI', name: 'Huế (Phú Bài)', city: 'Huế' },
  { code: 'VCL', name: 'Tam Kỳ (Chu Lai)', city: 'Tam Kỳ' },
  { code: 'CAH', name: 'Cà Mau', city: 'Cà Mau' },
  { code: 'DIN', name: 'Điện Biên', city: 'Điện Biên' },
  { code: 'VKG', name: 'Rạch Giá', city: 'Rạch Giá' },
  { code: 'TBB', name: 'Tuy Hòa (Phú Yên)', city: 'Tuy Hòa' },
  { code: 'VDO', name: 'Vân Đồn (Quảng Ninh)', city: 'Vân Đồn' },
];

export const FlightSearchForm: React.FC<FlightSearchFormProps> = ({ onSearch, loading }) => {
  const [formData, setFormData] = useState<SearchFormData>({
    from: 'ICN', // Default to ICN
    to: 'HAN', // Default to HAN
    departureDate: undefined,
    returnDate: undefined,
    passengers: 1,
    tripType: 'round_trip', // Default to round trip
  });

  const [departureDateOpen, setDepartureDateOpen] = useState(false);
  const [returnDateOpen, setReturnDateOpen] = useState(false);
  const [departureDateMonth, setDepartureDateMonth] = useState<Date | undefined>(undefined);
  const [returnDateMonth, setReturnDateMonth] = useState<Date | undefined>(undefined);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(formData);
  };

  const handleDepartureDateSelect = (date: Date | undefined) => {
    setFormData(prev => ({ ...prev, departureDate: date }));
    setDepartureDateOpen(false);
    
    // If round trip and departure date is selected, open return date picker
    if (formData.tripType === 'round_trip' && date) {
      setTimeout(() => {
        setReturnDateMonth(date); // Set return date month to departure date
        setReturnDateOpen(true);
      }, 100);
    }
  };

  const handleReturnDateSelect = (date: Date | undefined) => {
    setFormData(prev => ({ ...prev, returnDate: date }));
    setReturnDateOpen(false);
  };

  // Check if departure airport is Korean
  const isFromKorean = koreanAirports.some(airport => airport.code === formData.from);
  
  // Get available destination airports based on departure selection
  const getAvailableDestinations = () => {
    if (isFromKorean) {
      // If departure is Korean, show only Vietnamese airports
      return vietnameseAirports;
    } else {
      // If departure is Vietnamese, show all airports (both Korean and Vietnamese)
      return [...koreanAirports, ...vietnameseAirports];
    }
  };

  // Get available departure airports (all airports)
  const getAllAirports = () => {
    return [...koreanAirports, ...vietnameseAirports];
  };

  const handleFromChange = (value: string) => {
    setFormData(prev => {
      const newFormData = { ...prev, from: value };
      
      // Check if the new departure is Korean or Vietnamese
      const newIsFromKorean = koreanAirports.some(airport => airport.code === value);
      const availableDestinations = newIsFromKorean ? vietnameseAirports : [...koreanAirports, ...vietnameseAirports];
      
      // If current destination is not available for the new departure, reset to default
      const isCurrentDestinationAvailable = availableDestinations.some(airport => airport.code === prev.to);
      if (!isCurrentDestinationAvailable) {
        newFormData.to = newIsFromKorean ? 'HAN' : 'ICN';
      }
      
      return newFormData;
    });
  };

  const handleRefreshDepartureDate = () => {
    // Clear both departure and return dates
    setFormData(prev => ({ ...prev, departureDate: undefined, returnDate: undefined }));
    setDepartureDateMonth(new Date());
    setDepartureDateOpen(true);
  };

  const handleDepartureDateOpenChange = (open: boolean) => {
    setDepartureDateOpen(open);
    if (open) {
      // If there's a selected departure date, navigate to that month
      // Otherwise, use current date
      setDepartureDateMonth(formData.departureDate || new Date());
    }
  };

  const handleReturnDateOpenChange = (open: boolean) => {
    setReturnDateOpen(open);
    if (open && !returnDateMonth) {
      setReturnDateMonth(formData.returnDate || formData.departureDate || new Date());
    }
  };

  return (
    <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-6 animate-fade-in max-w-5xl mx-auto chase-border-active">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Trip Type Selector */}
        <div className="flex flex-wrap gap-4 pb-3 border-b border-gray-200">
          <label className="flex items-center gap-2 cursor-pointer group min-w-fit">
            <input
              type="radio"
              name="tripType"
              value="round_trip"
              checked={formData.tripType === 'round_trip'}
              onChange={(e) => setFormData(prev => ({ ...prev, tripType: e.target.value as 'round_trip' }))}
              className="text-blue-600 w-4 h-4 shrink-0"
            />
            <span className="text-gray-700 text-sm font-medium group-hover:text-blue-600 transition-colors whitespace-nowrap">Khứ hồi</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer group min-w-fit">
            <input
              type="radio"
              name="tripType"
              value="one_way"
              checked={formData.tripType === 'one_way'}
              onChange={(e) => setFormData(prev => ({ ...prev, tripType: e.target.value as 'one_way' }))}
              className="text-blue-600 w-4 h-4 shrink-0"
            />
            <span className="text-gray-700 text-sm font-medium group-hover:text-blue-600 transition-colors whitespace-nowrap">Một chiều</span>
          </label>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* From Airport */}
          <div className="space-y-1.5">
            <Label htmlFor="from" className="text-xs text-gray-600 font-medium flex items-center gap-1.5">
              <Plane className="w-3.5 h-3.5 text-blue-600" />
              Từ
            </Label>
            <Select value={formData.from} onValueChange={handleFromChange}>
              <SelectTrigger className="h-10 text-sm border-gray-300 focus:border-blue-500 focus:ring-blue-500">
                <SelectValue placeholder="Chọn sân bay đi" />
              </SelectTrigger>
              <SelectContent>
                {getAllAirports().map((airport) => (
                  <SelectItem key={airport.code} value={airport.code}>
                    {airport.code} - {airport.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* To Airport */}
          <div className="space-y-1.5">
            <Label htmlFor="to" className="text-xs text-gray-600 font-medium flex items-center gap-1.5">
              <Plane className="w-3.5 h-3.5 text-blue-600 rotate-90" />
              Đến
            </Label>
            <Select value={formData.to} onValueChange={(value) => setFormData(prev => ({ ...prev, to: value }))}>
              <SelectTrigger className="h-10 text-sm border-gray-300 focus:border-blue-500 focus:ring-blue-500">
                <SelectValue placeholder="Chọn sân bay đến" />
              </SelectTrigger>
              <SelectContent>
                {getAvailableDestinations().map((airport) => (
                  <SelectItem key={airport.code} value={airport.code}>
                    {airport.code} - {airport.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Departure Date */}
          <div className="space-y-1.5">
            <Label className="text-xs text-gray-600 font-medium flex items-center gap-1.5">
              <CalendarIcon className="w-3.5 h-3.5 text-blue-600" />
              Ngày đi
            </Label>
            <div className="flex space-x-2">
              <Popover open={departureDateOpen} onOpenChange={handleDepartureDateOpenChange}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "flex-1 justify-start text-left font-normal h-10 text-sm border-gray-300 hover:border-blue-500",
                      !formData.departureDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                    {formData.departureDate ? (
                      format(formData.departureDate, "dd/MM/yyyy")
                    ) : (
                      <span className="text-xs">Chọn ngày</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={formData.departureDate}
                    onSelect={handleDepartureDateSelect}
                    disabled={(date) => date < new Date()}
                    defaultMonth={departureDateMonth || formData.departureDate || new Date()}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={handleRefreshDepartureDate}
                className="shrink-0 h-10 w-10 border-gray-300 hover:border-blue-500 hover:bg-blue-50"
              >
                <RefreshCw className="h-3.5 w-3.5 text-blue-600" />
              </Button>
            </div>
          </div>

          {/* Passengers */}
          <div className="space-y-1.5">
            <Label htmlFor="passengers" className="text-xs text-gray-600 font-medium">Số hành khách</Label>
            <Input
              id="passengers"
              type="number"
              min="1"
              max="9"
              value={formData.passengers}
              onChange={(e) => setFormData(prev => ({ ...prev, passengers: parseInt(e.target.value) || 1 }))}
              className="h-10 text-sm border-gray-300 focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Return Date */}
        {formData.tripType === 'round_trip' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="lg:col-span-2"></div>
            <div className="space-y-1.5">
              <Label className="text-xs text-gray-600 font-medium flex items-center gap-1.5">
                <CalendarIcon className="w-3.5 h-3.5 text-blue-600" />
                Ngày về
              </Label>
              <Popover open={returnDateOpen} onOpenChange={handleReturnDateOpenChange}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal h-10 text-sm border-gray-300 hover:border-blue-500",
                      !formData.returnDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                    {formData.returnDate ? (
                      format(formData.returnDate, "dd/MM/yyyy")
                    ) : (
                      <span className="text-xs">Chọn ngày</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={formData.returnDate}
                    onSelect={handleReturnDateSelect}
                    disabled={(date) => date < (formData.departureDate || new Date())}
                    defaultMonth={returnDateMonth || formData.returnDate || formData.departureDate || new Date()}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        )}

        <Button 
          type="submit" 
          className="w-full h-12 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all" 
          disabled={loading}
        >
          <Plane className="mr-2 h-4 w-4" />
          {loading ? 'Đang tìm kiếm...' : 'Tìm chuyến bay'}
        </Button>
      </form>
    </div>
  );
};
