import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Trash2, Plus, Edit2, RefreshCw, Copy, Filter } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface RepriceRecord {
  id: string;
  pnr: string;
  type: string;
  status: string;
  old_price: number | null;
  new_price: number | null;
  last_checked_at: string | null;
  auto_reprice: boolean;
  created_at: string;
  updated_at: string;
  email: string | null;
}

const HVA_EMAILS = [
  "HANVIETAIR.SERVICE@GMAIL.COM",
  "HANVIETAIR247@GMAIL.COM",
  "HANVIETAIR@GMAIL.COM",
];

const getEmailTag = (email: string | null): "HVA" | "F2" | null => {
  if (!email) return null;
  return HVA_EMAILS.includes(email.toUpperCase()) ? "HVA" : "F2";
};

const PendingTickets = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [records, setRecords] = useState<RepriceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteRecordId, setDeleteRecordId] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>("HOLD");
  const [emailTagFilters, setEmailTagFilters] = useState<{ HVA: boolean; F2: boolean }>({
    HVA: true,
    F2: true,
  });

  // Add/Edit modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<RepriceRecord | null>(null);
  const [formData, setFormData] = useState({
    pnr: "",
    type: "VFR",
    status: "HOLD",
    old_price: "",
    new_price: "",
    auto_reprice: true,
  });

  useEffect(() => {
    if (profile?.role !== "admin") {
      navigate("/");
      return;
    }
    fetchRepriceRecords();
  }, [profile, navigate]);

  const fetchRepriceRecords = async () => {
    try {
      const { data, error } = await supabase
        .from("reprice")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setRecords(data || []);
    } catch (error) {
      console.error("Error fetching reprice records:", error);
      toast.error("Không thể tải danh sách reprice");
    } finally {
      setLoading(false);
    }
  };

  // Filter records based on status and email tags
  const filteredRecords = records.filter((record) => {
    // Status filter
    if (statusFilter !== "ALL" && record.status !== statusFilter) {
      return false;
    }

    // Email tag filter
    const emailTag = getEmailTag(record.email);
    if (emailTag === "HVA" && !emailTagFilters.HVA) return false;
    if (emailTag === "F2" && !emailTagFilters.F2) return false;
    // If no email tag (null), show if either filter is enabled
    if (emailTag === null && !emailTagFilters.HVA && !emailTagFilters.F2) return false;

    return true;
  });

  const handleDeleteRecord = async () => {
    if (!deleteRecordId) return;

    try {
      const { error } = await supabase
        .from("reprice")
        .delete()
        .eq("id", deleteRecordId);

      if (error) throw error;

      toast.success("Đã xóa thành công");
      setRecords(records.filter((r) => r.id !== deleteRecordId));
      setDeleteRecordId(null);
    } catch (error) {
      console.error("Error deleting record:", error);
      toast.error("Không thể xóa");
    }
  };

  const handleOpenAddModal = () => {
    setEditingRecord(null);
    setFormData({
      pnr: "",
      type: "VFR",
      status: "HOLD",
      old_price: "",
      new_price: "",
      auto_reprice: true,
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (record: RepriceRecord) => {
    setEditingRecord(record);
    setFormData({
      pnr: record.pnr,
      type: record.type,
      status: record.status,
      old_price: record.old_price?.toString() || "",
      new_price: record.new_price?.toString() || "",
      auto_reprice: record.auto_reprice,
    });
    setIsModalOpen(true);
  };

  const parsePNRs = (input: string): string[] => {
    // Split by spaces and filter valid 6-character PNRs
    const parts = input.trim().toUpperCase().split(/\s+/);
    const validPNRs: string[] = [];

    for (const part of parts) {
      if (part.length === 6 && /^[A-Z0-9]+$/.test(part)) {
        validPNRs.push(part);
      }
    }

    return validPNRs;
  };

  const handleSaveRecord = async () => {
    if (!formData.pnr.trim()) {
      toast.error("Vui lòng nhập PNR");
      return;
    }

    try {
      if (editingRecord) {
        // Update existing record (single PNR)
        const recordData = {
          pnr: formData.pnr.trim().toUpperCase(),
          type: formData.type,
          status: formData.status,
          old_price: formData.old_price ? parseFloat(formData.old_price) : null,
          new_price: formData.new_price ? parseFloat(formData.new_price) : null,
          auto_reprice: formData.auto_reprice,
        };

        const { error } = await supabase
          .from("reprice")
          .update(recordData)
          .eq("id", editingRecord.id);

        if (error) throw error;
        toast.success("Đã cập nhật thành công");
      } else {
        // Parse multiple PNRs for new records
        const pnrs = parsePNRs(formData.pnr);

        if (pnrs.length === 0) {
          toast.error("Không tìm thấy PNR hợp lệ (PNR phải gồm 6 ký tự)");
          return;
        }

        const recordsToInsert = pnrs.map((pnr) => ({
          pnr,
          type: formData.type,
          status: "HOLD",
          auto_reprice: true,
        }));

        const { error } = await supabase.from("reprice").insert(recordsToInsert);

        if (error) throw error;

        if (pnrs.length === 1) {
          toast.success("Đã thêm thành công");
        } else {
          toast.success(`Đã thêm ${pnrs.length} PNR thành công`);
        }
      }

      setIsModalOpen(false);
      fetchRepriceRecords();
    } catch (error) {
      console.error("Error saving record:", error);
      toast.error("Không thể lưu");
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Đã sao chép");
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      HOLD: "default",
      PAID: "secondary",
      CANCEL: "destructive",
      OVERTIME: "outline",
    };
    const labels: Record<string, string> = {
      HOLD: "Đang giữ",
      PAID: "Đã thanh toán",
      CANCEL: "Đã hủy",
      OVERTIME: "Quá hạn",
    };
    return <Badge variant={variants[status] || "default"}>{labels[status] || status}</Badge>;
  };

  const getTypeBadge = (type: string) => {
    const colors: Record<string, string> = {
      VFR: "bg-blue-500",
      ADT: "bg-green-500",
      STU: "bg-purple-500",
    };
    return (
      <Badge className={`${colors[type] || "bg-muted"} text-white`}>
        {type}
      </Badge>
    );
  };

  const getEmailBadge = (email: string | null) => {
    if (!email) return null;

    const tag = getEmailTag(email);
    const bgColor = tag === "HVA" ? "bg-orange-500" : "bg-teal-500";

    return (
      <Popover>
        <PopoverTrigger asChild>
          <button type="button">
            <Badge className={`${bgColor} text-white cursor-pointer hover:opacity-80`}>
              {tag}
            </Badge>
          </button>
        </PopoverTrigger>
      
        <PopoverContent
          side="top"
          sideOffset={6}
          className="z-[9999] w-auto max-w-xs p-3"
        >
          <div className="space-y-2">
            <p className="text-sm font-medium break-all">{email}</p>
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => copyToClipboard(email)}
            >
              Copy
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    );
  };

  const formatPrice = (price: number | null) => {
    if (price === null) return "-";
    return new Intl.NumberFormat("vi-VN").format(price) + " KRW";
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleString("vi-VN");
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
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={() => navigate("/admin")}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Quay lại
            </Button>
            <h1 className="text-3xl font-bold">Quản lý Reprice PNR</h1>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={fetchRepriceRecords}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Làm mới
            </Button>
            <Button onClick={handleOpenAddModal}>
              <Plus className="w-4 h-4 mr-2" />
              Thêm mới
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Filter className="w-4 h-4" />
              Bộ lọc
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-6">
              {/* Status Filter */}
              <div className="space-y-2">
                <Label>Trạng thái</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Tất cả</SelectItem>
                    <SelectItem value="HOLD">Đang giữ</SelectItem>
                    <SelectItem value="PAID">Đã thanh toán</SelectItem>
                    <SelectItem value="CANCEL">Đã hủy</SelectItem>
                    <SelectItem value="OVERTIME">Quá hạn</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Email Tag Filter */}
              <div className="space-y-2">
                <Label>Email</Label>
                <div className="flex gap-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="filter-hva"
                      checked={emailTagFilters.HVA}
                      onCheckedChange={(checked) =>
                        setEmailTagFilters((prev) => ({ ...prev, HVA: !!checked }))
                      }
                    />
                    <label
                      htmlFor="filter-hva"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      <Badge className="bg-orange-500 text-white">HVA</Badge>
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="filter-f2"
                      checked={emailTagFilters.F2}
                      onCheckedChange={(checked) =>
                        setEmailTagFilters((prev) => ({ ...prev, F2: !!checked }))
                      }
                    />
                    <label
                      htmlFor="filter-f2"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      <Badge className="bg-teal-500 text-white">F2</Badge>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              Danh sách PNR Reprice ({filteredRecords.length}/{records.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {filteredRecords.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                Không có PNR nào phù hợp với bộ lọc
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-3 font-medium">PNR</th>
                      <th className="text-left p-3 font-medium">Loại</th>
                      <th className="text-left p-3 font-medium">Email</th>
                      <th className="text-left p-3 font-medium">Trạng thái</th>
                      <th className="text-right p-3 font-medium">Giá cũ</th>
                      <th className="text-right p-3 font-medium">Giá mới</th>
                      <th className="text-center p-3 font-medium">Auto Reprice</th>
                      <th className="text-left p-3 font-medium">Check lần cuối</th>
                      <th className="text-left p-3 font-medium">Ngày tạo</th>
                      <th className="text-center p-3 font-medium">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRecords.map((record) => (
                      <tr key={record.id} className="border-b hover:bg-muted/50">
                        <td className="p-3 font-mono font-semibold">{record.pnr}</td>
                        <td className="p-3">{getTypeBadge(record.type)}</td>
                        <td className="p-3">{getEmailBadge(record.email)}</td>
                        <td className="p-3">{getStatusBadge(record.status)}</td>
                        <td className="p-3 text-right">{formatPrice(record.old_price)}</td>
                        <td className="p-3 text-right">
                          {record.new_price !== null && record.old_price !== null && record.new_price < record.old_price ? (
                            <span className="text-green-600 font-semibold">
                              {formatPrice(record.new_price)}
                            </span>
                          ) : record.new_price !== null && record.old_price !== null && record.new_price > record.old_price ? (
                            <span className="text-destructive font-semibold">
                              {formatPrice(record.new_price)}
                            </span>
                          ) : (
                            formatPrice(record.new_price)
                          )}
                        </td>
                        <td className="p-3 text-center">
                          <Badge variant={record.auto_reprice ? "default" : "outline"}>
                            {record.auto_reprice ? "Bật" : "Tắt"}
                          </Badge>
                        </td>
                        <td className="p-3 text-sm text-muted-foreground">
                          {formatDate(record.last_checked_at)}
                        </td>
                        <td className="p-3 text-sm text-muted-foreground">
                          {formatDate(record.created_at)}
                        </td>
                        <td className="p-3">
                          <div className="flex items-center justify-center gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleOpenEditModal(record)}
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setDeleteRecordId(record.id)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Add/Edit Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingRecord ? "Chỉnh sửa PNR" : "Thêm PNR mới"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="pnr">
                PNR {!editingRecord && "(có thể nhập nhiều PNR cách nhau bởi dấu cách)"}
              </Label>
              <Input
                id="pnr"
                value={formData.pnr}
                onChange={(e) => setFormData({ ...formData, pnr: e.target.value })}
                placeholder={editingRecord ? "Nhập mã PNR" : "Nhập mã PNR (VD: ABC123 DEF456 GHI789)"}
                className="uppercase"
              />
              {!editingRecord && formData.pnr && (
                <p className="text-xs text-muted-foreground">
                  Tìm thấy: {parsePNRs(formData.pnr).length} PNR hợp lệ
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="type">Loại</Label>
              <Select
                value={formData.type}
                onValueChange={(value) => setFormData({ ...formData, type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="VFR">VFR</SelectItem>
                  <SelectItem value="ADT">ADT</SelectItem>
                  <SelectItem value="STU">STU</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {editingRecord && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="status">Trạng thái</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) => setFormData({ ...formData, status: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="HOLD">Đang giữ</SelectItem>
                      <SelectItem value="PAID">Đã thanh toán</SelectItem>
                      <SelectItem value="CANCEL">Đã hủy</SelectItem>
                      <SelectItem value="OVERTIME">Quá hạn</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="old_price">Giá cũ</Label>
                    <Input
                      id="old_price"
                      type="number"
                      value={formData.old_price}
                      onChange={(e) => setFormData({ ...formData, old_price: e.target.value })}
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="new_price">Giá mới</Label>
                    <Input
                      id="new_price"
                      type="number"
                      value={formData.new_price}
                      onChange={(e) => setFormData({ ...formData, new_price: e.target.value })}
                      placeholder="0"
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="auto_reprice">Auto Reprice</Label>
                  <Switch
                    id="auto_reprice"
                    checked={formData.auto_reprice}
                    onCheckedChange={(checked) => setFormData({ ...formData, auto_reprice: checked })}
                  />
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>
              Hủy
            </Button>
            <Button onClick={handleSaveRecord}>
              {editingRecord ? "Lưu" : "Thêm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!deleteRecordId}
        onOpenChange={() => setDeleteRecordId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận xóa</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc chắn muốn xóa PNR này? Hành động này không thể hoàn tác.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteRecord}>
              Xóa
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default PendingTickets;
