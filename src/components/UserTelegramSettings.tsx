import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Bell } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

export const UserTelegramSettings = () => {
  const { user, profile } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [apikey, setApikey] = useState('');
  const [idchat, setIdchat] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && profile) {
      setApikey(profile.apikey_telegram || '');
      setIdchat(profile.idchat_telegram || '');
    }
  }, [isOpen, profile]);

  const handleSave = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          apikey_telegram: apikey || null,
          idchat_telegram: idchat || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (error) throw error;

      toast({
        title: "Thành công",
        description: "Đã cập nhật cài đặt Telegram",
      });
      setIsOpen(false);
    } catch (error) {
      console.error('Error updating telegram settings:', error);
      toast({
        variant: "destructive",
        title: "Lỗi",
        description: "Không thể cập nhật cài đặt Telegram",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Bell className="w-4 h-4 mr-2" />
          Cài đặt Telegram
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Cài đặt thông báo Telegram</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="apikey_telegram">API Key Bot Telegram</Label>
            <Input
              id="apikey_telegram"
              value={apikey}
              onChange={(e) => setApikey(e.target.value)}
              placeholder="Nhập API Key của bot Telegram"
            />
            <p className="text-xs text-muted-foreground">
              Lấy API key từ @BotFather trên Telegram
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="idchat_telegram">ID Chat Telegram</Label>
            <Input
              id="idchat_telegram"
              value={idchat}
              onChange={(e) => setIdchat(e.target.value)}
              placeholder="Nhập ID nhóm chat Telegram"
            />
            <p className="text-xs text-muted-foreground">
              ID của nhóm hoặc kênh để nhận thông báo
            </p>
          </div>

          <Button onClick={handleSave} disabled={loading} className="w-full">
            {loading ? 'Đang lưu...' : 'Lưu cài đặt'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};