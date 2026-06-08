import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import {
  RefreshCw,
  Search,
  X,
  CheckCircle2,
  AlertTriangle,
  Camera,
  Users,
} from 'lucide-react';
import { useChangeTicketVJ } from '@/hooks/useChangeTicketVJ';
import { SegmentSelectorVJ } from './SegmentSelectorVJ';
import { ChangeQuotationVJ } from './ChangeQuotationVJ';
import { ChangeResultViewVJ } from './ChangeResultViewVJ';
import { formatDateToApi } from '@/components/change-ticket/utils';
import type { VJFlightContext } from '@/types/changeTicketVJ';

interface VJLegLike {
  nơi_đi?: string;
  nơi_đến?: string;
  ngày_cất_cánh?: string;
  id?: string;
  số_hiệu_máy_bay?: string;
  [k: string]: unknown;
}

interface VJFlightLike {
  chiều_đi?: VJLegLike;
  chiều_về?: VJLegLike;
  [k: string]: unknown;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  flight: VJFlightLike | null;
}

function buildVJContext(flight: VJFlightLike | null): VJFlightContext | null {
  if (!flight) return null;
  const out = flight.chiều_đi;
  const back = flight.chiều_về;
  if (!out?.nơi_đi || !out?.nơi_đến || !out?.ngày_cất_cánh || !out?.id) {
    return null;
  }
  const isRoundTrip = Boolean(back?.ngày_cất_cánh && back?.id);
  return {
    dep: out.nơi_đi,
    arr: out.nơi_đến,
    dep_date: formatDateToApi(out.ngày_cất_cánh),
    new_flight_no: String(out.số_hiệu_máy_bay ?? ''),
    arr_date:
      isRoundTrip && back?.ngày_cất_cánh
        ? formatDateToApi(back.ngày_cất_cánh)
        : null,
    new_flight_arr_no:
      isRoundTrip && back?.số_hiệu_máy_bay ? String(back.số_hiệu_máy_bay) : null,
    isRoundTrip,
  };
}

