import React, { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { RefreshCw, Search, X, Copy, CheckCircle2, AlertTriangle, Users, Plane, Loader2 } from 'lucide-react';
import { useSunChangeTicket } from '@/hooks/useSunChangeTicket';
import {
  adjustedTotal,
  FEE_KEYS,
  newSegmentsFromTrip,
  paxTypeLabel,
  sameFlight,
  segLabel,
  segView,
  validateFeeEdit,
  type FeeKey,
  type SunChangeResult,
  type SunSeg,
} from '@/lib/sunChangeTicket';
import type { SunPQTrip } from '@/types/sunpq';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  trip: SunPQTrip; // frozen snapshot of the clicked card
}

const fmtNum = (n: number) => new Intl.NumberFormat('de-DE').format(n);

const SegRow: React.FC<{
  seg: SunSeg;
  selected?: boolean;
  disabled?: boolean;
  onSelect?: () => void;
  badge?: string;
}> = ({ seg, selected, disabled, onSelect, badge }) => {
  const v = segView(seg);
  const showArrDate = v.arrDate && v.arrDate !== v.depDate;
  const content = (
    <div className="flex items-start gap-2 w-full">
      {onSelect && (
        <span
          className={`mt-1 h-4 w-4 shrink-0 rounded-full border-2 ${selected ? 'border-orange-500 bg-orange-500' : 'border-gray-300'}`}
        />
      )}
      <div className="flex-1 min-w-0 text-sm">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5">
          <span className="font-semibold">{v.from} → {v.to}</span>
          {v.flight && <span className="font-mono text-gray-700">{v.flight}</span>}
          {badge && <span className="text-[11px] px-1.5 py-0.5 rounded bg-green-100 text-green-700">{badge}</span>}
        </div>
        <div className="text-xs text-gray-600 flex flex-wrap gap-x-3">
          <span>{v.depDate || '—'}</span>
          {(v.depTime || v.arrTime) && <span>{v.depTime || '--:--'} - {v.arrTime || '--:--'}</span>}
          {showArrDate && <span>Đến: {v.arrDate}</span>}
          {v.bookingClass && <span>Hạng: {v.bookingClass}</span>}
          {v.status && <span>TT: {v.status}</span>}
        </div>
      </div>
    </div>
  );
  if (!onSelect) return <div className="border rounded-md p-2 bg-white">{content}</div>;
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onSelect}
      className={`w-full text-left border rounded-md p-2 transition-colors disabled:opacity-60 ${
        selected ? 'border-orange-500 bg-orange-50' : 'bg-white hover:bg-orange-50/50'
      }`}
    >
      {content}
    </button>
  );
};

const Group: React.FC<{
  title: string;
  segs: SunSeg[];
  sel: SunSeg | null;
  onSel: (s: SunSeg) => void;
  disabled: boolean;
}> = ({ title, segs, sel, onSel, disabled }) =>
  segs.length === 0 ? null : (
    <div className="space-y-1.5">
      <div className="text-xs font-medium text-gray-500">{title}</div>
      {segs.map((s, i) => (
        <SegRow key={i} seg={s} selected={sel === s} disabled={disabled} onSelect={() => onSel(s)} />
      ))}
    </div>
  );

const FeeLine: React.FC<{
  label: string;
  value: number;
  original: number;
  currency: string;
  onSave: (v: number) => void;
}> = ({ label, value, original, currency, onSave }) => {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState('');
  const [err, setErr] = useState<string | null>(null);
  if (editing)
    return (
      <div className="py-1.5 space-y-1">
        <div className="text-sm text-gray-600">{label}</div>
        <div className="flex gap-2">
          <Input autoFocus value={text} onChange={(e) => setText(e.target.value)} className="h-8" inputMode="decimal" />
          <Button
            size="sm"
            onClick={() => {
              const r = validateFeeEdit(text, original);
              if (r.ok === false) return setErr(r.error);
              onSave(r.value);
              setEditing(false);
            }}
          >
            OK
          </Button>
          <Button size="sm" variant="outline" onClick={() => setEditing(false)}>Hủy</Button>
        </div>
        {err && <div className="text-xs text-red-600">{err} (tối thiểu {fmtNum(original)})</div>}
      </div>
    );
  return (
    <button
      type="button"
      className="w-full flex justify-between py-1.5 text-sm hover:bg-gray-50 rounded px-1"
      title="Nhấn để sửa"
      onClick={() => {
        setText(String(value));
        setErr(null);
        setEditing(true);
      }}
    >
      <span className="text-gray-600">{label}</span>
      <span className="font-medium">{fmtNum(value)} {currency}</span>
    </button>
  );
};

const FEE_LABELS: Record<FeeKey, string> = {
  chenhlech_giagoc: 'Chênh lệch giá vé',
  chenhlech_thuephi: 'Chênh lệch thuế/phí',
  phi_doi_ve: 'Phí đổi vé',
};

