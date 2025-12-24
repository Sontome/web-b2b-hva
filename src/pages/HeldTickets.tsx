import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Copy, Trash2, TrendingDown, Info } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { VJTicketModal } from "@/components/VJTicketModal";
import { VNATicketModal } from "@/components/VNATicketModal";
import { PNRCheckModal } from "@/components/PNRCheckModal";
import { EmailTicketModal } from "@/components/EmailTicketModal";
import { TopNavbar } from "@/components/TopNavbar";
import { useHoverSound } from "@/hooks/useHoverSound";

interface HeldTicket {
  id: string;
  pnr: string;
  flight_details: any;
  hold_date: string;
  expire_date: string;
  status: string;
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
  const [ticketPnr, setTicketPnr] = useState("");
  const [showPNRModal, setShowPNRModal] = useState(false);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [showVJTicketModal, setShowVJTicketModal] = useState(false);
  const [showVNATicketModal, setShowVNATicketModal] = useState(false);

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
        const response = await fetch(`https://thuhongtour.com/vj/checkpnr?pnr=${ticket.pnr}`, {
          method: "POST",
        });

        if (response.ok) {
          const data = await response.json();
          // If body is null or paymentstatus is not true, mark as cancelled
          const newStatus = data && data.paymentstatus === true ? "issued" : "cancelled";

          await supabase.from("held_tickets").update({ status: newStatus }).eq("id", ticket.id).eq("user_id", user.id);
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
        .select("*")
        .eq("user_id", user.id)
        .order("hold_date", { ascending: false });

      if (error) throw error;

      // Separate expired holding tickets and others
      const expiredHoldingTickets: HeldTicket[] = [];
      const filteredTickets = (data || []).filter((ticket) => {
        // Don't show cancelled tickets
        if (ticket.status === "cancelled") return false;

        if (ticket.status === "holding" && ticket.expire_date) {
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
    return ticket.flight_details?.airline === "VNA";
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

  const handleOpenTicketModal = async (pnr: string, isVNA: boolean) => {
    setTicketPnr(pnr);

    // Check payment status for VJ tickets
    if (!isVNA) {
      try {
        const response = await fetch(`https://thuhongtour.com/vj/checkpnr?pnr=${pnr}`, {
          method: "POST",
        });

        if (response.ok) {
          const data = await response.json();

          // If payment status is true, update ticket status to "issued"
          if (data.paymentstatus === true) {
            const {
              data: { user },
            } = await supabase.auth.getUser();
            if (user) {
              const { error } = await supabase
                .from("held_tickets")
                .update({ status: "issued" })
                .eq("pnr", pnr)
                .eq("user_id", user.id);

              if (!error) {
                // Update local state
                setTickets((prevTickets) => prevTickets.map((t) => (t.pnr === pnr ? { ...t, status: "issued" } : t)));
              }
            }
          }
        }
      } catch (error) {
        console.error("Error checking payment status:", error);
      }
    }

    if (isVNA) {
      setIsVNATicketModalOpen(true);
    } else {
      setIsVJTicketModalOpen(true);
    }
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
        const response = await fetch(`https://thuhongtour.com/checkvechoVNA?pnr=${selectedPnr}`);

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
      const response = await fetch(`https://thuhongtour.com/vj/checkpnr?pnr=${selectedPnr}`, {
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
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-6">Giỏ hàng - Vé đang giữ</h1>

          {tickets.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-gray-500">Chưa có vé nào trong giỏ hàng</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {tickets.map((ticket) => {
                const expired = isExpired(ticket.expire_date);
                const vnaTicket = isVNA(ticket);
                const isVJExpired = !vnaTicket && expired;

                return (
                  <Card
                    key={ticket.id}
                    className={`chase-border-card hover:scale-[1.02] transition-all duration-300 ${isVJExpired ? "opacity-50 grayscale" : ""} ${
                      vnaTicket
                        ? "border-blue-500 bg-blue-50 dark:bg-blue-950/20"
                        : "border-red-500 bg-red-50 dark:bg-red-950/20"
                    }`}
                    onMouseEnter={playClickSound}
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <CardTitle
                            className={`flex items-center gap-2 ${
                              vnaTicket ? "text-blue-700 dark:text-blue-400" : "text-red-700 dark:text-red-400"
                            }`}
                          >
                            Mã PNR: {ticket.pnr}
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleOpenTicketModal(ticket.pnr, vnaTicket)}
                              className="h-6 w-6 p-0"
                              title="Xem mặt vé"
                            >
                              <Info className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => copyPNR(ticket.pnr)}
                              className="h-6 w-6 p-0"
                              title="Copy PNR"
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                          </CardTitle>
                          <div className="text-sm text-gray-500">Giữ lúc: {formatDate(ticket.hold_date)}</div>
                        </div>
                        <Button size="sm" variant="destructive" onClick={() => handleDelete(ticket.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <Badge variant={isVJExpired ? "destructive" : "default"}>
                            {ticket.status === "holding"
                              ? "Đang giữ"
                              : ticket.status === "issued"
                                ? "Đã xuất vé"
                                : ticket.status}
                          </Badge>
                          {isVJExpired && ticket.status !== "issued" && <Badge variant="destructive">Hết hạn</Badge>}
                        </div>

                        <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                          <div className="text-sm space-y-1">
                            {!vnaTicket && (
                              <p>
                                <strong>Hạn thanh toán:</strong>{" "}
                                {ticket.flight_details?.deadline || formatDate(ticket.expire_date)}
                              </p>
                            )}
                          </div>
                        </div>

                        {!vnaTicket && !expired && (
                          <Button
                            onClick={() => handleOpenPnrModal(ticket.pnr)}
                            disabled={monitoredPNRs.has(ticket.pnr)}
                            size="sm"
                            variant={monitoredPNRs.has(ticket.pnr) ? "ghost" : "outline"}
                            className="mt-2"
                            title={monitoredPNRs.has(ticket.pnr) ? "Đang theo dõi giá" : "Theo dõi giá giảm"}
                          >
                            <TrendingDown className="h-4 w-4" />
                          </Button>
                        )}
                        {vnaTicket && !expired && (
                          <Button
                            onClick={() => handleOpenPnrModalVNA(ticket.pnr)}
                            disabled={monitoredPNRs.has(ticket.pnr)}
                            size="sm"
                            variant={monitoredPNRs.has(ticket.pnr) ? "ghost" : "outline"}
                            className="mt-2"
                            title={monitoredPNRs.has(ticket.pnr) ? "Đang theo dõi giá" : "Theo dõi giá giảm"}
                          >
                            <TrendingDown className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
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