export const ChangeTicketVJModal: React.FC<Props> = ({
  isOpen,
  onClose,
  flight,
}) => {
  const {
    stage,
    pnr,
    setPnr,
    preData,
    segDel,
    setSegDel,
    oldTrips,
    result,
    loading,
    runPreCheck,
    runChange,
    reset,
  } = useChangeTicketVJ();

  const [confirmOpen, setConfirmOpen] = useState(false);
  const ctx = useMemo(() => buildVJContext(flight), [flight]);
  const captureRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) {
      reset();
      setConfirmOpen(false);
    }
  }, [isOpen, reset]);

  const handleClose = () => onClose();

  const captureToClipboard = async () => {
    if (!captureRef.current) return;
    try {
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(captureRef.current, {
        backgroundColor: '#ffffff',
        scale: 2,
        useCORS: true,
      });
      canvas.toBlob(async (blob) => {
        if (!blob) {
          toast.error('Không thể tạo ảnh');
          return;
        }
        try {
          // @ts-ignore
          await navigator.clipboard.write([
            // @ts-ignore
            new ClipboardItem({ 'image/png': blob }),
          ]);
          toast.success('Đã copy ảnh vào clipboard');
        } catch {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `doi-ve-vj-${pnr || 'vj'}.png`;
          a.click();
          URL.revokeObjectURL(url);
          toast.success('Đã tải ảnh xuống');
        }
      }, 'image/png');
    } catch {
      toast.error('Lỗi chụp ảnh');
    }
  };

  const handlePreCheck = async () => {
    if (!ctx) {
      toast.error('Thiếu thông tin chuyến bay');
      return;
    }
    await runPreCheck(ctx);
  };

  const handleConfirm = async () => {
    if (!ctx) return;
    setConfirmOpen(false);
    await runChange(ctx);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="w-[95vw] max-w-[760px] max-h-[90vh] overflow-y-auto">
        <div className="flex items-center gap-2 border-b pb-3">
          <div className="h-8 w-8 rounded-lg bg-red-100 text-red-600 flex items-center justify-center">
            <RefreshCw className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-gray-900">
              Đổi vé VietJet
            </h2>
            <p className="text-xs text-gray-500">
              Đổi hành trình theo PNR VietJet
            </p>
          </div>
        </div>

        {stage === 'input' && (
          <div className="space-y-3 py-3">
            <label className="block text-sm font-medium text-gray-700">
              Mã đặt chỗ (PNR)
            </label>
            <Input
              autoFocus
              value={pnr}
              onChange={(e) =>
                setPnr(
                  e.target.value
                    .toUpperCase()
                    .replace(/[^A-Z0-9]/g, '')
                    .slice(0, 6)
                )
              }
              onKeyDown={(e) => {
                if (e.key === 'Enter') handlePreCheck();
              }}
              placeholder="VD: SPC6RA"
              maxLength={6}
              className="uppercase tracking-wider font-mono"
            />
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" onClick={handleClose} disabled={loading}>
                <X className="h-4 w-4 mr-1" />
                Hủy
              </Button>
              <Button
                onClick={handlePreCheck}
                disabled={loading || pnr.trim().length !== 6}
              >
                <Search className="h-4 w-4 mr-1" />
                {loading ? 'Đang kiểm tra...' : 'Tiếp tục'}
              </Button>
            </div>
            {loading && (
              <div className="space-y-2 pt-2">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            )}
          </div>
        )}

        {stage === 'segments' && preData && (
          <div className="space-y-3 py-3">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-700">
                PNR:{' '}
                <span className="font-mono font-semibold text-gray-900">
                  {pnr}
                </span>
                <span className="ml-2 text-xs text-gray-500">
                  ({preData.trips?.length || 0} chặng)
                </span>
              </div>
              <span
                className={[
                  'text-xs px-2 py-1 rounded',
                  ctx?.isRoundTrip
                    ? 'bg-purple-100 text-purple-700'
                    : 'bg-red-100 text-red-700',
                ].join(' ')}
              >
                {ctx?.isRoundTrip ? 'Khứ hồi' : 'Một chiều'}
              </span>
            </div>

            {ctx?.isRoundTrip && (
              <div className="flex items-start gap-2 text-amber-700 bg-amber-50 border border-amber-200 rounded p-2 text-xs">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>
                  Check giá đổi hành trình mới. Cả 2 chặng sẽ được thay thế
                  bằng hành trình mới.
                </span>
              </div>
            )}

            <SegmentSelectorVJ
              trips={preData.trips || []}
              selected={segDel}
              onSelect={setSegDel}
              readOnly={ctx?.isRoundTrip}
              markAll={ctx?.isRoundTrip}
            />

            {Array.isArray(preData.passengers) && preData.passengers.length > 0 && (
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                <div className="flex items-center gap-2 text-xs font-semibold text-gray-600 mb-2">
                  <Users className="h-3.5 w-3.5" />
                  Danh sách hành khách ({preData.passengers.length})
                </div>
                <ul className="space-y-1">
                  {preData.passengers.map((p, i) => (
                    <li
                      key={i}
                      className="text-sm font-mono text-gray-800 bg-white rounded px-2 py-1 border border-gray-100 flex items-center justify-between"
                    >
                      <strong>{p.full_name || '—'}</strong>
                      <span className="text-xs text-gray-500 ml-2">{p.type || ''}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex justify-between gap-2 pt-2 border-t">
              <Button variant="outline" onClick={handleClose} disabled={loading}>
                Đóng
              </Button>
              <Button
                onClick={() => setConfirmOpen(true)}
                disabled={loading || segDel == null}
              >
                <RefreshCw className="h-4 w-4 mr-1" />
                {loading ? 'Đang xử lý...' : 'Tiếp tục đổi vé'}
              </Button>
            </div>
          </div>
        )}

        {stage === 'result' && result && (
          <div className="space-y-3 py-3 relative">
            <button
              type="button"
              onClick={captureToClipboard}
              className="absolute -top-1 right-0 z-10 inline-flex items-center gap-1 px-2 py-1 rounded-md border border-red-200 bg-white text-red-600 hover:bg-red-50 shadow-sm text-xs"
            >
              <Camera className="h-3.5 w-3.5" />
              Chụp ảnh
            </button>

            <div ref={captureRef} className="space-y-3 bg-white p-1">
            {result.success === false ? (
              <div className="flex items-center gap-2 text-red-700 bg-red-50 border border-red-200 rounded p-2 text-sm">
                <AlertTriangle className="h-4 w-4" />
                <span className="inline-block -translate-y-[8px]">{result.message || 'Đổi vé không thành công'}</span>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2 text-emerald-700 bg-emerald-50 border border-emerald-200 rounded p-2 text-sm">
                  <CheckCircle2 className="h-4 w-4" />
                  <span className="inline-block -translate-y-[8px]">
                    PNR <strong>{result.pnr || pnr}</strong> với hành trình mới.
                  </span>
                </div>
                <div className="flex items-center gap-2 text-red-700 bg-emerald-50 border border-emerald-200 rounded p-2 text-sm">
                  <span className="inline-block -translate-y-[8px]">
                    **Phí đổi vé được check ở thời điểm hiện tại, vui lòng liên hệ admin để xác nhận và lưu phí đổi**
                  </span>
                </div>
              </>
            )}

            {Array.isArray(preData?.passengers) && preData!.passengers!.length > 0 && (
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                <div className="flex items-center gap-2 text-xs font-semibold text-gray-600 mb-2">
                  <Users className="h-3.5 w-3.5" />
                  <span className="inline-block -translate-y-[8px]">Danh sách hành khách ({preData!.passengers!.length})</span>
                </div>
                <ul className="space-y-1">
                  {preData!.passengers!.map((p, i) => (
                    <li
                      key={i}
                      className="text-sm font-mono text-gray-800 bg-white rounded px-2 py-1 border border-gray-100 flex items-center justify-between"
                    >
                      <strong className="inline-block -translate-y-[8px]">{p.full_name || '—'}</strong>
                      <span className="text-xs text-gray-500 ml-2 inline-block -translate-y-[8px]">{p.type || ''}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <ChangeResultViewVJ
              oldTrips={oldTrips}
              newTrips={Array.isArray(result.data?.trips) ? result.data!.trips! : []}
            />

            <ChangeQuotationVJ quotation={result.data?.quotation} />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button onClick={handleClose}>Đóng</Button>
            </div>
          </div>
        )}

        {confirmOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40">
            <div className="bg-white rounded-lg shadow-xl p-5 w-[90vw] max-w-sm">
              <div className="flex items-center gap-2 text-amber-600 mb-2">
                <CheckCircle2 className="h-5 w-5" />
                <h3 className="font-semibold">Xác nhận đổi vé</h3>
              </div>
              <p className="text-sm text-gray-600">
                {segDel === 99
                  ? 'Thay toàn bộ hành trình hiện tại bằng hành trình mới?'
                  : `Đổi chặng ${segDel} sang hành trình mới?`}
              </p>
              <div className="flex justify-end gap-2 mt-4">
                <Button
                  variant="outline"
                  onClick={() => setConfirmOpen(false)}
                  disabled={loading}
                >
                  Hủy
                </Button>
                <Button onClick={handleConfirm} disabled={loading}>
                  {loading ? 'Đang đổi...' : 'Xác nhận'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
