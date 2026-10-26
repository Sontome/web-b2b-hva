import { useEffect, useRef, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Plus, RefreshCw, Tag, Pencil, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { PromoEditor } from '@/components/promocodes/PromoEditor';
import { useAuth } from '@/hooks/useAuth';
import { PROMO_AIRLINES, PROMO_STATUSES, PROMO_NOTICE, airlineName, canManagePromos, formatPromoTime, promoStatus, promoError, type PromoStatus } from '@/lib/promocodes';
import { fetchPromos, savePromo, togglePromo, deletePromo, PROMO_PAGE_SIZE, type PromoRow, type PromoWrite } from '@/services/promocodes';
import { toast } from 'sonner';

export default function Promocodes() {
  const { user, profile, loading } = useAuth();
  const admin = !!user && canManagePromos(profile?.role);
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [filters, setFilters] = useState({ airline: 'all', status: 'all' as PromoStatus, search: '', page: 1 });
  const [search, setSearch] = useState('');
  const [editor, setEditor] = useState<{ row: PromoRow | null } | null>(null);
  const [target, setTarget] = useState<PromoRow | null>(null);
  const [deleteError, setDeleteError] = useState('');
  const rowLocks = useRef(new Set<string>());
  const deleteLock = useRef(false);
  const [pendingRows, setPendingRows] = useState(new Set<string>());
  useEffect(() => {
    const timer = setTimeout(() => setFilters(f => f.search === search ? f : { ...f, search, page: 1 }), 400);
    return () => clearTimeout(timer);
  }, [search]);
  const query = useQuery({
    queryKey: ['promocodes', user?.id, filters], enabled: admin, staleTime: 60_000,
    refetchOnWindowFocus: false, refetchOnReconnect: false, retry: false,
    placeholderData: keepPreviousData, queryFn: ({ signal }) => fetchPromos(filters, signal),
  });
  const total = query.data?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / PROMO_PAGE_SIZE));
  useEffect(() => {
    if (query.data && !query.isPlaceholderData && filters.page > pages) setFilters(f => ({ ...f, page: pages }));
  }, [pages, filters.page, query.data, query.isPlaceholderData]);
  const changed = () => {
    toast.success(PROMO_NOTICE);
    void qc.invalidateQueries({ queryKey: ['promocodes', user?.id] });
  };
  const save = useMutation({ mutationFn: ({ id, payload }: { id: string | null; payload: PromoWrite }) => savePromo(id, payload), onSuccess: changed });
  const toggle = useMutation({ mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) => togglePromo(id, enabled), onSuccess: changed });
  const remove = useMutation({ mutationFn: (id: string) => deletePromo(id), onSuccess: changed });
  const onToggle = async (row: PromoRow, enabled: boolean) => {
    if (!admin || rowLocks.current.has(row.id)) return;
    rowLocks.current.add(row.id); setPendingRows(new Set(rowLocks.current));
    try { await toggle.mutateAsync({ id: row.id, enabled }); }
    catch (e) { toast.error(promoError(e)); }
    finally { rowLocks.current.delete(row.id); setPendingRows(new Set(rowLocks.current)); }
  };
  const onDelete = async () => {
    if (!admin || !target || deleteLock.current || rowLocks.current.has(target.id)) return;
    deleteLock.current = true; setDeleteError('');
    rowLocks.current.add(target.id); setPendingRows(new Set(rowLocks.current));
    const id = target.id;
    try { await remove.mutateAsync(id); setTarget(null); }
    catch (e) { setDeleteError(promoError(e)); }
    finally { deleteLock.current = false; rowLocks.current.delete(id); setPendingRows(new Set(rowLocks.current)); }
  };
  if (loading || (user && !profile)) return <div className="p-8"><Skeleton className="h-12 w-full" /></div>;
  if (!admin) return <Navigate to="/" replace />;
  const rows = query.data?.rows ?? [];
  const statusBadge = (row: PromoRow) => {
    const status = promoStatus(row, query.data?.now ?? Date.now());
    return <Badge variant="outline" className={`promo-status-${status}`}>{PROMO_STATUSES[status]}</Badge>;
  };
  const actions = (row: PromoRow) => <div className="flex gap-1">
    <Tooltip><TooltipTrigger asChild><Button variant="outline" size="icon" aria-label={`Sửa ${row.code}`} disabled={pendingRows.has(row.id) || query.isPlaceholderData} onClick={() => setEditor({ row })}><Pencil className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent>Sửa mã</TooltipContent></Tooltip>
    <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" aria-label={`Xóa ${row.code}`} className="text-destructive hover:text-destructive" disabled={pendingRows.has(row.id) || query.isPlaceholderData} onClick={() => { setDeleteError(''); setTarget(row); }}><Trash2 className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent>Xóa mã</TooltipContent></Tooltip>
  </div>;
  const rowSwitch = (row: PromoRow) => <Switch aria-label={`Bật sử dụng ${row.code}`} checked={row.enabled} disabled={pendingRows.has(row.id) || query.isPlaceholderData} onCheckedChange={v => void onToggle(row, v)} />;
  const activeFilter = filters.airline !== 'all' || filters.status !== 'all' || !!filters.search;
  return <div className="min-h-screen bg-background p-4 md:p-8">
    <main className="max-w-7xl mx-auto space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div><Button variant="outline" size="sm" className="mb-3" onClick={() => navigate('/admin')}><ArrowLeft className="w-4 h-4 mr-2" />Quay lại Admin Dashboard</Button><h1 className="text-2xl font-bold flex items-center gap-2"><Tag className="w-6 h-6" />Quản lý Promocode</h1><p className="text-sm text-muted-foreground mt-1">Cấu hình mã khuyến mãi sử dụng khi tìm vé</p></div>
        <div className="flex flex-wrap gap-2"><Button variant="outline" disabled={query.isFetching} onClick={() => void query.refetch()}><RefreshCw className={`w-4 h-4 mr-2 ${query.isFetching ? 'animate-spin' : ''}`} />Làm mới danh sách</Button><Button onClick={() => setEditor({ row: null })}><Plus className="w-4 h-4 mr-2" />Thêm mã</Button></div>
      </header>
      <p className="text-sm text-muted-foreground border-l-2 border-primary pl-3">Thay đổi được lưu ngay. Hệ thống tìm vé cập nhật cấu hình trong tối đa khoảng 30 phút khi hoạt động bình thường.</p>
      <section aria-label="Bộ lọc" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1.5fr_auto] items-end">
        <div className="space-y-1"><Label htmlFor="filter-airline">Hãng</Label><Select value={filters.airline} onValueChange={airline => setFilters(f => ({ ...f, airline, page: 1 }))}><SelectTrigger id="filter-airline"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Tất cả hãng</SelectItem>{Object.entries(PROMO_AIRLINES).map(([code, label]) => <SelectItem key={code} value={code}>{label}</SelectItem>)}</SelectContent></Select></div>
        <div className="space-y-1"><Label htmlFor="filter-status">Trạng thái</Label><Select value={filters.status} onValueChange={status => setFilters(f => ({ ...f, status: status as PromoStatus, page: 1 }))}><SelectTrigger id="filter-status"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Tất cả trạng thái</SelectItem>{Object.entries(PROMO_STATUSES).map(([code, label]) => <SelectItem key={code} value={code}>{label}</SelectItem>)}</SelectContent></Select></div>
        <div className="space-y-1"><Label htmlFor="filter-code">Tìm theo mã</Label><Input id="filter-code" value={search} onChange={e => setSearch(e.target.value)} placeholder="Mã khuyến mãi" /></div>
        <Button variant="outline" onClick={() => { setSearch(''); setFilters({ airline: 'all', status: 'all', search: '', page: 1 }); }}><X className="w-4 h-4 mr-2" />Xóa bộ lọc</Button>
      </section>
      <section aria-label="Danh sách mã" aria-busy={query.isFetching} className="space-y-3">
        {query.isError ? <div role="alert" className="py-10 text-center space-y-3"><p className="text-destructive">Không tải được danh sách: {promoError(query.error)}</p><Button variant="outline" onClick={() => void query.refetch()}>Thử lại</Button></div> : query.isPending ? <div className="space-y-3">{Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="w-full h-14" />)}</div> : rows.length === 0 ? <div className="py-12 text-center text-muted-foreground">{activeFilter ? 'Không có mã phù hợp với bộ lọc.' : 'Chưa có mã khuyến mãi.'}</div> : <>
          <div className="hidden lg:block border rounded-lg overflow-x-auto"><Table><TableHeader><TableRow>{['Hãng', 'Mã khuyến mãi', 'Bật/tắt', 'Trạng thái', 'Bắt đầu', 'Kết thúc', 'Ghi chú', 'Cập nhật lần cuối', 'Thao tác'].map(label => <TableHead key={label}>{label}</TableHead>)}</TableRow></TableHeader><TableBody>{rows.map(row => <TableRow key={row.id}><TableCell>{airlineName(row.airline)}</TableCell><TableCell className="font-mono font-semibold break-all max-w-48">{row.code}</TableCell><TableCell>{rowSwitch(row)}</TableCell><TableCell>{statusBadge(row)}</TableCell><TableCell className="text-xs">{formatPromoTime(row.valid_from)}</TableCell><TableCell className="text-xs">{formatPromoTime(row.valid_until)}</TableCell><TableCell className="max-w-48 break-words whitespace-pre-wrap text-xs">{row.note || '—'}</TableCell><TableCell className="text-xs">{formatPromoTime(row.updated_at)}</TableCell><TableCell>{actions(row)}</TableCell></TableRow>)}</TableBody></Table></div>
          <div className="grid gap-3 sm:grid-cols-2 lg:hidden">{rows.map(row => <Card key={row.id}><CardContent className="p-4 space-y-3"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="text-xs text-muted-foreground">{airlineName(row.airline)}</p><p className="font-mono font-bold break-all">{row.code}</p></div>{rowSwitch(row)}</div>{statusBadge(row)}<dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-2 text-xs"><dt>Bắt đầu</dt><dd>{formatPromoTime(row.valid_from)}</dd><dt>Kết thúc</dt><dd>{formatPromoTime(row.valid_until)}</dd><dt>Cập nhật</dt><dd>{formatPromoTime(row.updated_at)}</dd><dt>Ghi chú</dt><dd className="break-words whitespace-pre-wrap min-w-0">{row.note || '—'}</dd></dl>{actions(row)}</CardContent></Card>)}</div>
        </>}
        {!query.isError && !query.isPending && <div className="flex flex-wrap items-center justify-between gap-3 text-sm"><p>{total} kết quả · Trang {filters.page}/{pages}</p><div className="flex gap-2"><Button variant="outline" disabled={filters.page <= 1 || query.isFetching} onClick={() => setFilters(f => ({ ...f, page: f.page - 1 }))}>Trước</Button><Button variant="outline" disabled={filters.page >= pages || query.isFetching} onClick={() => setFilters(f => ({ ...f, page: f.page + 1 }))}>Sau</Button></div></div>}
      </section>
    </main>
    {editor && <PromoEditor row={editor.row} onClose={() => setEditor(null)} onSave={payload => { if (!admin) return Promise.reject(new Error('Bạn không có quyền quản lý Promocode.')); return save.mutateAsync({ id: editor.row?.id ?? null, payload }); }} />}
    <Dialog open={!!target} onOpenChange={open => { if (!open && !deleteLock.current) setTarget(null); }}><DialogContent><DialogHeader><DialogTitle>Xóa mã khuyến mãi?</DialogTitle><DialogDescription>Xóa mã <strong className="break-all">{target?.code}</strong> của {target ? airlineName(target.airline) : ''}? Có thể tắt mã nếu muốn giữ lại cấu hình.</DialogDescription></DialogHeader>{deleteError && <p role="alert" className="text-sm text-destructive">{deleteError}</p>}<DialogFooter><Button variant="outline" disabled={remove.isPending} onClick={() => setTarget(null)}>Hủy</Button><Button variant="destructive" disabled={remove.isPending} onClick={() => void onDelete()}>{remove.isPending ? 'Đang xóa…' : 'Xóa mã'}</Button></DialogFooter></DialogContent></Dialog>
  </div>;
}
