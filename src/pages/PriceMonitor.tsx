import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Plus, Trash2, RefreshCw, Bell, Pencil, Users, ShoppingBasket } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PassengerWithType, PassengerInfo, BookingModal } from "@/components/VJBookingModal";
import { VNABookingModalPriceMonitor } from "@/components/VNABookingModalPriceMonitor";
import { Switch } from "@/components/ui/switch";
import { TopNavbar } from "@/components/TopNavbar";
import { PNRCheckModal } from "@/components/PNRCheckModal";
import { EmailTicketModal } from "@/components/EmailTicketModal";
import { VJTicketModal } from "@/components/VJTicketModal";
import { VNATicketModal } from "@/components/VNATicketModal";
import { useHoverSound } from "@/hooks/useHoverSound";

interface FlightSegment {
  departure_airport: string;
  arrival_airport: string;
  departure_date: string;
  departure_time?: string;
  ticket_class: "ADT" | "VFR" | "STU";
  stopover_airport?: string; // Chặng dừng (tùy chọn)
}

interface MonitoredFlight {
  id: string;
  airline: string;
  departure_airport: string;
  arrival_airport: string;
  departure_date: string;
  departure_time?: string;
  is_round_trip?: boolean;
  return_date?: string;
  return_time?: string;
  segments?: FlightSegment[];
  ticket_class?: string;
  current_price: number | null;
  last_checked_at: string | null;
  check_interval_minutes: number;
  is_active: boolean;
  passengers?: PassengerWithType[];
  booking_key_departure?: string;
  booking_key_return?: string;
  auto_hold_enabled?: boolean;
  pnr?: string;
  reprice_pnr?: string;
}

// Korean airports
const KOREAN_AIRPORTS = ["ICN", "GMP", "PUS", "CJU", "TAE", "KWJ", "USN", "CHN", "RSU", "KUV"];

// Vietnamese airports
const VIETNAMESE_AIRPORTS = [
  "HAN",
  "SGN",
  "DAD",
  "CXR",
  "HPH",
  "HUI",
  "VCA",
  "VCS",
  "VDO",
  "VII",
  "PQC",
  "UIH",
  "DIN",
  "BMV",
  "VKG",
];

// All airports combined
const ALL_AIRPORTS = [...VIETNAMESE_AIRPORTS, ...KOREAN_AIRPORTS].sort();

// Generate time options in 5-minute intervals
const TIME_OPTIONS = Array.from({ length: 288 }, (_, i) => {
  const hours = Math.floor(i / 12);
  const minutes = (i % 12) * 5;
  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
});

// Get today's date in YYYY-MM-DD format
const getTodayString = () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today.toISOString().split("T")[0];
};

