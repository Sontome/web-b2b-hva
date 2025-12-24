import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface HeldTicket {
  id: string;
  user_id: string;
  pnr: string;
  flight_details: any;
  hold_date: string;
  expire_date: string | null;
  status: string;
  user_name?: string;
  user_email?: string;
}

const PendingTickets = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [tickets, setTickets] = useState<HeldTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteTicketId, setDeleteTicketId] = useState<string | null>(null);

  useEffect(() => {
    if (profile?.role !== "admin") {
      navigate("/");
      return;
    }
    fetchHeldTickets();
  }, [profile, navigate]);

  const fetchHeldTickets = async () => {
    try {
      const { data: ticketsData, error: ticketsError } = await supabase
        .from("held_tickets")
        .select("*")
        .order("hold_date", { ascending: false });

      if (ticketsError) throw ticketsError;

      // Get user details for each ticket
      const userIds = [...new Set(ticketsData?.map((t) => t.user_id) || [])];
      const { data: usersData } = await supabase.auth.admin.listUsers();

      const { data: profilesData } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", userIds);

      const enrichedTickets = ticketsData?.map((ticket) => {
        const user = usersData?.users.find((u: any) => u.id === ticket.user_id);
        const profile = profilesData?.find((p: any) => p.id === ticket.user_id);
        return {
          ...ticket,
          user_email: user?.email,
          user_name: profile?.full_name || "N/A",
        };
      });

      setTickets(enrichedTickets || []);
    } catch (error) {
      console.error("Error fetching held tickets:", error);
      toast.error("Không thể tải danh sách vé giữ");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTicket = async () => {
    if (!deleteTicketId) return;

    try {
      const { error } = await supabase
        .from("held_tickets")
        .delete()
        .eq("id", deleteTicketId);

      if (error) throw error;

      toast.success("Đã xóa vé thành công");
      setTickets(tickets.filter((t) => t.id !== deleteTicketId));
      setDeleteTicketId(null);
    } catch (error) {
      console.error("Error deleting ticket:", error);
      toast.error("Không thể xóa vé");
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      holding: "default",
      expired: "destructive",
      completed: "secondary",
    };
    return <Badge variant={variants[status] || "default"}>{status}</Badge>;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p>Đang tải...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="outline" onClick={() => navigate("/admin")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Quay lại
          </Button>
          <h1 className="text-3xl font-bold">Quản lý vé chờ</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Danh sách vé đang giữ ({tickets.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {tickets.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                Không có vé nào đang được giữ
              </p>
            ) : (
              <div className="space-y-4">
                {tickets.map((ticket) => (
                  <Card key={ticket.id} className="border">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="space-y-2 flex-1">
                          <div className="flex items-center gap-3">
                            <h3 className="text-lg font-semibold">
                              PNR: {ticket.pnr}
                            </h3>
                            {getStatusBadge(ticket.status)}
                          </div>
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="text-muted-foreground">
                                User:
                              </span>{" "}
                              <span className="font-medium">
                                {ticket.user_name}
                              </span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">
                                Email:
                              </span>{" "}
                              <span className="font-medium">
                                {ticket.user_email}
                              </span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">
                                Ngày giữ:
                              </span>{" "}
                              {new Date(ticket.hold_date).toLocaleString(
                                "vi-VN"
                              )}
                            </div>
                            {ticket.expire_date && (
                              <div>
                                <span className="text-muted-foreground">
                                  Ngày hết hạn:
                                </span>{" "}
                                {new Date(ticket.expire_date).toLocaleString(
                                  "vi-VN"
                                )}
                              </div>
                            )}
                          </div>
                          {ticket.flight_details && (
                            <div className="mt-2 p-2 bg-muted rounded text-xs">
                              <pre className="whitespace-pre-wrap">
                                {JSON.stringify(ticket.flight_details, null, 2)}
                              </pre>
                            </div>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteTicketId(ticket.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <AlertDialog
        open={!!deleteTicketId}
        onOpenChange={() => setDeleteTicketId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận xóa</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc chắn muốn xóa vé này? Hành động này không thể hoàn tác.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteTicket}>
              Xóa
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default PendingTickets;
