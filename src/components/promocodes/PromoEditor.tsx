import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { PROMO_AIRLINES, promoPayload, utcToVietnamInput, promoError, type PromoForm } from '@/lib/promocodes';
import type { PromoRow, PromoWrite } from '@/services/promocodes';

export function PromoEditor({ row, onClose, onSave }: { row: PromoRow | null; onClose: () => void; onSave: (payload: PromoWrite) => Promise<unknown> }) {
  const [form, setForm] = useState<PromoForm>(() => ({ airline: row?.airline ?? '', code: row?.code ?? '', enabled: row?.enabled ?? true, start: utcToVietnamInput(row?.valid_from ?? null), end: utcToVietnamInput(row?.valid_until ?? null), note: row?.note ?? '' }));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const lock = useRef(false);
  const set = <K extends keyof PromoForm>(key: K, value: PromoForm[K]) => setForm(f => ({ ...f, [key]: value }));
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (lock.current) return;
    lock.current = true; setBusy(true); setError('');
    try { await onSave(promoPayload(form)); onClose(); }
    catch (e) { setError(promoError(e)); }
    finally { lock.current = false; setBusy(false); }
  };
  const airlines = { ...PROMO_AIRLINES, ...(row && !(row.airline in PROMO_AIRLINES) ? { [row.airline]: row.airline } : {}) };
  return <Dialog open onOpenChange={open => { if (!open && !lock.current) onClose(); }}>
    <DialogContent className="max-w-lg max-h-[90dvh] overflow-y-auto" onEscapeKeyDown={e => { if (busy) e.preventDefault(); }} onPointerDownOutside={e => { if (busy) e.preventDefault(); }}>
      <DialogHeader><DialogTitle>{row ? 'Sửa mã khuyến mãi' : 'Thêm mã khuyến mãi'}</DialogTitle><DialogDescription>Cấu hình mã theo hãng bay</DialogDescription></DialogHeader>
      <form onSubmit={submit} className="space-y-4">
        <fieldset disabled={busy} className="space-y-4">
          <div className="space-y-1"><Label htmlFor="promo-airline">Hãng *</Label><Select value={form.airline} onValueChange={v => set('airline', v)} disabled={busy}><SelectTrigger id="promo-airline"><SelectValue placeholder="Chọn hãng bay" /></SelectTrigger><SelectContent>{Object.entries(airlines).map(([code, label]) => <SelectItem key={code} value={code}>{label}</SelectItem>)}</SelectContent></Select></div>
          <div className="space-y-1"><Label htmlFor="promo-code">Mã khuyến mãi *</Label><Input id="promo-code" value={form.code} onChange={e => set('code', e.target.value)} autoComplete="off" /></div>
          <div className="flex items-center justify-between"><Label htmlFor="promo-enabled">Bật sử dụng</Label><Switch id="promo-enabled" checked={form.enabled} onCheckedChange={v => set('enabled', v)} disabled={busy} /></div>
          <p className="text-sm text-muted-foreground">Ngày giờ nhập theo giờ Việt Nam (GMT+7).</p>
          {(['start', 'end'] as const).map(key => <div key={key} className="space-y-1"><Label htmlFor={`promo-${key}`}>{key === 'start' ? 'Thời điểm bắt đầu' : 'Thời điểm kết thúc'}</Label><div className="flex gap-2"><Input id={`promo-${key}`} className="min-w-0" type="datetime-local" step="1" value={form[key]} onChange={e => set(key, e.target.value)} /><Button type="button" variant="outline" onClick={() => set(key, '')} disabled={!form[key] || busy}>Xóa mốc</Button></div></div>)}
          <p className="text-xs text-muted-foreground">Muốn dùng hết ngày 31/10, đặt kết thúc lúc 00:00 ngày 01/11.</p>
          <div className="space-y-1"><Label htmlFor="promo-note">Ghi chú</Label><Textarea id="promo-note" value={form.note} onChange={e => set('note', e.target.value)} /></div>
        </fieldset>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <DialogFooter><Button type="button" variant="outline" disabled={busy} onClick={onClose}>Hủy</Button><Button type="submit" disabled={busy}>{busy ? 'Đang lưu…' : 'Lưu mã'}</Button></DialogFooter>
      </form>
    </DialogContent>
  </Dialog>;
}
