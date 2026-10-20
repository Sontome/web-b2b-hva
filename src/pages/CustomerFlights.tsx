import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { ArrowLeft, RefreshCw, Search, Copy, X, Plane, ChevronDown, ChevronUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { toast } from 'sonner';

interface FlightRow {
  id: number;
  pnr: string | null;
  email: string;
  customer_name: string | null;
  salutation: string | null;
  phone: string | null;
  mail_type: string | null;
  first_sent_at: string | null;
  last_sent_at: string | null;
  send_count: number | null;
  trip1: string | null; day1: string | null; time1: string | null;
  trip2: string | null; day2: string | null; time2: string | null;
  trip3: string | null; day3: string | null; time3: string | null;
  trip4: string | null; day4: string | null; time4: string | null;
}

interface Filters {
  pnr: string; email: string; customerName: string; phone: string;
  sentFrom: string; sentTo: string; flyFrom: string; flyTo: string;
}

const EMPTY_FILTERS: Filters = {
  pnr: '', email: '', customerName: '', phone: '',
  sentFrom: '', sentTo: '', flyFrom: '', flyTo: '',
};

const rpc = (fn: string, args?: Record<string, unknown>) =>
  (supabase.rpc as any)(fn, args) as Promise<{ data: any; error: any }>;

const p2 = (n: number) => String(n).padStart(2, '0');
const fmt = (s?: string | null) => {
  if (!s) return '—';
  const v = new Date(new Date(s).getTime() + 7 * 3600e3);
  return `${p2(v.getUTCDate())}/${p2(v.getUTCMonth() + 1)}/${v.getUTCFullYear()} ${p2(v.getUTCHours())}:${p2(v.getUTCMinutes())}`;
};
// Ngày gửi (yyyy-mm-dd từ input date) -> ISO theo múi giờ VN
const vnDateToIso = (d: string, addDays = 0) => {
  const [y, m, dd] = d.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, dd + addDays) - 7 * 3600e3).toISOString();
};
const copy = (t: string) => { navigator.clipboard.writeText(t); toast.success('Đã sao chép'); };

// day text DD/MM/YYYY có nằm trong khoảng lọc ngày bay không (yyyy-mm-dd)
const dayInRange = (dayText: string | null, from: string, to: string) => {
  if (!dayText || !from || !to) return false;
  const m = dayText.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return false;
  const iso = `${m[3]}-${m[2]}-${m[1]}`;
  return iso >= from && iso <= to;
};

interface Leg { trip: string | null; day: string | null; time: string | null; }
const legsOf = (r: FlightRow): Leg[] =>
  [
    { trip: r.trip1, day: r.day1, time: r.time1 },
    { trip: r.trip2, day: r.day2, time: r.time2 },
    { trip: r.trip3, day: r.day3, time: r.time3 },
    { trip: r.trip4, day: r.day4, time: r.time4 },
  ].filter(l => (l.trip && l.trip.trim()) || (l.day && l.day.trim()));

const fmtTrip = (trip: string | null) => {
  if (!trip) return '';
  const t = trip.trim();
  return t.includes('-') && !t.includes('→') ? t.split('-').join(' → ') : t;
};

