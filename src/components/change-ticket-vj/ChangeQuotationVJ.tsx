import React, { useEffect, useState } from 'react';
import { ChevronDown, Wallet, Pencil } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import type { VJQuotation } from '@/types/changeTicketVJ';

/** 759060.93 -> "759.061 w" */
function formatVnd(value: number | string | undefined | null): string {
  if (value === undefined || value === null || value === '') return '-';
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return '-';
  const rounded = Math.round(n);
  return `${new Intl.NumberFormat('de-DE').format(rounded)} w`;
}

export const ChangeQuotationVJ: React.FC<{ quotation?: VJQuotation }> = ({
  quotation,
}) => {
  const [open, setOpen] = useState(true);
  const original = Number(quotation?.total_price_change) || 0;
  const [total, setTotal] = useState<number>(original);
  const [editing, setEditing] = useState(false);
  const [temp, setTemp] = useState<string>(String(original));

  useEffect(() => {
    setTotal(original);
    setTemp(String(original));
  }, [original]);

  if (!quotation) return null;

  const save = () => {
    const parsed = Number(temp);
    if (!Number.isFinite(parsed)) {
      toast.error('Giá trị không hợp lệ');
      return;
    }
    if (parsed < original) {
      toast.error(`Không được nhỏ hơn ${formatVnd(original)}`);
      return;
    }
    setTotal(parsed);
    setEditing(false);
  };

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className="rounded-xl border border-red-200 bg-gradient-to-br from-red-50 to-amber-50 p-3 shadow-sm">
        <CollapsibleTrigger className="w-full flex items-center justify-between text-sm font-semibold text-gray-700">
          <span className="inline-flex items-center gap-2">
            <Wallet className="h-4 w-4 text-red-500" />
            <span className="inline-block -translate-y-[8px]">Chi phí đổi vé</span>
          </span>
          <ChevronDown
            className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`}
          />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="mt-3">
            <div className="rounded-lg bg-white/80 p-3">
              <div className="text-xs text-gray-500 mb-1">
                <span className="inline-block -translate-y-[8px]">Tổng tiền đổi vé</span>
              </div>
              {editing ? (
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={temp}
                    onChange={(e) => setTemp(e.target.value)}
                    min={original}
                    className="h-8"
                  />
                  <Button size="sm" onClick={save}>OK</Button>
                  <Button size="sm" variant="outline" onClick={() => { setEditing(false); setTemp(String(total)); }}>
                    Hủy
                  </Button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setEditing(true)}
                  className="font-bold text-red-700 inline-flex items-center gap-1 hover:underline"
                  title="Bấm để sửa (không nhỏ hơn giá gốc)"
                >
                  <span className="inline-block -translate-y-[8px]">{formatVnd(total)}</span>
                  <Pencil className="h-3 w-3 text-gray-400" />
                </button>
              )}
            </div>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
};
