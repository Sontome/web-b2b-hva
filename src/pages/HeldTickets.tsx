import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Copy, Trash2, Info } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { VJTicketModal } from "@/components/VJTicketModal";
import { VNATicketModal } from "@/components/VNATicketModal";
import SunPQTicketModal from "@/components/SunPQTicketModal";
import { PNRCheckModal } from "@/components/PNRCheckModal";
import { EmailTicketModal } from "@/components/EmailTicketModal";
import { TopNavbar } from "@/components/TopNavbar";
import { useHoverSound } from "@/hooks/useHoverSound";

interface HeldSegment {
  segment_order: number;
  departure_airport: string;
  arrival_airport: string;
  departure_date: string;
  departure_time: string;
  trip: string;
}

interface HeldTicket {
  id: string;
  pnr: string;
  airline: string;
  number_person: number;
  namelist: string[];
  payment_status: boolean;
  ticket_status: string;
  hold_date: string;
  expire_date: string | null;
  tongbillgiagoc: number | null;
  segments: HeldSegment[];
}

export default function HeldTickets() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { playClickSound } = useHoverSound();
  const [tickets, setTickets] = useState<HeldTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [monitoredPNRs, setMonitoredPNRs] = useState<Set<string>>(new Set());
  const [isPnrModalOpen, setIsPnrModalOpen] = useState(false);
  const [selectedPnr, setSelectedPnr] = useState("");
  const [pnrAirline, setPnrAirline] = useState<"VJ" | "VNA">("VJ");
  const [exactTimeMatch, setExactTimeMatch] = useState(true);
  const [isLoadingPnr, setIsLoadingPnr] = useState(false);
  const [isVJTicketModalOpen, setIsVJTicketModalOpen] = useState(false);
  const [isVNATicketModalOpen, setIsVNATicketModalOpen] = useState(false);
  const [isSunTicketModalOpen, setIsSunTicketModalOpen] = useState(false);
  const [ticketPnr, setTicketPnr] = useState("");
  const [showPNRModal, setShowPNRModal] = useState(false);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [showVJTicketModal, setShowVJTicketModal] = useState(false);
  const [showVNATicketModal, setShowVNATicketModal] = useState(false);

  // Filters
  const todayIso = new Date().toISOString().slice(0, 10);
  const monthAgoIso = (() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d.toISOString().slice(0, 10);
  })();
  const [flightFrom, setFlightFrom] = useState<string>("");
  const [flightTo, setFlightTo] = useState<string>("");
  const [holdFrom, setHoldFrom] = useState<string>(monthAgoIso);
  const [holdTo, setHoldTo] = useState<string>(todayIso);
  const [filterAirline, setFilterAirline] = useState<string>("ALL");
  const [filterRoute, setFilterRoute] = useState<string>("ALL");
  const [filterStatus, setFilterStatus] = useState<string>("ALL");

  useEffect(() => {
    if (!profile?.perm_hold_ticket) {
      navigate("/");
      return;
    }
    fetchHeldTickets();
    fetchMonitoredPNRs();
  }, [profile, navigate]);

  const checkExpiredTicketsStatus = async (expiredTickets: HeldTicket[]) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    for (const ticket of expiredTickets) {
      if (isVNA(ticket)) continue; // Only check VJ tickets

      try {
        const response = await fetch(`https://apilive.hanvietair.com/vj/checkpnr?pnr=${ticket.pnr}`, {
          method: "POST",
        });

        if (response.ok) {
          const data = await response.json();
          // If body is null or paymentstatus is not true, mark as cancelled
          const newStatus = data && data.paymentstatus === true ? "issued" : "cancelled";

          await supabase.from("held_tickets").update({ ticket_status: newStatus, payment_status: newStatus === "issued" }).eq("id", ticket.id).eq("user_id", user.id);
        }
      } catch (error) {
        console.error(`Error checking status for PNR ${ticket.pnr}:`, error);
      }
    }
  };

  const fetchHeldTickets = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("held_tickets")
        .select("*, held_ticket_segments(*)")
        .eq("user_id", user.id)
        .order("hold_date", { ascending: false });

      if (error) throw error;

      // Map to HeldTicket with sorted segments
      const mapped: HeldTicket[] = (data || []).map((row: any) => ({
        id: row.id,
        pnr: row.pnr,
        airline: row.airline,
        number_person: row.number_person,
        namelist: row.namelist || [],
        payment_status: row.payment_status,
        ticket_status: row.ticket_status,
        hold_date: row.hold_date,
        expire_date: row.expire_date,
        tongbillgiagoc: row.tongbillgiagoc ?? null,
        segments: (row.held_ticket_segments || [])
          .slice()
          .sort((a: HeldSegment, b: HeldSegment) => a.segment_order - b.segment_order),
      }));

      // Separate expired holding tickets and others
      const expiredHoldingTickets: HeldTicket[] = [];
      const filteredTickets = mapped.filter((ticket) => {
        if (ticket.ticket_status === "holding" && ticket.expire_date) {
          const expired = isExpired(ticket.expire_date);
          if (expired) {
            expiredHoldingTickets.push(ticket);
            return false;
          }
        }
        return true;
      });

      setTickets(filteredTickets);

      // Check status of expired holding tickets
      if (expiredHoldingTickets.length > 0) {
        checkExpiredTicketsStatus(expiredHoldingTickets);
      }
    } catch (error) {
      console.error("Error fetching held tickets:", error);
      toast({
        title: "Lỗi",
        description: "Không thể tải danh sách vé giữ",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchMonitoredPNRs = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase.from("monitored_flights").select("pnr").eq("user_id", user.id);

      if (error) throw error;

      const pnrSet = new Set<string>();
      data?.forEach((flight) => {
        if (flight.pnr) {
          pnrSet.add(flight.pnr);
        }
      });
      setMonitoredPNRs(pnrSet);
    } catch (error) {
      console.error("Error fetching monitored PNRs:", error);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      // Update expire_date to now instead of deleting
      const { error } = await supabase
        .from("held_tickets")
        .update({ expire_date: new Date().toISOString() })
        .eq("id", id);

      if (error) throw error;

      setTickets(tickets.filter((t) => t.id !== id));
      toast({
        title: "Đã xóa",
        description: "Đã xóa vé khỏi giỏ hàng",
      });
    } catch (error) {
      console.error("Error deleting ticket:", error);
      toast({
        title: "Lỗi",
        description: "Không thể xóa vé",
        variant: "destructive",
      });
    }
  };

  const copyPNR = (pnr: string) => {
    navigator.clipboard.writeText(pnr);
    toast({
      title: "Đã copy",
      description: `Đã copy mã PNR: ${pnr}`,
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString("vi-VN");
  };

  const isExpired = (expireDate: string) => {
    if (!expireDate) return false;
    return new Date(expireDate) < new Date();
  };

  const isVNA = (ticket: HeldTicket) => {
    return ticket.airline === "VNA";
  };

  const parseDate = (dateStr: string): string => {
    const parts = dateStr.split("/");
    if (parts.length === 3) {
      return `${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`;
    }
    return dateStr;
  };

  const handleOpenPnrModal = (pnr: string) => {
    setSelectedPnr(pnr);
    setPnrAirline("VJ");
    setExactTimeMatch(true);
    setIsPnrModalOpen(true);
  };

  const handleOpenPnrModalVNA = (pnr: string) => {
    // Navigate to PriceMonitor page with PNR pre-filled
    navigate("/price-monitor", {
      state: { pnr, airline: "VNA", exactTimeMatch: true }
    });
  };

  const handleOpenTicketModal = async (pnr: string, airline: string) => {
    setTicketPnr(pnr);
    const isVNA = airline === "VNA";
    const isSun = airline === "SUN";

    // Check payment status for VJ tickets
    if (!isVNA && !isSun) {
      try {
        const response = await fetch(`https://apilive.hanvietair.com/vj/checkpnr?pnr=${pnr}`, {
          method: "POST",
        });

        if (response.ok) {
          const data = await response.json();
          if (data.paymentstatus === true) {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
              const { error } = await supabase
                .from("held_tickets")
                .update({ ticket_status: "issued", payment_status: true })
                .eq("pnr", pnr)
                .eq("user_id", user.id);
              if (!error) {
                setTickets((prev) => prev.map((t) => (t.pnr === pnr ? { ...t, ticket_status: "issued", payment_status: true } : t)));
              }
            }
          }
        }
      } catch (error) {
        console.error("Error checking payment status:", error);
      }
    }

    if (isVNA) setIsVNATicketModalOpen(true);
    else if (isSun) setIsSunTicketModalOpen(true);
    else setIsVJTicketModalOpen(true);
  };

  const handleImportFromPnr = async () => {
    if (!selectedPnr || selectedPnr.length !== 6) {
      toast({
        title: "Lỗi",
        description: "Vui lòng nhập mã PNR hợp lệ (6 ký tự)",
        variant: "destructive",
      });
      return;
    }

    if (pnrAirline === "VNA") {
      // Handle VNA PNR import
      setIsLoadingPnr(true);
      try {
        const response = await fetch(`https://apilive.hanvietair.com/checkvechoVNA?pnr=${selectedPnr}`);

        if (!response.ok) {
          throw new Error("Failed to fetch VNA PNR data");
        }

        const data = await response.json();

        // Validate segments
        if (!data.chang || !Array.isArray(data.chang)) {
          throw new Error("Invalid VNA PNR data");
        }

        const segments = data.chang;

        // Check for connecting flights (>2 segments or same departure dates)
        if (segments.length > 2) {
          toast({
            title: "Lỗi",
            description: "Chuyến bay nối chuyến chưa hỗ trợ check giá giảm",
            variant: "destructive",
          });
          setIsLoadingPnr(false);
          return;
        }

        if (segments.length === 2) {
          const date1 = segments[0].ngaycatcanh;
          const date2 = segments[1].ngaycatcanh;
          if (date1 === date2) {
            toast({
              title: "Lỗi",
              description: "Chuyến bay nối chuyến chưa hỗ trợ check giá giảm",
              variant: "destructive",
            });
            setIsLoadingPnr(false);
            return;
          }
        }

        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          throw new Error("User not authenticated");
        }

        // Helper function to detect gender and remove title prefix
        const processName = (firstName: string) => {
          const upperName = firstName.toUpperCase();
          let gender = "nam";
          let cleanName = firstName;

          if (upperName.endsWith("MISS") || upperName.endsWith("MS")) {
            gender = "nữ";
            cleanName = firstName.replace(/\s*(MISS|MS)\s*$/i, "").trim();
          } else if (upperName.includes("MR") || upperName.includes("MSTR")) {
            gender = "nam";
            cleanName = firstName.replace(/\s*(MR|MSTR)\s*/gi, "").trim();
          }

          return { gender, cleanName };
        };

        // Build flight data
        const flightData: any = {
          user_id: user.id,
          airline: "VNA",
          departure_airport: segments[0].departure,
          arrival_airport: segments[0].arrival,
          departure_date: segments[0].ngaycatcanh,
          departure_time: exactTimeMatch ? segments[0].giocatcanh : null,
          check_interval_minutes: 5,
          is_active: true,
          auto_hold_enabled: true,
          ticket_class: segments[0].doituong || "ADT",
          pnr: selectedPnr,
          reprice_pnr: selectedPnr, // Save original PNR for reprice
        };

        if (segments.length === 2) {
          flightData.is_round_trip = true;
          flightData.return_date = segments[1].ngaycatcanh;
          flightData.return_time = exactTimeMatch ? segments[1].giocatcanh : null;
        }

        // Transform and save passenger information
        if (data.passengers && Array.isArray(data.passengers) && data.passengers.length > 0) {
          const transformedPassengers = data.passengers.map((p: any) => {
            const { gender, cleanName } = processName(p.firstName || "");
            
            const passenger: any = {
              Họ: p.lastName || "",
              Tên: cleanName,
              Hộ_chiếu: p.passportNumber || "",
              Giới_tính: gender,
              Quốc_tịch: p.quoctich || "VN",
              type: p.child ? "trẻ_em" : "người_lớn",
            };

            // Handle infant
            if (p.inf && typeof p.inf === "object") {
              const infantFirstName = p.inf.firstName || "";
              const { gender: infantGender, cleanName: infantCleanName } = processName(infantFirstName);
              
              passenger.infant = {
                Họ: p.inf.lastName || "",
                Tên: infantCleanName,
                Hộ_chiếu: "B123456",
                Giới_tính: infantGender,
                Quốc_tịch: p.quoctich || "VN",
              };
            }

            return passenger;
          });
          flightData.passengers = transformedPassengers;
        }

        const { error } = await supabase.from("monitored_flights").insert(flightData);

        if (error) throw error;

        toast({
          title: "Đã thêm vào theo dõi giá! 🎯",
          description: `PNR ${selectedPnr}: ${segments[0].departure} → ${segments[0].arrival}`,
        });

        setMonitoredPNRs((prev) => new Set([...prev, selectedPnr]));
        setIsPnrModalOpen(false);
        setSelectedPnr("");
      } catch (error) {
        console.error("Error adding VNA to monitor:", error);
        toast({
          title: "Lỗi",
          description: "Không thể thêm vào danh sách theo dõi giá",
          variant: "destructive",
        });
      } finally {
        setIsLoadingPnr(false);
      }
      return;
    }

    if (monitoredPNRs.has(selectedPnr)) {
      toast({
        title: "Thông báo",
        description: "PNR này đã được thêm vào danh sách theo dõi",
        variant: "default",
      });
      return;
    }

    setIsLoadingPnr(true);
    try {
      const response = await fetch(`https://apilive.hanvietair.com/vj/checkpnr?pnr=${selectedPnr}`, {
        method: "POST",
        headers: {
          accept: "application/json",
        },
        body: "",
      });

      if (!response.ok) {
        throw new Error("Failed to fetch PNR data");
      }

      const data = await response.json();

      if (data.status !== "OK") {
        throw new Error("PNR data invalid");
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("User not authenticated");
      }

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
        ticket_class: data.chieudi.loaive === "ECO" ? "economy" : "business",
        pnr: selectedPnr,
      };

      if (data.chieuve) {
        flightData.is_round_trip = true;
        flightData.return_date = parseDate(data.chieuve.ngaycatcanh);
        flightData.return_time = exactTimeMatch ? data.chieuve.giocatcanh : null;
      }

      // Transform and save passenger information
      if (data.passengers && Array.isArray(data.passengers) && data.passengers.length > 0) {
        const transformedPassengers = data.passengers.map((p: any) => {
          const passenger: any = {
            Họ: p.lastName || "",
            Tên: p.firstName || "",
            Hộ_chiếu: p.passportNumber || "",
            Giới_tính: p.gender === "Female" ? "nữ" : "nam", // Default, as not in API response
            Quốc_tịch: p.quoctich || "", // Default, as not in API response
            type: p.child ? "trẻ_em" : "người_lớn",
          };

          if (p.infant && Array.isArray(p.infant) && p.infant.length > 0) {
            const infantData = p.infant[0];
            passenger.infant = {
              Họ: infantData.lastName || "",
              Tên: infantData.firstName || "",
              Hộ_chiếu: "B123456",
              Giới_tính: infantData.gender === "Unknown" ? "nam" : infantData.gender,
              Quốc_tịch: p.quoctich,
            };
          }

          return passenger;
        });
        flightData.passengers = transformedPassengers;
      }

      const { error } = await supabase.from("monitored_flights").insert(flightData);

      if (error) throw error;

      toast({
        title: "Đã thêm vào theo dõi giá! 🎯",
        description: `PNR ${selectedPnr}: ${data.chieudi.departure} → ${data.chieudi.arrival}`,
      });

      setMonitoredPNRs((prev) => new Set([...prev, selectedPnr]));
      setIsPnrModalOpen(false);
      setSelectedPnr("");
    } catch (error) {
      console.error("Error adding to monitor:", error);
      toast({
        title: "Lỗi",
        description: "Không thể thêm vào danh sách theo dõi giá",
        variant: "destructive",
      });
    } finally {
      setIsLoadingPnr(false);
    }
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
        onShowSunPQTicketModal={profile?.perm_check_sunpq ? () => { setTicketPnr(""); setIsSunTicketModalOpen(true); } : undefined}
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

        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-6">
            Yêu cầu đặt chỗ / Đặt vé
          </h1>

          {(() => {
            const airlineOptions = Array.from(new Set(tickets.map((t) => t.airline).filter(Boolean)));
            const routeOptions = Array.from(
              new Set(
                tickets.flatMap((t) =>
                  t.segments.map((s) => `${s.departure_airport}-${s.arrival_airport}`)
                )
              )
            ).sort();

            const inDateRange = (iso: string, from: string, to: string) => {
              if (!iso) return true;
              const d = iso.slice(0, 10);
              if (from && d < from) return false;
              if (to && d > to) return false;
              return true;
            };

            const getStatusKey = (t: HeldTicket) => {
              const expired = isExpired(t.expire_date);
              const isVJExpired = t.airline !== "VNA" && t.airline === "VJ" && expired;
              if (t.ticket_status === "holding") return "holding";
              if (t.ticket_status === "issued" || t.ticket_status === "ticketed") return "issued";
              if (t.ticket_status === "paid") return "paid";
              if (t.ticket_status === "expired" || t.ticket_status === "cancelled" || isVJExpired) return "expired";
              return t.ticket_status || "other";
            };

            const filtered = tickets.filter((t) => {
              if (filterAirline !== "ALL" && t.airline !== filterAirline) return false;
              if (filterStatus !== "ALL" && getStatusKey(t) !== filterStatus) return false;
              if (filterRoute !== "ALL") {
                const hit = t.segments.some(
                  (s) => `${s.departure_airport}-${s.arrival_airport}` === filterRoute
                );
                if (!hit) return false;
              }
              if (holdFrom || holdTo) {
                if (!inDateRange(t.hold_date, holdFrom, holdTo)) return false;
              }
              if (flightFrom || flightTo) {
                const anyMatch = t.segments.some((s) =>
                  inDateRange(
                    /^\d{4}-\d{2}-\d{2}/.test(s.departure_date)
                      ? s.departure_date
                      : (() => {
                          const p = s.departure_date.split("/");
                          return p.length === 3
                            ? `${p[2]}-${p[1].padStart(2, "0")}-${p[0].padStart(2, "0")}`
                            : s.departure_date;
                        })(),
                    flightFrom,
                    flightTo
                  )
                );
                if (!anyMatch) return false;
              }
              return true;
            });

            return (
              <>
                <Card className="mb-4">
                  <CardContent className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-3">
                    <div className="lg:col-span-2 grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs">Ngày bay từ</Label>
                        <Input type="date" value={flightFrom} onChange={(e) => setFlightFrom(e.target.value)} />
                      </div>
                      <div>
                        <Label className="text-xs">Đến</Label>
                        <Input type="date" value={flightTo} onChange={(e) => setFlightTo(e.target.value)} />
                      </div>
                    </div>
                    <div className="lg:col-span-2 grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs">Ngày đặt từ</Label>
                        <Input type="date" value={holdFrom} onChange={(e) => setHoldFrom(e.target.value)} />
                      </div>
                      <div>
                        <Label className="text-xs">Đến</Label>
                        <Input type="date" value={holdTo} onChange={(e) => setHoldTo(e.target.value)} />
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs">Hãng bay</Label>
                      <Select value={filterAirline} onValueChange={setFilterAirline}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ALL">Tất cả</SelectItem>
                          {airlineOptions.map((a) => (
                            <SelectItem key={a} value={a}>{a}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">Chặng bay</Label>
                      <Select value={filterRoute} onValueChange={setFilterRoute}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ALL">Tất cả</SelectItem>
                          {routeOptions.map((r) => (
                            <SelectItem key={r} value={r}>{r}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">Trạng Thái</Label>
                      <Select value={filterStatus} onValueChange={setFilterStatus}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ALL">Tất cả</SelectItem>
                          <SelectItem value="holding">Đang giữ</SelectItem>
                          <SelectItem value="issued">Đã xuất vé</SelectItem>
                          <SelectItem value="paid">Đã thanh toán</SelectItem>
                          <SelectItem value="expired">Hết hạn</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="md:col-span-2 lg:col-span-6 flex justify-end">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setFlightFrom("");
                          setFlightTo("");
                          setHoldFrom(monthAgoIso);
                          setHoldTo(todayIso);
                          setFilterAirline("ALL");
                          setFilterRoute("ALL");
                          setFilterStatus("ALL");
                        }}
                      >
                        Đặt lại bộ lọc
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {filtered.length === 0 ? (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <p className="text-gray-500">Không có vé phù hợp với bộ lọc</p>
                    </CardContent>
                  </Card>
                ) : (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-medium">
                  Tổng cộng {filtered.length} trường hợp
                </CardTitle>
              </CardHeader>
              <CardContent className="overflow-x-auto p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">STT</TableHead>
                      <TableHead>PNR</TableHead>
                      <TableHead>Trạng Thái</TableHead>
                      <TableHead>Hành trình lựa chọn</TableHead>
                      <TableHead>Ngày đặt chỗ</TableHead>
                      <TableHead className="text-center">Khách</TableHead>
                      <TableHead>Hành khách</TableHead>
                      <TableHead className="text-right whitespace-nowrap">Tổng bill giá gốc</TableHead>
                      <TableHead>TL (Hạn thanh toán)</TableHead>
                      <TableHead>Hãng</TableHead>
                      <TableHead className="text-right">Hành động</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((ticket, idx) => {
                      const expired = isExpired(ticket.expire_date);
                      const vnaTicket = isVNA(ticket);
                      const isVJExpired = !vnaTicket && ticket.airline === "VJ" && expired;
                      const statusLabel =
                        ticket.ticket_status === "holding"
                          ? "Đang giữ"
                          : ticket.ticket_status === "issued" || ticket.ticket_status === "ticketed"
                          ? "Đã xuất vé"
                          : ticket.ticket_status === "paid"
                          ? "Đã thanh toán"
                          : ticket.ticket_status === "expired" || ticket.ticket_status === "cancelled" || isVJExpired
                          ? "Hết hạn"
                          : ticket.ticket_status;
                      const rowTone = vnaTicket
                        ? "bg-blue-50/40 dark:bg-blue-950/10"
                        : ticket.airline === "SUN"
                        ? "bg-orange-50/40 dark:bg-orange-950/10"
                        : "bg-red-50/40 dark:bg-red-950/10";
                      return (
                        <TableRow
                          key={ticket.id}
                          className={`${rowTone} ${isVJExpired ? "opacity-60" : ""}`}
                          onMouseEnter={playClickSound}
                        >
                          <TableCell>{idx + 1}</TableCell>
                          <TableCell>
                            <button
                              onClick={() => handleOpenTicketModal(ticket.pnr, ticket.airline)}
                              className="font-semibold underline decoration-dotted text-foreground"
                              title="Xem mặt vé"
                            >
                              {ticket.pnr}
                            </button>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap items-center gap-1">
                              <Badge
                                variant={isVJExpired ? "destructive" : "default"}
                                className="whitespace-nowrap px-2 py-0.5"
                              >
                                {statusLabel}
                              </Badge>
                              {ticket.payment_status && (
                                <Badge className="bg-green-600 whitespace-nowrap">TT</Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-xs">
                            {ticket.segments.length === 0 ? (
                              <span className="text-muted-foreground">—</span>
                            ) : (
                              <div className="space-y-0.5">
                                {ticket.segments.map((s) => (
                                  <div key={s.segment_order}>
                                    {s.trip} / {s.departure_date} {s.departure_time}
                                  </div>
                                ))}
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="text-xs whitespace-nowrap">
                            {formatDate(ticket.hold_date)}
                          </TableCell>
                          <TableCell className="text-center">{ticket.number_person}</TableCell>
                          <TableCell className="text-xs">
                            {ticket.namelist.join(", ") || "—"}
                          </TableCell>
                          <TableCell className="text-right text-xs whitespace-nowrap font-medium">
                            {ticket.tongbillgiagoc && ticket.tongbillgiagoc > 0
                              ? ticket.tongbillgiagoc.toLocaleString("en-US")
                              : "—"}
                          </TableCell>
                          <TableCell className="text-xs whitespace-nowrap">
                            {ticket.expire_date ? formatDate(ticket.expire_date) : "—"}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{ticket.airline}</Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleOpenTicketModal(ticket.pnr, ticket.airline)}
                                className="h-7 w-7 p-0"
                                title="Xem mặt vé"
                              >
                                <Info className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => copyPNR(ticket.pnr)}
                                className="h-7 w-7 p-0"
                                title="Copy PNR"
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleDelete(ticket.id)}
                                className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                                title="Xóa"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
                )}
              </>
            );
          })()}
        </div>



        <Dialog open={isPnrModalOpen} onOpenChange={setIsPnrModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Thêm hành trình từ PNR vào theo dõi giá</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Mã PNR</Label>
                <Input
                  value={selectedPnr}
                  onChange={(e) => setSelectedPnr(e.target.value.toUpperCase())}
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

        <VJTicketModal
          isOpen={isVJTicketModalOpen}
          onClose={() => setIsVJTicketModalOpen(false)}
          initialPNR={ticketPnr}
        />

        <VNATicketModal
          isOpen={isVNATicketModalOpen}
          onClose={() => setIsVNATicketModalOpen(false)}
          initialPNR={ticketPnr}
        />

        <SunPQTicketModal
          isOpen={isSunTicketModalOpen}
          onClose={() => setIsSunTicketModalOpen(false)}
          initialPNR={ticketPnr}
        />

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
    </div>
  );
}