export default function CustomerFlights() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user, profile } = useAuth();
  const isAdmin = !!user && profile?.role === 'admin';

  const [inputs, setInputs] = useState<Filters>(EMPTY_FILTERS);
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [sort, setSort] = useState<'desc' | 'asc'>('desc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [selected, setSelected] = useState<FlightRow | null>(null);

  useEffect(() => { if (profile && !isAdmin) navigate('/'); }, [profile, isAdmin, navigate]);
  useEffect(() => { setPage(1); }, [filters, sort, pageSize]);

  const params = {
    p_pnr: filters.pnr || null,
    p_email: filters.email || null,
    p_customer_name: filters.customerName || null,
    p_phone: filters.phone || null,
    p_sent_from: filters.sentFrom ? vnDateToIso(filters.sentFrom) : null,
    p_sent_to: filters.sentTo ? vnDateToIso(filters.sentTo) : null,
    p_fly_from: filters.flyFrom || null,
    p_fly_to: filters.flyTo || null,
    p_sort: sort,
    p_page: page,
    p_page_size: pageSize,
  };

  const listQuery = useQuery({
    queryKey: ['customer-flights', 'list', params],
    enabled: isAdmin,
    staleTime: 60e3,
    refetchOnWindowFocus: false,
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const { data, error } = await rpc('customer_flights_list', params);
      if (error) throw error;
      return data as { total: number; rows: FlightRow[] };
    },
  });

  const applySearch = () => {
    setFilters({
      pnr: inputs.pnr.trim(), email: inputs.email.trim(),
      customerName: inputs.customerName.trim(), phone: inputs.phone.trim(),
      sentFrom: inputs.sentFrom, sentTo: inputs.sentTo,
      flyFrom: inputs.flyFrom, flyTo: inputs.flyTo,
    });
  };
  const clearFilters = () => { setInputs(EMPTY_FILTERS); setFilters(EMPTY_FILTERS); };
  const refresh = () => qc.invalidateQueries({ queryKey: ['customer-flights', 'list'] });
  const onEnter = (e: React.KeyboardEvent) => { if (e.key === 'Enter') applySearch(); };

  const total = listQuery.data?.total ?? 0;
  const rows = listQuery.data?.rows ?? [];
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const hasFilter = Object.values(filters).some(v => v !== '');

  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <Button variant="outline" size="sm" onClick={() => navigate('/admin')} className="mb-3">
              <ArrowLeft className="w-4 h-4 mr-2" /> Quay lại Admin
            </Button>
            <h1 className="text-2xl font-bold">Lịch Bay Khách Hàng</h1>
            <p className="text-sm text-muted-foreground">
              Tra cứu thông tin khách hàng, mã đặt chỗ và lịch trình chuyến bay từ lịch sử gửi email.
            </p>
          </div>
          <Button variant="outline" onClick={refresh} disabled={listQuery.isFetching}>
            <RefreshCw className={`w-4 h-4 mr-2 ${listQuery.isFetching ? 'animate-spin' : ''}`} /> Làm mới
          </Button>
        </div>

        <Card>
          <CardContent className="pt-6 space-y-4">
            <button
              className="flex items-center gap-2 text-sm font-medium"
              onClick={() => setFiltersOpen(o => !o)}
            >
              {filtersOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              Bộ lọc tìm kiếm {hasFilter && <Badge variant="secondary">Đang lọc</Badge>}
            </button>

            {filtersOpen && (
              <div className="space-y-3">
                <div className="grid gap-2 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <Label className="text-xs">Mã đặt chỗ (PNR)</Label>
                    <Input value={inputs.pnr} onChange={e => setInputs(i => ({ ...i, pnr: e.target.value }))}
                      onKeyDown={onEnter} placeholder="VD: EXG6T7" className="font-mono" />
                  </div>
                  <div>
                    <Label className="text-xs">Email</Label>
                    <Input value={inputs.email} onChange={e => setInputs(i => ({ ...i, email: e.target.value }))}
                      onKeyDown={onEnter} placeholder="Email khách hàng" />
                  </div>
                  <div>
                    <Label className="text-xs">Tên khách hàng</Label>
                    <Input value={inputs.customerName} onChange={e => setInputs(i => ({ ...i, customerName: e.target.value }))}
                      onKeyDown={onEnter} placeholder="Tên khách hàng" />
                  </div>
                  <div>
                    <Label className="text-xs">Số điện thoại</Label>
                    <Input value={inputs.phone} onChange={e => setInputs(i => ({ ...i, phone: e.target.value }))}
                      onKeyDown={onEnter} placeholder="Số điện thoại" />
                  </div>
                </div>
                <div className="grid gap-2 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <Label className="text-xs">Ngày gửi email từ</Label>
                    <Input type="date" value={inputs.sentFrom} onChange={e => setInputs(i => ({ ...i, sentFrom: e.target.value }))} />
                  </div>
                  <div>
                    <Label className="text-xs">Ngày gửi email đến</Label>
                    <Input type="date" value={inputs.sentTo} onChange={e => setInputs(i => ({ ...i, sentTo: e.target.value }))} />
                  </div>
                  <div>
                    <Label className="text-xs">Ngày bay từ</Label>
                    <Input type="date" value={inputs.flyFrom} onChange={e => setInputs(i => ({ ...i, flyFrom: e.target.value }))} />
                  </div>
                  <div>
                    <Label className="text-xs">Ngày bay đến</Label>
                    <Input type="date" value={inputs.flyTo} onChange={e => setInputs(i => ({ ...i, flyTo: e.target.value }))} />
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button onClick={applySearch} disabled={listQuery.isFetching}>
                    <Search className="w-4 h-4 mr-2" /> Tìm kiếm
                  </Button>
                  <Button variant="ghost" onClick={clearFilters}>
                    <X className="w-4 h-4 mr-1" /> Xóa bộ lọc
                  </Button>
                  <Select value={sort} onValueChange={v => setSort(v as 'desc' | 'asc')}>
                    <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="desc">Ngày gửi mới nhất</SelectItem>
                      <SelectItem value="asc">Ngày gửi cũ nhất</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {listQuery.isError ? (
              <div className="p-6 text-center space-y-3">
                <p className="text-destructive">Không tải được dữ liệu: {(listQuery.error as any)?.message}</p>
                <Button variant="outline" onClick={refresh}>Thử lại</Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">STT</TableHead>
                      <TableHead>PNR</TableHead>
                      <TableHead>Khách hàng</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Số điện thoại</TableHead>
                      <TableHead>Lịch trình bay</TableHead>
                      <TableHead>Ngày gửi</TableHead>
                      <TableHead>Số lần gửi</TableHead>
                      <TableHead>Thao tác</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {listQuery.isLoading ? Array.from({ length: 8 }).map((_, i) => (
                      <TableRow key={i}>{Array.from({ length: 9 }).map((__, j) => <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}</TableRow>
                    )) : rows.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-10 text-muted-foreground">
                          {hasFilter ? 'Không có kết quả phù hợp với bộ lọc' : 'Chưa có dữ liệu lịch bay khách hàng'}
                        </TableCell>
                      </TableRow>
                    ) : rows.map((r, idx) => {
                      const legs = legsOf(r);
                      return (
                        <TableRow key={r.id} className="cursor-pointer" onClick={() => setSelected(r)}>
                          <TableCell className="text-xs text-muted-foreground">{(page - 1) * pageSize + idx + 1}</TableCell>
                          <TableCell>
                            <button className="font-mono font-bold hover:underline" onClick={e => { e.stopPropagation(); setSelected(r); }}>
                              {r.pnr || '—'}
                            </button>
                          </TableCell>
                          <TableCell className="text-sm font-medium">{r.customer_name || '—'}</TableCell>
                          <TableCell className="text-sm max-w-[180px] truncate" title={r.email}>{r.email}</TableCell>
                          <TableCell className="text-sm">{r.phone || '—'}</TableCell>
                          <TableCell>
                            {legs.length === 0 ? '—' : (
                              <div className="space-y-1">
                                {legs.map((l, i) => {
                                  const hit = dayInRange(l.day, filters.flyFrom, filters.flyTo);
                                  return (
                                    <div key={i} className="flex items-center gap-1.5 text-xs whitespace-nowrap">
                                      <Plane className="w-3 h-3 text-muted-foreground shrink-0" />
                                      <span className="font-medium">{fmtTrip(l.trip)}</span>
                                      <span className={hit ? 'bg-blue-100 text-blue-800 font-semibold px-1 rounded' : 'text-muted-foreground'}>
                                        {l.day || ''}{l.time ? ` • ${l.time}` : ''}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-xs">{fmt(r.first_sent_at)}</TableCell>
                          <TableCell className="text-sm text-center">{r.send_count ?? '—'}</TableCell>
                          <TableCell>
                            <Button size="sm" variant="outline" onClick={e => { e.stopPropagation(); setSelected(r); }}>
                              Xem chi tiết
                            </Button>
                          </TableCell>
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

      <Sheet open={!!selected} onOpenChange={o => !o && setSelected(null)}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          <SheetHeader><SheetTitle>Chi tiết khách hàng</SheetTitle></SheetHeader>
          {selected && <FlightDetail r={selected} flyFrom={filters.flyFrom} flyTo={filters.flyTo} />}
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

function FlightDetail({ r, flyFrom, flyTo }: { r: FlightRow; flyFrom: string; flyTo: string }) {
  const legs = legsOf(r);
  return (
    <div className="space-y-5 mt-4">
      <section>
        <h3 className="font-semibold mb-2">Thông tin khách hàng</h3>
        <Field label="PNR" value={r.pnr} copyable />
        <Field label="Tên khách hàng" value={r.customer_name} />
        <Field label="Xưng hô" value={r.salutation} />
        <Field label="Email" value={r.email} copyable />
        <Field label="Số điện thoại" value={r.phone} copyable />
      </section>
      <section>
        <h3 className="font-semibold mb-2">Lịch trình chuyến bay</h3>
        {legs.length === 0 ? (
          <p className="text-sm text-muted-foreground">Không có thông tin chặng bay.</p>
        ) : (
          <div className="space-y-2">
            {legs.map((l, i) => {
              const hit = dayInRange(l.day, flyFrom, flyTo);
              return (
                <div key={i} className="flex items-center gap-2 text-sm border rounded-md p-2">
                  <Plane className="w-4 h-4 text-muted-foreground shrink-0" />
                  <div>
                    <div className="font-medium">Chặng {i + 1}: {fmtTrip(l.trip)}</div>
                    <div className={hit ? 'text-blue-700 font-semibold' : 'text-muted-foreground'}>
                      {l.day || '—'}{l.time ? ` • ${l.time}` : ''}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
      <section>
        <h3 className="font-semibold mb-2">Thông tin gửi email</h3>
        <Field label="Loại email" value={r.mail_type} />
        <Field label="Gửi lần đầu" value={r.first_sent_at && fmt(r.first_sent_at)} />
        <Field label="Gửi gần nhất" value={r.last_sent_at && fmt(r.last_sent_at)} />
        <Field label="Số lần gửi" value={r.send_count} />
      </section>
    </div>
  );
}
