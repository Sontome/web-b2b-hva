import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { GraduationCap, CheckCircle2, AlertTriangle, X } from 'lucide-react';
import {
  checkStudentPrice,
  type CheckStudentRequest,
} from '@/services/checkStudentApi';
import { formatDateToApi, formatTimeToApi } from './change-ticket/utils';
import { useAuth } from '@/hooks/useAuth';

interface VNALeg {
  nơi_đi?: string;
  nơi_đến?: string;
  ngày_cất_cánh?: string;
  giờ_cất_cánh?: string;
  giờ_hạ_cánh?: string;
}

export interface CheckSTUFlightLike {
  chiều_đi?: VNALeg;
  chiều_về?: VNALeg;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  flight: CheckSTUFlightLike | null;
  passengerCount: number;
  currentPrice: number;
  isRoundTrip?: boolean;
  onApply: (newPrice: number) => void;
}

function buildRequest(
  flight: CheckSTUFlightLike | null,
  passengerCount: number
): CheckStudentRequest | null {
  if (!flight) return null;
  const out = flight.chiều_đi;
  const back = flight.chiều_về;

  if (
    !out?.nơi_đi ||
    !out?.nơi_đến ||
    !out?.ngày_cất_cánh ||
    !out?.giờ_cất_cánh ||
    !out?.giờ_hạ_cánh
  ) {
    return null;
  }

  return {
    qualtity: String(Math.max(1, passengerCount)),
    dep: out.nơi_đi,
    arr: out.nơi_đến,
    depdate: formatDateToApi(out.ngày_cất_cánh),
    deptime: formatTimeToApi(out.giờ_cất_cánh),
    deptimedone: formatTimeToApi(out.giờ_hạ_cánh),
    arrdate: back?.ngày_cất_cánh
      ? formatDateToApi(back.ngày_cất_cánh)
      : undefined,
    arrtime: back?.giờ_cất_cánh
      ? formatTimeToApi(back.giờ_cất_cánh)
      : undefined,
    arrtimedone: back?.giờ_hạ_cánh
      ? formatTimeToApi(back.giờ_hạ_cánh)
      : undefined,
  };
}

const formatKRW = (n: number) =>
  `${new Intl.NumberFormat('de-DE').format(Math.round(n / 100) * 100)} KRW`;

export const CheckSTUVNAModal: React.FC<Props> = ({
  isOpen,
  onClose,
  flight,
  passengerCount,
  currentPrice,
  isRoundTrip,
  onApply,
}) => {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newPrice, setNewPrice] = useState<number | null>(null);
  const [mess, setMess] = useState<string>('');

  const computeFinalPrice = (basePrice: number) => {
    const vnaMarkup = profile?.price_vna || 0;
    const tripFee = isRoundTrip
      ? profile?.price_rt_vna || 0
      : profile?.price_ow_vna || 0;
    const total = basePrice + vnaMarkup + tripFee;
    return Math.round(total / 100) * 100;
  };

  useEffect(() => {
    if (!isOpen) {
      setLoading(false);
      setError(null);
      setNewPrice(null);
      setMess('');
      return;
    }

    const req = buildRequest(flight, passengerCount);
    if (!req) {
      setError('Thiếu thông tin hành trình để kiểm tra giá học sinh.');
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);
    setNewPrice(null);

    checkStudentPrice(req)
      .then((res) => {
        if (cancelled) return;
        const p = res?.price?.price;
        setMess(res?.mess || '');
        if (typeof p === 'number' && p > 0) {
          setNewPrice(p);
        } else {
          setError(res?.mess || 'API không trả về giá hợp lệ.');
        }
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : 'Lỗi không xác định');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen, flight, passengerCount]);

  const finalPrice = newPrice != null ? computeFinalPrice(newPrice) : null;

  const handleApply = () => {
    if (finalPrice == null) return;
    onApply(finalPrice);
    toast.success('Đã cập nhật giá vé học sinh');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="w-[95vw] max-w-[460px]">
        <div className="flex items-center gap-2 border-b pb-3">
          <div className="h-8 w-8 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center">
            <GraduationCap className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-gray-900">
              Giá vé học sinh - VNA
            </h2>
            <p className="text-xs text-gray-500">
              Số khách: {passengerCount}
            </p>
          </div>
        </div>

        <div className="py-3 space-y-3">
          {loading && (
            <div className="space-y-2">
              <Skeleton className="h-6 w-2/3" />
              <Skeleton className="h-10 w-full" />
              <p className="text-xs text-gray-500">Đang kiểm tra giá học sinh...</p>
            </div>
          )}

          {!loading && error && (
            <div className="flex items-start gap-2 text-red-700 bg-red-50 border border-red-200 rounded p-2 text-sm">
              <AlertTriangle className="h-4 w-4 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {!loading && !error && newPrice != null && (
            <>
              <div className="flex items-center gap-2 text-emerald-700 bg-emerald-50 border border-emerald-200 rounded p-2 text-sm">
                <CheckCircle2 className="h-4 w-4" />
                <span>{mess || 'Tìm thấy giá học sinh'}</span>
              </div>

              <div className="rounded-lg border border-gray-200 p-3 bg-gray-50 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Giá hiện tại:</span>
                  <span className="font-mono text-gray-800 line-through">
                    {formatKRW(currentPrice)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>Giá API gốc:</span>
                  <span className="font-mono">{formatKRW(newPrice)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-700 font-medium">Giá học sinh (đã cộng phí):</span>
                  <span className="font-mono text-indigo-700 font-bold text-base">
                    {finalPrice != null ? formatKRW(finalPrice) : '-'}
                  </span>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t">
          <Button variant="outline" onClick={onClose}>
            <X className="h-4 w-4 mr-1" />
            Đóng
          </Button>
          {!loading && !error && newPrice != null && (
            <Button onClick={handleApply}>
              <CheckCircle2 className="h-4 w-4 mr-1" />
              Áp dụng giá mới
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
