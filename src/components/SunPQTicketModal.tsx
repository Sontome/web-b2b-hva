import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Camera } from 'lucide-react';
import { toast } from 'sonner';
import { toPng } from 'html-to-image';
import { checkSunPQPnr } from '@/services/sunpqService';
import { syncHeldTicketFromCheck } from '@/utils/syncHeldTicketFromCheck';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  initialPNR?: string;
}

const AIRPORT_NAMES: Record<string, string> = {
  ICN: 'Seoul',
  GMP: 'Seoul',
  PUS: 'Busan',
  HAN: 'Hà Nội',
  SGN: 'TP HCM',
  PQC: 'Phú Quốc',
  DAD: 'Đà Nẵng',
  CXR: 'Nha Trang',
  HPH: 'Hải Phòng',
  VCA: 'Cần Thơ',
  VII: 'Vinh',
  HUI: 'Huế',
};

const WEEKDAYS = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];

const fmtKRW = new Intl.NumberFormat('de-DE');

const parseDateTime = (dt?: string) => {
  if (!dt) return { time: '', date: '', weekday: '' };
  const [dPart, tPart = ''] = dt.split(' ');
  const time = tPart.slice(0, 5);
  const [y, m, d] = dPart.split('-');
  const date = `${d}/${m}/${y}`;
  let weekday = '';
  try {
    weekday = WEEKDAYS[new Date(`${dPart}T00:00:00`).getDay()] || '';
  } catch {}
  return { time, date, weekday };
};

const fmtFlightTime = (raw?: string) => {
  if (!raw) return '';
  const s = raw.replace(/\D/g, '').padStart(4, '0');
  return `${s.slice(0, 2)}h${s.slice(2, 4)}m`;
};

const SegmentCard: React.FC<{ seg: any }> = ({ seg }) => {
  const dep = parseDateTime(
    seg?.departure_info?.datetime || seg.departure_datetime || seg.departure_time
  );
  const arr = parseDateTime(
    seg?.arrival_info?.datetime || seg.arrival_datetime || seg.arrival_time
  );
  const depCode = seg?.departure_info?.code || seg.departure || seg.from || '';
  const arrCode = seg?.arrival_info?.code || seg.arrival || seg.to || '';
  const aircraft = seg?.aircraft_info?.type || seg.aircraft || '';
  const depTerminal = seg?.departure_info?.terminal;
  const arrTerminal = seg?.arrival_info?.terminal;

  return (
    <div className="border border-orange-200 rounded-lg overflow-hidden mb-2">
      <div className="bg-orange-50 px-3 py-2 flex items-center gap-2">
        <img src="/icon/sunpq-logo.png" alt="SunPQ" width={28} height={28} className="rounded" />
        <div className="font-semibold text-sm">
          {(AIRPORT_NAMES[depCode] || depCode)} → {(AIRPORT_NAMES[arrCode] || arrCode)}
        </div>
        <div className="ml-auto text-xs text-gray-600">{dep.date}</div>
      </div>
      <div className="p-3 grid grid-cols-3 gap-3 text-sm">
        <div>
          <div className="text-xs text-gray-500">
            {AIRPORT_NAMES[depCode] || depCode} ({depCode}){depTerminal ? ` · T${depTerminal}` : ''}
          </div>
          <div className="text-2xl font-bold text-gray-800">{dep.time}</div>
          <div className="text-xs text-gray-600">{dep.weekday} {dep.date}</div>
        </div>
        <div>
          <div className="text-xs text-gray-500">
            {AIRPORT_NAMES[arrCode] || arrCode} ({arrCode}){arrTerminal ? ` · T${arrTerminal}` : ''}
          </div>
          <div className="text-2xl font-bold text-gray-800">{arr.time}</div>
          <div className="text-xs text-gray-600">{arr.weekday} {arr.date}</div>
        </div>
        <div className="text-xs space-y-1">
          <div>Chuyến: <span className="font-semibold">{seg.carrier || ''}{seg.flight_number || ''}</span></div>
          <div>Thời gian: <span className="font-semibold">{fmtFlightTime(seg.duration || seg.elapse_flying_time)}</span></div>
          {aircraft && <div>Máy bay: {aircraft}</div>}
          {seg.booking_class && <div>Hạng: {seg.booking_class}</div>}
        </div>
      </div>
    </div>
  );
};

