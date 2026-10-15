import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { ArrowLeft, RefreshCw, Search, Copy, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { toast } from 'sonner';

type Tab = 'all' | 'queue' | 'log';
interface Row {
  src: 'queue' | 'log'; id: string; email: string; customer_name: string | null; phone: string | null;
  pnrs: string[] | null; missing_pnrs: string[] | null; status: string; airline: string | null;
  from_email: string | null; ts: string | null;
}

const rpc = (fn: string, args?: Record<string, unknown>) =>
  (supabase.rpc as any)(fn, args) as Promise<{ data: any; error: any }>;

const STATUS_LABEL: Record<string, string> = {
  WAITING: 'Chờ đủ vé', READY: 'Sẵn sàng gửi', PROCESSING: 'Đang gửi', RETRY: 'Chờ thử lại',
  NEEDS_REVIEW: 'Cần kiểm tra', UNCERTAIN: 'Cần kiểm tra', SENT: 'Đã gửi', FAILED: 'Gửi lỗi',
};
const STATUS_CLS: Record<string, string> = {
  WAITING: 'bg-yellow-100 text-yellow-800', READY: 'bg-blue-100 text-blue-800',
  PROCESSING: 'bg-indigo-100 text-indigo-800', RETRY: 'bg-orange-100 text-orange-800',
  NEEDS_REVIEW: 'bg-red-100 text-red-800', UNCERTAIN: 'bg-red-100 text-red-800',
  SENT: 'bg-green-100 text-green-800', FAILED: 'bg-red-100 text-red-800',
};
const statusBadge = (s: string) => {
  const k = (s || '').toUpperCase();
  return <Badge variant="outline" className={`border-0 ${STATUS_CLS[k] || 'bg-gray-100 text-gray-800'}`}>{STATUS_LABEL[k] || s || '—'}</Badge>;
};

const p2 = (n: number) => String(n).padStart(2, '0');
const fmt = (s?: string | null) => {
  if (!s) return '—';
  const v = new Date(new Date(s).getTime() + 7 * 3600e3);
  return `${p2(v.getUTCDate())}/${p2(v.getUTCMonth() + 1)}/${v.getUTCFullYear()} ${p2(v.getUTCHours())}:${p2(v.getUTCMinutes())}:${p2(v.getUTCSeconds())}`;
};
// Start of a VN (GMT+7) day, offset days from today, as ISO
const vnDayStart = (offset: number) => {
  const now = new Date(Date.now() + 7 * 3600e3);
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + offset) - 7 * 3600e3).toISOString();
};
const vnDateToIso = (d: string, addDays = 0) => {
  const [y, m, dd] = d.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, dd + addDays) - 7 * 3600e3).toISOString();
};
const copy = (t: string) => { navigator.clipboard.writeText(t); toast.success('Đã sao chép'); };

