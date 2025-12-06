import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

import { PassengerInfo } from '@/components/VJBookingModal';

interface VNAPassengerInfo extends PassengerInfo {
  type: 'người_lớn' | 'trẻ_em';
  infant?: PassengerInfo;
}

interface VNABookingModalPriceMonitorProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'save';
  initialPassengers?: VNAPassengerInfo[];
  onSavePassengers: (passengers: VNAPassengerInfo[]) => void;
  doiTuong: 'VFR' | 'ADT' | 'STU';
}

export const VNABookingModalPriceMonitor = ({
  isOpen,
  onClose,
  initialPassengers,
  onSavePassengers,
  doiTuong: initialDoiTuong
}: VNABookingModalPriceMonitorProps) => {
  const [passengers, setPassengers] = useState<VNAPassengerInfo[]>(
    initialPassengers || [
      {
        Họ: '',
        Tên: '',
        Giới_tính: 'nam',
        type: 'người_lớn',
        Hộ_chiếu: 'B12345678',
        Quốc_tịch: 'VN'
      }
    ]
  );
  const [doiTuong, setDoiTuong] = useState<'VFR' | 'ADT' | 'STU'>(initialDoiTuong);

  useEffect(() => {
    if (initialPassengers && initialPassengers.length > 0) {
      setPassengers(initialPassengers);
    }
  }, [initialPassengers]);

  const handlePassengerChange = (index: number, field: 'Họ' | 'Tên' | 'Giới_tính' | 'type' | 'Hộ_chiếu' | 'Quốc_tịch', value: string | 'nam' | 'nữ' | 'người_lớn' | 'trẻ_em') => {
    const newPassengers = [...passengers];
    if (field === 'Giới_tính') {
      newPassengers[index][field] = value as 'nam' | 'nữ';
    } else if (field === 'type') {
      newPassengers[index][field] = value as 'người_lớn' | 'trẻ_em';
      // Remove infant if changing to child
      if (value === 'trẻ_em') {
        delete newPassengers[index].infant;
      }
    } else {
      newPassengers[index][field] = value as string;
    }
    setPassengers(newPassengers);
  };

  const addPassenger = () => {
    setPassengers([
      ...passengers,
      {
        Họ: '',
        Tên: '',
        Giới_tính: 'nam',
        type: 'người_lớn',
        Hộ_chiếu: 'B12345678',
        Quốc_tịch: 'VN'
      }
    ]);
  };

  const removePassenger = (index: number) => {
    if (passengers.length === 1) {
      toast({
        title: "Lỗi",
        description: "Phải có ít nhất 1 hành khách",
        variant: "destructive"
      });
      return;
    }
    setPassengers(passengers.filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
    try {
      // Validate
      for (const passenger of passengers) {
        if (!passenger.Họ.trim() || !passenger.Tên.trim()) {
          throw new Error("Vui lòng điền đầy đủ thông tin hành khách");
        }
        // Validate infant if present
        if (passenger.infant && (passenger.infant.Họ || passenger.infant.Tên)) {
          if (!passenger.infant.Họ.trim() || !passenger.infant.Tên.trim()) {
            throw new Error("Vui lòng điền đầy đủ thông tin trẻ sơ sinh");
          }
        }
      }

      onSavePassengers(passengers);
      toast({
        title: "Đã lưu thông tin hành khách",
        description: "Thông tin đã được lưu thành công",
      });
      onClose();
    } catch (error: any) {
      toast({
        title: "Lỗi",
        description: error.message || "Vui lòng kiểm tra lại thông tin",
        variant: "destructive"
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Thông Tin Hành Khách - Giữ Vé VNA</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div>
            <Label>Đối tượng</Label>
            <Select value={doiTuong} onValueChange={(v: 'VFR' | 'ADT' | 'STU') => setDoiTuong(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="VFR">VFR</SelectItem>
                <SelectItem value="ADT">ADT</SelectItem>
                <SelectItem value="STU">STU</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {passengers.map((passenger, index) => (
            <div key={index} className="border rounded-lg p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Hành khách {index + 1}</h3>
                {passengers.length > 1 && (
                  <Button variant="destructive" size="sm" onClick={() => removePassenger(index)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Họ</Label>
                  <Input
                    value={passenger.Họ}
                    onChange={(e) => handlePassengerChange(index, 'Họ', e.target.value)}
                    placeholder="PHAM"
                  />
                </div>
                <div>
                  <Label>Tên</Label>
                  <Input
                    value={passenger.Tên}
                    onChange={(e) => handlePassengerChange(index, 'Tên', e.target.value)}
                    placeholder="THI NGANG"
                  />
                </div>
                <div>
                  <Label>Giới tính</Label>
                  <Select
                    value={passenger.Giới_tính}
                    onValueChange={(v: 'nam' | 'nữ') => handlePassengerChange(index, 'Giới_tính', v)}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="nam">Nam (MR)</SelectItem>
                      <SelectItem value="nữ">Nữ (MS)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Loại khách</Label>
                  <Select
                    value={passenger.type}
                    onValueChange={(v: 'người_lớn' | 'trẻ_em') => handlePassengerChange(index, 'type', v)}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="người_lớn">Người lớn (ADT)</SelectItem>
                      <SelectItem value="trẻ_em">Trẻ em (CHD)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Infant section - only for adults */}
              {passenger.type === 'người_lớn' && (
                <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Trẻ sơ sinh (INF) - Kèm theo người lớn</Label>
                    {passenger.infant && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          const newPassengers = [...passengers];
                          delete newPassengers[index].infant;
                          setPassengers(newPassengers);
                        }}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <Label className="text-xs">Họ</Label>
                      <Input
                        value={passenger.infant?.Họ || ''}
                        onChange={(e) => {
                          const newPassengers = [...passengers];
                          if (!newPassengers[index].infant) {
                            newPassengers[index].infant = { 
                              Họ: '', 
                              Tên: '', 
                              Giới_tính: 'nam',
                              Hộ_chiếu: 'B12345678',
                              Quốc_tịch: 'VN'
                            };
                          }
                          newPassengers[index].infant!.Họ = e.target.value;
                          setPassengers(newPassengers);
                        }}
                        placeholder="NGUYEN"
                        className="h-9"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Tên</Label>
                      <Input
                        value={passenger.infant?.Tên || ''}
                        onChange={(e) => {
                          const newPassengers = [...passengers];
                          if (!newPassengers[index].infant) {
                            newPassengers[index].infant = { 
                              Họ: '', 
                              Tên: '', 
                              Giới_tính: 'nam',
                              Hộ_chiếu: 'B12345678',
                              Quốc_tịch: 'VN'
                            };
                          }
                          newPassengers[index].infant!.Tên = e.target.value;
                          setPassengers(newPassengers);
                        }}
                        placeholder="TIEU VU"
                        className="h-9"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Giới tính</Label>
                      <Select
                        value={passenger.infant?.Giới_tính || 'nam'}
                        onValueChange={(v: 'nam' | 'nữ') => {
                          const newPassengers = [...passengers];
                          if (!newPassengers[index].infant) {
                            newPassengers[index].infant = { 
                              Họ: '', 
                              Tên: '', 
                              Giới_tính: 'nam',
                              Hộ_chiếu: 'B12345678',
                              Quốc_tịch: 'VN'
                            };
                          }
                          newPassengers[index].infant!.Giới_tính = v;
                          setPassengers(newPassengers);
                        }}
                      >
                        <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="nam">MSTR</SelectItem>
                          <SelectItem value="nữ">MISS</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}

          <Button variant="outline" onClick={addPassenger} className="w-full">
            <Plus className="w-4 h-4 mr-2" /> Thêm hành khách
          </Button>

          <Button className="w-full" onClick={handleSubmit}>
            Lưu thông tin
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
