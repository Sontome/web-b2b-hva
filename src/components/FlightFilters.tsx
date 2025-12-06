
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronUp } from 'lucide-react';

export interface FilterOptions {
  airlines: string[];
  showCheapestOnly: boolean;
  directFlightsOnly: boolean;
  show2pc: boolean;
  sortBy: 'price' | 'duration' | 'departure';
}

interface FlightFiltersProps {
  filters: FilterOptions;
  onFiltersChange: (filters: FilterOptions) => void;
  hasDirectFlights: boolean;
  hasVfr2pc: boolean;
}

export const FlightFilters: React.FC<FlightFiltersProps> = ({ 
  filters, 
  onFiltersChange, 
  hasDirectFlights, 
  hasVfr2pc 
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleAirlineChange = (airline: string, checked: boolean) => {
    const newAirlines = checked 
      ? [...filters.airlines, airline]
      : filters.airlines.filter(a => a !== airline);
    
    onFiltersChange({
      ...filters,
      airlines: newAirlines
    });
  };

  const handleCheapestOnlyChange = (checked: boolean) => {
    onFiltersChange({
      ...filters,
      showCheapestOnly: checked
    });
  };

  const handleDirectFlightsChange = (checked: boolean) => {
    onFiltersChange({
      ...filters,
      directFlightsOnly: checked
    });
  };

  const handle2pcChange = (checked: boolean) => {
    onFiltersChange({
      ...filters,
      show2pc: checked
    });
  };

  const handleSortChange = (sortBy: 'price' | 'duration' | 'departure') => {
    onFiltersChange({
      ...filters,
      sortBy
    });
  };

  return (
    <Card className="mb-6">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold">Bộ lọc</CardTitle>
              {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="space-y-6">
            {/* Cheapest Only Filter */}
            <div className="space-y-3">
              <Label className="text-base font-medium">Tùy chọn hiển thị</Label>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="cheapest-only"
                    checked={filters.showCheapestOnly}
                    onCheckedChange={handleCheapestOnlyChange}
                  />
                  <Label htmlFor="cheapest-only" className="text-sm">
                    Chỉ hiển thị vé rẻ nhất (VJ & VNA)
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="direct-flights"
                    checked={filters.directFlightsOnly && hasDirectFlights}
                    onCheckedChange={handleDirectFlightsChange}
                    disabled={!hasDirectFlights}
                  />
                  <Label htmlFor="direct-flights" className="text-sm">
                    Bay thẳng
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="show-2pc"
                    checked={filters.show2pc && hasVfr2pc}
                    onCheckedChange={handle2pcChange}
                    disabled={!hasVfr2pc}
                  />
                  <Label htmlFor="show-2pc" className="text-sm">
                    2pc (VNA 46kg)
                  </Label>
                </div>
              </div>
            </div>

            {/* Airlines Filter */}
            <div className="space-y-3">
              <Label className="text-base font-medium">Hãng hàng không</Label>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="vj"
                    checked={filters.airlines.includes('VJ')}
                    onCheckedChange={(checked) => handleAirlineChange('VJ', checked as boolean)}
                  />
                  <Label htmlFor="vj" className="text-sm">VietJet Air</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="vna"
                    checked={filters.airlines.includes('VNA')}
                    onCheckedChange={(checked) => handleAirlineChange('VNA', checked as boolean)}
                  />
                  <Label htmlFor="vna" className="text-sm">Vietnam Airlines</Label>
                </div>
              </div>
            </div>

            {/* Sort Options */}
            <div className="space-y-3">
              <Label className="text-base font-medium">Sắp xếp theo</Label>
              <Select value={filters.sortBy} onValueChange={handleSortChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="price">Giá thấp nhất</SelectItem>
                  <SelectItem value="duration">Thời gian bay</SelectItem>
                  <SelectItem value="departure">Giờ khởi hành</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};