export default function PriceMonitor() {
  const navigate = useNavigate();
  const location = useLocation();
  const { profile } = useAuth();
  const { playClickSound } = useHoverSound();
  const [flights, setFlights] = useState<MonitoredFlight[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingFlightId, setEditingFlightId] = useState<string | null>(null);
  const [editCheckInterval, setEditCheckInterval] = useState("60");
  const [checkingFlightId, setCheckingFlightId] = useState<string | null>(null);
  const checkingFlightIdRef = useRef<string | null>(null); // Ref to prevent race conditions
  const [isAutoCheck, setIsAutoCheck] = useState(false);
  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [selectedFlight, setSelectedFlight] = useState<MonitoredFlight | null>(null);
  const [isPnrModalOpen, setIsPnrModalOpen] = useState(false);
  const [pnrCode, setPnrCode] = useState("");
  const [showPNRModal, setShowPNRModal] = useState(false);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [showVJTicketModal, setShowVJTicketModal] = useState(false);
  const [showVNATicketModal, setShowVNATicketModal] = useState(false);

  // Send Telegram notification
  const sendTelegramNotification = async (flight: MonitoredFlight, newPrice: number, oldPrice: number) => {
    try {
      if (!profile?.apikey_telegram || !profile?.idchat_telegram) {
        console.log('Telegram settings not configured');
        return;
      }

      const priceDiff = Math.abs(newPrice - oldPrice);
      const pnr = flight.pnr || 'N/A';
      const message = `🎉 PNR ${pnr} đã giảm giá!\n\nGiá cũ: ${oldPrice.toLocaleString()} KRW\nGiá mới: ${newPrice.toLocaleString()} KRW\nGiảm: ${priceDiff.toLocaleString()} KRW`;

      const telegramApiUrl = `https://api.telegram.org/bot${profile.apikey_telegram}/sendMessage`;
      
      await fetch(telegramApiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: profile.idchat_telegram,
          text: message,
        }),
      });
    } catch (error) {
      console.error('Failed to send Telegram notification:', error);
    }
  };
  const [pnrAirline, setPnrAirline] = useState<"VJ" | "VNA">("VJ");
  const [exactTimeMatch, setExactTimeMatch] = useState(true);
  const [isLoadingPnr, setIsLoadingPnr] = useState(false);

  // Form state
  const [airline, setAirline] = useState<"VJ" | "VNA">("VJ");
  const [departureAirport, setDepartureAirport] = useState("");
  const [arrivalAirport, setArrivalAirport] = useState("");
  const [departureDate, setDepartureDate] = useState("");
  const [departureTime, setDepartureTime] = useState("");
  const [isRoundTrip, setIsRoundTrip] = useState(false);
  const [returnDate, setReturnDate] = useState("");
  const [returnTime, setReturnTime] = useState("");
  const [checkInterval, setCheckInterval] = useState("5");

  // VNA segments state - simplified to 2 segments like VJ
  const [vnaTicketClass, setVnaTicketClass] = useState<"ADT" | "VFR" | "STU">("ADT");
  const [vnaStopoverAirport, setVnaStopoverAirport] = useState("none");
  const [vnaReturnStopoverAirport, setVnaReturnStopoverAirport] = useState("none");

  useEffect(() => {
    if (!profile?.perm_check_discount) {
      navigate("/");
      return;
    }
    fetchMonitoredFlights();

    // Check if navigated from held tickets with PNR
    if (location.state && location.state.pnr) {
      setPnrCode(location.state.pnr);
      setPnrAirline(location.state.airline || "VNA");
      setExactTimeMatch(location.state.exactTimeMatch !== undefined ? location.state.exactTimeMatch : true);
      setIsPnrModalOpen(true);
      // Clear location state
      window.history.replaceState({}, document.title);
    }

    // Refresh every second to update progress bars and check if auto-check is needed
    const interval = setInterval(() => {
      setFlights((prev) => {
        // Don't run auto-check if flights array is empty (still loading)
        if (prev.length === 0) return prev;

        // Only process ONE flight at a time to prevent race conditions
        // Skip if any check is already in progress
        if (checkingFlightIdRef.current) return [...prev];

        // Find the first active flight that needs auto-check
        const flightToCheck = prev.find((flight) => {
          if (!flight.is_active || !flight.last_checked_at) return false;
          const progress = calculateProgress(flight.last_checked_at, flight.check_interval_minutes);
          return progress >= 100;
        });

        if (flightToCheck) {
          // Set ref immediately before async call to prevent race conditions
          checkingFlightIdRef.current = flightToCheck.id;
          handleManualCheck(flightToCheck.id, true);
        }

        return [...prev];
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [profile, navigate, checkingFlightId]);

  // Auto-check when entering page if needed
  useEffect(() => {
    if (loading || flights.length === 0 || checkingFlightIdRef.current) return;

    // Find the first flight that needs checking (only process ONE at a time)
    const flightToCheck = flights.find((flight) => {
      if (!flight.is_active) return false;
      // Check if never checked OR time since last check exceeds interval
      return !flight.last_checked_at ||
        (flight.last_checked_at && calculateProgress(flight.last_checked_at, flight.check_interval_minutes) >= 100);
    });

    if (flightToCheck) {
      setIsAutoCheck(true);
      // Set ref immediately before async call to prevent race conditions
      checkingFlightIdRef.current = flightToCheck.id;
      handleManualCheck(flightToCheck.id, true);
    }
  }, [loading, flights]);

  const fetchMonitoredFlights = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("monitored_flights")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Map data to properly typed flights
      const typedFlights: MonitoredFlight[] = (data || []).map((flight) => ({
        ...flight,
        segments: flight.segments ? (flight.segments as any as FlightSegment[]) : undefined,
        passengers: flight.passengers ? (flight.passengers as any as PassengerWithType[]) : undefined,
      }));

      setFlights(typedFlights);
    } catch (error) {
      console.error("Error fetching monitored flights:", error);
      toast({
        title: "Lỗi",
        description: "Không thể tải danh sách chuyến bay theo dõi",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddFlight = async () => {
    // Check flight limit before adding
    const activeFlightCount = flights.filter(f => f.is_active).length;
    const maxFlights = profile?.hold_ticket_quantity || 0;
    
    if (activeFlightCount >= maxFlights) {
      toast({
        variant: "destructive",
        title: "Đã đạt giới hạn",
        description: `Bạn chỉ được phép theo dõi tối đa ${maxFlights} hành trình cùng lúc`,
      });
      return;
    }

    const today = getTodayString();

    // Validate based on airline
    if (airline === "VJ") {
      if (!departureAirport || !arrivalAirport || !departureDate) {
        toast({
          title: "Lỗi",
          description: "Vui lòng điền đầy đủ thông tin",
          variant: "destructive",
        });
        return;
      }

      // Validate departure date is in the future
      if (departureDate <= today) {
        toast({
          title: "Lỗi",
          description: "Ngày đi phải lớn hơn ngày hiện tại",
          variant: "destructive",
        });
        return;
      }

      if (isRoundTrip) {
        if (!returnDate) {
          toast({
            title: "Lỗi",
            description: "Vui lòng chọn ngày về",
            variant: "destructive",
          });
          return;
        }
        // Validate return date is after departure date
        if (returnDate <= departureDate) {
          toast({
            title: "Lỗi",
            description: "Ngày về phải lớn hơn ngày đi",
            variant: "destructive",
          });
          return;
        }
      }
    } else {
      // VNA validation
      if (!departureAirport || !arrivalAirport || !departureDate) {
        toast({
          title: "Lỗi",
          description: "Vui lòng điền đầy đủ thông tin",
          variant: "destructive",
        });
        return;
      }

      // Validate departure date is in the future
      if (departureDate <= today) {
        toast({
          title: "Lỗi",
          description: "Ngày đi phải lớn hơn ngày hiện tại",
          variant: "destructive",
        });
        return;
      }

      if (isRoundTrip) {
        if (!returnDate) {
          toast({
            title: "Lỗi",
            description: "Vui lòng chọn ngày về",
            variant: "destructive",
          });
          return;
        }
        // Validate return date is after departure date
        if (returnDate <= departureDate) {
          toast({
            title: "Lỗi",
            description: "Ngày về phải lớn hơn ngày đi",
            variant: "destructive",
          });
          return;
        }
      }
    }

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const insertData: any = {
        user_id: user.id,
        airline,
        check_interval_minutes: parseInt(checkInterval),
        pnr: Array.from(
          { length: 6 },
          () => "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"[Math.floor(Math.random() * 36)],
        ).join(""),
      };

      if (airline === "VJ") {
        insertData.departure_airport = departureAirport;
        insertData.arrival_airport = arrivalAirport;
        insertData.departure_date = departureDate;
        insertData.departure_time = (departureTime && departureTime !== 'none') ? departureTime : null;
        insertData.is_round_trip = isRoundTrip;
        insertData.return_date = isRoundTrip ? returnDate : null;
        insertData.return_time = isRoundTrip ? ((returnTime && returnTime !== 'none') ? returnTime : null) : null;
      } else {
        // For VNA, use 2 segments like VJ (departure + optional return)
        const segments: FlightSegment[] = [
          {
            departure_airport: departureAirport,
            arrival_airport: arrivalAirport,
            departure_date: departureDate,
            departure_time: (departureTime && departureTime !== 'none') ? departureTime : null,
            ticket_class: vnaTicketClass,
            stopover_airport: (vnaStopoverAirport && vnaStopoverAirport !== 'none') ? vnaStopoverAirport : undefined,
          },
        ];
        
        if (isRoundTrip && returnDate) {
          segments.push({
            departure_airport: arrivalAirport,
            arrival_airport: departureAirport,
            departure_date: returnDate,
            departure_time: (returnTime && returnTime !== 'none') ? returnTime : null,
            ticket_class: vnaTicketClass,
            stopover_airport: (vnaReturnStopoverAirport && vnaReturnStopoverAirport !== 'none') ? vnaReturnStopoverAirport : undefined,
          });
        }
        
        insertData.segments = segments;
        insertData.departure_airport = departureAirport;
        insertData.arrival_airport = arrivalAirport;
        insertData.departure_date = departureDate;
        insertData.is_round_trip = isRoundTrip;
        insertData.return_date = isRoundTrip ? returnDate : null;
      }

      const { data: newFlight, error } = await supabase.from("monitored_flights").insert(insertData).select().single();

      if (error) throw error;

      toast({
        title: "Thành công",
        description: "Đã thêm chuyến bay vào danh sách theo dõi",
      });

      // Reset form
      setDepartureAirport("");
      setArrivalAirport("");
      setDepartureDate("");
      setDepartureTime("");
      setIsRoundTrip(false);
      setReturnDate("");
      setReturnTime("");
      setCheckInterval("60");
      setVnaTicketClass("ADT");
      setVnaStopoverAirport("none");
      setVnaReturnStopoverAirport("none");
      setIsAddModalOpen(false);

      // Fetch updated list first
      await fetchMonitoredFlights();

      // Then automatically check price for the new flight
      if (newFlight) {
        setTimeout(() => {
          handleManualCheck(newFlight.id);
        }, 500);
      }
    } catch (error) {
      console.error("Error adding flight:", error);
      toast({
        title: "Lỗi",
        description: "Không thể thêm chuyến bay",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from("monitored_flights").delete().eq("id", id);

      if (error) throw error;

      setFlights(flights.filter((f) => f.id !== id));
      toast({
        title: "Đã xóa",
        description: "Đã xóa chuyến bay khỏi danh sách theo dõi",
      });
    } catch (error) {
      console.error("Error deleting flight:", error);
      toast({
        title: "Lỗi",
        description: "Không thể xóa chuyến bay",
        variant: "destructive",
      });
    }
  };

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase.from("monitored_flights").update({ is_active: !currentStatus }).eq("id", id);

      if (error) throw error;

      setFlights(flights.map((f) => (f.id === id ? { ...f, is_active: !currentStatus } : f)));

      toast({
        title: !currentStatus ? "Đã bật" : "Đã tắt",
        description: !currentStatus ? "Đã bật theo dõi giá" : "Đã tắt theo dõi giá",
      });
    } catch (error) {
      console.error("Error toggling active:", error);
      toast({
        title: "Lỗi",
        description: "Không thể cập nhật trạng thái",
        variant: "destructive",
      });
    }
  };

  const handleManualCheck = async (flightId: string, isAutomatic = false) => {
    // Prevent concurrent checks using ref (state updates are async)
    // If ref is already set to a DIFFERENT flight, skip (another check in progress)
    // If ref is already set to THIS flight, continue (was pre-set by auto-check)
    // If ref is null, set it (manual check)
    if (checkingFlightIdRef.current && checkingFlightIdRef.current !== flightId) {
      console.log('Check already in progress for another flight, skipping');
      return;
    }
    checkingFlightIdRef.current = flightId;
    setCheckingFlightId(flightId);

    try {
      // Find the flight in current state
      const flight = flights.find((f) => f.id === flightId);
      if (!flight) {
        throw new Error("Không tìm thấy thông tin chuyến bay");
      }

      // Handle VNA flights
      if (flight.airline === "VNA") {
        return await handleCheckVNAPrice(flightId, flight, isAutomatic);
      }

      // VJ logic continues below
      if (flight.airline !== "VJ") {
        toast({
          variant: "destructive",
          title: "Lỗi",
          description: "Hiện tại chỉ hỗ trợ kiểm tra giá VietJet và Vietnam Airlines",
        });
        return;
      }

      // Build request body for VJ API
      const passengers = flight.passengers || [];
      const adt = passengers.filter((p: PassengerWithType) => p.type === "người_lớn").length;
      const chd = passengers.filter((p: PassengerWithType) => p.type === "trẻ_em").length;
      const inf = passengers.filter((p: PassengerWithType) => p.infant).length;

      const requestBody: any = {
        dep0: flight.departure_airport,
        arr0: flight.arrival_airport,
        depdate0: flight.departure_date,
        adt: adt.toString(),
        chd: chd.toString(),
        inf: inf.toString(),
        sochieu: flight.is_round_trip ? "RT" : "OW",
      };

      if (flight.is_round_trip && flight.return_date) {
        requestBody.depdate1 = flight.return_date;
      }

      // Call VJ API directly
      const response = await fetch("https://thuhongtour.com/vj/check-ve-v2", {
        method: "POST",
        headers: {
          accept: "application/json",
          "content-type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error("Không thể kết nối API VietJet");
      }

      const data = await response.json();

      if (!data.body || data.body.length === 0) {
        toast({
          variant: "destructive",
          title: "Không tìm thấy chuyến bay",
          description: "Không có chuyến bay nào phù hợp với hành trình này",
        });
        return;
      }

      // Find matching flight
      let matchingFlight: any = null;

      if (flight.departure_time || (flight.is_round_trip && flight.return_time)) {
        // Filter by specific time
        const filtered = data.body.filter((f: any) => {
          const departureMatch = flight.departure_time ? f["chiều_đi"]?.giờ_cất_cánh === flight.departure_time : true;

          const returnMatch =
            flight.is_round_trip && flight.return_time ? f["chiều_về"]?.giờ_cất_cánh === flight.return_time : true;

          return departureMatch && returnMatch;
        });

        if (filtered.length > 0) {
          matchingFlight = filtered[0];
        }
      } else {
        // Find cheapest flight
        matchingFlight = data.body.reduce((cheapest: any, current: any) => {
          const currentPrice = parseInt(current["thông_tin_chung"]?.giá_vé || "999999999");
          const cheapestPrice = parseInt(cheapest["thông_tin_chung"]?.giá_vé || "999999999");
          return currentPrice < cheapestPrice ? current : cheapest;
        }, data.body[0]);
      }

      if (!matchingFlight) {
        // Update last_checked_at even when no matching flight is found (reset timer)
        await supabase
          .from("monitored_flights")
          .update({ last_checked_at: new Date().toISOString() })
          .eq("id", flightId);

        toast({
          variant: "destructive",
          title: "Không tìm thấy chuyến bay",
          description: "Không có chuyến bay nào phù hợp với giờ bay đã chọn",
        });
        fetchMonitoredFlights();
        return;
      }

      const newPrice = parseInt(matchingFlight["thông_tin_chung"]?.giá_vé || "0");
      const oldPrice = flight.current_price -5000;
      const bookingKeyDeparture = matchingFlight["chiều_đi"]?.BookingKey || matchingFlight["chiều_đi"]?.booking_key;
      const bookingKeyReturn = flight.is_round_trip
        ? matchingFlight["chiều_về"]?.BookingKey || matchingFlight["chiều_về"]?.booking_key
        : null;

      console.log("Booking Keys:", { bookingKeyDeparture, bookingKeyReturn });

      // Update database with booking keys and last_checked_at (NOT the price)
      const { error: updateError } = await supabase
        .from("monitored_flights")
        .update({
          booking_key_departure: bookingKeyDeparture,
          booking_key_return: bookingKeyReturn,
          last_checked_at: new Date().toISOString(),
        })
        .eq("id", flightId);

      if (updateError) throw updateError;

      // Check if auto-hold should be triggered
      const shouldAutoHold =
        flight.auto_hold_enabled &&
        ((oldPrice && oldPrice > 0 && newPrice < oldPrice) || ((!oldPrice || oldPrice === 0) && newPrice > 0));

      if (shouldAutoHold && bookingKeyDeparture && flight.passengers && flight.passengers.length > 0) {
        try {
          // Call auto-hold function
          await handleAutoHoldTicket(flight, bookingKeyDeparture, bookingKeyReturn);
          return; // Exit early as the flight is now held and deleted
        } catch (error) {
          console.error("Auto-hold failed:", error);
          // Send Telegram notification about failure (similar to VNA)
          if (profile?.apikey_telegram && profile?.idchat_telegram) {
            const failMessage = `⚠️ Có hành trình VJ giảm chưa giữ vé thành công, hãy giữ vé thủ công\n\nPNR: ${flight.pnr || 'N/A'}\nHành trình: ${flight.departure_airport} → ${flight.arrival_airport}\nGiá mới: ${newPrice.toLocaleString()} KRW`;
            fetch(`https://api.telegram.org/bot${profile.apikey_telegram}/sendMessage`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: profile.idchat_telegram,
                text: failMessage,
              }),
            }).catch(e => console.log('Could not send failure notification:', e));
          }
          // Continue with normal flow if auto-hold fails
        }
      }

      // Show notification based on price change
      if (oldPrice !== null && oldPrice !== undefined) {
        const priceDiff = newPrice - oldPrice;

        if (priceDiff < 0) {
          // Play notification sound for price drop
          const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTUIGWS57OScTgwOUKXi8LJnHQU2jdXzzX0vBSl+zPLaizsKGGS56+ihUhELTKXh8bllHAU1jNTz0IAyBSh+zPLaizsKF2O56+mjUBELTKTg8bllHAU1i9Tz0IEzBSh8y/Lbi0ELF2K56+mjTxAKS6Pg8bllHAUzi9Tz0YEzBSh8y/Lbi0ELFmG56+mjTxAKS6Pg8blmHgU0itPz0oI0BSh7y/Lbi0ELFmG56+mjTxAKS6Pg8bllHAUzitPz0oI0BSh7y/Lbi0ELFWCy4/DRimkdBTCP0fDcizwKGWO46+mjUBELTKPe8bplHgU0idLzz38yBSd6yvLci0YMFl+y4+/SiGgcBjCO0fDbi0ALFmC05O+rWRQKR6He8bxqIAU0h9Lz0H8zBSd5yvLdizwKGGC04++oVRMMSaDf8blnHwU1htHz0YAzBSV2yPLdizsKF1+z5O6pVxQKR5/d8L1tIgU0hNHz0oE0BSV1yPLdjEYLFl6y4+6pVxQLRp/d8L5uIwUzg9Hz04I1BSVzy/LdizsKF1205O+rWRQKRp7d8L1uIgUygtHz04I0BSVzy/LdjEYLFl2y4+6qWhQLRp7c8LxvJAUygdHz1II1BSVyyvLejEYLFlyx4++rWxUKRZ3b8LxvJAUxf9Dz1II1BSVxyvLejEYLFVux4++sXRYLRJzb8LxvIwUwf8/z1YM1BSVwyfLejEYLFVqw4+6sXRYLRJzb8LxvIwUwf8/z1YM1BSVvyPLejEYLFVmx4+6tXRYLRJva8LxvIwUwfs/z1YM1BSVvyPLejEYLFVmw4+6tXRYLRJva8LxvJAUvfs/z1YQ2BSZuyPLfjUcMFVmw4u2sXBYKRZvZ8LpwJAUvfs7z1oQ2BSZtyPLfjUcMFViv4u2sXBYKRZvZ8LpwJAUufc7z1oQ3BSZsyPLfjUcMFViv4u2sXBYKRZrZ8LlvIwUsfc7z14Q2BSZsyPLfjUcMFViv4u2tXRYKRZrZ8LlvIwUsfc7z14Q2BSZrx/LgjEYMFViu4u2tXRYKRZrZ8LlvIwUsfc7z14Q2BSZrx/LgjEYMFViu4u2tXRYKRZrZ8LlvIwUsfc7z14M2BSZqx/LgjEYMFVat4u2uXhYKRZnY8LlvIwUrfM7z14M3BSZqxvLgjEYMFVWt4u2uXhYKRZnY8LlvIwUrfM7z14M3BSZpxvLgjEYMFVWt4uyuXhYKRZnY8LlvIwUrfM7z14M3BSZpxvLgjEYMFVWt4uyuXhYKRZnY8LlvIwUrfM7z14M3BSZpxvLgjEYMFVWs4uyuXhYKRZnY8LluJAUrfM7z14M3BSZpxvLgjEYMFVWs4uyuXhYKRZnY8LluJAUrfM7z14M3BSZpxvLgjEYMFVWs4uyuXhYKRZnY8LluJAUrfM7z14M3BSZpxvLgjEYMFVWs4uyuXhYKRZnY8LluJAUrfM7z14M3BSZpxvLgjEYMFVWs4uyvXhYKRZnY8LluJAUrfM7z14M3BSZpxvLgjEYMFVWs4uyvXhYKRZnY8LluJAUrfM7z14M3BSZpxvLgjEYMFVWs4uyvXhYKRZnY8LluJAUrfM7z14M3BSZpxvLgjEYMFVWr4uyvXhYKRZnY8LluJAUrfM7z14M3BSZpxvLgjEYMFVWr4uyvXhYKRZnY8LluJAUrfM7z14M3BSZpxvLgjEYMFVWr4uyvXhYKRZnY8LluJAUrfM7z14M3BSZpxvLgjEYMFVWr4uyvXhYKRZnY8LluJAUrfM7z14M3BSZpxvLgjEYMFVWr4uyvXhYKRZnY8LluJAUrfM7z14M3BSZpxvLgjEYMFVWr4uyvXhYKRZnY8LluJAUrfM7z14M3BSZpxvLgjEYMFVWr4uyvXhYKRZnY8LluJAUrfM7z14M3BSZpxvLgjEYMFVWr4uyvXhYK');
          audio.volume = 0.5;
          audio.play().catch((e) => console.log('Could not play notification sound:', e));

          // Send Telegram notification (non-blocking)
          sendTelegramNotification(flight, newPrice, oldPrice).catch((e) => 
            console.log('Could not send Telegram notification:', e)
          );

          toast({
            title: "Giá vé giảm! 🎉",
            description: `Giá mới: ${newPrice.toLocaleString()} KRW (giảm ${Math.abs(priceDiff).toLocaleString()} KRW)`,
            className: "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800",
          });
        } else if (priceDiff > 0) {
          if (!isAutomatic) {
            toast({
              title: "Giá vé tăng",
              description: `Giá mới: ${newPrice.toLocaleString()} KRW (tăng ${priceDiff.toLocaleString()} KRW)`,
              variant: "destructive",
            });
          }
        } else {
          if (!isAutomatic) {
            toast({
              title: "Giá vé không đổi",
              description: `Giá hiện tại: ${newPrice.toLocaleString()} KRW`,
            });
          }
        }
      } else {
        if (!isAutomatic) {
          toast({
            title: "Đã cập nhật giá",
            description: `Giá hiện tại: ${newPrice.toLocaleString()} KRW`,
          });
        }
      }

      await fetchMonitoredFlights();
    } catch (error) {
      console.error("Error checking price:", error);
      // Only show toast if it's not the "flight not found" error (which happens on initial load)
      if (error instanceof Error && error.message !== "Không tìm thấy thông tin chuyến bay") {
        toast({
          variant: "destructive",
          title: "Lỗi",
          description: error.message,
        });
      }
    } finally {
      checkingFlightIdRef.current = null;
      setCheckingFlightId(null);
      if (isAutomatic) {
        setIsAutoCheck(false);
      }
    }
  };

  const handleCheckVNAPrice = async (flightId: string, flight: MonitoredFlight, isAutomatic = false) => {
    try {
      // Use reprice_pnr if available, otherwise fall back to pnr
      const repricePnr = flight.reprice_pnr || flight.pnr;
      
      if (!repricePnr) {
        throw new Error("Không có PNR để kiểm tra");
      }

      const segments = flight.segments || [];
      if (segments.length === 0) {
        throw new Error("Không có thông tin chặng bay");
      }

      const segment1 = segments[0];
      const ticketClass = segment1.ticket_class || flight.ticket_class || "VFR";
      const oldPrice = flight.current_price;

      console.log("VNA Check with reprice_pnr:", repricePnr);

      // Step 1: Call checkvechoVNA with reprice_pnr
      const checkResponse = await fetch(`https://thuhongtour.com/checkvechoVNA?pnr=${repricePnr}`, {
        method: "GET",
        headers: { accept: "application/json" },
      });

      if (!checkResponse.ok) {
        throw new Error("Không thể kết nối API Vietnam Airlines");
      }

      const checkData = await checkResponse.json();
      console.log("VNA Check PNR Response:", checkData);

      // If response is null or empty, skip this periodic check
      if (!checkData || checkData === null) {
        console.log("VNA Check: Response is null, skipping this check");
        // Update last_checked_at only
        await supabase
          .from("monitored_flights")
          .update({ last_checked_at: new Date().toISOString() })
          .eq("id", flightId);
        return;
      }

      // Update last_checked_at
      await supabase
        .from("monitored_flights")
        .update({ last_checked_at: new Date().toISOString() })
        .eq("id", flightId);

      // Case 1: paymentstatus is false - call reprice API
      if (!checkData.paymentstatus || checkData.paymentstatus !== true) {
        console.log("Case 1: PNR not issued, calling reprice API");
        
        try {
          // Call reprice API
          const repriceResponse = await fetch(`https://thuhongtour.com/reprice?pnr=${repricePnr}&doituong=${ticketClass}`, {
            method: "GET",
            headers: { accept: "application/json" },
          });

          if (!repriceResponse.ok) {
            throw new Error(`Reprice HTTP error: ${repriceResponse.status}`);
          }

          const repriceData = await repriceResponse.json();
          console.log("Reprice Response:", repriceData);

          // Check if reprice was successful (has pricegoc and pricemoi)
          if (repriceData && repriceData.pricegoc && repriceData.pricemoi) {
            // Call checkvechoVNA again to get new price (tongbillgiagoc)
            const reCheckResponse = await fetch(`https://thuhongtour.com/checkvechoVNA?pnr=${repricePnr}`, {
              method: "GET",
              headers: { accept: "application/json" },
            });

            if (reCheckResponse.ok) {
              const reCheckData = await reCheckResponse.json();
              console.log("Re-check PNR Response:", reCheckData);

              const newPrice = reCheckData.tongbillgiagoc || reCheckData.giavegoc || 0;
              
              // Check if price dropped more than 5000
              if (oldPrice && oldPrice > 0 && newPrice > 0 && (oldPrice - newPrice) > 5000) {
                const priceDiff = oldPrice - newPrice;
                
                // Play notification sound
                const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTUIGWS57OScTgwOUKXi8LJnHQU2jdXzzX0vBSl+zPLaizsKGGS56+ihUhELTKXh8bllHAU1jNTz0IAyBSh+zPLaizsKF2O56+mjUBELTKTg8bllHAU1i9Tz0IEzBSh8y/Lbi0ELF2K56+mjTxAKS6Pg8bllHAUzi9Tz0YEzBSh8y/Lbi0ELFmG56+mjTxAKS6Pg8blmHgU0itPz0oI0BSh7y/Lbi0ELFmG56+mjTxAKS6Pg8bllHAUzitPz0oI0BSh7y/Lbi0ELFWCy4/DRimkdBTCP0fDcizwKGWO46+mjUBELTKPe8bplHgU0idLzz38yBSd6yvLci0YMFl+y4+/SiGgcBjCO0fDbi0ALFmC05O+rWRQKR6He8bxqIAU0h9Lz0H8zBSd5yvLdizwKGGC04++oVRMMSaDf8blnHwU1htHz0YAzBSV2yPLdizsKF1+z5O6pVxQKR5/d8L1tIgU0hNHz0oE0BSV1yPLdjEYLFl6y4+6pVxQLRp/d8L5uIwUzg9Hz04I1BSVzy/LdizsKF1205O+rWRQKRp7d8L1uIgUygtHz04I0BSVzy/LdjEYLFl2y4+6qWhQLRp7c8LxvJAUygdHz1II1BSVyyvLejEYLFlyx4++rWxUKRZ3b8LxvJAUxf9Dz1II1BSVxyvLejEYLFVux4++sXRYLRJzb8LxvIwUwf8/z1YM1BSVwyfLejEYLFVqw4+6sXRYLRJzb8LxvIwUwf8/z1YM1BSVvyPLejEYLFVmx4+6tXRYLRJva8LxvIwUwfs/z1YM1BSVvyPLejEYLFVmw4+6tXRYLRJva8LxvJAUvfs/z1YQ2BSZuyPLfjUcMFVmw4u2sXBYKRZvZ8LpwJAUvfs7z1oQ2BSZtyPLfjUcMFViv4u2sXBYKRZvZ8LpwJAUufc7z1oQ3BSZsyPLfjUcMFViv4u2sXBYKRZrZ8LlvIwUsfc7z14Q2BSZsyPLfjUcMFViv4u2tXRYKRZrZ8LlvIwUsfc7z14Q2BSZrx/LgjEYMFViu4u2tXRYKRZrZ8LlvIwUsfc7z14Q2BSZrx/LgjEYMFViu4u2tXRYKRZrZ8LlvIwUsfc7z14M2BSZqx/LgjEYMFVat4u2uXhYKRZnY8LlvIwUrfM7z14M3BSZqxvLgjEYMFVWt4u2uXhYKRZnY8LlvIwUrfM7z14M3BSZpxvLgjEYMFVWt4uyuXhYKRZnY8LlvIwUrfM7z14M3BSZpxvLgjEYMFVWt4uyuXhYKRZnY8LlvIwUrfM7z14M3BSZpxvLgjEYMFVWs4uyuXhYKRZnY8LluJAUrfM7z14M3BSZpxvLgjEYMFVWs4uyuXhYKRZnY8LluJAUrfM7z14M3BSZpxvLgjEYMFVWs4uyuXhYKRZnY8LluJAUrfM7z14M3BSZpxvLgjEYMFVWs4uyuXhYKRZnY8LluJAUrfM7z14M3BSZpxvLgjEYMFVWs4uyvXhYKRZnY8LluJAUrfM7z14M3BSZpxvLgjEYMFVWs4uyvXhYKRZnY8LluJAUrfM7z14M3BSZpxvLgjEYMFVWs4uyvXhYKRZnY8LluJAUrfM7z14M3BSZpxvLgjEYMFVWr4uyvXhYKRZnY8LluJAUrfM7z14M3BSZpxvLgjEYMFVWr4uyvXhYKRZnY8LluJAUrfM7z14M3BSZpxvLgjEYMFVWr4uyvXhYKRZnY8LluJAUrfM7z14M3BSZpxvLgjEYMFVWr4uyvXhYKRZnY8LluJAUrfM7z14M3BSZpxvLgjEYMFVWr4uyvXhYKRZnY8LluJAUrfM7z14M3BSZpxvLgjEYMFVWr4uyvXhYKRZnY8LluJAUrfM7z14M3BSZpxvLgjEYMFVWr4uyvXhYKRZnY8LluJAUrfM7z14M3BSZpxvLgjEYMFVWr4uyvXhYK');
                audio.volume = 0.5;
                audio.play().catch((e) => console.log('Could not play notification sound:', e));

                // Note: Do NOT update current_price for VNA flights during periodic checks

                // Send Telegram notification
                if (profile?.apikey_telegram && profile?.idchat_telegram) {
                  const telegramMessage = `✅ Đã reprice ${repricePnr} (PNR gốc ${flight.pnr || 'N/A'}) ra giá rẻ hơn ${priceDiff.toLocaleString()} KRW\n\nGiá cũ: ${oldPrice.toLocaleString()} KRW\nGiá mới: ${newPrice.toLocaleString()} KRW`;
                  fetch(`https://api.telegram.org/bot${profile.apikey_telegram}/sendMessage`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      chat_id: profile.idchat_telegram,
                      text: telegramMessage,
                    }),
                  }).catch(e => console.log('Could not send Telegram notification:', e));
                }

                toast({
                  title: "Reprice thành công! 🎉",
                  description: `PNR ${repricePnr} đã reprice ra giá rẻ hơn ${priceDiff.toLocaleString()} KRW`,
                  className: "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800",
                });
              } else {
                if (!isAutomatic) {
                  toast({
                    title: "Đã kiểm tra giá VNA",
                    description: `Giá hiện tại: ${newPrice.toLocaleString()} KRW - Không có thay đổi đáng kể`,
                  });
                }
              }
            }
          } else {
            if (!isAutomatic) {
              toast({
                title: "Reprice không có thay đổi",
                description: `PNR ${repricePnr} đã được kiểm tra`,
              });
            }
          }
        } catch (repriceError) {
          console.error("Error calling reprice API:", repriceError);
          if (!isAutomatic) {
            toast({
              variant: "destructive",
              title: "Lỗi reprice",
              description: "Không thể thực hiện reprice",
            });
          }
        }
      } else {
        // Case 2: paymentstatus is true - hold new ticket if permission allows
        console.log("Case 2: PNR already issued");
        
        // Check perm_check_vna_issued setting
        if (profile?.perm_check_vna_issued) {
          toast({
            variant: "destructive",
            title: "Vé đã xuất",
            description: "Vé đã xuất không check giảm giá được nữa",
          });
        } else {
          // Auto-hold new ticket if enabled and has passenger info
          if (flight.auto_hold_enabled && flight.passengers && flight.passengers.length > 0) {
            try {
              const newPnr = await handleAutoHoldVNATicketNew(flight);
              if (newPnr) {
                // Update reprice_pnr with new PNR
                await supabase
                  .from("monitored_flights")
                  .update({ reprice_pnr: newPnr })
                  .eq("id", flightId);
              }
            } catch (autoHoldError) {
              console.error("Error auto-holding VNA ticket:", autoHoldError);
              if (profile?.apikey_telegram && profile?.idchat_telegram) {
                const failMessage = `⚠️ Có hành trình giảm chưa giữ vé thành công, hãy giữ vé thủ công\n\nPNR: ${flight.pnr || 'N/A'}`;
                fetch(`https://api.telegram.org/bot${profile.apikey_telegram}/sendMessage`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    chat_id: profile.idchat_telegram,
                    text: failMessage,
                  }),
                }).catch(e => console.log('Could not send failure notification:', e));
              }
            }
          } else if (!flight.auto_hold_enabled) {
            // Notify user to manually hold ticket
            if (profile?.apikey_telegram && profile?.idchat_telegram) {
              const message = `📉 Hành trình PNR ${flight.pnr || 'N/A'} đã xuất vé, có thể giữ vé mới\n\nVui lòng kiểm tra và giữ vé thủ công`;
              fetch(`https://api.telegram.org/bot${profile.apikey_telegram}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  chat_id: profile.idchat_telegram,
                  text: message,
                }),
              }).catch(e => console.log('Could not send Telegram notification:', e));
            }
            if (!isAutomatic) {
              toast({
                title: "Vé đã xuất",
                description: "PNR đã xuất vé. Bật giữ vé tự động để giữ vé mới khi cần.",
              });
            }
          }
        }
      }

      await fetchMonitoredFlights();
    } catch (error) {
      console.error("Error checking VNA price:", error);
      toast({
        variant: "destructive",
        title: "Lỗi kiểm tra giá VNA",
        description: error instanceof Error ? error.message : "Đã xảy ra lỗi",
      });
    }
  };

  // New function to hold VNA ticket and return new PNR (without deleting monitored flight)
  const handleAutoHoldVNATicketNew = async (flight: MonitoredFlight): Promise<string | null> => {
    if (!flight.passengers || flight.passengers.length === 0) {
      throw new Error("Không có thông tin hành khách");
    }

    const segments = flight.segments || [];
    if (segments.length === 0) {
      throw new Error("Không có thông tin chặng bay");
    }

    const segment1 = segments[0];
    const segment2 = segments.length > 1 ? segments[1] : null;

    // Helper functions
    const removeVietnameseDiacritics = (str: string) => {
      const vietnameseMap: { [key: string]: string } = {
        'à': 'a', 'á': 'a', 'ả': 'a', 'ã': 'a', 'ạ': 'a',
        'ă': 'a', 'ằ': 'a', 'ắ': 'a', 'ẳ': 'a', 'ẵ': 'a', 'ặ': 'a',
        'â': 'a', 'ầ': 'a', 'ấ': 'a', 'ẩ': 'a', 'ẫ': 'a', 'ậ': 'a',
        'đ': 'd',
        'è': 'e', 'é': 'e', 'ẻ': 'e', 'ẽ': 'e', 'ẹ': 'e',
        'ê': 'e', 'ề': 'e', 'ế': 'e', 'ể': 'e', 'ễ': 'e', 'ệ': 'e',
        'ì': 'i', 'í': 'i', 'ỉ': 'i', 'ĩ': 'i', 'ị': 'i',
        'ò': 'o', 'ó': 'o', 'ỏ': 'o', 'õ': 'o', 'ọ': 'o',
        'ô': 'o', 'ồ': 'o', 'ố': 'o', 'ổ': 'o', 'ỗ': 'o', 'ộ': 'o',
        'ơ': 'o', 'ờ': 'o', 'ớ': 'o', 'ở': 'o', 'ỡ': 'o', 'ợ': 'o',
        'ù': 'u', 'ú': 'u', 'ủ': 'u', 'ũ': 'u', 'ụ': 'u',
        'ư': 'u', 'ừ': 'u', 'ứ': 'u', 'ử': 'u', 'ữ': 'u', 'ự': 'u',
        'ỳ': 'y', 'ý': 'y', 'ỷ': 'y', 'ỹ': 'y', 'ỵ': 'y',
        'À': 'A', 'Á': 'A', 'Ả': 'A', 'Ã': 'A', 'Ạ': 'A',
        'Ă': 'A', 'Ằ': 'A', 'Ắ': 'A', 'Ẳ': 'A', 'Ẵ': 'A', 'Ặ': 'A',
        'Â': 'A', 'Ầ': 'A', 'Ấ': 'A', 'Ẩ': 'A', 'Ẫ': 'A', 'Ậ': 'A',
        'Đ': 'D',
        'È': 'E', 'É': 'E', 'Ẻ': 'E', 'Ẽ': 'E', 'Ẹ': 'E',
        'Ê': 'E', 'Ề': 'E', 'Ế': 'E', 'Ể': 'E', 'Ễ': 'E', 'Ệ': 'E',
        'Ì': 'I', 'Í': 'I', 'Ỉ': 'I', 'Ĩ': 'I', 'Ị': 'I',
        'Ò': 'O', 'Ó': 'O', 'Ỏ': 'O', 'Õ': 'O', 'Ọ': 'O',
        'Ô': 'O', 'Ồ': 'O', 'Ố': 'O', 'Ổ': 'O', 'Ỗ': 'O', 'Ộ': 'O',
        'Ơ': 'O', 'Ờ': 'O', 'Ớ': 'O', 'Ở': 'O', 'Ỡ': 'O', 'Ợ': 'O',
        'Ù': 'U', 'Ú': 'U', 'Ủ': 'U', 'Ũ': 'U', 'Ụ': 'U',
        'Ư': 'U', 'Ừ': 'U', 'Ứ': 'U', 'Ử': 'U', 'Ữ': 'U', 'Ự': 'U',
        'Ỳ': 'Y', 'Ý': 'Y', 'Ỷ': 'Y', 'Ỹ': 'Y', 'Ỵ': 'Y'
      };
      return str.split('').map(char => vietnameseMap[char] || char).join('');
    };

    const formatDateForAPI = (dateStr: string) => {
      const [year, month, day] = dateStr.split('-');
      const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
      return `${day}${months[parseInt(month) - 1]}`;
    };

    const formatNameForAPI = (passenger: PassengerWithType) => {
      const lastName = removeVietnameseDiacritics(passenger.Họ.trim()).toUpperCase();
      const firstName = removeVietnameseDiacritics(passenger.Tên.trim()).toUpperCase().replace(/\s+/g, ' ');
      const gender = passenger.type === 'trẻ_em' 
        ? (passenger.Giới_tính === 'nam' ? 'MSTR' : 'MISS')
        : (passenger.Giới_tính === 'nam' ? 'MR' : 'MS');
      const ageType = passenger.type === 'người_lớn' ? 'ADT' : 'CHD';
      
      let formattedName = `${lastName}/${firstName} ${gender}(${ageType})`;
      
      if (passenger.infant && passenger.infant.Họ && passenger.infant.Tên) {
        const infantLastName = removeVietnameseDiacritics(passenger.infant.Họ.trim()).toUpperCase();
        const infantFirstName = removeVietnameseDiacritics(passenger.infant.Tên.trim()).toUpperCase().replace(/\s+/g, ' ');
        const infantGender = passenger.infant.Giới_tính === 'nam' ? 'MSTR' : 'MISS';
        formattedName += `(INF${infantLastName}/${infantFirstName} ${infantGender})`;
      }
      
      return formattedName;
    };

    // Build URL with query params
    const params = new URLSearchParams();
    params.append('dep', segment1.departure_airport);
    params.append('arr', segment1.arrival_airport);
    params.append('depdate', formatDateForAPI(segment1.departure_date));
    params.append('deptime', segment1.departure_time?.replace(':', '') || '');
    
    if (segment2) {
      params.append('arrdate', formatDateForAPI(segment2.departure_date));
      params.append('arrtime', segment2.departure_time?.replace(':', '') || '');
    }
    
    params.append('doituong', segment1.ticket_class);

    for (let i = flight.passengers.length - 1; i >= 0; i--) {
      const formattedName = formatNameForAPI(flight.passengers[i]);
      params.append('hanhkhach', formattedName);
    }

    const response = await fetch(`https://thuhongtour.com/giuveVNAlive?${params.toString()}`, {
      method: 'POST',
      headers: { 'accept': 'application/json' }
    });

    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const data = await response.json();

    if (data.status !== 'OK' || !data.pnr) {
      throw new Error("Giữ vé thất bại");
    }

    // Save to held_tickets
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Không tìm thấy thông tin người dùng");

    const { error: insertError } = await supabase.from("held_tickets").insert({
      pnr: data.pnr,
      user_id: user.id,
      flight_details: {
        airline: 'VNA',
        tripType: segment2 ? 'RT' : 'OW',
        departureAirport: segment1.departure_airport,
        arrivalAirport: segment1.arrival_airport,
        departureDate: segment1.departure_date,
        departureTime: segment1.departure_time,
        arrivalDate: segment2?.departure_date,
        arrivalTime: segment2?.departure_time,
        passengers: flight.passengers,
        doiTuong: segment1.ticket_class
      } as any,
      status: 'holding'
    });

    if (insertError) throw insertError;

    // Send Telegram notification
    if (profile?.apikey_telegram && profile?.idchat_telegram) {
      const telegramMessage = `✅ Đã tự động giữ vé VNA thành công!\n\nPNR mới: ${data.pnr}\nHành trình: ${segment1.departure_airport} → ${segment1.arrival_airport}\nNgày bay: ${segment1.departure_date}${segment2 ? `\nNgày về: ${segment2.departure_date}` : ''}`;
      fetch(`https://api.telegram.org/bot${profile.apikey_telegram}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: profile.idchat_telegram,
          text: telegramMessage,
        }),
      }).catch(e => console.log('Could not send Telegram notification:', e));
    }

    toast({
      title: "Đã tự động giữ vé VNA thành công! 🎉",
      description: `PNR mới: ${data.pnr}. Đã cập nhật vào reprice_pnr.`,
      className: "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800",
    });

    return data.pnr;
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Chưa kiểm tra";
    const date = new Date(dateString);
    return date.toLocaleString("vi-VN");
  };

  const formatFlightDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
  };

  const calculateProgress = (lastChecked: string | null, intervalMinutes: number) => {
    if (!lastChecked) return 0;
    const lastCheckedTime = new Date(lastChecked).getTime();
    const now = Date.now();
    const elapsed = now - lastCheckedTime;
    const intervalMs = intervalMinutes * 60 * 1000;
    const progress = (elapsed / intervalMs) * 100;
    return Math.min(progress, 100);
  };

  const getTimeUntilNextCheck = (lastChecked: string | null, intervalMinutes: number) => {
    if (!lastChecked) return "Chưa check";
    const lastCheckedTime = new Date(lastChecked).getTime();
    const now = Date.now();
    const elapsed = now - lastCheckedTime;
    const intervalMs = intervalMinutes * 60 * 1000;
    const remaining = intervalMs - elapsed;

    if (remaining <= 0) return "Sẵn sàng check";

    const minutes = Math.floor(remaining / 60000);
    const seconds = Math.floor((remaining % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const handleUpdateInterval = async (flightId: string, newInterval: number) => {
    try {
      const { error } = await supabase
        .from("monitored_flights")
        .update({ check_interval_minutes: newInterval })
        .eq("id", flightId);

      if (error) throw error;

      setFlights(flights.map((f) => (f.id === flightId ? { ...f, check_interval_minutes: newInterval } : f)));

      setEditingFlightId(null);
      toast({
        title: "Đã cập nhật",
        description: "Đã cập nhật tần suất kiểm tra",
      });
    } catch (error) {
      console.error("Error updating interval:", error);
      toast({
        title: "Lỗi",
        description: "Không thể cập nhật tần suất kiểm tra",
        variant: "destructive",
      });
    }
  };

  const handleToggleAutoHold = async (flightId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from("monitored_flights")
        .update({ auto_hold_enabled: !currentStatus })
        .eq("id", flightId);

      if (error) throw error;

      setFlights(flights.map((f) => (f.id === flightId ? { ...f, auto_hold_enabled: !currentStatus } : f)));

      toast({
        title: !currentStatus ? "Đã bật giữ vé tự động" : "Đã tắt giữ vé tự động",
        description: !currentStatus ? "Hệ thống sẽ tự động giữ vé khi giá giảm" : "Đã tắt chức năng giữ vé tự động",
      });
    } catch (error) {
      console.error("Error toggling auto hold:", error);
      toast({
        title: "Lỗi",
        description: "Không thể cập nhật trạng thái",
        variant: "destructive",
      });
    }
  };

  const handleBookingSuccess = async (pnr: string) => {
    if (!selectedFlight) return;

    // Delete the monitored flight after successful booking
    try {
      const { error } = await supabase.from("monitored_flights").delete().eq("id", selectedFlight.id);

      if (error) throw error;

      toast({
        title: "Đã giữ vé thành công",
        description: `PNR: ${pnr}. Hành trình đã được xóa khỏi danh sách theo dõi.`,
      });

      setBookingModalOpen(false);
      setSelectedFlight(null);
      await fetchMonitoredFlights();
    } catch (error) {
      console.error("Error deleting monitored flight:", error);
    }
  };

  const handleAutoHoldVNATicket = async (flight: MonitoredFlight, matchingFlightData: any) => {
    if (!flight.passengers || flight.passengers.length === 0) {
      throw new Error("Không có thông tin hành khách");
    }

    const segments = flight.segments || [];
    if (segments.length === 0) {
      throw new Error("Không có thông tin chặng bay");
    }

    // Always check old PNR payment status first (regardless of perm_check_vna_issued setting)
    if (flight.pnr) {
      try {
        const checkPnrResponse = await fetch(`https://thuhongtour.com/checkvechoVNA?pnr=${flight.pnr}`, {
          method: 'GET',
          headers: { accept: 'application/json' }
        });
        
        if (checkPnrResponse.ok) {
          const pnrData = await checkPnrResponse.json();
          
          // Case 1: Old PNR is NOT issued (paymentstatus != true) -> Call reprice API instead of holding new ticket
          if (!pnrData || pnrData.paymentstatus !== true) {
            console.log("Old VNA PNR not issued, calling reprice API instead of holding new ticket");
            
            // Get ticket class from first segment
            const ticketClass = segments[0]?.ticket_class || 'VFR';
            
            try {
              const repriceResponse = await fetch(`https://thuhongtour.com/reprice?pnr=${flight.pnr}&doituong=${ticketClass}`, {
                method: 'GET',
                headers: { accept: 'application/json' }
              });
              
              if (repriceResponse.ok) {
                const repriceData = await repriceResponse.json();
                
                // Check if reprice was successful (has pricegoc and pricemoi)
                if (repriceData && repriceData.pricegoc && repriceData.pricemoi) {
                  console.log("Reprice successful:", repriceData);
                  
                  // Send Telegram notification about successful reprice
                  if (profile?.apikey_telegram && profile?.idchat_telegram) {
                    const segment1 = segments[0];
                    const telegramMessage = `✅ Đã reprice PNR ${flight.pnr} thành công!\n\nHành trình: ${segment1.departure_airport} → ${segment1.arrival_airport}\nNgày bay: ${segment1.departure_date}`;
                    fetch(`https://api.telegram.org/bot${profile.apikey_telegram}/sendMessage`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        chat_id: profile.idchat_telegram,
                        text: telegramMessage,
                      }),
                    }).catch(e => console.log('Could not send Telegram notification:', e));
                  }
                  
                  toast({
                    title: "Đã reprice PNR thành công! 🎉",
                    description: `PNR ${flight.pnr} đã được reprice. Hành trình đã được xóa khỏi danh sách theo dõi.`,
                    className: "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800",
                  });
                  
                  // Delete from monitored_flights
                  const { error: deleteError } = await supabase
                    .from("monitored_flights")
                    .delete()
                    .eq("id", flight.id);

                  if (deleteError) {
                    console.error("Error deleting flight from monitoring:", deleteError);
                  }
                  
                  await fetchMonitoredFlights();
                  return;
                } else {
                  console.log("Reprice failed - missing pricegoc or pricemoi:", repriceData);
                  throw new Error("Reprice không thành công");
                }
              } else {
                throw new Error(`Reprice HTTP error: ${repriceResponse.status}`);
              }
            } catch (repriceError) {
              console.error("Error calling reprice API:", repriceError);
              // Send Telegram notification about reprice failure
              if (profile?.apikey_telegram && profile?.idchat_telegram) {
                const failMessage = `⚠️ Reprice PNR ${flight.pnr} thất bại, hãy kiểm tra thủ công`;
                fetch(`https://api.telegram.org/bot${profile.apikey_telegram}/sendMessage`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    chat_id: profile.idchat_telegram,
                    text: failMessage,
                  }),
                }).catch(e => console.log('Could not send failure notification:', e));
              }
              throw repriceError;
            }
          }
          
          // Case 2: Old PNR IS issued (paymentstatus = true)
          if (pnrData.paymentstatus === true) {
            // Check perm_check_vna_issued setting
            if (profile?.perm_check_vna_issued) {
              // Setting ON: Don't hold new ticket, just delete from monitoring
              console.log("Old VNA PNR is already issued, not holding new ticket (perm_check_vna_issued = ON)");
              toast({
                title: "PNR cũ đã xuất vé",
                description: `PNR ${flight.pnr} đã được xuất vé, không giữ vé mới`,
              });
              
              // Delete from monitored_flights
              const { error: deleteError } = await supabase
                .from("monitored_flights")
                .delete()
                .eq("id", flight.id);

              if (deleteError) {
                console.error("Error deleting flight from monitoring:", deleteError);
              } else {
                console.log("VNA flight removed from monitoring");
                toast({
                  title: "Đã xóa hành trình",
                  description: "Hành trình đã được xóa khỏi danh sách theo dõi",
                });
              }
              
              await fetchMonitoredFlights();
              return;
            }
            // Setting OFF: Continue to hold new ticket (existing flow below)
            console.log("Old VNA PNR is issued but perm_check_vna_issued = OFF, proceeding to hold new ticket");
          }
        }
      } catch (checkError) {
        console.error("Error checking old VNA PNR status:", checkError);
        // If it's a reprice error, rethrow it
        if (checkError instanceof Error && checkError.message.includes('Reprice')) {
          throw checkError;
        }
        // Continue with holding process if check fails for other reasons
      }
    }

    const segment1 = segments[0];
    const segment2 = segments.length > 1 ? segments[1] : null;

    // Helper functions from VNABookingModal
    const removeVietnameseDiacritics = (str: string) => {
      const vietnameseMap: { [key: string]: string } = {
        'à': 'a', 'á': 'a', 'ả': 'a', 'ã': 'a', 'ạ': 'a',
        'ă': 'a', 'ằ': 'a', 'ắ': 'a', 'ẳ': 'a', 'ẵ': 'a', 'ặ': 'a',
        'â': 'a', 'ầ': 'a', 'ấ': 'a', 'ẩ': 'a', 'ẫ': 'a', 'ậ': 'a',
        'đ': 'd',
        'è': 'e', 'é': 'e', 'ẻ': 'e', 'ẽ': 'e', 'ẹ': 'e',
        'ê': 'e', 'ề': 'e', 'ế': 'e', 'ể': 'e', 'ễ': 'e', 'ệ': 'e',
        'ì': 'i', 'í': 'i', 'ỉ': 'i', 'ĩ': 'i', 'ị': 'i',
        'ò': 'o', 'ó': 'o', 'ỏ': 'o', 'õ': 'o', 'ọ': 'o',
        'ô': 'o', 'ồ': 'o', 'ố': 'o', 'ổ': 'o', 'ỗ': 'o', 'ộ': 'o',
        'ơ': 'o', 'ờ': 'o', 'ớ': 'o', 'ở': 'o', 'ỡ': 'o', 'ợ': 'o',
        'ù': 'u', 'ú': 'u', 'ủ': 'u', 'ũ': 'u', 'ụ': 'u',
        'ư': 'u', 'ừ': 'u', 'ứ': 'u', 'ử': 'u', 'ữ': 'u', 'ự': 'u',
        'ỳ': 'y', 'ý': 'y', 'ỷ': 'y', 'ỹ': 'y', 'ỵ': 'y',
        'À': 'A', 'Á': 'A', 'Ả': 'A', 'Ã': 'A', 'Ạ': 'A',
        'Ă': 'A', 'Ằ': 'A', 'Ắ': 'A', 'Ẳ': 'A', 'Ẵ': 'A', 'Ặ': 'A',
        'Â': 'A', 'Ầ': 'A', 'Ấ': 'A', 'Ẩ': 'A', 'Ẫ': 'A', 'Ậ': 'A',
        'Đ': 'D',
        'È': 'E', 'É': 'E', 'Ẻ': 'E', 'Ẽ': 'E', 'Ẹ': 'E',
        'Ê': 'E', 'Ề': 'E', 'Ế': 'E', 'Ể': 'E', 'Ễ': 'E', 'Ệ': 'E',
        'Ì': 'I', 'Í': 'I', 'Ỉ': 'I', 'Ĩ': 'I', 'Ị': 'I',
        'Ò': 'O', 'Ó': 'O', 'Ỏ': 'O', 'Õ': 'O', 'Ọ': 'O',
        'Ô': 'O', 'Ồ': 'O', 'Ố': 'O', 'Ổ': 'O', 'Ỗ': 'O', 'Ộ': 'O',
        'Ơ': 'O', 'Ờ': 'O', 'Ớ': 'O', 'Ở': 'O', 'Ỡ': 'O', 'Ợ': 'O',
        'Ù': 'U', 'Ú': 'U', 'Ủ': 'U', 'Ũ': 'U', 'Ụ': 'U',
        'Ư': 'U', 'Ừ': 'U', 'Ứ': 'U', 'Ử': 'U', 'Ữ': 'U', 'Ự': 'U',
        'Ỳ': 'Y', 'Ý': 'Y', 'Ỷ': 'Y', 'Ỹ': 'Y', 'Ỵ': 'Y'
      };
      return str.split('').map(char => vietnameseMap[char] || char).join('');
    };

    const formatDateForAPI = (dateStr: string) => {
      // Convert "2026-03-27" to "27MAR"
      const [year, month, day] = dateStr.split('-');
      const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
      return `${day}${months[parseInt(month) - 1]}`;
    };

    const formatNameForAPI = (passenger: PassengerWithType) => {
      const lastName = removeVietnameseDiacritics(passenger.Họ.trim()).toUpperCase();
      const firstName = removeVietnameseDiacritics(passenger.Tên.trim()).toUpperCase().replace(/\s+/g, ' ');
      const gender = passenger.type === 'trẻ_em' 
        ? (passenger.Giới_tính === 'nam' ? 'MSTR' : 'MISS')
        : (passenger.Giới_tính === 'nam' ? 'MR' : 'MS');
      const ageType = passenger.type === 'người_lớn' ? 'ADT' : 'CHD';
      
      let formattedName = `${lastName}/${firstName} ${gender}(${ageType})`;
      
      // Add infant if present
      if (passenger.infant && passenger.infant.Họ && passenger.infant.Tên) {
        const infantLastName = removeVietnameseDiacritics(passenger.infant.Họ.trim()).toUpperCase();
        const infantFirstName = removeVietnameseDiacritics(passenger.infant.Tên.trim()).toUpperCase().replace(/\s+/g, ' ');
        const infantGender = passenger.infant.Giới_tính === 'nam' ? 'MSTR' : 'MISS';
        formattedName += `(INF${infantLastName}/${infantFirstName} ${infantGender})`;
      }
      
      return formattedName;
    };

    // Build URL with query params
    const params = new URLSearchParams();
    params.append('dep', segment1.departure_airport);
    params.append('arr', segment1.arrival_airport);
    params.append('depdate', formatDateForAPI(segment1.departure_date));
    
    // Get time from API response
    const depTime = matchingFlightData["chiều_đi"]?.giờ_cất_cánh?.replace(':', '') || '';
    params.append('deptime', depTime);
    
    // Only add return date/time if round trip
    if (segment2) {
      params.append('arrdate', formatDateForAPI(segment2.departure_date));
      const arrTime = matchingFlightData["chiều_về"]?.giờ_cất_cánh?.replace(':', '') || '';
      params.append('arrtime', arrTime);
    }
    
    params.append('doituong', segment1.ticket_class);

    // Add passengers in reverse order (last to first)
    for (let i = flight.passengers.length - 1; i >= 0; i--) {
      const formattedName = formatNameForAPI(flight.passengers[i]);
      params.append('hanhkhach', formattedName);
    }

    const response = await fetch(`https://thuhongtour.com/giuveVNAlive?${params.toString()}`, {
      method: 'POST',
      headers: { 'accept': 'application/json' }
    });

    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const data = await response.json();

    if (data.status !== 'OK' || !data.pnr) {
      throw new Error("Giữ vé thất bại");
    }

    // Save to held_tickets
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Không tìm thấy thông tin người dùng");

    const { error: insertError } = await supabase.from("held_tickets").insert({
      pnr: data.pnr,
      user_id: user.id,
      flight_details: {
        airline: 'VNA',
        tripType: segment2 ? 'RT' : 'OW',
        departureAirport: segment1.departure_airport,
        arrivalAirport: segment1.arrival_airport,
        departureDate: segment1.departure_date,
        departureTime: depTime,
        arrivalDate: segment2?.departure_date,
        arrivalTime: segment2 ? matchingFlightData["chiều_về"]?.giờ_cất_cánh : undefined,
        passengers: flight.passengers,
        doiTuong: segment1.ticket_class
      } as any,
      status: 'holding'
    });

    if (insertError) throw insertError;

    // Delete monitored flight
    const { error: deleteError } = await supabase.from("monitored_flights").delete().eq("id", flight.id);
    if (deleteError) throw deleteError;

    // Send Telegram notification for successful auto-hold
    if (profile?.apikey_telegram && profile?.idchat_telegram) {
      const telegramMessage = `✅ Đã tự động giữ vé VNA thành công!\n\nPNR mới: ${data.pnr}\nHành trình: ${segment1.departure_airport} → ${segment1.arrival_airport}\nNgày bay: ${segment1.departure_date}${segment2 ? `\nNgày về: ${segment2.departure_date}` : ''}`;
      fetch(`https://api.telegram.org/bot${profile.apikey_telegram}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: profile.idchat_telegram,
          text: telegramMessage,
        }),
      }).catch(e => console.log('Could not send Telegram notification:', e));
    }

    toast({
      title: "Đã tự động giữ vé VNA thành công! 🎉",
      description: `PNR: ${data.pnr}. Hành trình đã được chuyển vào giỏ vé.`,
      className: "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800",
    });

    await fetchMonitoredFlights();
  };

  const handleAutoHoldTicket = async (
    flight: MonitoredFlight,
    bookingKeyDeparture: string,
    bookingKeyReturn: string | null,
  ) => {
    if (!flight.passengers || flight.passengers.length === 0) {
      throw new Error("Không có thông tin hành khách");
    }

    // Helper functions from VJBookingModal
    const removeVietnameseDiacritics = (str: string): string => {
      return str
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/đ/g, "d")
        .replace(/Đ/g, "D");
    };

    const formatName = (name: string): string => {
      const cleaned = removeVietnameseDiacritics(name);
      return cleaned
        .split(" ")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(" ");
    };

    // Organize passengers
    const adults: any[] = [];
    const children: any[] = [];
    const infants: any[] = [];

    flight.passengers.forEach((passenger) => {
      const formattedPassenger = {
        Họ: formatName(passenger.Họ),
        Tên: formatName(passenger.Tên),
        Hộ_chiếu: passenger.Hộ_chiếu,
        Giới_tính: passenger.Giới_tính,
        Quốc_tịch: passenger.Quốc_tịch,
      };

      if (passenger.type === "người_lớn") {
        adults.push(formattedPassenger);
        if (passenger.infant) {
          infants.push({
            Họ: formatName(passenger.infant.Họ),
            Tên: formatName(passenger.infant.Tên),
            Hộ_chiếu: passenger.infant.Hộ_chiếu,
            Giới_tính: passenger.infant.Giới_tính,
            Quốc_tịch: passenger.infant.Quốc_tịch,
          });
        }
      } else if (passenger.type === "trẻ_em") {
        children.push(formattedPassenger);
      }
    });

    const requestBody: any = {
      ds_khach: {
        người_lớn: adults,
      },
      bookingkey: bookingKeyDeparture,
      sochieu: flight.is_round_trip ? "RT" : "OW",
      sanbaydi: flight.departure_airport,
    };

    if (children.length > 0) {
      requestBody.ds_khach.trẻ_em = children;
    }

    if (infants.length > 0) {
      requestBody.ds_khach.em_bé = infants;
    }

    if (flight.is_round_trip && bookingKeyReturn) {
      requestBody.bookingkeychieuve = bookingKeyReturn;
    }

    // Check if old PNR is already issued before holding new ticket
    if (flight.pnr) {
      try {
        const checkPnrResponse = await fetch(`https://thuhongtour.com/vj/checkpnr?pnr=${flight.pnr}`, {
          method: 'POST',
        });
        
        if (checkPnrResponse.ok) {
          const pnrData = await checkPnrResponse.json();
          if (pnrData && pnrData.paymentstatus === true) {
            console.log("Old PNR is already issued, not holding new ticket");
            toast({
              title: "PNR cũ đã xuất vé",
              description: `PNR ${flight.pnr} đã được xuất vé, không giữ vé mới`,
            });
            
            // Delete from monitored_flights
            const { error: deleteError } = await supabase
              .from("monitored_flights")
              .delete()
              .eq("id", flight.id);

            if (deleteError) {
              console.error("Error deleting flight from monitoring:", deleteError);
            } else {
              console.log("Flight removed from monitoring");
              toast({
                title: "Đã xóa hành trình",
                description: "Hành trình đã được xóa khỏi danh sách theo dõi",
              });
            }
            
            await fetchMonitoredFlights();
            return;
          }
        }
      } catch (checkError) {
        console.error("Error checking old PNR status:", checkError);
        // Continue with holding process if check fails
      }
    }

    // Call VJ booking API
    const response = await fetch("https://thuhongtour.com/vj/booking", {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      throw new Error("Không thể kết nối API giữ vé");
    }

    const data = await response.json();

    if (!data.mã_giữ_vé || (data.mess !== "Thành công" && data.mess !== "Success")) {
      throw new Error("Giữ vé thất bại");
    }

    // Save to held_tickets
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Không tìm thấy thông tin người dùng");

    // Parse expire date from "18:02 17/11/2025" format (GMT+7)
    let expireDate = null;
    if (data.hạn_thanh_toán) {
      try {
        const [time, dateStr] = data.hạn_thanh_toán.split(" ");
        const [day, month, year] = dateStr.split("/");
        expireDate = `${year}-${month}-${day}T${time}:00+07:00`;
      } catch (e) {
        console.error("Error parsing expire date:", e);
      }
    }

    const { error: insertError } = await supabase.from("held_tickets").insert({
      pnr: data.mã_giữ_vé,
      user_id: user.id,
      flight_details: {
        airline: flight.airline,
        departure_airport: flight.departure_airport,
        arrival_airport: flight.arrival_airport,
        departure_date: flight.departure_date,
        return_date: flight.return_date,
        price: flight.current_price,
        passengers: flight.passengers,
      } as any,
      expire_date: expireDate,
    });

    if (insertError) throw insertError;

    // Check if original PNR exists in held tickets and delete it
    if (flight.pnr) {
      const { data: existingTickets } = await supabase
        .from("held_tickets")
        .select("id")
        .eq("user_id", user.id)
        .eq("pnr", flight.pnr);

      if (existingTickets && existingTickets.length > 0) {
        const { error: deleteOldPnrError } = await supabase
          .from("held_tickets")
          .update({ expire_date: new Date().toISOString() })
          .eq("pnr", flight.pnr)
          .eq("user_id", user.id);

        if (deleteOldPnrError) {
          console.error("Error deleting old PNR:", deleteOldPnrError);
        }
      }
    }

    // Delete monitored flight
    const { error: deleteError } = await supabase.from("monitored_flights").delete().eq("id", flight.id);

    if (deleteError) throw deleteError;

    // Send Telegram notification for successful auto-hold (similar to VNA)
    if (profile?.apikey_telegram && profile?.idchat_telegram) {
      const telegramMessage = `✅ Đã tự động giữ vé VJ thành công!\n\nPNR mới: ${data.mã_giữ_vé}\nHành trình: ${flight.departure_airport} → ${flight.arrival_airport}\nNgày bay: ${flight.departure_date}${flight.is_round_trip && flight.return_date ? `\nNgày về: ${flight.return_date}` : ''}\nHạn thanh toán: ${data.hạn_thanh_toán || 'N/A'}`;
      fetch(`https://api.telegram.org/bot${profile.apikey_telegram}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: profile.idchat_telegram,
          text: telegramMessage,
        }),
      }).catch(e => console.log('Could not send Telegram notification:', e));
    }

    toast({
      title: "Đã tự động giữ vé thành công! 🎉",
      description: `PNR: ${data.mã_giữ_vé}. Hành trình đã được chuyển vào giỏ vé.`,
      className: "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800",
    });

    await fetchMonitoredFlights();
  };

  const handleOpenBookingModal = (flightId: string) => {
    const flight = flights.find((f) => f.id === flightId);
    if (!flight) return;

    setSelectedFlight(flight);
    setBookingModalOpen(true);
  };

  const handleSavePassengers = async (flightId: string, passengers: PassengerWithType[]) => {
    try {
      const { error } = await supabase
        .from("monitored_flights")
        .update({ passengers: passengers as any })
        .eq("id", flightId);

      if (error) throw error;

      // Cập nhật state local
      setFlights((prev) => prev.map((f) => (f.id === flightId ? { ...f, passengers } : f)));

      toast({
        title: "Đã lưu thông tin hành khách",
        description: "Thông tin hành khách đã được cập nhật",
      });
    } catch (error) {
      console.error("Error saving passengers:", error);
      toast({
        title: "Lỗi",
        description: "Không thể lưu thông tin hành khách",
        variant: "destructive",
      });
    }
  };

  const handleImportFromPnr = async () => {
    if (!pnrCode || pnrCode.length !== 6) {
      toast({
        variant: "destructive",
        title: "Lỗi",
        description: "Vui lòng nhập mã PNR hợp lệ (6 ký tự)",
      });
      return;
    }

    // Check flight limit before importing
    const activeFlightCount = flights.filter(f => f.is_active).length;
    const maxFlights = profile?.hold_ticket_quantity || 0;
    
    if (activeFlightCount >= maxFlights) {
      toast({
        variant: "destructive",
        title: "Đã đạt giới hạn",
        description: `Bạn chỉ được phép theo dõi tối đa ${maxFlights} hành trình cùng lúc`,
      });
      return;
    }

    setIsLoadingPnr(true);

    try {
      // Handle VNA PNR
      if (pnrAirline === "VNA") {
        const response = await fetch(`https://thuhongtour.com/checkvechoVNA?pnr=${pnrCode}`, {
          method: "GET",
          headers: {
            accept: "application/json",
          },
        });

        if (!response.ok) {
          throw new Error("Không thể lấy thông tin PNR");
        }

        const data = await response.json();

        if (data.status !== "OK" || !data.chang || data.chang.length === 0) {
          throw new Error("PNR không hợp lệ hoặc không tìm thấy");
        }

        // Check if VNA PNR is already issued (only if perm_check_vna_issued is enabled)
        if (profile?.perm_check_vna_issued && data.paymentstatus === true) {
          toast({
            variant: "destructive",
            title: "Không thể thêm",
            description: "PNR đã xuất không thể check giá giảm, vui lòng thêm hành trình thủ công nếu muốn",
          });
          setIsPnrModalOpen(false);
          setPnrCode("");
          setIsLoadingPnr(false);
          return;
        }

        // Validate segments
        const segments = data.chang;
        
        // Check if more than 2 segments
        if (segments.length > 2) {
          toast({
            variant: "destructive",
            title: "Không hỗ trợ",
            description: "Chuyến bay nối chuyến chưa hỗ trợ check giá giảm",
          });
          setIsPnrModalOpen(false);
          setPnrCode("");
          setIsLoadingPnr(false);
          return;
        }

        // Check if 2 segments have same departure date
        if (segments.length === 2) {
          const date1 = segments[0].ngaycatcanh;
          const date2 = segments[1].ngaycatcanh;
          if (date1 === date2) {
            toast({
              variant: "destructive",
              title: "Không hỗ trợ",
              description: "Chuyến bay nối chuyến chưa hỗ trợ check giá giảm",
            });
            setIsPnrModalOpen(false);
            setPnrCode("");
            setIsLoadingPnr(false);
            return;
          }
        }

        // Parse VNA date from "03/02/2026" to "2026-02-03"
        const parseVNADate = (dateStr: string) => {
          const [day, month, year] = dateStr.split("/");
          return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
        };

        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) throw new Error("Không tìm thấy thông tin người dùng");

        // Create VNA monitored flight from PNR data
        const firstSegment = segments[0];
        const flightData: any = {
          user_id: user.id,
          airline: "VNA",
          departure_airport: firstSegment.departure,
          arrival_airport: firstSegment.arrival,
          departure_date: parseVNADate(firstSegment.ngaycatcanh),
          departure_time: exactTimeMatch ? firstSegment.giocatcanh : null,
          check_interval_minutes: 5,
          is_active: true,
          auto_hold_enabled: true,
          ticket_class: data.doituong || "ADT",
          pnr: pnrCode,
          reprice_pnr: pnrCode, // Save original PNR for reprice
          segments: [
            {
              departure_airport: firstSegment.departure,
              arrival_airport: firstSegment.arrival,
              departure_date: parseVNADate(firstSegment.ngaycatcanh),
              departure_time: exactTimeMatch ? firstSegment.giocatcanh : null,
              ticket_class: data.doituong || "ADT",
              stopover_airport: undefined,
            },
          ],
        };

        // Check if round trip (2 segments)
        if (segments.length === 2) {
          const secondSegment = segments[1];
          flightData.is_round_trip = true;
          flightData.return_date = parseVNADate(secondSegment.ngaycatcanh);
          flightData.return_time = exactTimeMatch ? secondSegment.giocatcanh : null;
          
          flightData.segments.push({
            departure_airport: secondSegment.departure,
            arrival_airport: secondSegment.arrival,
            departure_date: parseVNADate(secondSegment.ngaycatcanh),
            departure_time: exactTimeMatch ? secondSegment.giocatcanh : null,
            ticket_class: data.doituong || "ADT",
            stopover_airport: undefined,
          });
        }

        // Extract and transform passengers data
        if (data.passengers && Array.isArray(data.passengers) && data.passengers.length > 0) {
          // Helper function to parse firstName and detect gender from suffix
          const parseFirstName = (firstName: string) => {
            if (!firstName) return { name: "", gender: "nam" as const };
            
            const upperName = firstName.toUpperCase();
            // Check for gender suffix at the END of firstName
            const isFemale = /\s*(MISS|MS)\s*$/i.test(upperName);
            const isMale = /\s*(MR|MSTR)\s*$/i.test(upperName);
            
            // Remove title suffix from the end
            const cleanName = firstName.replace(/\s*(MISS|MS|MR|MSTR)\s*$/i, "").trim();
            
            return {
              name: cleanName,
              gender: isFemale ? "nữ" as const : "nam" as const
            };
          };

          const transformedPassengers = data.passengers.map((p: any) => {
            const parsed = parseFirstName(p.firstName || "");
            const passenger: any = {
              Họ: p.lastName || "",
              Tên: parsed.name,
              Giới_tính: parsed.gender,
              type: p.loaikhach === "ADT" ? "người_lớn" : "trẻ_em",
            };
            
            // Check if passenger has infant
            if (p.inf) {
              const infantParsed = parseFirstName(p.inf.firstName || "");
              passenger.infant = {
                Họ: p.inf.lastName || "",
                Tên: infantParsed.name,
                Giới_tính: infantParsed.gender
              };
            }
            
            return passenger;
          });

          flightData.passengers = transformedPassengers;
        }

        // Add initial price from giavegoc if available
        if (data.giavegoc && typeof data.giavegoc === 'number') {
          flightData.current_price = data.giavegoc;
        }

        const { error } = await supabase.from("monitored_flights").insert(flightData);

        if (error) throw error;

        toast({
          title: "Đã thêm hành trình từ PNR",
          description: `PNR ${pnrCode}: ${firstSegment.departure} → ${firstSegment.arrival}${segments.length === 2 ? " (Khứ hồi)" : ""}`,
        });

        setIsPnrModalOpen(false);
        setPnrCode("");
        await fetchMonitoredFlights();
        setIsLoadingPnr(false);
        return;
      }

      // Handle VJ PNR
      const response = await fetch(`https://thuhongtour.com/vj/checkpnr?pnr=${pnrCode}`, {
        method: "POST",
        headers: {
          accept: "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Không thể lấy thông tin PNR");
      }

      const data = await response.json();

      if (data.status !== "OK") {
        throw new Error("PNR không hợp lệ hoặc không tìm thấy");
      }

      // Check if PNR is already issued
      if (data && data.paymentstatus === true) {
        toast({
          variant: "destructive",
          title: "Không thể thêm",
          description: "PNR đã xuất không thể check giá giảm, vui lòng thêm hành trình thủ công nếu muốn",
        });
        setIsPnrModalOpen(false);
        setPnrCode("");
        setIsLoadingPnr(false);
        return;
      }

      // Parse date from "07/02/2026" to "2026-02-07"
      const parseDate = (dateStr: string) => {
        const [day, month, year] = dateStr.split("/");
        return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
      };

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Không tìm thấy thông tin người dùng");

      // Create monitored flight from PNR data
      const flightData: any = {
        user_id: user.id,
        airline: "VJ",
        departure_airport: data.chieudi.departure,
        arrival_airport: data.chieudi.arrival,
        departure_date: parseDate(data.chieudi.ngaycatcanh),
        departure_time: exactTimeMatch ? data.chieudi.giocatcanh : null,
        check_interval_minutes: 5,
        is_active: true,
        auto_hold_enabled: true,
        ticket_class: data.chieudi.loaive === "ECO" || data.chieudi.loaive === "DELUXE" ? "economy" : "business",
        pnr: pnrCode,
      };

      // Check if round trip
      if (data.chieuve) {
        flightData.is_round_trip = true;
        flightData.return_date = parseDate(data.chieuve.ngaycatcanh);
        flightData.return_time = exactTimeMatch ? data.chieuve.giocatcanh : null;
      }

      // Extract and transform passengers data
      if (data.passengers && Array.isArray(data.passengers) && data.passengers.length > 0) {
        const transformedPassengers = data.passengers.map((p: any) => {
          const passenger: any = {
            Họ: p.lastName || "",
            Tên: p.firstName || "",
            Hộ_chiếu: p.passportNumber || "B12345678",
            Giới_tính: p.gender === "Male" ? "nam" : "nữ",
            Quốc_tịch: p.quoctich,
            type: p.child ? "trẻ_em" : "người_lớn",
          };

          // Add infant if exists
          if (p.infant && Array.isArray(p.infant) && p.infant.length > 0) {
            const infantData = p.infant[0];
            passenger.infant = {
              Họ: infantData.lastName || "",
              Tên: infantData.firstName || "",
              Hộ_chiếu: "",
              Giới_tính: infantData.gender === "Unknown" ? "" : infantData.gender,
              Quốc_tịch: p.quoctich,
            };
          }

          return passenger;
        });

        flightData.passengers = transformedPassengers;
      }

      // Add initial price from giacoban if available
      if (data.giacoban && typeof data.giacoban === 'number') {
        flightData.current_price = data.giacoban;
      }

      const { error } = await supabase.from("monitored_flights").insert(flightData);

      if (error) throw error;

      toast({
        title: "Đã thêm hành trình từ PNR",
        description: `PNR ${pnrCode}: ${data.chieudi.departure} → ${data.chieudi.arrival}`,
      });

      setIsPnrModalOpen(false);
      setPnrCode("");
      await fetchMonitoredFlights();
    } catch (error) {
      console.error("Error importing from PNR:", error);
      toast({
        variant: "destructive",
        title: "Lỗi",
        description: error instanceof Error ? error.message : "Không thể nhập hành trình từ PNR",
      });
    } finally {
      setIsLoadingPnr(false);
    }
  };

  const generatePNR = (flightId: string) => {
    // Generate a consistent 6-character PNR from flight ID
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let hash = 0;
    for (let i = 0; i < flightId.length; i++) {
      hash = (hash << 5) - hash + flightId.charCodeAt(i);
      hash = hash & hash;
    }
    let pnr = "";
    for (let i = 0; i < 6; i++) {
      pnr += chars[Math.abs(hash >> (i * 5)) % chars.length];
    }
    return pnr;
  };

  const renderFlightSegments = (flight: MonitoredFlight) => {
    if (flight.airline === "VNA" && flight.segments && flight.segments.length > 0) {
      return (
        <div className="text-sm">
          <div className="flex items-center gap-2 mb-2">
            <strong>
              {flight.segments.length > 1 ? `Hành trình khứ hồi (${flight.segments.length} chặng):` : "Hành trình:"}
            </strong>
            <Badge variant="secondary" className="text-xs">
              Hạng vé: {flight.segments[0]?.ticket_class}
            </Badge>
          </div>
          <div className="mt-2 space-y-2">
            {flight.segments.map((seg: FlightSegment, idx: number) => (
              <div key={idx} className="ml-2">
                <span className="font-medium">Chặng {idx + 1} {idx === 0 ? "- Chiều đi" : "- Chiều về"}</span>
                <div className="ml-2 text-gray-700 dark:text-gray-300">
                  <div>
                    {seg.departure_airport} → {seg.arrival_airport}
                  </div>
                  {seg.stopover_airport && (
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      Chặng dừng: {seg.stopover_airport}
                    </div>
                  )}
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {formatFlightDate(seg.departure_date)}
                    {seg.departure_time && ` | ${seg.departure_time}`}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    } else if (flight.airline === "VJ") {
      if (flight.is_round_trip) {
        return (
          <div className="text-sm">
            <strong>Hành trình khứ hồi (2 chặng):</strong>
            <div className="mt-2 space-y-2">
              <div className="ml-2">
                <span className="font-medium">Chặng 1</span>
                <div className="ml-2 text-gray-700 dark:text-gray-300">
                  <div>
                    {flight.departure_airport} → {flight.arrival_airport}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {formatFlightDate(flight.departure_date)}
                    {flight.departure_time && ` | ${flight.departure_time}`}
                  </div>
                </div>
              </div>
              <div className="ml-2">
                <span className="font-medium">Chặng 2</span>
                <div className="ml-2 text-gray-700 dark:text-gray-300">
                  <div>
                    {flight.arrival_airport} → {flight.departure_airport}
                  </div>
                  {flight.return_date && (
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {formatFlightDate(flight.return_date)}
                      {flight.return_time && ` | ${flight.return_time}`}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      } else {
        return (
          <div className="text-sm">
            <strong>Hành trình:</strong>
            <div className="mt-2">
              <span className="font-medium ml-2">Chặng 1</span>
              <div className="ml-4 text-gray-700 dark:text-gray-300">
                <div>
                  {flight.departure_airport} → {flight.arrival_airport}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {formatFlightDate(flight.departure_date)}
                  {flight.departure_time && ` | ${flight.departure_time}`}
                </div>
              </div>
            </div>
          </div>
        );
      }
    }
    return null;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-800">
      <TopNavbar 
        onShowPNRModal={() => setShowPNRModal(true)}
        onShowEmailModal={() => setIsEmailModalOpen(true)}
        onShowVJTicketModal={() => setShowVJTicketModal(true)}
        onShowVNATicketModal={() => setShowVNATicketModal(true)}
      />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate("/")}
            className="text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Quay lại
          </Button>
        </div>

        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-6">Tool Check Vé Giảm</h1>

          <div className="flex gap-2 mb-6 justify-center">
            <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
              <DialogTrigger asChild>
                <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                  <Plus className="w-5 h-5 mr-2" />
                  Thêm hành trình thủ công
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh]">
                <DialogHeader>
                  <DialogTitle>Thêm hành trình theo dõi</DialogTitle>
                </DialogHeader>
                <ScrollArea className="max-h-[calc(90vh-120px)] pr-4">
                  <div className="space-y-4">
                  <div>
                    <Label>Hãng bay</Label>
                    <Select
                      value={airline}
                      onValueChange={(value: "VJ" | "VNA") => {
                        setAirline(value);
                        // Reset forms when switching airlines
                        setDepartureAirport("");
                        setArrivalAirport("");
                        setDepartureDate("");
                        setDepartureTime("");
                        setIsRoundTrip(false);
                        setReturnDate("");
                        setReturnTime("");
                        setVnaTicketClass("ADT");
                        setVnaStopoverAirport("none");
                        setVnaReturnStopoverAirport("none");
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="VJ">VietJet Air</SelectItem>
                        <SelectItem value="VNA">Vietnam Airlines</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {airline === "VJ" ? (
                    <>
                      <div>
                        <Label>Sân bay đi</Label>
                        <Select value={departureAirport} onValueChange={setDepartureAirport}>
                          <SelectTrigger>
                            <SelectValue placeholder="Chọn sân bay" />
                          </SelectTrigger>
                          <SelectContent>
                            {ALL_AIRPORTS.map((code) => (
                              <SelectItem key={code} value={code}>
                                {code}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Sân bay đến</Label>
                        <Select value={arrivalAirport} onValueChange={setArrivalAirport}>
                          <SelectTrigger>
                            <SelectValue placeholder="Chọn sân bay" />
                          </SelectTrigger>
                          <SelectContent>
                            {ALL_AIRPORTS.map((code) => (
                              <SelectItem key={code} value={code}>
                                {code}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Ngày bay</Label>
                        <Input
                          type="date"
                          value={departureDate}
                          onChange={(e) => setDepartureDate(e.target.value)}
                          min={getTodayString()}
                        />
                      </div>
                      <div>
                        <Label>Giờ đi (tùy chọn)</Label>
                        <Select value={departureTime} onValueChange={setDepartureTime}>
                          <SelectTrigger>
                            <SelectValue placeholder="Chọn giờ" />
                          </SelectTrigger>
                          <SelectContent className="max-h-[200px]">
                            <SelectItem value="none">Không chọn giờ</SelectItem>
                            {TIME_OPTIONS.map((time) => (
                              <SelectItem key={time} value={time}>
                                {time}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="roundTrip"
                          checked={isRoundTrip}
                          onChange={(e) => setIsRoundTrip(e.target.checked)}
                          className="rounded"
                        />
                        <Label htmlFor="roundTrip">Khứ hồi</Label>
                      </div>
                      {isRoundTrip && (
                        <>
                          <div>
                            <Label>Ngày về</Label>
                            <Input
                              type="date"
                              value={returnDate}
                              onChange={(e) => setReturnDate(e.target.value)}
                              min={departureDate || getTodayString()}
                            />
                          </div>
                          <div>
                            <Label>Giờ về (tùy chọn)</Label>
                            <Select value={returnTime} onValueChange={setReturnTime}>
                              <SelectTrigger>
                                <SelectValue placeholder="Chọn giờ" />
                              </SelectTrigger>
                              <SelectContent className="max-h-[200px]">
                                <SelectItem value="none">Không chọn giờ</SelectItem>
                                {TIME_OPTIONS.map((time) => (
                                  <SelectItem key={time} value={time}>
                                    {time}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </>
                      )}
                    </>
                   ) : (
                     <>
                       <div>
                         <Label>Sân bay đi</Label>
                         <Select value={departureAirport} onValueChange={setDepartureAirport}>
                           <SelectTrigger>
                             <SelectValue placeholder="Chọn sân bay" />
                           </SelectTrigger>
                           <SelectContent>
                             {ALL_AIRPORTS.map((code) => (
                               <SelectItem key={code} value={code}>
                                 {code}
                               </SelectItem>
                             ))}
                           </SelectContent>
                         </Select>
                       </div>
                       <div>
                         <Label>Sân bay đến</Label>
                         <Select value={arrivalAirport} onValueChange={setArrivalAirport}>
                           <SelectTrigger>
                             <SelectValue placeholder="Chọn sân bay" />
                           </SelectTrigger>
                           <SelectContent>
                             {ALL_AIRPORTS.map((code) => (
                               <SelectItem key={code} value={code}>
                                 {code}
                               </SelectItem>
                             ))}
                           </SelectContent>
                         </Select>
                       </div>
                       <div>
                         <Label>Ngày bay</Label>
                         <Input
                           type="date"
                           value={departureDate}
                           onChange={(e) => setDepartureDate(e.target.value)}
                           min={getTodayString()}
                         />
                       </div>
                       <div>
                         <Label>Giờ đi (tùy chọn)</Label>
                         <Select value={departureTime} onValueChange={setDepartureTime}>
                           <SelectTrigger>
                             <SelectValue placeholder="Chọn giờ" />
                           </SelectTrigger>
                           <SelectContent className="max-h-[200px]">
                             <SelectItem value="none">Không chọn giờ</SelectItem>
                             {TIME_OPTIONS.map((time) => (
                               <SelectItem key={time} value={time}>
                                 {time}
                               </SelectItem>
                             ))}
                           </SelectContent>
                         </Select>
                       </div>

                        <div>
                          <Label>Hạng vé</Label>
                          <Select value={vnaTicketClass} onValueChange={(value: "ADT" | "VFR" | "STU") => setVnaTicketClass(value)}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="ADT">ADT</SelectItem>
                              <SelectItem value="VFR">VFR</SelectItem>
                              <SelectItem value="STU">STU</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id="roundTripVNA"
                            checked={isRoundTrip}
                            onChange={(e) => setIsRoundTrip(e.target.checked)}
                            className="rounded"
                          />
                          <Label htmlFor="roundTripVNA">Khứ hồi</Label>
                        </div>

                        {/* Chặng 1 - Chiều đi */}
                        <div className="p-4 border rounded-lg space-y-3 bg-blue-50 dark:bg-blue-950/20">
                          <div className="font-medium text-sm mb-2">Chặng 1 - Chiều đi</div>

                           <div>
                             <Label className="text-xs">Chặng dừng (tùy chọn)</Label>
                             <Select value={vnaStopoverAirport} onValueChange={setVnaStopoverAirport}>
                               <SelectTrigger>
                                 <SelectValue placeholder="Không có" />
                               </SelectTrigger>
                               <SelectContent>
                                 <SelectItem value="none">Không có</SelectItem>
                                 {ALL_AIRPORTS.map((code) => (
                                   <SelectItem key={code} value={code}>
                                     {code}
                                   </SelectItem>
                                 ))}
                               </SelectContent>
                             </Select>
                           </div>
                        </div>

                       {/* Chặng 2 - Chiều về */}
                       {isRoundTrip && (
                         <>
                           <div>
                             <Label>Ngày về</Label>
                             <Input
                               type="date"
                               value={returnDate}
                               onChange={(e) => setReturnDate(e.target.value)}
                               min={departureDate || getTodayString()}
                             />
                           </div>
                           <div>
                             <Label>Giờ về (tùy chọn)</Label>
                             <Select value={returnTime} onValueChange={setReturnTime}>
                               <SelectTrigger>
                                 <SelectValue placeholder="Chọn giờ" />
                               </SelectTrigger>
                               <SelectContent className="max-h-[200px]">
                                 <SelectItem value="none">Không chọn giờ</SelectItem>
                                 {TIME_OPTIONS.map((time) => (
                                   <SelectItem key={time} value={time}>
                                     {time}
                                   </SelectItem>
                                 ))}
                               </SelectContent>
                             </Select>
                           </div>

                            <div className="p-4 border rounded-lg space-y-3 bg-blue-50 dark:bg-blue-950/20">
                              <div className="font-medium text-sm mb-2">Chặng 2 - Chiều về</div>

                               <div>
                                 <Label className="text-xs">Chặng dừng (tùy chọn)</Label>
                                 <Select value={vnaReturnStopoverAirport} onValueChange={setVnaReturnStopoverAirport}>
                                   <SelectTrigger>
                                     <SelectValue placeholder="Không có" />
                                   </SelectTrigger>
                                   <SelectContent>
                                     <SelectItem value="none">Không có</SelectItem>
                                     {ALL_AIRPORTS.map((code) => (
                                       <SelectItem key={code} value={code}>
                                         {code}
                                       </SelectItem>
                                     ))}
                                   </SelectContent>
                                 </Select>
                               </div>
                            </div>
                         </>
                       )}
                     </>
                   )}

                  <div>
                    <Label>Kiểm tra mỗi (phút)</Label>
                    <Input
                      type="number"
                      value={checkInterval}
                      onChange={(e) => {
                        const val = parseInt(e.target.value);
                        if (val >= 5 || e.target.value === "") {
                          setCheckInterval(e.target.value);
                        }
                      }}
                      min="5"
                      placeholder="60"
                    />
                  </div>
                  <Button onClick={handleAddFlight} className="w-full">
                    Thêm vào danh sách
                  </Button>
                </div>
                </ScrollArea>
              </DialogContent>
            </Dialog>

            <Dialog open={isPnrModalOpen} onOpenChange={setIsPnrModalOpen}>
              <DialogTrigger asChild>
                <Button className="bg-green-600 hover:bg-green-700 text-white">
                  <Plus className="w-5 h-5 mr-2" />
                  Thêm hành trình từ PNR
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Thêm hành trình từ PNR</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Mã PNR</Label>
                    <Input
                      value={pnrCode}
                      onChange={(e) => setPnrCode(e.target.value.toUpperCase())}
                      placeholder="VD: CZ6B62"
                      maxLength={6}
                    />
                  </div>
                  <div>
                    <Label>Hãng bay</Label>
                    <Select value={pnrAirline} onValueChange={(value: "VJ" | "VNA") => setPnrAirline(value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="VJ">VietJet</SelectItem>
                        <SelectItem value="VNA">Vietnam Airlines</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch id="exact-time" checked={exactTimeMatch} onCheckedChange={setExactTimeMatch} />
                    <Label htmlFor="exact-time">Bắt đúng giờ</Label>
                  </div>
                  <Button onClick={handleImportFromPnr} className="w-full" disabled={isLoadingPnr}>
                    {isLoadingPnr ? "Đang xử lý..." : "Xác nhận"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {flights.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Bell className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                <p className="text-gray-500">Chưa có chuyến bay nào trong danh sách theo dõi</p>
                <p className="text-sm text-gray-400 mt-2">
                  Nhấn "Thêm hành trình thủ công" hoặc "Thêm hành trình từ PNR" để bắt đầu theo dõi giá vé
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {flights.map((flight) => (
                <Card
                  key={flight.id}
                  className={`chase-border-card hover:scale-[1.02] transition-all duration-300 ${
                    flight.airline === "VNA"
                      ? "border-blue-500 bg-blue-50 dark:bg-blue-950/20"
                      : "border-red-500 bg-red-50 dark:bg-red-950/20"
                  } ${!flight.is_active ? "opacity-50" : ""}`}
                  onMouseEnter={playClickSound}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="space-y-1 flex-1">
                        <CardTitle
                          className={`flex items-center gap-2 ${
                            flight.airline === "VNA"
                              ? "text-blue-700 dark:text-blue-400"
                              : "text-red-700 dark:text-red-400"
                          }`}
                        >
                          {flight.pnr || generatePNR(flight.id)}
                          <Badge variant={flight.airline === "VNA" ? "default" : "destructive"}>{flight.airline}</Badge>
                        </CardTitle>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleOpenBookingModal(flight.id)}
                          title="Giữ vé"
                        >
                          <ShoppingBasket className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleManualCheck(flight.id)}
                          disabled={checkingFlightId === flight.id}
                          title="Kiểm tra giá ngay"
                        >
                          <RefreshCw className={`h-4 w-4 ${checkingFlightId === flight.id ? "animate-spin" : ""}`} />
                        </Button>
                        <Button
                          size="sm"
                          variant={flight.is_active ? "default" : "outline"}
                          onClick={() => handleToggleActive(flight.id, flight.is_active)}
                          title={flight.is_active ? "Tắt theo dõi" : "Bật theo dõi"}
                        >
                          {flight.is_active ? <Bell className="h-4 w-4" /> : <Bell className="h-4 w-4 opacity-50" />}
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => handleDelete(flight.id)} title="Xóa">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="bg-white dark:bg-gray-800 p-3 rounded-lg">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <strong>Giá hiện tại:</strong>
                            <p className="text-lg font-bold text-green-600">
                              {flight.current_price
                                ? `${flight.current_price.toLocaleString("vi-VN")} KRW`
                                : "Chưa có dữ liệu"}
                            </p>
                          </div>
                          <div>
                            <strong>Kiểm tra lần cuối:</strong>
                            <p>{formatDate(flight.last_checked_at)}</p>
                          </div>
                          <div>
                            <strong>Tần suất check:</strong>
                            <div className="flex items-center gap-2">
                              <p>Mỗi {flight.check_interval_minutes} phút</p>
                              <Dialog
                                open={editingFlightId === flight.id}
                                onOpenChange={(open) => {
                                  if (open) {
                                    setEditingFlightId(flight.id);
                                    setEditCheckInterval(flight.check_interval_minutes.toString());
                                  } else {
                                    setEditingFlightId(null);
                                  }
                                }}
                              >
                                <DialogTrigger asChild>
                                  <Button size="sm" variant="ghost" className="h-6 w-6 p-0">
                                    <Pencil className="h-3 w-3" />
                                  </Button>
                                </DialogTrigger>
                                <DialogContent>
                                  <DialogHeader>
                                    <DialogTitle>Chỉnh sửa tần suất check</DialogTitle>
                                  </DialogHeader>
                                  <div className="space-y-4">
                                    <div>
                                      <Label>Kiểm tra mỗi (phút)</Label>
                                      <Input
                                        type="number"
                                        value={editCheckInterval}
                                        onChange={(e) => {
                                          const val = parseInt(e.target.value);
                                          if (val >= 5 || e.target.value === "") {
                                            setEditCheckInterval(e.target.value);
                                          }
                                        }}
                                        min="5"
                                        placeholder="60"
                                      />
                                    </div>
                                    <Button
                                      onClick={() => handleUpdateInterval(flight.id, parseInt(editCheckInterval))}
                                      className="w-full"
                                    >
                                      Cập nhật
                                    </Button>
                                  </div>
                                </DialogContent>
                              </Dialog>
                            </div>
                          </div>
                          <div>
                            <strong>Trạng thái:</strong>
                            <Badge variant={flight.is_active ? "default" : "secondary"}>
                              {flight.is_active ? "Đang theo dõi" : "Tạm dừng"}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2">
                            <strong>Giữ vé tự động:</strong>
                            <Switch
                              checked={flight.auto_hold_enabled || false}
                              onCheckedChange={() => handleToggleAutoHold(flight.id, flight.auto_hold_enabled || false)}
                            />
                            <span className="text-xs text-gray-500">{flight.auto_hold_enabled ? "Bật" : "Tắt"}</span>
                          </div>
                        </div>

                        {/* Progress bar for next check */}
                        {flight.is_active && (
                          <div className="mt-4 space-y-1">
                            <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                              <span>Thời gian đến lần check tiếp theo:</span>
                              <span className="font-medium">
                                {getTimeUntilNextCheck(flight.last_checked_at, flight.check_interval_minutes)}
                              </span>
                            </div>
                            <Progress
                              value={calculateProgress(flight.last_checked_at, flight.check_interval_minutes)}
                              className="h-2"
                            />
                          </div>
                        )}

                        {/* Flight segments */}
                        <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                          {renderFlightSegments(flight)}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Booking Modal */}
      {selectedFlight && selectedFlight.airline === "VJ" && (
        <BookingModal
          isOpen={bookingModalOpen}
          onClose={() => {
            setBookingModalOpen(false);
            setSelectedFlight(null);
          }}
          bookingKey={selectedFlight.booking_key_departure || ""}
          bookingKeyReturn={selectedFlight.booking_key_return}
          tripType={selectedFlight.is_round_trip ? "RT" : "OW"}
          departureAirport={selectedFlight.departure_airport}
          maxSeats={9}
          mode="save"
          initialPassengers={selectedFlight.passengers}
          onSavePassengers={(passengers) => handleSavePassengers(selectedFlight.id, passengers)}
          onBookingSuccess={handleBookingSuccess}
        />
      )}

      {/* VNA Booking Modal */}
      {selectedFlight && selectedFlight.airline === "VNA" && (
        <VNABookingModalPriceMonitor
          isOpen={bookingModalOpen}
          onClose={() => {
            setBookingModalOpen(false);
            setSelectedFlight(null);
          }}
          mode="save"
          initialPassengers={selectedFlight.passengers}
          onSavePassengers={(passengers) => handleSavePassengers(selectedFlight.id, passengers)}
          doiTuong={(selectedFlight.ticket_class as 'VFR' | 'ADT' | 'STU') || 'ADT'}
        />
      )}

      {/* Utility Modals */}
      <PNRCheckModal
        isOpen={showPNRModal}
        onClose={() => setShowPNRModal(false)}
      />

      <EmailTicketModal
        isOpen={isEmailModalOpen}
        onClose={() => setIsEmailModalOpen(false)}
      />

      <VJTicketModal
        isOpen={showVJTicketModal}
        onClose={() => setShowVJTicketModal(false)}
        initialPNR=""
      />

      <VNATicketModal
        isOpen={showVNATicketModal}
        onClose={() => setShowVNATicketModal(false)}
        initialPNR=""
      />
    </div>
  );
}
