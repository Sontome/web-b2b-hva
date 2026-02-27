import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Search, Pencil, Trash2, RefreshCw, MessageSquare } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';

interface KakaNotiRecord {
  id: string;
  phone: string | null;
  name: string;
  pnr: string;
  timecreat: string;
  isSent: boolean;
}

const ITEMS_PER_PAGE = 15;

export default function KakaoNoti() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [records, setRecords] = useState<KakaNotiRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchPhone, setSearchPhone] = useState('');
  const [searchPNR, setSearchPNR] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'sent' | 'not_sent'>('all');
  const [currentPage, setCurrentPage] = useState(1);

  // Modal states
  const [showAddEdit, setShowAddEdit] = useState(false);
  const [editingRecord, setEditingRecord] = useState<KakaNotiRecord | null>(null);
  const [formData, setFormData] = useState({ name: '', pnr: '', phone: '' });
  const [deleteRecord, setDeleteRecord] = useState<KakaNotiRecord | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      const [kakanoRes, sentRes] = await Promise.all([
        supabase.from('kakanoti').select('*').order('timecreat', { ascending: false }),
        supabase.from('sent_phone').select('phone')
      ]);

      if (kakanoRes.error) throw kakanoRes.error;
      if (sentRes.error) throw sentRes.error;

      const sentPhones = new Set((sentRes.data || []).map((s: any) => s.phone));

      const mapped: KakaNotiRecord[] = (kakanoRes.data || []).map((r: any) => ({
        id: r.id,
        phone: r.phone,
        name: r.name,
        pnr: r.pnr,
        timecreat: r.timecreat,
        isSent: r.phone ? sentPhones.has(r.phone) : false,
      }));

      setRecords(mapped);
    } catch (err: any) {
      toast({ title: 'Lỗi', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  // Filtered + searched records
  const filteredRecords = records.filter(r => {
    if (filterStatus === 'sent' && !r.isSent) return false;
    if (filterStatus === 'not_sent' && r.isSent) return false;
    if (searchPhone && !(r.phone || '').includes(searchPhone)) return false;
    if (searchPNR && !r.pnr.toUpperCase().includes(searchPNR.toUpperCase())) return false;
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / ITEMS_PER_PAGE));
  const paginatedRecords = filteredRecords.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [searchPhone, searchPNR, filterStatus]);

  const normalizePhone = (phone: string): string => {
    let p = phone.trim();
    if (p && !p.startsWith('0')) p = '0' + p;
    return p;
  };

  const handleOpenAdd = () => {
    setEditingRecord(null);
    setFormData({ name: '', pnr: '', phone: '' });
    setShowAddEdit(true);
  };

  const handleOpenEdit = (record: KakaNotiRecord) => {
    setEditingRecord(record);
    setFormData({ name: record.name, pnr: record.pnr, phone: record.phone || '' });
    setShowAddEdit(true);
  };

  const handleSave = async () => {
    const pnr = formData.pnr.trim().toUpperCase();
    if (!/^[A-Za-z0-9]{6}$/.test(pnr)) {
      toast({ title: 'Lỗi', description: 'PNR phải đúng 6 ký tự chữ và số', variant: 'destructive' });
      return;
    }
    if (!formData.name.trim()) {
      toast({ title: 'Lỗi', description: 'Tên không được để trống', variant: 'destructive' });
      return;
    }

    const phone = formData.phone.trim() ? normalizePhone(formData.phone) : null;

    setSaving(true);
    try {
      if (editingRecord) {
        const { error } = await supabase.from('kakanoti').update({
          name: formData.name.trim(),
          pnr,
          phone,
        }).eq('id', editingRecord.id);
        if (error) throw error;
        toast({ title: 'Đã cập nhật thành công' });
      } else {
        const { error } = await supabase.from('kakanoti').insert({
          name: formData.name.trim(),
          pnr,
          phone,
        });
        if (error) throw error;
        toast({ title: 'Đã thêm thành công' });
      }
      setShowAddEdit(false);
      fetchRecords();
    } catch (err: any) {
      toast({ title: 'Lỗi', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteRecord) return;
    try {
      const { error } = await supabase.from('kakanoti').delete().eq('id', deleteRecord.id);
      if (error) throw error;
      toast({ title: 'Đã xóa thành công' });
      setDeleteRecord(null);
      fetchRecords();
    } catch (err: any) {
      toast({ title: 'Lỗi', description: err.message, variant: 'destructive' });
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('vi-VN', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="icon" onClick={() => navigate('/admin')}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                <MessageSquare className="w-6 h-6" />
                Quản lý Kakao Noti
              </h1>
              <p className="text-sm text-muted-foreground">Tổng: {filteredRecords.length} bản ghi</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={fetchRecords} disabled={loading}>
              <RefreshCw className={`w-4 h-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button onClick={handleOpenAdd}>
              <Plus className="w-4 h-4 mr-1" />
              Thêm
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card className="mb-4">
          <CardContent className="pt-4">
            <div className="flex flex-wrap gap-3 items-end">
              <div className="flex-1 min-w-[150px]">
                <Label className="text-xs mb-1 block">Tìm theo Phone</Label>
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Số điện thoại..."
                    value={searchPhone}
                    onChange={e => setSearchPhone(e.target.value)}
                    className="pl-8"
                  />
                </div>
              </div>
              <div className="flex-1 min-w-[150px]">
                <Label className="text-xs mb-1 block">Tìm theo PNR</Label>
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Mã PNR..."
                    value={searchPNR}
                    onChange={e => setSearchPNR(e.target.value)}
                    className="pl-8"
                  />
                </div>
              </div>
              <div className="min-w-[150px]">
                <Label className="text-xs mb-1 block">Trạng thái gửi</Label>
                <Select value={filterStatus} onValueChange={(v: any) => setFilterStatus(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tất cả</SelectItem>
                    <SelectItem value="sent">Đã gửi</SelectItem>
                    <SelectItem value="not_sent">Chưa gửi</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">#</TableHead>
                    <TableHead>Tên</TableHead>
                    <TableHead>PNR</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Trạng thái</TableHead>
                    <TableHead>Ngày tạo</TableHead>
                    <TableHead className="text-right">Thao tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        Đang tải...
                      </TableCell>
                    </TableRow>
                  ) : paginatedRecords.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        Không có dữ liệu
                      </TableCell>
                    </TableRow>
                  ) : paginatedRecords.map((r, idx) => (
                    <TableRow key={r.id}>
                      <TableCell className="text-muted-foreground text-xs">
                        {(currentPage - 1) * ITEMS_PER_PAGE + idx + 1}
                      </TableCell>
                      <TableCell className="font-medium">{r.name}</TableCell>
                      <TableCell className="font-mono text-sm">{r.pnr}</TableCell>
                      <TableCell>{r.phone || '—'}</TableCell>
                      <TableCell>
                        {r.isSent ? (
                          <Badge className="bg-green-500 hover:bg-green-600 text-white">Đã gửi</Badge>
                        ) : (
                          <Badge variant="destructive">Chưa gửi</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{formatDate(r.timecreat)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(r)}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => setDeleteRecord(r)} className="text-destructive hover:text-destructive">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-4">
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                  />
                </PaginationItem>
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 2)
                  .map((p, idx, arr) => (
                    <PaginationItem key={p}>
                      {idx > 0 && arr[idx - 1] !== p - 1 && (
                        <span className="px-2 text-muted-foreground">...</span>
                      )}
                      <PaginationLink
                        isActive={p === currentPage}
                        onClick={() => setCurrentPage(p)}
                        className="cursor-pointer"
                      >
                        {p}
                      </PaginationLink>
                    </PaginationItem>
                  ))}
                <PaginationItem>
                  <PaginationNext
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        )}

        {/* Add/Edit Modal */}
        <Dialog open={showAddEdit} onOpenChange={setShowAddEdit}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingRecord ? 'Sửa bản ghi' : 'Thêm bản ghi mới'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Tên khách *</Label>
                <Input
                  value={formData.name}
                  onChange={e => setFormData(f => ({ ...f, name: e.target.value }))}
                  placeholder="Nguyễn Văn A"
                />
              </div>
              <div>
                <Label>PNR * (6 ký tự)</Label>
                <Input
                  value={formData.pnr}
                  onChange={e => setFormData(f => ({ ...f, pnr: e.target.value.toUpperCase().slice(0, 6) }))}
                  placeholder="ABC123"
                  maxLength={6}
                  className="font-mono"
                />
              </div>
              <div>
                <Label>Số điện thoại</Label>
                <Input
                  value={formData.phone}
                  onChange={e => setFormData(f => ({ ...f, phone: e.target.value }))}
                  placeholder="01012345678"
                />
                <p className="text-xs text-muted-foreground mt-1">Tự động thêm số 0 nếu thiếu</p>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowAddEdit(false)}>Hủy</Button>
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? 'Đang lưu...' : editingRecord ? 'Cập nhật' : 'Thêm'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <AlertDialog open={!!deleteRecord} onOpenChange={open => !open && setDeleteRecord(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Xác nhận xóa</AlertDialogTitle>
              <AlertDialogDescription>
                Bạn có chắc muốn xóa bản ghi PNR <strong>{deleteRecord?.pnr}</strong> - {deleteRecord?.name}?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Hủy</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Xóa
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
