import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { FlightSearchForm, SearchFormData } from '@/components/FlightSearchForm';
import { FlightCard } from '@/components/FlightCard';
import { FlightFilters, FilterOptions } from '@/components/FlightFilters';
import { fetchVietJetFlights, fetchVietnamAirlinesFlights, Flight, OtherAirlineFlight } from '@/services/flightApi';
import { searchLowFare, LowFareDay } from '../services/lowfareService';
import { Button } from '@/components/ui/button';
import { UserProfileDropdown } from '@/components/UserProfileDropdown';
import backgroundBanner from '@/assets/vietnam-banner-bg.png';
import LowFareChart from '../components/LowFareChart';
import { PNRCheckModal } from '../components/PNRCheckModal';
import { EmailTicketModal } from '@/components/EmailTicketModal';
import { VJTicketModal } from '@/components/VJTicketModal';
import { VNATicketModal } from '@/components/VNATicketModal';
import { BookingModal as VJBookingModal } from '@/components/VJBookingModal';
import { VNABookingModal } from '@/components/VNABookingModal';
import { RepriceModal } from '@/components/RepriceModal';
import { InkSplashEffect } from '@/components/InkSplashEffect';
import { useAuth } from '@/hooks/useAuth';
import { ArrowUp, Mail, Wrench, ShoppingBasket, TrendingDown, Plane } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { TopNavbar } from '@/components/TopNavbar';
import { supabase } from '@/integrations/supabase/client';
import { OtherAirlinesModal, OtherFlight, AIRLINE_NAMES, AIRLINE_BAGGAGE } from '@/components/OtherAirlinesModal';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from '@/components/ui/dropdown-menu';

