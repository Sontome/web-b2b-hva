import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Copy } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { saveHeldTicket, resolveAirlineCode } from '@/utils/heldTickets';
import { useAuth } from '@/hooks/useAuth';

type PaxType = 'ADT' | 'CHD' | 'INF';

interface PaxRow {
  type: PaxType;
  Họ: string;
  Tên: string;
  Giới_tính: 'NAM' | 'NU';
  birthday: string;
}

interface OtherBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  hang: string;
  fromCode: string;
  toCode: string;
  depDate: string;        // yyyy-MM-dd or yyyy/MM/dd
  arrDate?: string;       // yyyy-MM-dd or yyyy/MM/dd (RT)
  indexId: string;        // id of chiều_đi
  tripType: 'OW' | 'RT';
  adults: number;
  children: number;
  infants: number;
  maxSeats: number;
  onBookingSuccess?: (pnr: string) => void;
}

const removeVietnameseDiacritics = (str: string) => {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D');
};

const formatName = (name: string, isLastName = false) => {
  let formatted = removeVietnameseDiacritics(name.trim());
  if (isLastName) {
    formatted = formatted.split(' ')[0];
    return formatted.toUpperCase();
  }
  return formatted.toUpperCase();
};

const normalizeDate = (d: string) => {
  if (!d) return '';
  // accept yyyy-MM-dd or yyyy/MM/dd or dd/MM/yyyy
  if (/^\d{4}[-/]\d{2}[-/]\d{2}$/.test(d)) return d.replace(/-/g, '/');
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(d)) {
    const [dd, mm, yyyy] = d.split('/');
    return `${yyyy}/${mm}/${dd}`;
  }
  return d;
};

