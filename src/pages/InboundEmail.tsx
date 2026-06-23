import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, RefreshCw, Search, Mail } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

interface InboundEmailRow {
  id: string;
  sender_name: string | null;
  sender_email: string | null;
  subject: string | null;
  file_name: string | null;
  hang: string | null;
  pnr: string | null;
  status: string | null;
  created_at: string;
  customer: string | null;
  body: string | null;
  note: string | null;
}

type TabKey = 'ALL' | 'NEW' | 'UNMATCHED' | 'CHECKED';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'ALL', label: 'TẤT CẢ' },
  { key: 'NEW', label: 'NEW' },
  { key: 'UNMATCHED', label: 'UNMATCHED' },
  { key: 'CHECKED', label: 'CHECKED' },
];

const formatVN = (s: string) => {
  const d = new Date(s);
  const v = new Date(d.getTime() + 7 * 3600 * 1000);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(v.getUTCDate())}/${p(v.getUTCMonth() + 1)}/${v.getUTCFullYear()} ${p(v.getUTCHours())}:${p(v.getUTCMinutes())}`;
};

const statusBadge = (s: string | null) => {
  switch (s) {
    case 'NEW':
      return <Badge className="bg-blue-500 hover:bg-blue-600 text-white">NEW</Badge>;
    case 'UNMATCHED':
      return <Badge className="bg-yellow-500 hover:bg-yellow-600 text-white">UNMATCHED</Badge>;
    case 'CHECKED':
      return <Badge className="bg-green-500 hover:bg-green-600 text-white">CHECKED</Badge>;
    default:
      return <Badge variant="secondary">{s || '—'}</Badge>;
  }
};

export default function InboundEmail() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<InboundEmailRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabKey>('ALL');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<InboundEmailRow | null>(null);
  const [editStatus, setEditStatus] = useState<string>('UNMATCHED');
  const [editNote, setEditNote] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const fetchRows = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('inbound_email')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) {
      toast.error('Không thể tải danh sách email');
    } else {
      setRows((data as InboundEmailRow[]) || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchRows();
  }, []);

  const counts = useMemo(() => {
    const c: Record<TabKey, number> = { ALL: rows.length, NEW: 0, UNMATCHED: 0, CHECKED: 0 };
    rows.forEach((r) => {
      if (r.status === 'NEW') c.NEW++;
      else if (r.status === 'UNMATCHED') c.UNMATCHED++;
      else if (r.status === 'CHECKED') c.CHECKED++;
    });
    return c;
  }, [rows]);

  const filtered = useMemo(() => {
    let list = rows;
    if (tab !== 'ALL') list = list.filter((r) => r.status === tab);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (r) =>
          (r.sender_email || '').toLowerCase().includes(q) ||
          (r.subject || '').toLowerCase().includes(q),
      );
    }
    return list;
  }, [rows, tab, search]);

  const openRow = (r: InboundEmailRow) => {
    setSelected(r);
    setEditStatus(r.status === 'CHECKED' ? 'CHECKED' : 'UNMATCHED');
    setEditNote(r.note || '');
  };

  const handleSave = async () => {
    if (!selected) return;
    setSaving(true);
    const { error } = await supabase
      .from('inbound_email')
      .update({ status: editStatus, note: editNote || null })
      .eq('id', selected.id);
    setSaving(false);
    if (error) {
      toast.error('Cập nhật thất bại');
      return;
    }
    toast.success('Đã cập nhật');
    setSelected(null);
    fetchRows();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={() => navigate('/admin')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Quay lại
            </Button>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Mail className="w-6 h-6" /> Quản lý Mail Đến
            </h1>
          </div>
          <Button variant="outline" onClick={fetchRows} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Làm mới
          </Button>
        </div>

        {/* Filter bar */}
        <div className="bg-card border rounded-lg p-4 mb-4 flex flex-col md:flex-row md:items-center gap-3">
          <div className="flex flex-wrap gap-2">
            {TABS.map((t) => (
              <Button
                key={t.key}
                size="sm"
                variant={tab === t.key ? 'default' : 'outline'}
                onClick={() => setTab(t.key)}
              >
                {t.label}
                <Badge variant="secondary" className="ml-2">
                  {counts[t.key]}
                </Badge>
              </Button>
            ))}
          </div>
          <div className="relative md:ml-auto md:w-80">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Tìm theo email hoặc tiêu đề..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {/* Table */}
        <div className="bg-card border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Thời gian</TableHead>
                <TableHead>Người gửi</TableHead>
                <TableHead>Tiêu đề</TableHead>
                <TableHead>Hãng</TableHead>
                <TableHead>PNR</TableHead>
                <TableHead>Trạng thái</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 6 }).map((_, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-10">
                    Không có email nào
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((r) => (
                  <TableRow key={r.id} className="cursor-pointer" onClick={() => openRow(r)}>
                    <TableCell className="whitespace-nowrap">{formatVN(r.created_at)}</TableCell>
                    <TableCell>
                      <div className="font-medium">{r.sender_name || '—'}</div>
                      <div className="text-xs text-muted-foreground">{r.sender_email}</div>
                    </TableCell>
                    <TableCell className="max-w-[360px] truncate">{r.subject || '—'}</TableCell>
                    <TableCell>{r.hang || '—'}</TableCell>
                    <TableCell className="font-mono">{r.pnr || '—'}</TableCell>
                    <TableCell>{statusBadge(r.status)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Chi tiết email</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <div>
                  <div className="text-muted-foreground">Người gửi</div>
                  <div className="font-medium">{selected.sender_name || '—'}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Email</div>
                  <div className="font-medium">{selected.sender_email || '—'}</div>
                </div>
                <div className="md:col-span-2">
                  <div className="text-muted-foreground">Tiêu đề</div>
                  <div className="font-medium">{selected.subject || '—'}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Thời gian</div>
                  <div className="font-medium">{formatVN(selected.created_at)}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Trạng thái</div>
                  <div>{statusBadge(selected.status)}</div>
                </div>
                {selected.hang && (
                  <div>
                    <div className="text-muted-foreground">Hãng</div>
                    <div className="font-medium">{selected.hang}</div>
                  </div>
                )}
                {selected.pnr && (
                  <div>
                    <div className="text-muted-foreground">PNR</div>
                    <div className="font-mono font-medium">{selected.pnr}</div>
                  </div>
                )}
                {selected.customer && (
                  <div>
                    <div className="text-muted-foreground">Khách hàng</div>
                    <div className="font-medium">{selected.customer}</div>
                  </div>
                )}
                {selected.file_name && (
                  <div>
                    <div className="text-muted-foreground">File</div>
                    <div className="font-medium">{selected.file_name}</div>
                  </div>
                )}
              </div>

              <div>
                <div className="text-sm text-muted-foreground mb-1">Nội dung</div>
                <pre className="bg-muted rounded-md p-3 text-xs whitespace-pre-wrap max-h-72 overflow-y-auto">
{selected.body || '(Không có nội dung)'}
                </pre>
              </div>

              {selected.status === 'NEW' ? (
                <div className="text-sm text-yellow-700 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md p-3">
                  Email đang ở trạng thái NEW — không thể cập nhật.
                </div>
              ) : (
                <div className="space-y-3 border-t pt-4">
                  <div>
                    <Label className="mb-1 block">Trạng thái</Label>
                    <Select value={editStatus} onValueChange={setEditStatus}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="UNMATCHED">UNMATCHED</SelectItem>
                        <SelectItem value="CHECKED">CHECKED</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="mb-1 block">Ghi chú</Label>
                    <Textarea
                      placeholder="Nhập ghi chú xử lý..."
                      value={editNote}
                      onChange={(e) => setEditNote(e.target.value)}
                      rows={4}
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setSelected(null)}>
                      Hủy
                    </Button>
                    <Button onClick={handleSave} disabled={saving}>
                      {saving ? 'Đang lưu...' : 'Lưu'}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