const ResultView: React.FC<{ result: SunChangeResult; newSeg: SunSeg | null; onClose: () => void }> = ({
  result,
  newSeg,
  onClose,
}) => {
  const [edits, setEdits] = useState<Partial<Record<FeeKey, number>>>({});
  const total = adjustedTotal(result, edits);
  const cur = result.currency;
  const val = (k: FeeKey) => (edits[k] !== undefined ? (edits[k] as number) : result[k]);

  const copyText = () => {
    const lines = [
      `Đổi vé SunPQ thành công - PNR ${result.pnr_number}`,
      ...FEE_KEYS.map((k) => `${FEE_LABELS[k]}: ${fmtNum(val(k))} ${cur}`),
      `Tổng tiền thay đổi: ${fmtNum(total)} ${cur}`,
      'Hành trình sau đổi:',
      ...result.list_itinerary.map((s) => `- ${segLabel(s)}`),
    ];
    navigator.clipboard.writeText(lines.join('\n'));
    toast.success('Đã copy');
  };

  return (
    <div className="space-y-4 py-3">
      <div className="flex items-start gap-2 rounded-lg bg-green-50 border border-green-200 p-3">
        <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
        <div className="text-sm">
          <div className="font-semibold text-green-800">Đổi vé SunPQ thành công</div>
          <div>PNR: <span className="font-mono font-semibold">{result.pnr_number}</span></div>
          {result.trace_id && <div className="text-xs text-gray-500 break-all">Trace: {result.trace_id}</div>}
        </div>
      </div>

      <div className="border rounded-lg p-3">
        {FEE_KEYS.map((k) => (
          <FeeLine
            key={k}
            label={FEE_LABELS[k]}
            value={val(k)}
            original={result[k]}
            currency={cur}
            onSave={(v) => setEdits((p) => ({ ...p, [k]: v }))}
          />
        ))}
        <div className="flex justify-between border-t mt-1 pt-2 px-1">
          <span className="font-semibold">Tổng tiền thay đổi</span>
          <span className="font-bold text-lg text-orange-600">{fmtNum(total)} {cur}</span>
        </div>
      </div>

      {result.pax_pricing.length > 0 && (
        <div className="overflow-x-auto border rounded-lg">
          <table className="w-full text-xs">
            <thead className="bg-gray-50">
              <tr>
                {['Loại khách', 'SL', 'Giá cũ', 'Giá mới', 'CL giá', 'CL thuế/phí', 'Phí đổi', 'Tổng/khách'].map((h) => (
                  <th key={h} className="px-2 py-1.5 text-left font-medium whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {result.pax_pricing.map((p, i) => (
                <tr key={i} className="border-t">
                  <td className="px-2 py-1">{paxTypeLabel(p?.type ?? p?.pax_type)}</td>
                  {['quantity', 'old_base_fare', 'new_base_fare', 'chenhlech_giagoc', 'chenhlech_thuephi', 'phi_doi_ve', 'tong_moi_khach'].map((k) => (
                    <td key={k} className="px-2 py-1 whitespace-nowrap">
                      {typeof p?.[k] === 'number' ? fmtNum(p[k]) : p?.[k] ?? '—'}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="space-y-1.5">
        <div className="text-sm font-medium">Hành trình sau đổi</div>
        {result.list_itinerary.length === 0 ? (
          <div className="text-xs text-gray-500">Không có dữ liệu hành trình</div>
        ) : (
          result.list_itinerary.map((s, i) => (
            <SegRow key={i} seg={s} badge={newSeg && sameFlight(s, newSeg) ? 'Chặng vừa đổi' : undefined} />
          ))
        )}
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={copyText}><Copy className="h-4 w-4 mr-1" />Sao chép</Button>
        <Button onClick={onClose}>Đóng</Button>
      </div>
    </div>
  );
};

export const SunChangeTicketModal: React.FC<Props> = ({ isOpen, onClose, trip }) => {
  const h = useSunChangeTicket();
  const { reset } = h;
  const newGroups = useMemo(() => newSegmentsFromTrip(trip), [trip]);
  const hasNew = newGroups.out.length + newGroups.back.length > 0;
  const allNew = useMemo(() => [...newGroups.out, ...newGroups.back], [newGroups]);
  const locked = h.changing || !!h.result;

  useEffect(() => () => reset(), [reset]);
  useEffect(() => {
    if (!isOpen) reset();
  }, [isOpen, reset]);
  // Pre-select when only one new segment exists.
  useEffect(() => {
    if (h.checked && !h.newSel && allNew.length === 1) h.setNewSel(allNew[0]);
  }, [h.checked, h.newSel, allNew, h]);

  const newList = (
    <div className="space-y-2">
      <div className="text-sm font-semibold text-gray-800">Hành trình mới — chọn chặng thay thế</div>
      {!hasNew ? (
        <div className="text-xs text-red-600">Thẻ tìm kiếm thiếu dữ liệu hành trình (list_itinerary)</div>
      ) : h.checked ? (
        <>
          <Group title="Chiều đi" segs={newGroups.out} sel={h.newSel} onSel={h.setNewSel} disabled={locked} />
          <Group title="Chiều về" segs={newGroups.back} sel={h.newSel} onSel={h.setNewSel} disabled={locked} />
        </>
      ) : (
        allNew.map((s, i) => <SegRow key={i} seg={s} />)
      )}
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={(o) => !o && !h.changing && onClose()}>
      <DialogContent className="w-[95vw] max-w-[760px] max-h-[90vh] overflow-y-auto">
        <div className="flex items-center gap-2 border-b pb-3">
          <div className="h-8 w-8 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center">
            <RefreshCw className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-gray-900">Đổi vé Sun PhuQuoc Airways</h2>
            <p className="text-xs text-gray-500">Thay 1 chặng theo PNR</p>
          </div>
        </div>

        {h.result ? (
          <ResultView result={h.result} newSeg={h.newSel} onClose={onClose} />
        ) : (
          <div className="space-y-4 py-3">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Mã đặt chỗ (PNR)</label>
              <div className="flex gap-2">
                <Input
                  autoFocus
                  value={h.pnr}
                  disabled={h.changing}
                  onChange={(e) => h.setPnr(e.target.value.toUpperCase().slice(0, 6))}
                  onKeyDown={(e) => e.key === 'Enter' && h.runCheck()}
                  placeholder="VD: ABCDEF"
                  maxLength={6}
                  className="uppercase tracking-wider font-mono"
                />
                <Button onClick={h.runCheck} disabled={h.checking || h.changing || !h.pnr.trim()}>
                  {h.checking ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Search className="h-4 w-4 mr-1" />}
                  {h.checking ? 'Đang kiểm tra...' : 'Kiểm tra vé'}
                </Button>
              </div>
            </div>

            {h.error && (
              <div className="flex gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded p-2">
                <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" /> {h.error}
              </div>
            )}

            {h.checking && (
              <div className="space-y-2">
                <Skeleton className="h-14 w-full" />
                <Skeleton className="h-14 w-full" />
              </div>
            )}

            {h.checked && (
              <>
                <div className="text-sm flex flex-wrap gap-x-4 gap-y-1">
                  <span>PNR: <span className="font-mono font-semibold">{h.checked.pnr}</span></span>
                  {h.checked.status && <span>Trạng thái: <span className="font-semibold">{h.checked.status}</span></span>}
                </div>
                {h.checked.passengers.length > 0 && (
                  <div className="text-sm">
                    <div className="flex items-center gap-1 text-gray-600 mb-1"><Users className="h-4 w-4" /> Hành khách</div>
                    <ul className="text-xs space-y-0.5 pl-5 list-disc">
                      {h.checked.passengers.map((p, i) => (
                        <li key={i}>
                          {[p?.title, p?.last_name, p?.first_name].filter(Boolean).join(' ') || p?.name || p?.full_name || '—'}
                          {p?.type ? ` (${paxTypeLabel(p.type)})` : ''}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <div className="space-y-2">
                  <div className="text-sm font-semibold text-gray-800">Hành trình hiện tại — chọn chặng cần thay</div>
                  <Group title="Chiều đi" segs={h.checked.chieudi} sel={h.oldSel} onSel={h.setOldSel} disabled={locked} />
                  <Group title="Chiều về" segs={h.checked.chieuve} sel={h.oldSel} onSel={h.setOldSel} disabled={locked} />
                </div>
              </>
            )}

            <div className="border-t pt-3">{newList}</div>

            {h.checked && (
              <div className="border-t pt-3 space-y-3">
                <div className="text-sm rounded bg-orange-50 border border-orange-200 p-2 flex items-start gap-2">
                  <Plane className="h-4 w-4 text-orange-600 mt-0.5 shrink-0" />
                  {h.oldSel && h.newSel ? (
                    <span>Thay chặng <b>{segLabel(h.oldSel)}</b> bằng <b>{segLabel(h.newSel)}</b></span>
                  ) : (
                    <span className="text-gray-600">Chọn 1 chặng hiện tại và 1 chặng mới</span>
                  )}
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={onClose} disabled={h.changing}>
                    <X className="h-4 w-4 mr-1" />Hủy
                  </Button>
                  <Button
                    className="bg-orange-500 hover:bg-orange-600 text-white"
                    disabled={!h.canConfirm}
                    onClick={h.runChange}
                  >
                    {h.changing && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                    {h.changing ? 'Đang đổi vé…' : 'Xác nhận đổi vé'}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default SunChangeTicketModal;
