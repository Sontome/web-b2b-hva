import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Copy, Info } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { VJTicketModal } from "@/components/VJTicketModal";
import { VNATicketModal } from "@/components/VNATicketModal";
import SunPQTicketModal from "@/components/SunPQTicketModal";

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
  user_id: string;
  user_name: string;
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

export default function AdminCart() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [tickets, setTickets] = useState<HeldTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [isVJTicketModalOpen, setIsVJTicketModalOpen] = useState(false);
  const [isVNATicketModalOpen, setIsVNATicketModalOpen] = useState(false);
  const [isSunTicketModalOpen, setIsSunTicketModalOpen] = useState(false);
  const [ticketPnr, setTicketPnr] = useState("");

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
  const [filterUser, setFilterUser] = useState<string>("ALL");

  useEffect(() => {
    if (profile && profile.role !== "admin") {
      navigate("/");
      return;
    }
    if (profile?.role === "admin") fetchAll();
  }, [profile, navigate]);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("held_tickets")
        .select("*, held_ticket_segments(*)")
        .order("hold_date", { ascending: false });
      if (error) throw error;

      const userIds = Array.from(new Set((data || []).map((r: any) => r.user_id))).filter(Boolean);
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, full_name, phone")
        .in("id", userIds as string[]);
      const nameMap = new Map<string, string>();
      (profs || []).forEach((p: any) => {
        nameMap.set(p.id, p.full_name || p.phone || p.id.slice(0, 8));
      });

      const mapped: HeldTicket[] = (data || []).map((row: any) => ({
        id: row.id,
        user_id: row.user_id,
        user_name: nameMap.get(row.user_id) || row.user_id?.slice(0, 8) || "—",
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
      setTickets(mapped);
    } catch (e) {
      console.error(e);
      toast({ title: "Lỗi", description: "Không thể tải giỏ hàng", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const copyPNR = (pnr: string) => {
    navigator.clipboard.writeText(pnr);
    toast({ title: "Đã copy", description: `PNR: ${pnr}` });
  };

  const formatDate = (s: string) => new Date(s).toLocaleString("vi-VN");
  const isExpired = (d: string | null) => (d ? new Date(d) < new Date() : false);

  const handleOpenTicketModal = (pnr: string, airline: string) => {
    setTicketPnr(pnr);
    if (airline === "VNA") setIsVNATicketModalOpen(true);
    else if (airline === "SUN") setIsSunTicketModalOpen(true);
    else setIsVJTicketModalOpen(true);
  };

  const airlineOptions = useMemo(
    () => Array.from(new Set(tickets.map((t) => t.airline).filter(Boolean))),
    [tickets]
  );
  const routeOptions = useMemo(
    () =>
      Array.from(
        new Set(tickets.flatMap((t) => t.segments.map((s) => `${s.departure_airport}-${s.arrival_airport}`)))
      ).sort(),
    [tickets]
  );
  const userOptions = useMemo(() => {
    const m = new Map<string, string>();
    tickets.forEach((t) => m.set(t.user_id, t.user_name));
    return Array.from(m.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [tickets]);

  const inDateRange = (iso: string, from: string, to: string) => {
    if (!iso) return true;
    const d = iso.slice(0, 10);
    if (from && d < from) return false;
    if (to && d > to) return false;
    return true;
  };

  const getStatusKey = (t: HeldTicket) => {
    const expired = isExpired(t.expire_date);
    const isVJExpired = t.airline === "VJ" && expired;
    if (t.ticket_status === "holding") return "holding";
    if (t.ticket_status === "issued" || t.ticket_status === "ticketed") return "issued";
    if (t.ticket_status === "paid") return "paid";
    if (t.ticket_status === "expired" || t.ticket_status === "cancelled" || isVJExpired) return "expired";
    return t.ticket_status || "other";
  };

  const filtered = tickets.filter((t) => {
    if (filterUser !== "ALL" && t.user_id !== filterUser) return false;
    if (filterAirline !== "ALL" && t.airline !== filterAirline) return false;
    if (filterStatus !== "ALL" && getStatusKey(t) !== filterStatus) return false;
    if (filterRoute !== "ALL") {
      const hit = t.segments.some((s) => `${s.departure_airport}-${s.arrival_airport}` === filterRoute);
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <Button variant="ghost" onClick={() => navigate("/admin")}>
            <ArrowLeft className="w-5 h-5 mr-2" /> Quay lại Admin
          </Button>
        </div>

        <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-6">Giỏ Hàng (Admin)</h1>

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
              <Label className="text-xs">Người dùng</Label>
              <Select value={filterUser} onValueChange={setFilterUser}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Tất cả</SelectItem>
                  {userOptions.map(([id, name]) => (
                    <SelectItem key={id} value={id}>{name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
                  setFilterUser("ALL");
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
              <CardTitle className="text-base font-medium">Tổng cộng {filtered.length} trường hợp</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">STT</TableHead>
                    <TableHead>Người dùng</TableHead>
                    <TableHead>PNR</TableHead>
                    <TableHead>Trạng Thái</TableHead>
                    <TableHead>Hành trình</TableHead>
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
                    const vnaTicket = ticket.airline === "VNA";
                    const isVJExpired = ticket.airline === "VJ" && expired;
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
                      <TableRow key={ticket.id} className={`${rowTone} ${isVJExpired ? "opacity-60" : ""}`}>
                        <TableCell>{idx + 1}</TableCell>
                        <TableCell className="text-xs font-medium">{ticket.user_name}</TableCell>
                        <TableCell>
                          <button
                            onClick={() => handleOpenTicketModal(ticket.pnr, ticket.airline)}
                            className="font-semibold underline decoration-dotted"
                          >
                            {ticket.pnr}
                          </button>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap items-center gap-1">
                            <Badge variant={isVJExpired ? "destructive" : "default"} className="whitespace-nowrap px-2 py-0.5">
                              {statusLabel}
                            </Badge>
                            {ticket.payment_status && <Badge className="bg-green-600 whitespace-nowrap">TT</Badge>}
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
                        <TableCell className="text-xs whitespace-nowrap">{formatDate(ticket.hold_date)}</TableCell>
                        <TableCell className="text-center">{ticket.number_person}</TableCell>
                        <TableCell className="text-xs">{ticket.namelist.join(", ") || "—"}</TableCell>
                        <TableCell className="text-right text-xs whitespace-nowrap font-medium">
                          {ticket.tongbillgiagoc && ticket.tongbillgiagoc > 0
                            ? ticket.tongbillgiagoc.toLocaleString("en-US")
                            : "—"}
                        </TableCell>
                        <TableCell className="text-xs whitespace-nowrap">
                          {ticket.expire_date ? formatDate(ticket.expire_date) : "—"}
                        </TableCell>
                        <TableCell><Badge variant="outline">{ticket.airline}</Badge></TableCell>
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
      </div>

      {isVJTicketModalOpen && (
        <VJTicketModal isOpen={isVJTicketModalOpen} onClose={() => setIsVJTicketModalOpen(false)} initialPNR={ticketPnr} />
      )}
      {isVNATicketModalOpen && (
        <VNATicketModal isOpen={isVNATicketModalOpen} onClose={() => setIsVNATicketModalOpen(false)} initialPNR={ticketPnr} />
      )}
      {isSunTicketModalOpen && (
        <SunPQTicketModal isOpen={isSunTicketModalOpen} onClose={() => setIsSunTicketModalOpen(false)} initialPNR={ticketPnr} />
      )}
    </div>
  );
}