export default function Index() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [flights, setFlights] = useState<Flight[]>([]);
  const [otherFlights, setOtherFlights] = useState<OtherFlight[]>([]);
  const [showOtherAirlinesModal, setShowOtherAirlinesModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchPerformed, setSearchPerformed] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [reverseInkSplash, setReverseInkSplash] = useState({ active: false, x: 0, y: 0 });
  const [showContent, setShowContent] = useState(false);
  const resultsRef = useRef<HTMLDivElement>(null);
  const [showPNRModal, setShowPNRModal] = useState(false);
  const [showVJTicketModal, setShowVJTicketModal] = useState(false);
  const [showVNATicketModal, setShowVNATicketModal] = useState(false);
  const [showVJBookingModal, setShowVJBookingModal] = useState(false);
  const [showVNABookingModal, setShowVNABookingModal] = useState(false);
  const [showRepriceModal, setShowRepriceModal] = useState(false);
  const [selectedFlight, setSelectedFlight] = useState<Flight | null>(null);
  const [ticketPNR, setTicketPNR] = useState<string | undefined>(undefined);
  // Low fare chart state
  const [lowFareDeparture, setLowFareDeparture] = useState<LowFareDay[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [searchData, setSearchData] = useState<SearchFormData | null>(null);
  const [lowFareReturn, setLowFareReturn] = useState<LowFareDay[]>([]);
  const [isLoadingLowFare, setIsLoadingLowFare] = useState(false);
  const [lastSearchData, setLastSearchData] = useState<SearchFormData | null>(null);
  const [filters, setFilters] = useState<FilterOptions>({
    airlines: ['VJ', 'VNA'],
    showCheapestOnly: false,
    directFlightsOnly: false,
    show2pc: false,
    sortBy: 'price'
  });

  // Redirect admin to admin dashboard
  useEffect(() => {
    if (profile?.role === 'admin') {
      navigate('/admin');
    }
  }, [profile, navigate]);

  // Reverse ink splash effect when page loads
  useEffect(() => {
    // Trigger reverse ink splash from center of screen
    setTimeout(() => {
      setReverseInkSplash({ 
        active: true, 
        x: window.innerWidth / 2, 
        y: window.innerHeight / 2 
      });
    }, 50);
    
    // Show content after ink splash completes
    setTimeout(() => {
      setShowContent(true);
    }, 100);
  }, []);

  // Show scroll to top button when user scrolls down
  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 300);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Smooth scroll function with custom easing
  const smoothScrollTo = (targetPosition: number, duration: number = 1200) => {
    const startPosition = window.pageYOffset;
    const distance = targetPosition - startPosition;
    let startTime: number | null = null;

    // Easing function for smooth animation
    const easeInOutCubic = (t: number): number => {
      return t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1;
    };

    const animateScroll = (currentTime: number) => {
      if (startTime === null) startTime = currentTime;
      const timeElapsed = currentTime - startTime;
      const progress = Math.min(timeElapsed / duration, 1);
      const easedProgress = easeInOutCubic(progress);
      
      window.scrollTo(0, startPosition + distance * easedProgress);
      
      if (progress < 1) {
        requestAnimationFrame(animateScroll);
      }
    };

    requestAnimationFrame(animateScroll);
  };

  // Auto scroll to results when flights are loaded - ultra smooth
  useEffect(() => {
    if (flights.length > 0 && resultsRef.current) {
      // Longer delay to ensure content is fully rendered
      setTimeout(() => {
        const element = resultsRef.current;
        if (element) {
          const elementTop = element.offsetTop;
          const offsetPosition = elementTop - 120; // Add some offset from top
          
          // Use custom smooth scroll instead of native scrollTo
          smoothScrollTo(offsetPosition, 1500); // 1.5 seconds for very smooth scroll
        }
      }, 800); // Increased delay for smoother experience
    }
  }, [flights.length]);

  const scrollToTop = () => {
    smoothScrollTo(0, 1000); // Use custom smooth scroll for scroll to top too
  };

  const handleHoldTicket = (flight: Flight) => {
    setSelectedFlight(flight);
    if (flight.airline === 'VJ') {
      setShowVJBookingModal(true);
    } else {
      setShowVNABookingModal(true);
    }
  };

  const playNotificationSound = () => {
    // Create a simple notification sound using Web Audio API
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    oscillator.frequency.value = 800;
    oscillator.type = 'sine';
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.5);
  };
  // Fetch low fare data from VietJet
  const fetchLowFareData = async (data: SearchFormData) => {
    setIsLoadingLowFare(true);
    setLowFareDeparture([]);
    setLowFareReturn([]);
    console.log(data);
    try {
      const tripType =
        data.tripType === 'round_trip' ? 'RT' : 'OW';
      const formatDate = (date: Date | string | undefined) => {
        if (!date) return '';
        if (date instanceof Date) {
          return date.toISOString().slice(0, 10);
        }
        return date.split('T')[0];
      };
      const result = await searchLowFare(
        data.from,
        data.to,
        tripType,
        formatDate(data.departureDate),
        tripType === 'RT' ? formatDate(data.returnDate) : ''
      );
      
      if (result.status_code === '200' && result.body) {
        setLowFareDeparture(result.body.chiều_đi || []);
        setLowFareReturn(result.body.chiều_về || []);
      }
    } catch (error) {
      console.error('Error fetching low fare data:', error);
    } finally {
      setIsLoadingLowFare(false);
    }
  };

  // Handle search with selected dates from low fare chart
  const handleSearchWithDates = (departureDate: string, returnDate: string) => {
    if (!lastSearchData) return;
    const parseVNDate = (dateStr: string) => {
      return new Date(`${dateStr}T00:00:00+07:00`);
    };
    const newSearchData: SearchFormData = {
      ...lastSearchData,
      departureDate: departureDate ? parseVNDate(departureDate) : undefined,
      returnDate: returnDate ? parseVNDate(returnDate) : undefined,
      tripType: returnDate ? 'round_trip' : 'one_way',
    };
    
    handleSearch(newSearchData);
  };



  const handleSearch = async (searchData: SearchFormData) => {
    console.log('=== FLIGHT SEARCH DEBUG ===');
    console.log('Profile:', profile);
    console.log('perm_check_vj:', profile?.perm_check_vj);
    console.log('perm_check_vna:', profile?.perm_check_vna);
    
    // Check permissions first
    const canCheckVJ = profile?.perm_check_vj === true;
    const canCheckVNA = profile?.perm_check_vna === true;
    
    console.log('canCheckVJ:', canCheckVJ);
    console.log('canCheckVNA:', canCheckVNA);

    // If no permissions at all, show error and return
    if (!canCheckVJ && !canCheckVNA) {
      const errorMsg = 'Tính năng tìm kiếm chuyến bay đã bị khóa.';
      console.log('BLOCKING SEARCH - No permissions:', errorMsg);
      setError(errorMsg);
      toast({
        title: "Thông báo",
        description: (
        <span>
          Vui lòng liên hệ{' '}
          <a
            href="https://zalo.me/821035463396"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 underline font-semibold"
          >
            Zalo Admin
          </a>{' '}
          để được cấp quyền
        </span>
      ),
        
        variant: "destructive",
        duration: 10000,
      });
      return;
    }

    // Show toast for locked features
    if (!canCheckVJ) {
      const errorMsg = 'Tính năng tìm kiếm chuyến bay VJ đã bị khóa.';
      console.log('BLOCKING SEARCH - No permissions:', errorMsg);
      setError(errorMsg);
      toast({
        title: "Thông báo",
        description: (
          <span>
            Vui lòng liên hệ{' '}
            <a
              href="https://zalo.me/821035463396"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 underline font-semibold"
            >
              Zalo Admin
            </a>{' '}
            để được cấp quyền kiểm tra vé VJ
          </span>
        ),
        variant: "destructive",
        duration: 10000,
      });
    }
    if (!canCheckVNA) {
      const errorMsg = 'Tính năng tìm kiếm chuyến bay VNA đã bị khóa.';
      console.log('BLOCKING SEARCH - No permissions:', errorMsg);
      setError(errorMsg);
      toast({
        title: "Thông báo",
        description: (
          <span>
            Vui lòng liên hệ{' '}
            <a
              href="https://zalo.me/821035463396"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 underline font-semibold"
            >
              Zalo Admin
            </a>{' '}
            để được cấp quyền kiểm tra vé VNA
          </span>
        ),
        variant: "destructive",
        duration: 10000,
      });
    }

    // Log search action to database
    if (profile?.id) {
      supabase
        .from('search_logs')
        .insert([{
          user_id: profile.id,
          search_data: searchData as any
        }])
        .then(({ error }) => {
          if (error) console.error('Error logging search:', error);
        });
    }

    setLoading(true);
    setError(null);
    setSearchPerformed(true);
    setFlights([]); // Clear previous results
    setOtherFlights([]); // Clear other airlines results
    setHasSearched(true);
    setSearchData(searchData);
    setLastSearchData(searchData);
    
    // Determine which airlines to fetch based on permissions
    const availableAirlines = [];
    if (canCheckVJ) availableAirlines.push('VJ');
    if (canCheckVNA) availableAirlines.push('VNA');

    // Reset filters to default state with available airlines
    setFilters({
      airlines: availableAirlines as ('VJ' | 'VNA')[],
      showCheapestOnly: false,
      directFlightsOnly: false,
      show2pc: false,
      sortBy: 'price'
    });

    try {
      const promises = [];
      // Fetch low fare data (don't wait for it to complete)
      fetchLowFareData(searchData);
      // Only fetch from airlines with permission
      if (canCheckVJ) {
        console.log('Fetching VietJet flights...');
        const vietJetPromise = fetchVietJetFlights(searchData);
        promises.push(vietJetPromise);
        
        // Handle VietJet results as soon as they arrive
        vietJetPromise.then(vietJetFlights => {
          if (vietJetFlights.length > 0) {
            setFlights(prev => [...prev, ...vietJetFlights]);
            playNotificationSound();
          }
        }).catch(error => {
          console.error('VietJet API error:', error);
        });
      }

      if (canCheckVNA) {
        console.log('Fetching Vietnam Airlines flights...');
        const vietnamAirlinesPromise = fetchVietnamAirlinesFlights(searchData);
        promises.push(vietnamAirlinesPromise);
        
        // Handle Vietnam Airlines results as soon as they arrive
        vietnamAirlinesPromise.then(result => {
          if (result.vnaFlights.length > 0) {
            setFlights(prev => [...prev, ...result.vnaFlights]);
            setTimeout(() => playNotificationSound(), 200);
          }
          
          // Process Other Airlines flights if user has permission
          if (profile?.perm_check_other && result.otherFlights.length > 0) {
            const listOther = profile.list_other || [];
            const isRoundTrip = !!searchData.returnDate;
            const owMarkup = profile.price_ow_other || 0;
            const rtMarkup = profile.price_rt_other || 0;
            
            // Filter and transform other flights
            const processedOtherFlights: OtherFlight[] = result.otherFlights
              .filter(f => listOther.includes(f.airline))
              .map(f => {
                const priceWithMarkup = f.price + (isRoundTrip ? rtMarkup : owMarkup);
                const roundedPrice = Math.round(priceWithMarkup / 100) * 100;
                
                return {
                  ...f,
                  adjustedPrice: roundedPrice,
                  baggageInfo: AIRLINE_BAGGAGE[f.airline] || { carryOn: '10kg' },
                };
              });
            
            setOtherFlights(processedOtherFlights);
          }
        }).catch(error => {
          console.error('Vietnam Airlines API error:', error);
        });
      }

      // Wait for all to complete to update filters and loading state
      const results = await Promise.allSettled(promises);
      let allFlights: Flight[] = [];
      
      results.forEach(result => {
        if (result.status === 'fulfilled') {
          // Handle both VJ (Flight[]) and VNA (VNAFlightsResult) responses
          const value = result.value;
          if (Array.isArray(value)) {
            allFlights = [...allFlights, ...value];
          } else if (value && 'vnaFlights' in value) {
            allFlights = [...allFlights, ...value.vnaFlights];
          }
        }
      });

      // Auto-adjust filters based on available flights
      const hasDirectFlights = allFlights.some(f => f.departure.stops === 0);
      const hasVfr2pc = allFlights.some(f => f.airline === 'VNA' && f.baggageType === 'VFR');
      setFilters(prev => ({
        ...prev,
        directFlightsOnly: hasDirectFlights ? prev.directFlightsOnly : false,
        show2pc: hasVfr2pc ? prev.show2pc : false
      }));
    } catch (err: any) {
      setError(err.message || 'Đã xảy ra lỗi khi tìm kiếm chuyến bay.');
    } finally {
      setLoading(false);
    }
  };

  const handleShowMore = () => {
    setFilters(prev => {
      // First click: remove cheapest only filter
      if (prev.showCheapestOnly) {
        return {
          ...prev,
          showCheapestOnly: false
        };
      }
      // Second click: remove direct flights filter
      else if (prev.directFlightsOnly) {
        return {
          ...prev,
          directFlightsOnly: false
        };
      }
      // This shouldn't happen, but fallback
      return {
        ...prev,
        show2pc: false
      };
    });
  };

  const filterAndSortFlights = (flights: Flight[]) => {
    let filtered = flights;

    // Filter by airlines
    if (filters.airlines.length > 0) {
      filtered = filtered.filter(flight => filters.airlines.includes(flight.airline));
    }

    // Filter for direct flights only - check both departure and return flights
    if (filters.directFlightsOnly) {
      filtered = filtered.filter(flight => {
        // For one-way flights, only check departure
        if (!flight.return) {
          return flight.departure.stops === 0;
        }
        // For round-trip flights, check both departure and return
        return flight.departure.stops === 0 && flight.return.stops === 0;
      });
    }

    // Filter for 2pc (VFR baggage type)
    if (filters.show2pc) {
      filtered = filtered.filter(flight => flight.airline === 'VJ' || flight.airline === 'VNA' && flight.baggageType === 'VFR');
    }

    // Filter for cheapest only
    if (filters.showCheapestOnly) {
      const vjFlights = filtered.filter(f => f.airline === 'VJ');
      const vnaFlights = filtered.filter(f => f.airline === 'VNA');
      const cheapestVJ = vjFlights.length > 0 ? vjFlights.reduce((prev, current) => prev.price < current.price ? prev : current) : null;
      const cheapestVNA = vnaFlights.length > 0 ? vnaFlights.reduce((prev, current) => prev.price < current.price ? prev : current) : null;
      filtered = [cheapestVJ, cheapestVNA].filter(Boolean) as Flight[];
    }

    // Sort flights
    filtered.sort((a, b) => {
      // 1️⃣ Ưu tiên bay thẳng
      const aDirect =
        (!a.return && a.departure.stops === 0) ||
        (a.return && a.departure.stops === 0 && a.return.stops === 0);
    
      const bDirect =
        (!b.return && b.departure.stops === 0) ||
        (b.return && b.departure.stops === 0 && b.return.stops === 0);
    
      if (aDirect !== bDirect) {
        return aDirect ? -1 : 1; // bay thẳng lên trước
      }
    
      // 2️⃣ Nếu cùng loại → xét giá
      return a.price - b.price;
    });
    return filtered;
  };

  const filteredFlights = filterAndSortFlights(flights);

  // Separate flights by airline for side-by-side display
  const vjFlights = filteredFlights.filter(f => f.airline === 'VJ');
  const vnaFlights = filteredFlights.filter(f => f.airline === 'VNA');

  // Get allowed airlines for other flights
  const allowedOtherAirlines = profile?.list_other || [];
  
  // Filter other flights by allowed airlines and find cheapest
  const filteredOtherFlights = otherFlights.filter(f => allowedOtherAirlines.includes(f.airline));
  const cheapestOtherFlight = filteredOtherFlights.length > 0 
    ? filteredOtherFlights.reduce((prev, current) => 
        prev.adjustedPrice < current.adjustedPrice ? prev : current
      )
    : null;

  // Check if we have direct flights (both departure and return for round-trip)
  const hasDirectFlights = flights.some(f => {
    if (!f.return) {
      return f.departure.stops === 0;
    }
    return f.departure.stops === 0 && f.return.stops === 0;
  });
  const hasVfr2pc = flights.some(f => f.airline === 'VNA' && f.baggageType === 'VFR');

  // Check if show more button should be visible
  const shouldShowMoreButton = filters.showCheapestOnly || filters.directFlightsOnly;

  // Format price for display
  const formatPriceDisplay = (price: number) => {
    return new Intl.NumberFormat('ko-KR').format(price);
  };
  const formatDate = (date?: Date | string) => {
    if (!date) return '';
    const d = typeof date === 'string' ? new Date(date) : date;
  
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
  
    return `${y}-${m}-${day}`;
  };
  return (
    <div className={`min-h-screen transition-all duration-100 ${
      showContent 
        ? 'bg-white dark:from-gray-900 dark:via-gray-800 dark:to-gray-900' 
        : 'bg-white'
    }`}>
      {showContent && (
        <>
          <TopNavbar
            onShowPNRModal={() => setShowPNRModal(true)}
            onShowEmailModal={() => setIsEmailModalOpen(true)}
            onShowVJTicketModal={() => setShowVJTicketModal(true)}
            onShowVNATicketModal={() => setShowVNATicketModal(true)}
            onShowRepriceModal={() => setShowRepriceModal(true)}
          />

          {/* Hero Banner with Background Image */}
          <div 
            className="relative w-full min-h-[450px] bg-cover bg-center"
            style={{ backgroundImage: `url(${backgroundBanner})` }}
          >
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-white/20"></div>
            <div className="container mx-auto px-4 h-full flex items-start sm:items-center justify-center relative z-10 pt-24 sm:pt-0 pb-6">
              <div className="w-full max-w-5xl">
                <FlightSearchForm onSearch={handleSearch} loading={loading} />
              </div>
            </div>
          </div>

          <main className="container mx-auto px-4 py-8 animate-fade-in">
        
        {flights.length > 0 && <div className="animate-fade-in" ref={resultsRef}>
            <FlightFilters filters={filters} onFiltersChange={setFilters} hasDirectFlights={hasDirectFlights} hasVfr2pc={hasVfr2pc} />
          </div>}

        {loading && <div className="flex items-center justify-center py-12 animate-fade-in">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
          </div>}

        {error && <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-8 animate-fade-in">
            <p className="text-red-600 dark:text-red-400">{error}</p>
          </div>}
        {/* Low Fare Chart - show after first search */}
        {hasSearched && (lowFareDeparture.length > 0 || lowFareReturn.length > 0) && (
          <LowFareChart
            departureData={lowFareDeparture}
            returnData={lowFareReturn}
            tripType={searchData.tripType === 'round_trip' ? 'RT' : 'OW'}
            onSearchWithDates={handleSearchWithDates}
            isLoading={loading}
            initialDepartureDate={formatDate(searchData?.departureDate)}
            initialReturnDate={formatDate(searchData?.returnDate)}
            cheapestOtherFlight={profile?.perm_check_other && cheapestOtherFlight ? {
              airlineName: cheapestOtherFlight.airlineName,
              price: cheapestOtherFlight.adjustedPrice,
              route: `${cheapestOtherFlight.departure.airport} → ${cheapestOtherFlight.arrival.airport}`,
              totalFlights: filteredOtherFlights.length,
            } : null}
            onShowOtherAirlines={() => setShowOtherAirlinesModal(true)}
          />
        )}

        {/* Other Airlines Cheapest Flight Box */}
        {profile?.perm_check_other && cheapestOtherFlight && filteredOtherFlights.length > 0 && (
          <div 
            className="bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 border border-purple-200 dark:border-purple-700 rounded-xl p-4 mb-6 cursor-pointer hover:shadow-lg transition-all duration-300 animate-fade-in"
            onClick={() => setShowOtherAirlinesModal(true)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-purple-100 dark:bg-purple-800 p-2 rounded-lg">
                  <Plane className="w-6 h-6 text-purple-600 dark:text-purple-300" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-purple-700 dark:text-purple-300">
                    Hãng khác rẻ nhất: {cheapestOtherFlight.airlineName}
                  </h3>
                  <p className="text-sm text-purple-600 dark:text-purple-400">
                    Bấm để xem tất cả {filteredOtherFlights.length} chuyến bay từ các hãng khác
                  </p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-purple-700 dark:text-purple-300">
                  {formatPriceDisplay(cheapestOtherFlight.adjustedPrice)} KRW
                </div>
                <div className="text-sm text-purple-500 dark:text-purple-400">
                  {cheapestOtherFlight.departure.airport} → {cheapestOtherFlight.arrival.airport}
                </div>
              </div>
            </div>
          </div>
        )}

        {filteredFlights.length > 0 && <div className="space-y-4 animate-fade-in">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* VietJet flights on the left */}
              <div className="space-y-4">
                {vjFlights.length > 0 && <div className="p-3 rounded-lg transition-all duration-300 bg-blue-50">
                    <h3 className="text-lg font-semibold text-red-600 dark:text-red-400 mb-3">
                      VietJet ({vjFlights.length} chuyến bay)
                    </h3>
                    <div className="space-y-4">
                      {vjFlights.map(flight => <FlightCard key={flight.id} flight={flight} priceMode="Page" onHoldTicket={profile?.perm_hold_ticket === true ? handleHoldTicket : undefined} />)}
                    </div>
                  </div>}
              </div>

              {/* Vietnam Airlines flights on the right */}
              <div className="space-y-4">
                {vnaFlights.length > 0 && <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg transition-all duration-300">
                    <h3 className="text-lg font-semibold text-blue-600 dark:text-blue-400 mb-3">
                      Vietnam Airlines ({vnaFlights.length} chuyến bay)
                    </h3>
                    <div className="space-y-4">
                      {vnaFlights.map(flight => <FlightCard key={flight.id} flight={flight} priceMode="Page" onHoldTicket={profile?.perm_hold_ticket === true ? handleHoldTicket : undefined} />)}
                    </div>
                  </div>}
              </div>
            </div>

            {/* Show More Button */}
            {shouldShowMoreButton && (
              <div className="flex justify-center mt-8">
                <Button
                  onClick={handleShowMore}
                  variant="outline"
                  className="px-6 py-3 text-blue-600 border-blue-300 hover:bg-blue-50 hover:border-blue-400 transition-colors"
                >
                  Hiển thị thêm
                </Button>
              </div>
            )}
          </div>}

            {!loading && flights.length === 0 && searchPerformed && !error && <div className="text-center py-12 animate-fade-in">
                <p className="text-gray-500 dark:text-gray-400">
                  Không tìm thấy chuyến bay nào phù hợp với yêu cầu của bạn.
                </p>
              </div>}
          </main>
        </>
      )}

      {/* Scroll to top button */}
      {showContent && showScrollTop && (
        <Button
          onClick={scrollToTop}
          className="fixed bottom-6 right-6 z-50 rounded-full w-12 h-12 p-0 bg-white dark:bg-gray-800 border-2 border-blue-600 dark:border-blue-400 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 shadow-lg animate-fade-in"
          size="icon"
        >
          <ArrowUp className="h-5 w-5" />
        </Button>
      )}

      {showContent && (
        <>
          <EmailTicketModal 
            isOpen={isEmailModalOpen} 
            onClose={() => setIsEmailModalOpen(false)} 
          />
          <PNRCheckModal 
            isOpen={showPNRModal} 
            onClose={() => setShowPNRModal(false)} 
          />
          <VJTicketModal 
            isOpen={showVJTicketModal} 
            onClose={() => {
              setShowVJTicketModal(false);
              setTicketPNR(undefined);
            }}
            initialPNR={ticketPNR}
          />
          <VNATicketModal 
            isOpen={showVNATicketModal} 
            onClose={() => {
              setShowVNATicketModal(false);
              setTicketPNR(undefined);
            }}
            initialPNR={ticketPNR}
          />
          <RepriceModal
            isOpen={showRepriceModal}
            onClose={() => setShowRepriceModal(false)}
          />
          {selectedFlight?.airline === 'VJ' && selectedFlight?.bookingKey && (
            <VJBookingModal
              isOpen={showVJBookingModal}
              onClose={() => {
                setShowVJBookingModal(false);
                setSelectedFlight(null);
              }}
              bookingKey={selectedFlight.bookingKey}
              bookingKeyReturn={selectedFlight.bookingKeyReturn}
              tripType={selectedFlight.return ? 'RT' : 'OW'}
              departureAirport={selectedFlight.departure.airport}
              maxSeats={selectedFlight.availableSeats}
              onBookingSuccess={(pnr) => {
                console.log('Booking success:', pnr);
                toast({
                  title: "Giữ vé thành công!",
                  description: `Mã giữ vé: ${pnr}. Đang lấy ảnh mặt vé...`,
                });
                // Auto open VJ ticket modal to get ticket image
                setTicketPNR(pnr);
                setTimeout(() => {
                  setShowVJTicketModal(true);
                }, 500);
              }}
            />
          )}
          {selectedFlight?.airline === 'VNA' && (
            <VNABookingModal
              isOpen={showVNABookingModal}
              onClose={() => {
                setShowVNABookingModal(false);
                setSelectedFlight(null);
              }}
              flightInfo={{
                dep: selectedFlight.departure.airport,
                arr: selectedFlight.arrival.airport,
                depdate: selectedFlight.departure.date,
                deptime: selectedFlight.departure.time,
                arrdate: selectedFlight.return?.departure.date,
                arrtime: selectedFlight.return?.departure.time,
                tripType: selectedFlight.return ? 'RT' : 'OW',
              }}
              maxSeats={selectedFlight.availableSeats}
              onBookingSuccess={(pnr) => {
                console.log('Booking success:', pnr);
                toast({
                  title: "Giữ vé thành công!",
                  description: `Mã giữ vé: ${pnr}. Đang lấy ảnh mặt vé...`,
                });
                // Auto open VNA ticket modal to get ticket image
                setTicketPNR(pnr);
                setTimeout(() => {
                  setShowVNATicketModal(true);
                }, 500);
              }}
            />
          )}
          
          {/* Other Airlines Modal */}
          <OtherAirlinesModal
            isOpen={showOtherAirlinesModal}
            onClose={() => setShowOtherAirlinesModal(false)}
            flights={otherFlights}
            allowedAirlines={allowedOtherAirlines}
          />
        </>
      )}

      <InkSplashEffect
        isActive={reverseInkSplash.active}
        x={reverseInkSplash.x}
        y={reverseInkSplash.y}
        reverse={true}
        onComplete={() => {
          setReverseInkSplash({ active: false, x: 0, y: 0 });
        }}
      />
    </div>
  );
}
