import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import { preChangePnr, changePnr } from '@/services/changeTicketApi';
import type {
  PreChangeResponse,
  ChangeTicketResponse,
  FlightContext,
} from '@/types/changeTicket';

type Stage = 'input' | 'segments' | 'result';

export function useChangeTicket() {
  const [stage, setStage] = useState<Stage>('input');
  const [pnr, setPnr] = useState('');
  const [preData, setPreData] = useState<PreChangeResponse | null>(null);
  const [segDelete, setSegDelete] = useState<number[]>([]);
  const [result, setResult] = useState<ChangeTicketResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const reset = useCallback(() => {
    setStage('input');
    setPnr('');
    setPreData(null);
    setSegDelete([]);
    setResult(null);
    setLoading(false);
  }, []);

  const toggleSegment = useCallback((segNo: number) => {
    setSegDelete((prev) =>
      prev.includes(segNo) ? prev.filter((n) => n !== segNo) : [...prev, segNo]
    );
  }, []);

  const runPreCheck = useCallback(async () => {
    const code = pnr.trim().toUpperCase();
    if (!code) {
      toast.error('Vui lòng nhập PNR');
      return;
    }
    setLoading(true);
    try {
      const data = await preChangePnr(code);
      if (!data?.seg || data.seg.length === 0) {
        toast.error('Không tìm thấy segment cho PNR này');
        return;
      }
      setPreData(data);
      setSegDelete([]);
      setStage('segments');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Lỗi kiểm tra vé';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [pnr]);

  const runChange = useCallback(
    async (ctx: FlightContext) => {
      if (segDelete.length === 0) {
        toast.error('Vui lòng chọn ít nhất 1 segment để xoá');
        return;
      }
      if (ctx.isRoundTrip && segDelete.length < 2) {
        toast.error('Vé khứ hồi cần xoá tối thiểu 2 segment');
        return;
      }
      setLoading(true);
      try {
        const data = await changePnr({
          pnr: pnr.trim().toUpperCase(),
          seg_del: segDelete.join(','),
          dep: ctx.dep,
          arr: ctx.arr,
          depdate: ctx.depdate,
          deptime: ctx.deptime,
          deptimedone: ctx.deptimedone,
          ...(ctx.arrdate ? { arrdate: ctx.arrdate } : {}),
          ...(ctx.arrtime ? { arrtime: ctx.arrtime } : {}),
          ...(ctx.arrtimedone ? { arrtimedone: ctx.arrtimedone } : {}),
        });
        if (data?.status && data.status !== 'success') {
          toast.error(data.message || 'Đổi vé không thành công');
        } else {
          toast.success('Đổi vé thành công');
        }
        setResult(data);
        setStage('result');
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Lỗi đổi vé';
        toast.error(msg);
      } finally {
        setLoading(false);
      }
    },
    [pnr, segDelete]
  );

  return {
    stage,
    pnr,
    setPnr,
    preData,
    segDelete,
    toggleSegment,
    result,
    loading,
    runPreCheck,
    runChange,
    reset,
    setStage,
  };
}
