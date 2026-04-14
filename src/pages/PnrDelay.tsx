import { useState, useEffect } from 'react';
import { ArrowLeft, RefreshCw, Search } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

interface DelayRecord {
  id: string;
  pnr: string | null;
  hang: string | null;
  phone: string | null;
  trip: string | null;
  oldtime: string | null;
  newtime: string | null;
  kakao_status: string | null;
  rcs_status: string | null;
  email: string | null;
  timecreate: string | null;
  sent_at: string | null;
}

const statusColors: Record<string, string> = {
  success: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  pending: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
  fail: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
  no_data: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
};

const getStatusBadge = (status: string | null) => {
  if (!status) return <Badge variant="outline">—</Badge>;
  const colorClass = statusColors[status] || 'bg-gray-100 text-gray-800';
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${colorClass}`}>{status}</span>;
};

const formatDate = (date: string | null) => {
  if (!date) return '—';
  try {
    return new Date(date).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
  } catch {
    return date;
  }
};

const PnrDelay = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [records, setRecords] = useState<DelayRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [kakaoFilter, setKakaoFilter] = useState('all');
  const [rcsFilter, setRcsFilter] = useState('all');
  const [pageSize, setPageSize] = useState(20);
  const [currentPage, setCurrentPage] = useState(1);

  const fetchRecords = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('sent_delay_pnr')
      .select('*')
      .order('timecreate', { ascending: false });

    if (error) {
      console.error('Error fetching sent_delay_pnr:', error);
    } else {
      setRecords((data as DelayRecord[]) || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (profile?.role !== 'admin') {
      navigate('/');
      return;
    }
    fetchRecords();
  }, [profile]);

  const filteredRecords = records.filter((r) => {
    const search = searchText.toLowerCase();
    const matchSearch = !search || 
      (r.pnr && r.pnr.toLowerCase().includes(search)) || 
      (r.phone && r.phone.toLowerCase().includes(search));
    const matchKakao = kakaoFilter === 'all' || r.kakao_status === kakaoFilter;
    const matchRcs = rcsFilter === 'all' || r.rcs_status === rcsFilter;
    return matchSearch && matchKakao && matchRcs;
  });

  const totalPages = Math.ceil(filteredRecords.length / pageSize);
  const paginatedRecords = filteredRecords.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchText, kakaoFilter, rcsFilter, pageSize]);

  const isFailRow = (r: DelayRecord) => r.kakao_status === 'fail' || r.rcs_status === 'fail';

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-[1400px] mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="outline" size="sm" onClick={() => navigate('/admin')}>
            <ArrowLeft className="w-4 h-4 mr-1" /> Quay lại
          </Button>
          <h1 className="text-2xl font-bold">Quản lý PNR Delay</h1>
          <Button variant="outline" size="sm" onClick={fetchRecords} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-1 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </Button>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Bộ lọc</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4 items-end">
              <div className="flex-1 min-w-[200px]">
                <label className="text-sm font-medium mb-1 block">Tìm PNR / SĐT</label>
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Nhập PNR hoặc SĐT..."
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
              <div className="w-[160px]">
                <label className="text-sm font-medium mb-1 block">Kakao Status</label>
                <Select value={kakaoFilter} onValueChange={setKakaoFilter}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tất cả</SelectItem>
                    <SelectItem value="success">Success</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="fail">Fail</SelectItem>
                    <SelectItem value="no_data">No Data</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="w-[160px]">
                <label className="text-sm font-medium mb-1 block">RCS Status</label>
                <Select value={rcsFilter} onValueChange={setRcsFilter}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tất cả</SelectItem>
                    <SelectItem value="success">Success</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="fail">Fail</SelectItem>
                    <SelectItem value="no_data">No Data</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="w-[120px]">
                <label className="text-sm font-medium mb-1 block">Số dòng</label>
                <Select value={String(pageSize)} onValueChange={(v) => setPageSize(Number(v))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="20">20</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="mt-3 text-sm text-muted-foreground">
              Tổng: {filteredRecords.length} bản ghi
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
                    <TableHead className="w-10">STT</TableHead>
                    <TableHead>PNR</TableHead>
                    <TableHead>Hãng</TableHead>
                    <TableHead>SĐT</TableHead>
                    <TableHead>Hành trình</TableHead>
                    <TableHead>Giờ cũ</TableHead>
                    <TableHead>Giờ mới</TableHead>
                    <TableHead>Kakao</TableHead>
                    <TableHead>RCS</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Thời gian tạo</TableHead>
                    <TableHead>Thời gian gửi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={12} className="text-center py-8">Đang tải...</TableCell>
                    </TableRow>
                  ) : paginatedRecords.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={12} className="text-center py-8">Không có dữ liệu</TableCell>
                    </TableRow>
                  ) : (
                    paginatedRecords.map((r, idx) => (
                      <TableRow key={r.id} className={isFailRow(r) ? 'bg-red-50 dark:bg-red-950/20' : ''}>
                        <TableCell className="text-center text-muted-foreground">{(currentPage - 1) * pageSize + idx + 1}</TableCell>
                        <TableCell className="font-mono font-semibold">{r.pnr || '—'}</TableCell>
                        <TableCell>{r.hang || '—'}</TableCell>
                        <TableCell>{r.phone || '—'}</TableCell>
                        <TableCell className="max-w-[200px] truncate">{r.trip || '—'}</TableCell>
                        <TableCell>{r.oldtime || '—'}</TableCell>
                        <TableCell>{r.newtime || '—'}</TableCell>
                        <TableCell>{getStatusBadge(r.kakao_status)}</TableCell>
                        <TableCell>{getStatusBadge(r.rcs_status)}</TableCell>
                        <TableCell className="max-w-[180px] truncate">{r.email || '—'}</TableCell>
                        <TableCell className="text-xs whitespace-nowrap">{formatDate(r.timecreate)}</TableCell>
                        <TableCell className="text-xs whitespace-nowrap">{formatDate(r.sent_at)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-4">
            <Button variant="outline" size="sm" disabled={currentPage <= 1} onClick={() => setCurrentPage(p => p - 1)}>
              Trước
            </Button>
            <span className="text-sm">Trang {currentPage} / {totalPages}</span>
            <Button variant="outline" size="sm" disabled={currentPage >= totalPages} onClick={() => setCurrentPage(p => p + 1)}>
              Sau
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default PnrDelay;