const SunPQTicketModal: React.FC<Props> = ({ isOpen, onClose, initialPNR }) => {
  const [pnr, setPnr] = useState('');
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const captureRef = useRef<HTMLDivElement>(null);
  const hasAutoSubmittedRef = useRef(false);

  useEffect(() => {
    if (!isOpen) {
      setData(null);
      setErrorMsg('');
      setPnr('');
      hasAutoSubmittedRef.current = false;
    }
  }, [isOpen]);

  const handleSubmit = async (pnrOverride?: string) => {
    const code = (pnrOverride ?? pnr).trim().toUpperCase();
    if (!code) return;
    setIsLoading(true);
    setErrorMsg('');
    try {
      const res = await checkSunPQPnr(code);
      const body = res?.data ?? res?.body ?? res;
      setData(body);
      syncHeldTicketFromCheck(code, body);
    } catch (e: any) {
      setErrorMsg(e?.message || 'Không tra cứu được PNR');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && initialPNR?.trim() && !data && !isLoading && !hasAutoSubmittedRef.current) {
      hasAutoSubmittedRef.current = true;
      const code = initialPNR.trim().toUpperCase();
      setPnr(code);
      setTimeout(() => handleSubmit(code), 0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, initialPNR]);

  const handleCapture = async () => {
    if (!captureRef.current) return;
    try {
      const dataUrl = await toPng(captureRef.current, {
        backgroundColor: '#ffffff',
        pixelRatio: 2,
        cacheBust: true,
      });
      const blob = await (await fetch(dataUrl)).blob();
      // @ts-ignore
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      toast.success('Đã copy ảnh vào clipboard');
    } catch (e: any) {
      toast.error(e?.message || 'Lỗi chụp ảnh');
    }
  };

  const totalPrice =
    Math.round(
      (Number(data?.tongbillgiagoc || data?.total_price || data?.tongtien || 0) || 0) / 100
    ) * 100;
  const paid = !!(data?.paymentstatus ?? data?.paid);
  const deadline = data?.hanthanhtoan || data?.payment_deadline || data?.han_tt || '';
  const passengers: any[] = data?.passengers || data?.hanhkhach || [];
  const chieudi: any[] = data?.chieudi || data?.outbound || [];
  const chieuve: any[] = data?.chieuve || data?.inbound || [];
  const pnrCode = data?.pnr || pnr;

  const paxTypeLabel = (t: string) =>
    t === 'ADULT' ? 'Người Lớn' : t === 'CHILD' ? 'Trẻ em' : t === 'INFANT' ? 'Trẻ sơ sinh' : t;

  return (
    <Dialog open={isOpen} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-orange-600">Tra cứu vé SunPQ</DialogTitle>
        </DialogHeader>

        <div className="flex gap-2 items-end">
          <div className="flex-1">
            <label className="text-xs text-gray-600">Nhập mã PNR</label>
            <Input
              value={pnr}
              onChange={(e) => setPnr(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              placeholder="VD: DCXMJK"
            />
          </div>
          <Button
            className="bg-orange-500 hover:bg-orange-600 text-white"
            onClick={() => handleSubmit()}
            disabled={isLoading}
          >
            {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Xác nhận
          </Button>
          <Button variant="outline" onClick={onClose}>Đóng</Button>
        </div>

        {errorMsg && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-2">
            {errorMsg}
          </div>
        )}

        {data && (
          <>
            <div className="flex flex-wrap items-center gap-2 pt-2">
              <span className="bg-orange-500 text-white px-2 py-1 rounded text-sm font-bold">
                PNR: {pnrCode}
              </span>
              <span
                className={`px-2 py-1 rounded text-sm font-bold text-white ${paid ? 'bg-green-600' : 'bg-red-600'}`}
              >
                Tổng: {fmtKRW.format(totalPrice)} KRW
              </span>
              {!paid && deadline && (
                <span className="bg-yellow-500 text-white px-2 py-1 rounded text-sm font-bold">
                  Hạn TT: {deadline}
                </span>
              )}
              <Button size="sm" variant="outline" className="ml-auto" onClick={handleCapture}>
                <Camera className="h-4 w-4 mr-1" /> Chụp ảnh
              </Button>
            </div>

            <div ref={captureRef} className="bg-white p-3 space-y-3">
              {passengers.length > 0 && (
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-orange-50">
                      <tr>
                        <th className="px-2 py-1 text-left">#</th>
                        <th className="px-2 py-1 text-left">Loại</th>
                        <th className="px-2 py-1 text-left">Title</th>
                        <th className="px-2 py-1 text-left">Họ</th>
                        <th className="px-2 py-1 text-left">Tên</th>
                      </tr>
                    </thead>
                    <tbody>
                      {passengers.map((p, i) => (
                        <tr key={i} className="border-t">
                          <td className="px-2 py-1">{i + 1}</td>
                          <td className="px-2 py-1">{paxTypeLabel(p.type || p.pax_type || '')}</td>
                          <td className="px-2 py-1">{p.title || ''}</td>
                          <td className="px-2 py-1">{p.last_name || p.ho || ''}</td>
                          <td className="px-2 py-1">{p.first_name || p.ten || ''}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {chieudi.length > 0 && (
                <div>
                  <div className="font-semibold text-orange-600 mb-1">Chiều đi</div>
                  {chieudi.map((seg, i) => <SegmentCard key={`o-${i}`} seg={seg} />)}
                </div>
              )}

              {chieuve.length > 0 && (
                <div>
                  <div className="font-semibold text-orange-600 mb-1">Chiều về</div>
                  {chieuve.map((seg, i) => <SegmentCard key={`r-${i}`} seg={seg} />)}
                </div>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default SunPQTicketModal;
