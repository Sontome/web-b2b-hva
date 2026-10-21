import { useCallback, useRef, useState } from 'react';
import { toast } from 'sonner';
import { sunCheckPnr, sunChangePnr, SunNetworkError } from '@/services/sunChangeTicketApi';
import {
  buildChangePayload,
  isValidPnr,
  normalizePnr,
  parseChangeResponse,
  parseCheckResponse,
  type SunChangeResult,
  type SunCheckData,
  type SunSeg,
} from '@/lib/sunChangeTicket';

export const SUN_UNKNOWN_RESULT_MSG =
  'Chưa xác định được kết quả đổi vé. Vui lòng kiểm tra lại PNR trước khi thực hiện tiếp.';

export function useSunChangeTicket() {
  const [pnr, setPnrState] = useState('');
  const [checked, setChecked] = useState<SunCheckData | null>(null);
  const [checkedPnr, setCheckedPnr] = useState('');
  const [oldSel, setOldSel] = useState<SunSeg | null>(null);
  const [newSel, setNewSel] = useState<SunSeg | null>(null);
  const [result, setResult] = useState<SunChangeResult | null>(null);
  const [checking, setChecking] = useState(false);
  const [changing, setChanging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sessionRef = useRef(0); // bumps on PNR edit / reset → stale responses ignored
  const checkAbortRef = useRef<AbortController | null>(null);
  const changeLockRef = useRef(false); // synchronous double-click guard
  const doneRef = useRef(false);

  const invalidate = useCallback(() => {
    sessionRef.current += 1;
    checkAbortRef.current?.abort();
    checkAbortRef.current = null;
    setChecked(null);
    setCheckedPnr('');
    setOldSel(null);
    setNewSel(null);
    setResult(null);
    setChecking(false);
    doneRef.current = false;
  }, []);

  const setPnr = useCallback(
    (v: string) => {
      if (changeLockRef.current) return;
      setPnrState(v);
      invalidate();
      setError(null);
    },
    [invalidate],
  );

  const reset = useCallback(() => {
    invalidate();
    setPnrState('');
    setError(null);
    setChanging(false);
    changeLockRef.current = false;
  }, [invalidate]);

  const runCheck = useCallback(async () => {
    const code = normalizePnr(pnr);
    if (!code) return toast.error('Vui lòng nhập PNR');
    if (!isValidPnr(code)) return toast.error('PNR phải gồm 6 ký tự chữ/số');
    if (changeLockRef.current) return;
    invalidate();
    const sid = sessionRef.current;
    const ctrl = new AbortController();
    checkAbortRef.current = ctrl;
    setChecking(true);
    setError(null);
    try {
      const { ok, json } = await sunCheckPnr(code, ctrl.signal);
      if (sid !== sessionRef.current) return;
      const parsed = parseCheckResponse(ok, json, code);
      if (parsed.ok === false) {
        setError(parsed.error);
        toast.error(parsed.error);
        return;
      }
      setChecked(parsed.data);
      setCheckedPnr(code);
      const all = [...parsed.data.chieudi, ...parsed.data.chieuve];
      if (all.length === 1) setOldSel(all[0]);
    } catch (e) {
      if (sid !== sessionRef.current) return;
      if (e instanceof SunNetworkError && e.kind === 'aborted') return;
      const m = e instanceof Error ? e.message : 'Lỗi kiểm tra vé';
      setError(m);
      toast.error(m);
    } finally {
      if (sid === sessionRef.current) setChecking(false);
    }
  }, [pnr, invalidate]);

  const runChange = useCallback(async () => {
    if (changeLockRef.current || doneRef.current) return;
    if (!checked || !checkedPnr || !oldSel || !newSel) return;
    changeLockRef.current = true;
    const sid = sessionRef.current;
    setChanging(true);
    setError(null);
    try {
      const payload = buildChangePayload(checkedPnr, oldSel, newSel);
      const { ok, json } = await sunChangePnr(payload);
      if (sid !== sessionRef.current) return;
      if (ok && json === null) throw new SunNetworkError('network', 'non-json');
      const parsed = parseChangeResponse(ok, json, checkedPnr);
      if (parsed.ok === false) {
        setError(parsed.error);
        toast.error(parsed.error);
        return;
      }
      doneRef.current = true;
      setResult(parsed.data);
      toast.success('Đổi vé SunPQ thành công');
    } catch {
      if (sid !== sessionRef.current) return;
      // Outcome unknown: force a fresh PNR check, never retry.
      setChecked(null);
      setCheckedPnr('');
      setOldSel(null);
      setNewSel(null);
      setError(SUN_UNKNOWN_RESULT_MSG);
      toast.error(SUN_UNKNOWN_RESULT_MSG);
    } finally {
      changeLockRef.current = false;
      if (sid === sessionRef.current) setChanging(false);
    }
  }, [checked, checkedPnr, oldSel, newSel]);

  const canConfirm = !!checked && !!checkedPnr && !!oldSel && !!newSel && !changing && !checking && !result;

  return {
    pnr, setPnr, checked, checkedPnr, oldSel, setOldSel, newSel, setNewSel,
    result, checking, changing, error, runCheck, runChange, reset, canConfirm,
  };
}
