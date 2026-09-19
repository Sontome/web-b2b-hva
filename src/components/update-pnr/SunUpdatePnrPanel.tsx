import React, { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, User, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { DateInput } from '@/components/DateInput';
import { checkSunPQPnr, addSunPQDocument } from '@/services/sunpqService';
import { format, parse, isValid } from 'date-fns';

type Step = 'input' | 'form' | 'done';

interface DocForm {
  type: string;
  number: string;
  nationality: string;
  country: string;
  gender: string;
  date_of_birth: string; // yyyy-MM-dd
  expiry_date: string; // yyyy-MM-dd
  first_name: string;
  last_name: string;
}

interface PaxState {
  pax_id: number;
  type: string;
  title?: string;
  locked: Record<keyof DocForm, boolean>;
  doc: DocForm;
}

const COUNTRIES = [
  { code: 'VN', label: 'Việt Nam (VN)' },
  { code: 'KR', label: 'Hàn Quốc (KR)' },
];

const PASSENGER_TYPE_LABELS: Record<string, string> = {
  ADULT: 'Người Lớn',
  CHILD: 'Trẻ Em',
  INFANT: 'Em Bé',
};

const toDate = (s?: string): Date | undefined => {
  if (!s) return undefined;
  const d = parse(s, 'yyyy-MM-dd', new Date());
  return isValid(d) ? d : undefined;
};

const emptyDoc = (): DocForm => ({
  type: 'P',
  number: '',
  nationality: '',
  country: '',
  gender: '',
  date_of_birth: '',
  expiry_date: '',
  first_name: '',
  last_name: '',
});

export const SunUpdatePnrPanel: React.FC<{ onBack?: () => void }> = ({ onBack }) => {
  const [step, setStep] = useState<Step>('input');
  const [pnr, setPnr] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [traceId, setTraceId] = useState('');
  const [pax, setPax] = useState<PaxState[]>([]);
  const [minExpiry, setMinExpiry] = useState<Date | undefined>(undefined);

  const reset = () => {
    setStep('input');
    setPnr('');
    setTraceId('');
    setPax([]);
    setMinExpiry(undefined);
  };

  const handleCheck = async () => {
    const code = pnr.trim().toUpperCase();
    if (code.length !== 6) {
      toast.error('Mã PNR phải gồm 6 ký tự');
      return;
    }
    setIsLoading(true);
    try {
      const res: any = await checkSunPQPnr(code);
      const data = res?.data;
      if (!res?.success || !data) {
        toast.error(res?.message || 'Không tìm thấy thông tin PNR');
        return;
      }
      setTraceId(res.trace_id || data.trace_id || '');

      const segs = [...(data.chieudi || []), ...(data.chieuve || [])];
      const dates = segs
        .map((s: any) => toDate(s.flight_date))
        .filter(Boolean) as Date[];
      const maxDate = dates.length
        ? new Date(Math.max(...dates.map((d) => d.getTime())))
        : undefined;
      setMinExpiry(maxDate);

      const list: PaxState[] = (data.passengers || []).map((p: any) => {
        const d = p.document || {};
        const title = String(p.title || '').toUpperCase();
        const doc: DocForm = {
          type: 'P',
          number: d.number || '',
          nationality: d.nationality || '',
          country: d.country || '',
          gender: d.gender || (title === 'MISS' || title === 'MRS' ? 'F' : 'M'),
          date_of_birth: d.date_of_birth || '',
          expiry_date: d.expiry_date || '',
          first_name: d.first_name || p.first_name || '',
          last_name: d.last_name || p.last_name || '',
        };
        const locked = {
          type: true,
          number: !!d.number,
          nationality: !!d.nationality,
          country: !!d.country,
          gender: !!d.gender,
          date_of_birth: !!d.date_of_birth,
          expiry_date: !!d.expiry_date,
          first_name: !!(d.first_name || p.first_name),
          last_name: !!(d.last_name || p.last_name),
        } as Record<keyof DocForm, boolean>;
        return { pax_id: p.pax_id, type: p.type, title: p.title, locked, doc };
      });

      if (!list.length) {
        toast.error('PNR không có hành khách nào');
        return;
      }
      setPax(list);
      setStep('form');
      toast.success(`Đã tải thông tin PNR ${code}`);
    } catch (e: any) {
      toast.error(e?.message || 'Lỗi kết nối');
    } finally {
      setIsLoading(false);
    }
  };

  const updateDoc = (idx: number, field: keyof DocForm, value: string) => {
    setPax((prev) =>
      prev.map((p, i) => (i === idx ? { ...p, doc: { ...p.doc, [field]: value } } : p))
    );
  };

  const handleSubmit = async () => {
    for (let i = 0; i < pax.length; i++) {
      const p = pax[i];
      const missing = (Object.keys(p.doc) as (keyof DocForm)[]).filter((k) => !p.doc[k]);
      if (missing.length) {
        toast.error(`Hành khách ${i + 1} (${p.doc.last_name} ${p.doc.first_name}) chưa đủ thông tin`);
        return;
      }
    }
    setIsLoading(true);
    try {
      const res: any = await addSunPQDocument(
        traceId,
        pax.map((p) => ({ pax_id: p.pax_id, type: p.type, document: { ...p.doc } }))
      );
      if (res?.success) {
        toast.success('Cập nhật thông tin PNR thành công');
        setStep('done');
      } else {
        toast.error(res?.message || 'Cập nhật thất bại');
      }
    } catch (e: any) {
      toast.error(e?.message || 'Lỗi kết nối');
    } finally {
      setIsLoading(false);
    }
  };

  if (step === 'input') {
    return (
      <div className="space-y-4">
        <div>
          <Label>Mã PNR (SunPQ)</Label>
          <Input
            value={pnr}
            onChange={(e) => setPnr(e.target.value.toUpperCase())}
            placeholder="Nhập mã PNR gồm 6 ký tự"
            maxLength={6}
            disabled={isLoading}
          />
          <p className="text-xs text-muted-foreground mt-1">Ví dụ: FJQUD6</p>
        </div>
        <div className="flex justify-end gap-2">
          {onBack && (
            <Button variant="outline" onClick={onBack} disabled={isLoading}>
              Quay lại
            </Button>
          )}
          <Button onClick={handleCheck} disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Đang kiểm tra...
              </>
            ) : (
              'Xác nhận'
            )}
          </Button>
        </div>
      </div>
    );
  }

  if (step === 'done') {
    return (
      <div className="space-y-4 text-center py-6">
        <CheckCircle2 className="w-12 h-12 text-green-600 mx-auto" />
        <p className="font-semibold text-green-700">Cập nhật thông tin hành khách thành công</p>
        <Button variant="outline" onClick={reset}>
          Cập nhật PNR khác
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {pax.map((p, idx) => (
        <div key={p.pax_id} className="border rounded-lg p-3 space-y-3 bg-muted/30">
          <div className="flex items-center gap-2 font-semibold text-sm">
            <User className="w-4 h-4" />
            {idx + 1}. {p.title || ''} {p.doc.last_name} {p.doc.first_name}
            <span className="ml-auto text-xs text-muted-foreground">
              {PASSENGER_TYPE_LABELS[p.type] || p.type}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Họ (last name)</Label>
              <Input
                value={p.doc.last_name}
                disabled={p.locked.last_name || isLoading}
                onChange={(e) => updateDoc(idx, 'last_name', e.target.value.toUpperCase())}
              />
            </div>
            <div>
              <Label className="text-xs">Tên (first name)</Label>
              <Input
                value={p.doc.first_name}
                disabled={p.locked.first_name || isLoading}
                onChange={(e) => updateDoc(idx, 'first_name', e.target.value.toUpperCase())}
              />
            </div>
            <div>
              <Label className="text-xs">Loại giấy tờ</Label>
              <Input value="P (Hộ chiếu)" disabled />
            </div>
            <div>
              <Label className="text-xs">Số hộ chiếu</Label>
              <Input
                value={p.doc.number}
                disabled={p.locked.number || isLoading}
                onChange={(e) => updateDoc(idx, 'number', e.target.value.toUpperCase())}
              />
            </div>
            <div>
              <Label className="text-xs">Quốc tịch</Label>
              <Select
                value={p.doc.nationality}
                disabled={p.locked.nationality || isLoading}
                onValueChange={(v) => updateDoc(idx, 'nationality', v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Chọn quốc tịch" />
                </SelectTrigger>
                <SelectContent className="bg-background z-[300]">
                  {COUNTRIES.map((c) => (
                    <SelectItem key={c.code} value={c.code}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Quốc gia cấp</Label>
              <Select
                value={p.doc.country}
                disabled={p.locked.country || isLoading}
                onValueChange={(v) => updateDoc(idx, 'country', v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Chọn quốc gia" />
                </SelectTrigger>
                <SelectContent className="bg-background z-[300]">
                  {COUNTRIES.map((c) => (
                    <SelectItem key={c.code} value={c.code}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Giới tính</Label>
              <Select
                value={p.doc.gender}
                disabled={p.locked.gender || isLoading}
                onValueChange={(v) => updateDoc(idx, 'gender', v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Chọn giới tính" />
                </SelectTrigger>
                <SelectContent className="bg-background z-[300]">
                  <SelectItem value="M">Nam (M)</SelectItem>
                  <SelectItem value="F">Nữ (F)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Ngày sinh</Label>
              <DateInput
                value={toDate(p.doc.date_of_birth)}
                disabled={p.locked.date_of_birth || isLoading}
                onChange={(d) => updateDoc(idx, 'date_of_birth', d ? format(d, 'yyyy-MM-dd') : '')}
              />
            </div>
            <div>
              <Label className="text-xs">
                Ngày hết hạn hộ chiếu
                {minExpiry && (
                  <span className="text-muted-foreground"> (từ {format(minExpiry, 'dd/MM/yyyy')})</span>
                )}
              </Label>
              <DateInput
                value={toDate(p.doc.expiry_date)}
                minDate={minExpiry}
                disabled={p.locked.expiry_date || isLoading}
                onChange={(d) => updateDoc(idx, 'expiry_date', d ? format(d, 'yyyy-MM-dd') : '')}
              />
            </div>
          </div>
        </div>
      ))}

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={reset} disabled={isLoading}>
          Nhập lại
        </Button>
        <Button onClick={handleSubmit} disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Đang cập nhật...
            </>
          ) : (
            'Cập nhật thông tin'
          )}
        </Button>
      </div>
    </div>
  );
};
