import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import { preChangeVJPnr, changeVJPnr } from '@/services/changeTicketVJApi';
import type {
  PreChangeVJResponse,
  ChangeVJResponse,
  VJFlightContext,
  VJTrip,
} from '@/types/changeTicketVJ';

type Stage = 'input' | 'segments' | 'result';

export function useChangeTicketVJ() {
  const [stage, setStage] = useState<Stage>('input');
  const [pnr, setPnr] = useState('');
  const [preData, setPreData] = useState<PreChangeVJResponse | null>(null);
  const [segDel, setSegDel] = useState<number | null>(null);
  const [oldTrips, setOldTrips] = useState<VJTrip[]>([]);
  const [result, setResult] = useState<ChangeVJResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const reset = useCallback(() => {
    setStage('input');
    setPnr('');
    setPreData(null);
    setSegDel(null);
    setOldTrips([]);
    setResult(null);
    setLoading(false);
  }, []);

  const runPreCheck = useCallback(async (ctx: VJFlightContext) => {
    const code = pnr.trim().toUpperCase();
    if (code.length !== 6) {
      toast.error('PNR phải đủ 6 ký tự');
      return;
    }
    setLoading(true);
    try {
      const data = await preChangeVJPnr(code);
      const trips = Array.isArray(data?.trips) ? data.trips : [];
      if (trips.length === 0) {
        toast.error('Không tìm thấy hành trình cho PNR này');
        return;
      }
      if (ctx.isRoundTrip && trips.length < 2) {
        toast.error(
          'PNR này là vé một chiều, không thể đổi cho hành trình khứ hồi đang chọn.'
        );
        return;
      }
      setPreData(data);
      // RT auto select 99, OW default first segment
      setSegDel(ctx.isRoundTrip ? 99 : (trips[0]?.seg_no ?? 1));
      setStage('segments');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Lỗi kiểm tra vé');
    } finally {
      setLoading(false);
    }
  }, [pnr]);

  const runChange = useCallback(
    async (ctx: VJFlightContext) => {
      if (segDel == null) {
        toast.error('Vui lòng chọn segment cần đổi');
        return;
      }
      setLoading(true);
      try {
        const trips = preData?.trips ?? [];
        // capture old segments being replaced for the result view
        const replaced =
          segDel === 99
            ? trips
            : trips.filter((t) => Number(t.seg_no) === Number(segDel));
        setOldTrips(replaced);

        const data = await changeVJPnr({
          pnr: pnr.trim().toUpperCase(),
          dep: ctx.dep,
          arr: ctx.arr,
          dep_date: ctx.dep_date,
          new_flight_no: ctx.new_flight_no,
          arr_date: ctx.isRoundTrip ? ctx.arr_date : null,
          new_flight_arr_no: ctx.isRoundTrip ? ctx.new_flight_arr_no : null,
          segdel: segDel,
        });
        if (data?.success === false) {
          toast.error(data.message || 'Đổi vé không thành công');
        } else {
          toast.success('Đổi vé thành công');
        }
        setResult(data);
        setStage('result');
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Lỗi đổi vé');
      } finally {
        setLoading(false);
      }
    },
    [pnr, preData, segDel]
  );

  return {
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
  };
}