// Convert yyyy-MM-dd input to yyyyMMdd for API
const formatBirthday = (date: string): string => {
  if (!date) return '';
  return date.replace(/-/g, '').replace(/\//g, '');
};

// Compute age relative to a reference date (flight departure)
const getAge = (birthday: string, refDateStr: string): number => {
  if (!birthday) return -1;
  const bd = new Date(birthday);
  if (isNaN(bd.getTime())) return -1;
  // Parse refDate from yyyy/MM/dd or yyyy-MM-dd
  const ref = refDateStr ? new Date(refDateStr.replace(/\//g, '-')) : new Date();
  if (isNaN(ref.getTime())) return -1;
  let age = ref.getFullYear() - bd.getFullYear();
  const m = ref.getMonth() - bd.getMonth();
  if (m < 0 || (m === 0 && ref.getDate() < bd.getDate())) age--;
  return age;
};

const buildInitial = (adults: number, children: number, infants: number): PaxRow[] => {
  const rows: PaxRow[] = [];
  for (let i = 0; i < adults; i++) rows.push({ type: 'ADT', Họ: '', Tên: '', Giới_tính: 'NAM', birthday: '' });
  for (let i = 0; i < children; i++) rows.push({ type: 'CHD', Họ: '', Tên: '', Giới_tính: 'NAM', birthday: '' });
  for (let i = 0; i < infants; i++) rows.push({ type: 'INF', Họ: '', Tên: '', Giới_tính: 'NAM', birthday: '' });
  if (rows.length === 0) rows.push({ type: 'ADT', Họ: '', Tên: '', Giới_tính: 'NAM', birthday: '' });
  return rows;
};

export const OtherBookingModal = ({
  isOpen,
  onClose,
  hang,
  fromCode,
  toCode,
  depDate,
  arrDate,
  indexId,
  tripType,
  adults,
  children,
  infants,
  maxSeats,
  onBookingSuccess,
}: OtherBookingModalProps) => {
  const { user } = useAuth();
  const [passengers, setPassengers] = useState<PaxRow[]>(buildInitial(adults, children, infants));
  const [phoneKakao, setPhoneKakao] = useState('');
  const [emailKakao, setEmailKakao] = useState('');
  const [emailError, setEmailError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [successData, setSuccessData] = useState<{ code: string; deadline: string } | null>(null);

  const expectedAdt = adults;
  const expectedChd = children;
  const expectedInf = infants;
  const expectedTotal = expectedAdt + expectedChd + expectedInf;

  const counts = passengers.reduce(
    (acc, p) => {
      acc[p.type] += 1;
      return acc;
    },
    { ADT: 0, CHD: 0, INF: 0 } as Record<PaxType, number>
  );

  const handleChange = (idx: number, field: keyof PaxRow, value: string) => {
    const next = [...passengers];
    (next[idx] as any)[field] = value;
    setPassengers(next);
  };

  const addPax = (type: PaxType) => {
    if (passengers.length >= maxSeats && type !== 'INF') {
      toast({ title: 'Lỗi', description: `Số khách không vượt quá ${maxSeats} ghế còn lại`, variant: 'destructive' });
      return;
    }
    setPassengers([...passengers, { type, Họ: '', Tên: '', Giới_tính: 'NAM', birthday: '' }]);
  };

  const removePax = (idx: number) => {
    if (passengers.length === 1) {
      toast({ title: 'Lỗi', description: 'Phải có ít nhất 1 hành khách', variant: 'destructive' });
      return;
    }
    setPassengers(passengers.filter((_, i) => i !== idx));
  };

  const validateEmail = (email: string) => !email.trim() || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  const handleSubmit = async () => {
    try {
      if (emailKakao.trim() && !validateEmail(emailKakao)) {
        throw new Error('Email không đúng định dạng');
      }

      // Strict pax counts validation per request
      if (
        counts.ADT !== expectedAdt ||
        counts.CHD !== expectedChd ||
        counts.INF !== expectedInf
      ) {
        throw new Error(
          `Số hành khách phải đúng: ${expectedAdt} người lớn, ${expectedChd} trẻ em, ${expectedInf} em bé (hiện ${counts.ADT}/${counts.CHD}/${counts.INF})`
        );
      }

      // Validate birthday & age vs flight departure date
      const refDep = normalizeDate(depDate);
      passengers.forEach((p, i) => {
        if (!p.birthday) {
          throw new Error(`Hành khách ${i + 1}: vui lòng nhập ngày sinh`);
        }
        const age = getAge(p.birthday, refDep);
        if (age < 0) throw new Error(`Hành khách ${i + 1}: ngày sinh không hợp lệ`);
        if (p.type === 'CHD' && (age < 2 || age >= 12)) {
          throw new Error(`Hành khách ${i + 1} là Trẻ em, tuổi phải từ 2 đến dưới 12 (hiện ${age})`);
        }
        if (p.type === 'INF' && age >= 2) {
          throw new Error(`Hành khách ${i + 1} là Em bé, tuổi phải dưới 2 (hiện ${age})`);
        }
      });

      const customer = passengers.map((p) => {
        const lastname = formatName(p.Họ, true);
        const firstname = formatName(p.Tên, false);
        if (!lastname || !firstname) throw new Error('Vui lòng điền đầy đủ Họ và Tên cho mọi hành khách');
        if (lastname.includes(' ')) throw new Error('Họ chỉ được phép có 1 từ');
        return {
          type: p.type,
          gender: p.Giới_tính,
          firstname,
          lastname,
          birthday: formatBirthday(p.birthday),
        };
      });

      let phone = phoneKakao.trim();
      if (phone && !phone.startsWith('0')) phone = '0' + phone;

      const body: Record<string, any> = {
        hang,
        from_code: fromCode,
        to_code: toCode,
        dep_date: normalizeDate(depDate),
        arr_date: tripType === 'RT' ? normalizeDate(arrDate || '') : '',
        index: String(indexId),
        customer,
      };
      if (phone) body.phonekakao = phone;
      if (emailKakao.trim()) body.emailkakao = emailKakao.trim();

      setIsLoading(true);
      const res = await fetch('https://apilive.hanvietair.com/other/booking', {
        method: 'POST',
        headers: { accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const code = data.mã_giữ_vé || data.pnr || data.status_code;
      const deadline = data.hạn_thanh_toán || data.message || '';
      if (code) {
        setSuccessData({ code, deadline });
        try {
          const namelist = passengers.map((p) => `${p.Họ} ${p.Tên}`.trim().toUpperCase());
          const toIso = (s: string) => {
            if (!s) return '';
            if (/^\d{4}[-/]\d{2}[-/]\d{2}$/.test(s)) return s.replace(/\//g, '-');
            if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) {
              const [dd, mm, yyyy] = s.split('/');
              return `${yyyy}-${mm}-${dd}`;
            }
            return s;
          };
          const segs = [{
            segment_order: 1,
            departure_airport: fromCode,
            arrival_airport: toCode,
            departure_date: toIso(depDate),
            departure_time: '',
            trip: `${fromCode}-${toCode}`,
          }];
          if (tripType === 'RT' && arrDate) {
            segs.push({
              segment_order: 2,
              departure_airport: toCode,
              arrival_airport: fromCode,
              departure_date: toIso(arrDate),
              departure_time: '',
              trip: `${toCode}-${fromCode}`,
            });
          }
          if (user?.id) {
            await saveHeldTicket({
              user_id: user.id,
              pnr: code,
              airline: resolveAirlineCode(hang),
              namelist,
              segments: segs,
              expire_date: typeof deadline === 'string' ? deadline : null,
            });
          }
        } catch (e) {
          console.error('[saveHeldTicket OTHER]', e);
        }
        if (onBookingSuccess) {
          setTimeout(() => {
            setSuccessData(null);
            onClose();
            onBookingSuccess(code);
          }, 100);
        }
      } else {
        toast({
          title: 'Lỗi giữ vé',
          description: data.mess || data.message || 'Không thể giữ vé. Vui lòng thử lại.',
          variant: 'destructive',
          duration: 10000,
        });
      }
    } catch (err: any) {
      toast({ title: 'Lỗi', description: err.message || 'Không thể giữ vé', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Giữ Vé - {hang} ({fromCode} → {toCode})</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="text-xs text-muted-foreground">
              Yêu cầu: <b>{expectedAdt}</b> người lớn, <b>{expectedChd}</b> trẻ em, <b>{expectedInf}</b> em bé
              (tổng <b>{expectedTotal}</b>). Hiện có: {counts.ADT}/{counts.CHD}/{counts.INF}.
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Phone/Kakao (không bắt buộc)</Label>
                <Input
                  value={phoneKakao}
                  onChange={(e) => setPhoneKakao(e.target.value.replace(/\D/g, ''))}
                  placeholder="VD: 0901234567"
                />
              </div>
              <div>
                <Label>Email (không bắt buộc)</Label>
                <Input
                  type="email"
                  value={emailKakao}
                  onChange={(e) => {
                    setEmailKakao(e.target.value);
                    setEmailError(e.target.value.trim() && !validateEmail(e.target.value) ? 'Email không đúng định dạng' : '');
                  }}
                  placeholder="VD: example@gmail.com"
                />
                {emailError && <p className="text-xs text-destructive mt-1">{emailError}</p>}
              </div>
            </div>

            {passengers.map((p, idx) => (
              <div key={idx} className="border rounded-lg p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-sm">
                    Hành khách {idx + 1} ({p.type === 'ADT' ? 'Người lớn' : p.type === 'CHD' ? 'Trẻ em' : 'Em bé'})
                  </h3>
                  {passengers.length > 1 && (
                    <Button variant="destructive" size="sm" onClick={() => removePax(idx)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  <div>
                    <Label>Họ</Label>
                    <Input value={p.Họ} onChange={(e) => handleChange(idx, 'Họ', e.target.value)} placeholder="NGUYEN" />
                  </div>
                  <div>
                    <Label>Tên</Label>
                    <Input value={p.Tên} onChange={(e) => handleChange(idx, 'Tên', e.target.value)} placeholder="VAN A" />
                  </div>
                  <div>
                    <Label>Giới tính</Label>
                    <Select value={p.Giới_tính} onValueChange={(v: 'NAM' | 'NU') => handleChange(idx, 'Giới_tính', v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="NAM">Nam</SelectItem>
                        <SelectItem value="NU">Nữ</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Loại khách</Label>
                    <Select value={p.type} onValueChange={(v: PaxType) => handleChange(idx, 'type', v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ADT">Người lớn</SelectItem>
                        <SelectItem value="CHD">Trẻ em</SelectItem>
                        <SelectItem value="INF">Em bé</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Ngày sinh</Label>
                    <Input
                      type="date"
                      value={p.birthday}
                      onChange={(e) => handleChange(idx, 'birthday', e.target.value)}
                    />
                  </div>
                </div>
              </div>
            ))}

            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => addPax('ADT')}>
                <Plus className="w-4 h-4 mr-1" /> Người lớn
              </Button>
              <Button variant="outline" size="sm" onClick={() => addPax('CHD')}>
                <Plus className="w-4 h-4 mr-1" /> Trẻ em
              </Button>
              <Button variant="outline" size="sm" onClick={() => addPax('INF')}>
                <Plus className="w-4 h-4 mr-1" /> Em bé
              </Button>
            </div>

            <Button className="w-full" onClick={handleSubmit} disabled={isLoading}>
              {isLoading ? 'Đang giữ vé...' : 'Giữ vé ngay'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!successData} onOpenChange={() => setSuccessData(null)}>
        <DialogContent className="max-w-sm text-center">
          <DialogHeader>
            <DialogTitle>🎉 Giữ vé thành công!</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-3">
            {/* <p className="text-sm text-gray-600">Mã giữ vé:</p> */}
            <div className="flex items-center justify-center gap-2">
              <span className="text-xl font-bold text-green-600">{successData?.deadline}</span>
              {/* <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  navigator.clipboard.writeText(successData?.code || '');
                  toast({ title: 'Đã copy mã giữ vé ✈️' });
                }}
              >
                <Copy className="w-4 h-4 mr-1" /> Copy
              </Button> */}
            </div>
            {successData?.deadline && (
              <p className="text-sm text-gray-500">Hạn thanh toán: <b>{successData.deadline}</b></p>
            )}
          </div>
          <div className="flex justify-center mt-4">
            <Button onClick={() => { setSuccessData(null); onClose(); }}>OK</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
