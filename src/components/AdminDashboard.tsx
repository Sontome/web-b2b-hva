import { useState, useEffect } from 'react';
import { Users, Settings, DollarSign, Mail, User, LogOut, Phone, Facebook, Ticket } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';
import { useNavigate } from 'react-router-dom';
import { SearchStatistics } from './SearchStatistics';

interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  linkfacebook: string | null;
  role: string;
  price_markup: number;
  price_vj: number;
  price_vna: number;
  price_ow_vj: number;
  price_rt_vj: number;
  price_ow_vna: number;
  price_rt_vna: number;
  status: string;
  created_at: string;
  perm_check_vj: boolean;
  perm_check_vna: boolean;
  perm_send_ticket: boolean;
  perm_get_ticket_image: boolean;
  perm_get_pending_ticket: boolean;
  perm_check_discount: boolean;
  perm_check_vna_issued: boolean;
  hold_ticket_quantity: number;
  apikey_telegram: string | null;
  idchat_telegram: string | null;
  banner: string | null;
  agent_name: string | null;
  address: string | null;
  business_number: string | null;
}

export const AdminDashboard = () => {
  const { signOut, profile } = useAuth();
  const navigate = useNavigate();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null);
  const [editForm, setEditForm] = useState({
    full_name: '',
    phone: '',
    linkfacebook: '',
    price_markup: 0,
    price_vj: 0,
    price_vna: 0,
    price_ow_vj: 0,
    price_rt_vj: 0,
    price_ow_vna: 0,
    price_rt_vna: 0,
    role: 'user',
    status: 'active',
    perm_check_vj: false,
    perm_check_vna: false,
    perm_send_ticket: false,
    perm_get_ticket_image: false,
    perm_get_pending_ticket: false,
    perm_check_discount: false,
    perm_check_vna_issued: false,
    hold_ticket_quantity: 0,
    apikey_telegram: '',
    idchat_telegram: '',
    banner: '',
    agent_name: '',
    address: '',
    business_number: '',
  });

  useEffect(() => {
    fetchProfiles();
  }, []);

  const fetchProfiles = async () => {
    try {
      // Fetch profiles
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
        toast({
          variant: "destructive",
          title: "Lỗi",
          description: "Không thể tải danh sách người dùng",
        });
        return;
      }

      // Fetch user emails and roles
      const userIds = profilesData?.map(p => p.id) || [];
      const { data: authData } = await supabase.auth.admin.listUsers();
      const users = authData?.users || [];
      
      const { data: rolesData } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .in('user_id', userIds);

      // Combine data and filter to only show users with role 'user'
      const enrichedProfiles = profilesData?.map(profile => {
        const user = users.find(u => u.id === profile.id);
        const roleInfo = rolesData?.find(r => r.user_id === profile.id);
        return {
          ...profile,
          email: user?.email || '',
          role: roleInfo?.role || 'user'
        };
      }).filter(profile => profile.role === 'user') || [];

      setProfiles(enrichedProfiles);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEditProfile = (profile: Profile) => {
    setEditingProfile(profile);
    setEditForm({
      full_name: profile.full_name || '',
      phone: profile.phone || '',
      linkfacebook: profile.linkfacebook || '',
      price_markup: profile.price_markup || 0,
      price_vj: profile.price_vj || 0,
      price_vna: profile.price_vna || 0,
      price_ow_vj: profile.price_ow_vj || 0,
      price_rt_vj: profile.price_rt_vj || 0,
      price_ow_vna: profile.price_ow_vna || 0,
      price_rt_vna: profile.price_rt_vna || 0,
      role: profile.role,
      status: profile.status,
      perm_check_vj: profile.perm_check_vj || false,
      perm_check_vna: profile.perm_check_vna || false,
      perm_send_ticket: profile.perm_send_ticket || false,
      perm_get_ticket_image: profile.perm_get_ticket_image || false,
      perm_get_pending_ticket: profile.perm_get_pending_ticket || false,
      perm_check_discount: profile.perm_check_discount || false,
      perm_check_vna_issued: profile.perm_check_vna_issued || false,
      hold_ticket_quantity: profile.hold_ticket_quantity || 0,
      apikey_telegram: profile.apikey_telegram || '',
      idchat_telegram: profile.idchat_telegram || '',
      banner: profile.banner || '',
      agent_name: profile.agent_name || '',
      address: profile.address || '',
      business_number: profile.business_number || '',
    });
  };

  const handleUpdateProfile = async () => {
    if (!editingProfile) return;

    try {
      // Automatically set perm_hold_ticket based on hold_ticket_quantity
      const permHoldTicket = editForm.hold_ticket_quantity > 0;

      // Update profile data
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          full_name: editForm.full_name,
          phone: editForm.phone,
          linkfacebook: editForm.linkfacebook,
          price_markup: editForm.price_markup,
          price_vj: editForm.price_vj,
          price_vna: editForm.price_vna,
          price_ow_vj: editForm.price_ow_vj,
          price_rt_vj: editForm.price_rt_vj,
          price_ow_vna: editForm.price_ow_vna,
          price_rt_vna: editForm.price_rt_vna,
          status: editForm.status,
          perm_check_vj: editForm.perm_check_vj,
          perm_check_vna: editForm.perm_check_vna,
          perm_send_ticket: editForm.perm_send_ticket,
          perm_get_ticket_image: editForm.perm_get_ticket_image,
          perm_get_pending_ticket: editForm.perm_get_pending_ticket,
          perm_check_discount: editForm.perm_check_discount,
          perm_check_vna_issued: editForm.perm_check_vna_issued,
          hold_ticket_quantity: editForm.hold_ticket_quantity,
          perm_hold_ticket: permHoldTicket,
          apikey_telegram: editForm.apikey_telegram || null,
          idchat_telegram: editForm.idchat_telegram || null,
          banner: editForm.banner || null,
          agent_name: editForm.agent_name || null,
          address: editForm.address || null,
          business_number: editForm.business_number || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', editingProfile.id);

      if (profileError) {
        toast({
          variant: "destructive",
          title: "Lỗi",
          description: "Không thể cập nhật thông tin người dùng",
        });
        return;
      }

      // Update role in user_roles table
      const { error: roleError } = await supabase
        .from('user_roles')
        .update({ role: editForm.role as 'admin' | 'user' })
        .eq('user_id', editingProfile.id);

      if (roleError) {
        console.error('Error updating role:', roleError);
      }

      toast({
        title: "Thành công",
        description: "Đã cập nhật thông tin người dùng",
      });
      fetchProfiles();
      setEditingProfile(null);
    } catch (error) {
      console.error('Error updating profile:', error);
    }
  };

  const getRoleBadge = (role: string) => {
    return role === 'admin' ? (
      <Badge variant="destructive">Admin</Badge>
    ) : (
      <Badge variant="secondary">User</Badge>
    );
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="default" className="bg-green-500 hover:bg-green-600">Active</Badge>;
      case 'pending':
        return <Badge variant="secondary" className="bg-yellow-500 hover:bg-yellow-600 text-white">Pending</Badge>;
      case 'inactive':
        return <Badge variant="outline" className="text-red-600 border-red-600">Inactive</Badge>;
      default:
        return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('vi-VN');
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW'
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Admin Dashboard
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Quản lý người dùng và cấu hình hệ thống
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-right">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Xin chào, {profile?.full_name || profile?.email}
              </p>
              <Badge variant="destructive" className="mt-1">Admin</Badge>
            </div>
            <Button onClick={signOut} variant="outline">
              <LogOut className="w-4 h-4 mr-2" />
              Đăng xuất
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tổng người dùng</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{profiles.length}</div>
              <p className="text-xs text-muted-foreground">
                +{profiles.filter(p => new Date(p.created_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)).length} tuần này
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Người dùng Admin</CardTitle>
              <Settings className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {profiles.filter(p => p.role === 'admin').length}
              </div>
              <p className="text-xs text-muted-foreground">
                Tài khoản quản trị viên
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Phí cộng thêm trung bình</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(Math.round(profiles.reduce((sum, p) => sum + (p.price_markup || 0), 0) / profiles.length || 0))}
              </div>
              <p className="text-xs text-muted-foreground">
                Giá trị cộng thêm trung bình
              </p>
            </CardContent>
          </Card>

          <Card 
            className="cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => navigate('/admin/pending-tickets')}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Vé chờ</CardTitle>
              <Ticket className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                Quản lý
              </div>
              <p className="text-xs text-muted-foreground">
                Xem danh sách vé đang giữ
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Search Statistics */}
        <div className="mb-8">
          <SearchStatistics />
        </div>

        {/* Users Table */}
        <Card>
          <CardHeader>
            <CardTitle>Danh sách người dùng</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Người dùng</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Điện thoại</TableHead>
                    <TableHead>Facebook</TableHead>
                    <TableHead>Vai trò</TableHead>
                    <TableHead>Trạng thái</TableHead>
                    <TableHead>Phí chung</TableHead>
                    <TableHead>Phí VJ</TableHead>
                    <TableHead>Phí VNA</TableHead>
                    <TableHead>VJ 1C</TableHead>
                    <TableHead>VJ KH</TableHead>
                    <TableHead>VNA 1C</TableHead>
                    <TableHead>VNA KH</TableHead>
                    <TableHead>Ngày tạo</TableHead>
                    <TableHead>Thao tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {profiles.map((profile) => (
                    <TableRow key={profile.id}>
                      <TableCell className="flex items-center space-x-2">
                        <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                          <User className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        </div>
                        <span className="font-medium">
                          {profile.full_name || 'Chưa cập nhật'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Mail className="w-4 h-4 text-gray-400" />
                          <span>{profile.email}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Phone className="w-4 h-4 text-gray-400" />
                          <span>{profile.phone || 'Chưa cập nhật'}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Facebook className="w-4 h-4 text-gray-400" />
                          {profile.linkfacebook ? (
                            <a 
                              href={profile.linkfacebook} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline"
                            >
                              Facebook
                            </a>
                          ) : (
                            <span>Chưa cập nhật</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{getRoleBadge(profile.role)}</TableCell>
                      <TableCell>{getStatusBadge(profile.status)}</TableCell>
                      <TableCell>
                        <span className="font-mono">
                          {formatCurrency(profile.price_markup || 0)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="font-mono">
                          {formatCurrency(profile.price_vj || 0)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="font-mono">
                          {formatCurrency(profile.price_vna || 0)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="font-mono">
                          {formatCurrency(profile.price_ow_vj || 0)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="font-mono">
                          {formatCurrency(profile.price_rt_vj || 0)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="font-mono">
                          {formatCurrency(profile.price_ow_vna || 0)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="font-mono">
                          {formatCurrency(profile.price_rt_vna || 0)}
                        </span>
                      </TableCell>
                      <TableCell>{formatDate(profile.created_at)}</TableCell>
                      <TableCell>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditProfile(profile)}
                            >
                              Chỉnh sửa
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-md">
                            <DialogHeader>
                              <DialogTitle>Chỉnh sửa thông tin người dùng</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 max-h-96 overflow-y-auto">
                              <div className="space-y-2">
                                <Label htmlFor="full_name">Họ và tên</Label>
                                <Input
                                  id="full_name"
                                  value={editForm.full_name}
                                  onChange={(e) => setEditForm(prev => ({ ...prev, full_name: e.target.value }))}
                                  placeholder="Nhập họ và tên"
                                />
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor="phone">Số điện thoại</Label>
                                <Input
                                  id="phone"
                                  value={editForm.phone}
                                  onChange={(e) => setEditForm(prev => ({ ...prev, phone: e.target.value }))}
                                  placeholder="Nhập số điện thoại"
                                />
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor="linkfacebook">Link Facebook</Label>
                                <Input
                                  id="linkfacebook"
                                  value={editForm.linkfacebook}
                                  onChange={(e) => setEditForm(prev => ({ ...prev, linkfacebook: e.target.value }))}
                                  placeholder="Nhập link Facebook"
                                />
                              </div>

                              {/* Agent Information Section */}
                              <div className="space-y-4 pt-4 border-t">
                                <h3 className="text-lg font-semibold">Thông tin đại lý</h3>
                                
                                <div className="space-y-2">
                                  <Label htmlFor="agent_name">Tên đại lý</Label>
                                  <Input
                                    id="agent_name"
                                    value={editForm.agent_name}
                                    onChange={(e) => setEditForm(prev => ({ ...prev, agent_name: e.target.value }))}
                                    placeholder="Nhập tên đại lý"
                                  />
                                </div>

                                <div className="space-y-2">
                                  <Label htmlFor="address">Địa chỉ</Label>
                                  <Input
                                    id="address"
                                    value={editForm.address}
                                    onChange={(e) => setEditForm(prev => ({ ...prev, address: e.target.value }))}
                                    placeholder="Nhập địa chỉ"
                                  />
                                </div>

                                <div className="space-y-2">
                                  <Label htmlFor="business_number">Mã số doanh nghiệp (사업자번호)</Label>
                                  <Input
                                    id="business_number"
                                    value={editForm.business_number}
                                    onChange={(e) => setEditForm(prev => ({ ...prev, business_number: e.target.value }))}
                                    placeholder="Nhập mã số doanh nghiệp"
                                  />
                                </div>

                                <div className="space-y-2">
                                  <Label htmlFor="banner">Banner (URL hình ảnh)</Label>
                                  <Input
                                    id="banner"
                                    value={editForm.banner}
                                    onChange={(e) => setEditForm(prev => ({ ...prev, banner: e.target.value }))}
                                    placeholder="Nhập URL banner của đại lý"
                                  />
                                  {editForm.banner && (
                                    <div className="mt-2">
                                      <img 
                                        src={editForm.banner} 
                                        alt="Banner preview" 
                                        className="max-h-32 rounded-md object-cover"
                                        onError={(e) => {
                                          (e.target as HTMLImageElement).style.display = 'none';
                                        }}
                                      />
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor="price_markup">Phí cộng thêm chung (KRW)</Label>
                                <Input
                                  id="price_markup"
                                  type="number"
                                  value={editForm.price_markup}
                                  onChange={(e) => setEditForm(prev => ({ ...prev, price_markup: parseFloat(e.target.value) || 0 }))}
                                  placeholder="10000"
                                  min="0"
                                  step="1000"
                                />
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor="price_vj">Phí VietJet (KRW)</Label>
                                <Input
                                  id="price_vj"
                                  type="number"
                                  value={editForm.price_vj}
                                  onChange={(e) => setEditForm(prev => ({ ...prev, price_vj: parseFloat(e.target.value) || 0 }))}
                                  placeholder="0"
                                  min="0"
                                  step="1000"
                                />
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor="price_vna">Phí Vietnam Airlines (KRW)</Label>
                                <Input
                                  id="price_vna"
                                  type="number"
                                  value={editForm.price_vna}
                                  onChange={(e) => setEditForm(prev => ({ ...prev, price_vna: parseFloat(e.target.value) || 0 }))}
                                  placeholder="0"
                                  min="0"
                                  step="1000"
                                />
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor="price_ow_vj">Phí VJ 1 chiều (KRW)</Label>
                                <Input
                                  id="price_ow_vj"
                                  type="number"
                                  value={editForm.price_ow_vj}
                                  onChange={(e) => setEditForm(prev => ({ ...prev, price_ow_vj: parseFloat(e.target.value) || 0 }))}
                                  placeholder="0"
                                  min="0"
                                  step="1000"
                                />
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor="price_rt_vj">Phí VJ khứ hồi (KRW)</Label>
                                <Input
                                  id="price_rt_vj"
                                  type="number"
                                  value={editForm.price_rt_vj}
                                  onChange={(e) => setEditForm(prev => ({ ...prev, price_rt_vj: parseFloat(e.target.value) || 0 }))}
                                  placeholder="0"
                                  min="0"
                                  step="1000"
                                />
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor="price_ow_vna">Phí VNA 1 chiều (KRW)</Label>
                                <Input
                                  id="price_ow_vna"
                                  type="number"
                                  value={editForm.price_ow_vna}
                                  onChange={(e) => setEditForm(prev => ({ ...prev, price_ow_vna: parseFloat(e.target.value) || 0 }))}
                                  placeholder="0"
                                  min="0"
                                  step="1000"
                                />
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor="price_rt_vna">Phí VNA khứ hồi (KRW)</Label>
                                <Input
                                  id="price_rt_vna"
                                  type="number"
                                  value={editForm.price_rt_vna}
                                  onChange={(e) => setEditForm(prev => ({ ...prev, price_rt_vna: parseFloat(e.target.value) || 0 }))}
                                  placeholder="0"
                                  min="0"
                                  step="1000"
                                />
                              </div>

                              {/* Permissions Section */}
                              <div className="space-y-4 pt-4 border-t">
                                <h3 className="text-lg font-semibold">Phân quyền tính năng</h3>
                                
                                <div className="flex items-center justify-between">
                                  <Label htmlFor="perm_check_vj">Check vé VJ</Label>
                                  <Switch
                                    id="perm_check_vj"
                                    checked={editForm.perm_check_vj}
                                    onCheckedChange={(checked) => setEditForm(prev => ({ ...prev, perm_check_vj: checked }))}
                                  />
                                </div>

                                <div className="flex items-center justify-between">
                                  <Label htmlFor="perm_check_vna">Check vé VNA</Label>
                                  <Switch
                                    id="perm_check_vna"
                                    checked={editForm.perm_check_vna}
                                    onCheckedChange={(checked) => setEditForm(prev => ({ ...prev, perm_check_vna: checked }))}
                                  />
                                </div>

                                <div className="flex items-center justify-between">
                                  <Label htmlFor="perm_send_ticket">Gửi mặt vé</Label>
                                  <Switch
                                    id="perm_send_ticket"
                                    checked={editForm.perm_send_ticket}
                                    onCheckedChange={(checked) => setEditForm(prev => ({ ...prev, perm_send_ticket: checked }))}
                                  />
                                </div>

                                <div className="flex items-center justify-between">
                                  <Label htmlFor="perm_get_ticket_image">Lấy ảnh mặt vé</Label>
                                  <Switch
                                    id="perm_get_ticket_image"
                                    checked={editForm.perm_get_ticket_image}
                                    onCheckedChange={(checked) => setEditForm(prev => ({ ...prev, perm_get_ticket_image: checked }))}
                                  />
                                </div>

                                <div className="flex items-center justify-between">
                                  <Label htmlFor="perm_get_pending_ticket">Lấy mặt vé chờ</Label>
                                  <Switch
                                    id="perm_get_pending_ticket"
                                    checked={editForm.perm_get_pending_ticket}
                                    onCheckedChange={(checked) => setEditForm(prev => ({ ...prev, perm_get_pending_ticket: checked }))}
                                  />
                                </div>

                                <div className="flex items-center justify-between">
                                  <Label htmlFor="perm_check_discount">Tool check vé giảm</Label>
                                  <Switch
                                    id="perm_check_discount"
                                    checked={editForm.perm_check_discount}
                                    onCheckedChange={(checked) => setEditForm(prev => ({ ...prev, perm_check_discount: checked }))}
                                  />
                                </div>

                                <div className="flex items-center justify-between">
                                  <Label htmlFor="perm_check_vna_issued">Check vé đã xuất VNA</Label>
                                  <Switch
                                    id="perm_check_vna_issued"
                                    checked={editForm.perm_check_vna_issued}
                                    onCheckedChange={(checked) => setEditForm(prev => ({ ...prev, perm_check_vna_issued: checked }))}
                                  />
                                </div>

                                <div className="space-y-2">
                                  <Label htmlFor="hold_ticket_quantity">
                                    Giữ vé (Tối đa: {editForm.hold_ticket_quantity || 0})
                                  </Label>
                                  <Input
                                    id="hold_ticket_quantity"
                                    type="number"
                                    min="0"
                                    value={editForm.hold_ticket_quantity || 0}
                                    onChange={(e) => setEditForm(prev => ({ ...prev, hold_ticket_quantity: parseInt(e.target.value) || 0 }))}
                                    placeholder="0 = tắt, >0 = số vé tối đa"
                                  />
                                 </div>
                               </div>

                              {/* Telegram Settings */}
                              <div className="space-y-4 pt-4 border-t">
                                <h3 className="text-lg font-semibold">Cài đặt Telegram</h3>
                                
                                <div className="space-y-2">
                                  <Label htmlFor="apikey_telegram">API Key Bot Telegram</Label>
                                  <Input
                                    id="apikey_telegram"
                                    value={editForm.apikey_telegram}
                                    onChange={(e) => setEditForm(prev => ({ ...prev, apikey_telegram: e.target.value }))}
                                    placeholder="Nhập API Key của bot Telegram"
                                  />
                                </div>

                                <div className="space-y-2">
                                  <Label htmlFor="idchat_telegram">ID Chat Telegram</Label>
                                  <Input
                                    id="idchat_telegram"
                                    value={editForm.idchat_telegram}
                                    onChange={(e) => setEditForm(prev => ({ ...prev, idchat_telegram: e.target.value }))}
                                    placeholder="Nhập ID nhóm chat Telegram"
                                  />
                                </div>
                              </div>

                              <div className="space-y-2">
                                <Label htmlFor="status">Trạng thái</Label>
                                <select
                                  id="status"
                                  value={editForm.status}
                                  onChange={(e) => setEditForm(prev => ({ ...prev, status: e.target.value }))}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700"
                                >
                                  <option value="pending">Pending</option>
                                  <option value="active">Active</option>
                                  <option value="inactive">Inactive</option>
                                </select>
                              </div>
                              <Button onClick={handleUpdateProfile} className="w-full">
                                Cập nhật
                              </Button>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
