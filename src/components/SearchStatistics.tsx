import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { Search, Calendar } from 'lucide-react';
import { format, startOfMonth, endOfMonth, startOfDay, endOfDay } from 'date-fns';

interface SearchStats {
  user_id: string;
  email: string;
  full_name: string | null;
  search_count: number;
}

type FilterType = 'all' | 'month' | 'day';

export const SearchStatistics = () => {
  const [stats, setStats] = useState<SearchStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [selectedMonth, setSelectedMonth] = useState<string>(format(new Date(), 'yyyy-MM'));
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [totalSearches, setTotalSearches] = useState(0);

  useEffect(() => {
    fetchStats();
  }, [filterType, selectedMonth, selectedDate]);

  const fetchStats = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('search_logs')
        .select('user_id, searched_at');

      // Apply date filters
      if (filterType === 'month') {
        const monthDate = new Date(selectedMonth + '-01');
        const start = startOfMonth(monthDate);
        const end = endOfMonth(monthDate);
        query = query
          .gte('searched_at', start.toISOString())
          .lte('searched_at', end.toISOString());
      } else if (filterType === 'day') {
        const dayDate = new Date(selectedDate);
        const start = startOfDay(dayDate);
        const end = endOfDay(dayDate);
        query = query
          .gte('searched_at', start.toISOString())
          .lte('searched_at', end.toISOString());
      }

      const { data: searchLogs, error: searchError } = await query;

      if (searchError) {
        console.error('Error fetching search logs:', searchError);
        return;
      }

      // Count searches per user
      const countMap: Record<string, number> = {};
      searchLogs?.forEach(log => {
        countMap[log.user_id] = (countMap[log.user_id] || 0) + 1;
      });

      setTotalSearches(searchLogs?.length || 0);

      // Get user details
      const userIds = Object.keys(countMap);
      if (userIds.length === 0) {
        setStats([]);
        setLoading(false);
        return;
      }

      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', userIds);

      // Get emails from auth admin
      const { data: authData } = await supabase.auth.admin.listUsers();
      const users = authData?.users || [];

      // Combine data
      const statsData: SearchStats[] = userIds.map(userId => {
        const profile = profiles?.find(p => p.id === userId);
        const user = users.find(u => u.id === userId);
        return {
          user_id: userId,
          email: user?.email || 'N/A',
          full_name: profile?.full_name || null,
          search_count: countMap[userId]
        };
      }).sort((a, b) => b.search_count - a.search_count);

      setStats(statsData);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const getFilterLabel = () => {
    switch (filterType) {
      case 'month':
        return `Tháng ${format(new Date(selectedMonth + '-01'), 'MM/yyyy')}`;
      case 'day':
        return format(new Date(selectedDate), 'dd/MM/yyyy');
      default:
        return 'Tất cả thời gian';
    }
  };

  // Generate month options (last 12 months)
  const monthOptions = Array.from({ length: 12 }, (_, i) => {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    return format(date, 'yyyy-MM');
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Search className="h-5 w-5" />
          Thống kê tìm kiếm chuyến bay
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Filter Controls */}
        <div className="flex flex-wrap gap-4 mb-6">
          <div className="flex gap-2">
            <Button
              variant={filterType === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterType('all')}
            >
              Tất cả
            </Button>
            <Button
              variant={filterType === 'month' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterType('month')}
            >
              Theo tháng
            </Button>
            <Button
              variant={filterType === 'day' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterType('day')}
            >
              Theo ngày
            </Button>
          </div>

          {filterType === 'month' && (
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Chọn tháng" />
              </SelectTrigger>
              <SelectContent>
                {monthOptions.map(month => (
                  <SelectItem key={month} value={month}>
                    {format(new Date(month + '-01'), 'MM/yyyy')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {filterType === 'day' && (
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-3 py-2 border rounded-md text-sm"
            />
          )}
        </div>

        {/* Summary */}
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
            <Calendar className="h-4 w-4" />
            <span className="font-medium">{getFilterLabel()}</span>
          </div>
          <div className="text-2xl font-bold text-blue-900 dark:text-blue-100 mt-2">
            {totalSearches.toLocaleString()} lượt tìm kiếm
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : stats.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Không có dữ liệu tìm kiếm
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Người dùng</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead className="text-right">Số lần tìm kiếm</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.map((stat, index) => (
                  <TableRow key={stat.user_id}>
                    <TableCell className="font-medium">{index + 1}</TableCell>
                    <TableCell>{stat.full_name || 'Chưa cập nhật'}</TableCell>
                    <TableCell>{stat.email}</TableCell>
                    <TableCell className="text-right font-mono">
                      {stat.search_count.toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
