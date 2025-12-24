
import React, { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { User, LogOut, Key, Loader2, Lock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export const UserProfileDropdown = () => {
  const { profile, signOut, updatePassword } = useAuth();
  const { toast } = useToast();
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    newPassword: '',
    confirmPassword: '',
  });
  const [loading, setLoading] = useState(false);

  const formatPriceMarkup = (markup: number | null) => {
    if (!markup || markup === 0) return '0W';
    return new Intl.NumberFormat('ko-KR').format(markup) + 'W';
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (passwordForm.newPassword.length < 6) {
      toast({
        variant: "destructive",
        title: "Lỗi",
        description: "Mật khẩu phải có ít nhất 6 ký tự",
      });
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast({
        variant: "destructive",
        title: "Lỗi",
        description: "Mật khẩu xác nhận không khớp",
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await updatePassword(passwordForm.newPassword);
      if (error) {
        toast({
          variant: "destructive",
          title: "Lỗi",
          description: error.message,
        });
      } else {
        toast({
          title: "Thành công",
          description: "Mật khẩu đã được thay đổi",
        });
        setShowChangePassword(false);
        setPasswordForm({ newPassword: '', confirmPassword: '' });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Có lỗi xảy ra",
        description: "Vui lòng thử lại sau.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="transition-all duration-200 hover:scale-105">
            <User className="w-4 h-4 mr-2" />
            {profile?.full_name || profile?.email}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent 
          align="end" 
          className="w-64 transition-all duration-200 animate-fade-in"
        >
          <DropdownMenuLabel className="transition-colors duration-200">
            Thông tin tài khoản
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem disabled className="transition-colors duration-200">
            <div className="flex flex-col space-y-1">
              <span className="text-sm font-medium">
                {profile?.full_name || 'Chưa có tên'}
              </span>
              <span className="text-xs text-gray-500">
                {profile?.email}
              </span>
              <span className="text-xs text-blue-600 font-semibold">
                Phí chung: {formatPriceMarkup(profile?.price_markup)}
              </span>
            </div>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem 
            onClick={() => setShowChangePassword(true)}
            className="transition-all duration-200 hover:bg-blue-50 focus:bg-blue-50"
          >
            <Key className="w-4 h-4 mr-2" />
            Đổi mật khẩu
          </DropdownMenuItem>
          <DropdownMenuItem 
            onClick={signOut}
            className="transition-all duration-200 hover:bg-red-50 focus:bg-red-50"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Đăng xuất
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Change Password Dialog */}
      <Dialog open={showChangePassword} onOpenChange={setShowChangePassword}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Đổi mật khẩu</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">Mật khẩu mới</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="new-password"
                  type="password"
                  placeholder="••••••••"
                  className="pl-10"
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-new-password">Xác nhận mật khẩu mới</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="confirm-new-password"
                  type="password"
                  placeholder="••••••••"
                  className="pl-10"
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                  required
                />
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setShowChangePassword(false);
                  setPasswordForm({ newPassword: '', confirmPassword: '' });
                }}
              >
                Hủy
              </Button>
              <Button type="submit" className="flex-1" disabled={loading}>
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'Lưu mật khẩu'
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};
