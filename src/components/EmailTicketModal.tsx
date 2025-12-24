import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

interface EmailTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const EmailTicketModal = ({ isOpen, onClose }: EmailTicketModalProps) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    tenKhach: '',
    xungHo: 'bạn',
    sdt: '',
    guiChung: true,
    pnrs: '',
    banner:''
  });
  const [isLoading, setIsLoading] = useState(false);

  // Load user's saved banner when modal opens
  useEffect(() => {
    if (isOpen && user) {
      const loadUserBanner = async () => {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('banner')
          .eq('id', user.id)
          .single();
        
        if (profile?.banner) {
          setFormData(prev => ({
            ...prev,
            banner: profile.banner
          }));
        }
      };
      
      loadUserBanner();
    }
  }, [isOpen, user]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSelectChange = (value: string) => {
    setFormData(prev => ({
      ...prev,
      xungHo: value
    }));
  };

  const handleSwitchChange = (checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      guiChung: checked
    }));
  };

  const handleClose = () => {
    // Reset form to default values
    setFormData({
      email: '',
      tenKhach: '',
      xungHo: 'bạn',
      sdt: '',
      guiChung: true,
      pnrs: '',
      banner:''
    });
    onClose();
  };

  const parsePNRs = (pnrString: string): string[] => {
    return pnrString
      .split(/[\s\-;]+/)
      .map(pnr => pnr.trim())
      .filter(pnr => pnr.length === 6);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation
    if (!formData.email || !formData.tenKhach || !formData.xungHo || !formData.pnrs) {
      toast.error('Vui lòng điền đầy đủ thông tin bắt buộc');
      return;
    }

    const pnrs = parsePNRs(formData.pnrs);
    if (pnrs.length === 0) {
      toast.error('Vui lòng nhập ít nhất một mã PNR hợp lệ (6 ký tự)');
      return;
    }

    setIsLoading(true);
    
    try {
      const requestBody = {
        khachHang: [
          {
            pnrs: pnrs,
            email: formData.email,
            tenKhach: formData.tenKhach,
            xungHo: formData.xungHo,
            sdt: formData.sdt,
            guiChung: formData.guiChung,
            banner:formData.banner
          }
        ]
      };

      const response = await fetch('https://thuhongtour.com/proxy-gas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });
      
      const result = await response.json();
      
      
      
      
      if (result?.status === 'success') {
        // Save banner to user profile for future use
        if (user && formData.banner) {
          await supabase
            .from('profiles')
            .update({ banner: formData.banner })
            .eq('id', user.id);
        }
        
        toast.success('Đã thêm hàng chờ gửi mail thành công', {
          duration: 5000,
          style: {
            fontSize: '16px',
            padding: '16px'
          }
        });
        handleClose();
      } else {
        toast.error('Có lỗi xảy ra khi gửi yêu cầu');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Có lỗi xảy ra khi gửi yêu cầu');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto animate-fade-in duration-800">
        <DialogHeader className="animate-fade-in duration-900">
          <DialogTitle>Gửi Email Mặt Vé</DialogTitle>
          <DialogDescription>
            Điền thông tin để gửi email thông tin vé máy bay
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 animate-fade-in duration-1200">
          <div className="space-y-2">
            <Label htmlFor="email">Email người nhận *</Label>
            <Input
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleInputChange}
              placeholder="example@email.com"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="tenKhach">Tên khách hàng *</Label>
            <Input
              id="tenKhach"
              name="tenKhach"
              value={formData.tenKhach}
              onChange={handleInputChange}
              placeholder="Nguyễn Văn A"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="xungHo">Xưng hô *</Label>
            <Select value={formData.xungHo} onValueChange={handleSelectChange}>
              <SelectTrigger>
                <SelectValue placeholder="Chọn xưng hô" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="anh">Anh</SelectItem>
                <SelectItem value="chị">Chị</SelectItem>
                <SelectItem value="bạn">Bạn</SelectItem>
                <SelectItem value="cô">Cô</SelectItem>
                <SelectItem value="chú">Chú</SelectItem>
                <SelectItem value="bác">Bác</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="sdt">Số điện thoại</Label>
            <Input
              id="sdt"
              name="sdt"
              value={formData.sdt}
              onChange={handleInputChange}
              placeholder="0901234567"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="pnrs">Mã PNR *</Label>
            <Input
              id="pnrs"
              name="pnrs"
              value={formData.pnrs}
              onChange={handleInputChange}
              placeholder="ABC123 DEF456 hoặc ABC123-DEF456 hoặc ABC123;DEF456"
              required
            />
            <p className="text-sm text-muted-foreground">
              Nhập một hoặc nhiều mã PNR (6 ký tự mỗi mã), phân tách bằng dấu cách, - hoặc ;
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="banner">Banner đại lý *</Label>
            <Textarea
              id="banner"
              name="banner"
              value={formData.banner}
              onChange={handleInputChange}
              placeholder="Banner thông tin đại lý"
              required
              rows={4}
            />
            <p className="text-sm text-muted-foreground">
               
            </p>
          </div>  
          <div className="flex items-center space-x-2">
            <Switch
              id="guiChung"
              checked={formData.guiChung}
              onCheckedChange={handleSwitchChange}
            />
            <Label htmlFor="guiChung">{formData.guiChung ? 'Gửi chung' : 'Gửi riêng từng Pax'}</Label>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={handleClose}>
              Hủy
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Đang gửi...' : 'Gửi Email'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