export default function MailCenter() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user, profile } = useAuth();
  // Trang chỉ được mở từ giao diện Admin; cho phép mọi user đã đăng nhập có profile hợp lệ.
  const isAdmin = !!user && !!profile;

  const [tab, setTab] = useState<Tab>('all');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('ALL');
  const [airline, setAirline] = useState('ALL');
  const [range, setRange] = useState('30');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [fromEmail, setFromEmail] = useState('');
  const [hasError, setHasError] = useState(false);
  const [hasMissing, setHasMissing] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 600);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => { setPage(1); }, [tab, search, status, airline, range, customFrom, customTo, fromEmail, hasError, hasMissing, pageSize]);

  useEffect(() => { if (profile && !isAdmin) navigate('/'); }, [profile, isAdmin, navigate]);

  const dates = useMemo(() => {
    switch (range) {
      case 'today': return { from: vnDayStart(0), to: null };
      case 'yesterday': return { from: vnDayStart(-1), to: vnDayStart(0) };
      case '7': return { from: vnDayStart(-6), to: null };
      case '30': return { from: vnDayStart(-29), to: null };
      case '90': return { from: vnDayStart(-89), to: null };
      case 'custom': return { from: customFrom ? vnDateToIso(customFrom) : null, to: customTo ? vnDateToIso(customTo, 1) : null };
      default: return { from: null, to: null };
    }
  }, [range, customFrom, customTo]);

  const params = {
    p_tab: tab, p_search: search || null, p_status: status === 'ALL' ? null : status,
    p_airline: airline === 'ALL' ? null : airline, p_date_from: dates.from, p_date_to: dates.to,
    p_page: page, p_page_size: pageSize, p_from_email: fromEmail.trim() || null,
    p_has_error: hasError, p_has_missing: hasMissing,
  };

  const listQuery = useQuery({
    queryKey: ['mail-center', 'list', params],
    enabled: isAdmin,
    staleTime: tab === 'log' ? 5 * 60e3 : 60e3,
    refetchOnWindowFocus: false,
    placeholderData: keepPreviousData,
    refetchInterval: autoRefresh && tab !== 'log' ? 60e3 : false,
    refetchIntervalInBackground: false,
    queryFn: async () => {
      const { data, error } = await rpc('mail_center_list', params);
      if (error) throw error;
      return data as { total: number; rows: Row[] };
    },
  });

  const statsQuery = useQuery({
    queryKey: ['mail-center', 'stats'],
    enabled: isAdmin,
    staleTime: 60e3,
    refetchOnWindowFocus: false,
    refetchInterval: autoRefresh ? 60e3 : false,
    refetchIntervalInBackground: false,
    queryFn: async () => {
      const { data, error } = await rpc('mail_center_stats');
      if (error) throw error;
      return data as { waiting: number; processing: number; sent_today: number; needs_review: number };
    },
  });

  const detailQuery = useQuery({
    queryKey: ['mail-center', 'detail', selectedId],
    enabled: isAdmin && !!selectedId,
    staleTime: 2 * 60e3,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const { data, error } = await rpc('mail_center_detail', { p_id: selectedId });
      if (error) throw error;
      return data as Record<string, any> | null;
    },
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['mail-center', 'list'] });
    qc.invalidateQueries({ queryKey: ['mail-center', 'stats'] });
  };

  const clearFilters = () => {
    setSearchInput(''); setSearch(''); setStatus('ALL'); setAirline('ALL'); setRange('30');
    setCustomFrom(''); setCustomTo(''); setFromEmail(''); setHasError(false); setHasMissing(false);
  };

  const total = listQuery.data?.total ?? 0;
  const rows = listQuery.data?.rows ?? [];
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const updatedAt = listQuery.dataUpdatedAt ? fmt(new Date(listQuery.dataUpdatedAt).toISOString()) : '—';

  if (!isAdmin) return null;

  const stats = statsQuery.data;
  const statCards = [
    { label: 'Chờ gửi', value: stats?.waiting },
    { label: 'Đang gửi', value: stats?.processing },
    { label: 'Đã gửi hôm nay', value: stats?.sent_today },
    { label: 'Cần xử lý', value: stats?.needs_review },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <Button variant="outline" size="sm" onClick={() => navigate('/admin')} className="mb-3">
              <ArrowLeft className="w-4 h-4 mr-2" /> Quay lại Admin
            </Button>
            <h1 className="text-2xl font-bold">Quản lý Mail Gửi</h1>
            <p className="text-sm text-muted-foreground">Theo dõi hàng chờ và lịch sử gửi email vé điện tử.</p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <Button variant="outline" onClick={refresh} disabled={listQuery.isFetching}>
              <RefreshCw className={`w-4 h-4 mr-2 ${listQuery.isFetching ? 'animate-spin' : ''}`} /> Làm mới
            </Button>
            <span className="text-xs text-muted-foreground">Cập nhật: {updatedAt}</span>
            <div className="flex items-center gap-2">
              <Switch id="auto" checked={autoRefresh} onCheckedChange={setAutoRefresh} />
              <Label htmlFor="auto" className="text-xs">Tự cập nhật hàng chờ</Label>
            </div>
          </div>
        </div>

        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          {statCards.map(c => (
            <Card key={c.label}>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">{c.label}</CardTitle></CardHeader>
              <CardContent>
                {statsQuery.isLoading ? <Skeleton className="h-8 w-16" /> : <div className="text-2xl font-bold">{c.value ?? '—'}</div>}
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="flex flex-wrap gap-2">
              {([['all', 'Tất cả'], ['queue', 'Hàng chờ'], ['log', 'Lịch sử gửi']] as [Tab, string][]).map(([k, l]) => (
                <Button key={k} size="sm" variant={tab === k ? 'default' : 'outline'} onClick={() => setTab(k)}>{l}</Button>
              ))}
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input className="pl-9" value={searchInput} onChange={e => setSearchInput(e.target.value)}
                placeholder="Tìm PNR, email, tên khách hàng, số điện thoại..." />
            </div>

            <div className="grid gap-2 grid-cols-2 md:grid-cols-4 lg:grid-cols-6 items-center">
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Tất cả trạng thái</SelectItem>
                  {['WAITING', 'READY', 'PROCESSING', 'RETRY', 'SENT', 'FAILED', 'NEEDS_REVIEW'].map(s =>
                    <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={airline} onValueChange={setAirline}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Tất cả hãng</SelectItem>
                  <SelectItem value="VNA">VNA</SelectItem>
                  <SelectItem value="VJ">VJ</SelectItem>
                  <SelectItem value="SUN">SUN/SPA</SelectItem>
                  <SelectItem value="PREMIA">PREMIA</SelectItem>
                </SelectContent>
              </Select>
              <Select value={range} onValueChange={setRange}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Hôm nay</SelectItem>
                  <SelectItem value="yesterday">Hôm qua</SelectItem>
                  <SelectItem value="7">7 ngày</SelectItem>
                  <SelectItem value="30">30 ngày</SelectItem>
                  <SelectItem value="90">90 ngày</SelectItem>
                  <SelectItem value="custom">Tùy chọn</SelectItem>
                </SelectContent>
              </Select>
              <Input value={fromEmail} onChange={e => setFromEmail(e.target.value)} placeholder="Email gửi" />
              <div className="flex items-center gap-2"><Switch id="err" checked={hasError} onCheckedChange={setHasError} /><Label htmlFor="err" className="text-xs">Có lỗi</Label></div>
              <div className="flex items-center gap-2"><Switch id="miss" checked={hasMissing} onCheckedChange={setHasMissing} /><Label htmlFor="miss" className="text-xs">Có PNR thiếu</Label></div>
            </div>
            {range === 'custom' && (
              <div className="flex flex-wrap gap-2 items-center text-sm">
                Từ <Input type="date" className="w-44" value={customFrom} onChange={e => setCustomFrom(e.target.value)} />
                đến <Input type="date" className="w-44" value={customTo} onChange={e => setCustomTo(e.target.value)} />
              </div>
            )}
            <Button variant="ghost" size="sm" onClick={clearFilters}><X className="w-4 h-4 mr-1" /> Xóa bộ lọc</Button>

            {listQuery.isError ? (
              <div className="p-6 text-center text-destructive">Không tải được dữ liệu: {(listQuery.error as any)?.message}</div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Thời gian</TableHead><TableHead>Email nhận</TableHead><TableHead>Khách hàng</TableHead>
                      <TableHead>PNR</TableHead><TableHead>Hãng</TableHead><TableHead>Trạng thái</TableHead>
                      <TableHead>Email gửi</TableHead><TableHead>Thao tác</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {listQuery.isLoading ? Array.from({ length: 8 }).map((_, i) => (
                      <TableRow key={i}>{Array.from({ length: 8 }).map((__, j) => <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}</TableRow>
                    )) : rows.length === 0 ? (
                      <TableRow><TableCell colSpan={8} className="text-center py-10 text-muted-foreground">Không có email nào</TableCell></TableRow>
                    ) : rows.map(r => {
                      const pnrs = r.pnrs || [];
                      return (
                        <TableRow key={`${r.src}-${r.id}`} className="cursor-pointer" onClick={() => setSelectedId(r.id)}>
                          <TableCell className="whitespace-nowrap text-xs">{fmt(r.ts)}</TableCell>
                          <TableCell className="text-sm">{r.email}</TableCell>
                          <TableCell className="text-sm">{r.customer_name || '—'}</TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {pnrs.slice(0, 3).map(p => <Badge key={p} variant="secondary" className="font-mono">{p}</Badge>)}
                              {pnrs.length > 3 && <Badge variant="outline">+{pnrs.length - 3}</Badge>}
                            </div>
                          </TableCell>
                          <TableCell>{r.airline || '—'}</TableCell>
                          <TableCell>{statusBadge(r.status)}</TableCell>
                          <TableCell className="text-xs">{r.from_email || '—'}</TableCell>
                          <TableCell><Button size="sm" variant="outline">Xem chi tiết</Button></TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <div className="flex items-center gap-2">
                Tổng {total} •
                <Select value={String(pageSize)} onValueChange={v => setPageSize(Number(v))}>
                  <SelectTrigger className="w-24 h-8"><SelectValue /></SelectTrigger>
                  <SelectContent>{[20, 50, 100].map(n => <SelectItem key={n} value={String(n)}>{n} dòng</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Trước</Button>
                <span>Trang {page}/{totalPages}</span>
                <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Sau</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Sheet open={!!selectedId} onOpenChange={o => !o && setSelectedId(null)}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          <SheetHeader><SheetTitle>Chi tiết email</SheetTitle></SheetHeader>
          {detailQuery.isLoading ? <div className="space-y-2 mt-4">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-5" />)}</div>
            : detailQuery.isError ? <p className="text-destructive mt-4">Không tải được chi tiết.</p>
            : !detailQuery.data ? <p className="mt-4 text-muted-foreground">Không tìm thấy bản ghi.</p>
            : <Detail d={detailQuery.data} />}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function Field({ label, value, copyable }: { label: string; value: any; copyable?: boolean }) {
  if (value === null || value === undefined || value === '') return null;
  return (
    <div className="flex justify-between gap-3 py-1 border-b text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right break-all flex items-center gap-1">
        {String(value)}
        {copyable && <button onClick={() => copy(String(value))}><Copy className="w-3 h-3" /></button>}
      </span>
    </div>
  );
}

function Detail({ d }: { d: Record<string, any> }) {
  const pnrs: string[] = d.pnrs || [];
  const missing: string[] = (d.missing_pnrs || []).map((x: string) => String(x).toUpperCase());
  const attachments: any[] = Array.isArray(d.attachments) ? d.attachments : [];
  return (
    <div className="space-y-5 mt-4">
      <section>
        <h3 className="font-semibold mb-2">Thông tin chung</h3>
        <Field label="Queue ID" value={d.id} copyable />
        <Field label="Email người nhận" value={d.email} copyable />
        <Field label="Tên khách hàng" value={d.customer_name} />
        <Field label="Số điện thoại" value={d.phone} />
        <Field label="Lời chào" value={d.salutation} />
        <Field label="Email người gửi" value={d.from_email} />
        <Field label="Hãng bay" value={d.airline} />
        <Field label="Loại email" value={d.type} />
        <div className="flex justify-between py-1 border-b text-sm"><span className="text-muted-foreground">Trạng thái</span>{statusBadge(d.status)}</div>
      </section>
      <section>
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold">Danh sách PNR</h3>
          {pnrs.length > 0 && <Button size="sm" variant="ghost" onClick={() => copy(pnrs.join(' '))}><Copy className="w-3 h-3 mr-1" />Sao chép</Button>}
        </div>
        <div className="space-y-1">
          {pnrs.map(p => (
            <div key={p} className="flex justify-between text-sm">
              <span className="font-mono">{p}</span>
              {missing.includes(String(p).toUpperCase())
                ? <Badge variant="outline" className="border-0 bg-yellow-100 text-yellow-800">Chưa có vé</Badge>
                : <Badge variant="outline" className="border-0 bg-green-100 text-green-800">Đã có vé</Badge>}
            </div>
          ))}
        </div>
      </section>
      {attachments.length > 0 && (
        <section>
          <h3 className="font-semibold mb-2">Đính kèm</h3>
          <pre className="text-xs bg-muted p-2 rounded whitespace-pre-wrap">{JSON.stringify(attachments, null, 2)}</pre>
        </section>
      )}
      <section>
        <h3 className="font-semibold mb-2">Lịch sử xử lý</h3>
        <Field label="Tạo lúc" value={d.created_at && fmt(d.created_at)} />
        <Field label="Cập nhật" value={d.updated_at && fmt(d.updated_at)} />
        <Field label="Sẵn sàng sau" value={d.ready_after && fmt(d.ready_after)} />
        <Field label="Thử lại lúc" value={d.next_retry_at && fmt(d.next_retry_at)} />
        <Field label="Gửi lúc" value={d.sent_at && fmt(d.sent_at)} />
        <Field label="Lưu trữ lúc" value={d.archived_at && fmt(d.archived_at)} />
        <Field label="Số lần thử" value={d.retry_count || null} />
        <Field label="Lý do cuối" value={d.final_reason} />
        <Field label="Message ID" value={d.message_id} />
        {d.last_error && <pre className="text-xs bg-red-50 text-red-700 p-2 rounded whitespace-pre-wrap mt-2">{d.last_error}</pre>}
      </section>
    </div>
  );
}
