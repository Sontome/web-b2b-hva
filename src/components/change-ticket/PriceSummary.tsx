import React, { useEffect, useMemo, useState } from 'react';
import type { ChangePrice } from '@/types/changeTicket';
import { formatCurrencyKRW } from './utils';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export const PriceSummary: React.FC<{
  price?: ChangePrice;
}> = ({ price }) => {

  const [editingField, setEditingField] =
    useState<'penalty' | 'grd' | null>(null);

  const [penalty, setPenalty] =
    useState<number>(0);

  const [grd, setGrd] =
    useState<number>(0);

  const [tempValue, setTempValue] =
    useState('');

  useEffect(() => {

    if (!price) return;

    setPenalty(Number(price.penalty_total) || 0);

    setGrd(Number(price.GRD_TOTAL) || 0);

  }, [price]);

  const total = useMemo(() => {
    return penalty + grd;
  }, [penalty, grd]);

  if (!price) return null;

  const startEdit = (
    field: 'penalty' | 'grd'
  ) => {

    setEditingField(field);

    setTempValue(
      String(
        field === 'penalty'
          ? penalty
          : grd
      )
    );
  };

  const saveEdit = () => {
    const parsed = Number(tempValue);
    if (!isNaN(parsed)) {
      if (editingField === 'penalty') {
        const min = Number(price?.penalty_total) || 0;
        if (parsed < min) {
          // eslint-disable-next-line @typescript-eslint/no-var-requires
          import('sonner').then(({ toast }) =>
            toast.error(`Phí đổi mới không được nhỏ hơn ${min.toLocaleString()}`)
          );
          return;
        }
        setPenalty(parsed);
      }
      if (editingField === 'grd') {
        const min = Number(price?.GRD_TOTAL) || 0;
        if (parsed < min) {
          import('sonner').then(({ toast }) =>
            toast.error(`Phí chênh lệch mới không được nhỏ hơn ${min.toLocaleString()}`)
          );
          return;
        }
        setGrd(parsed);
      }
    }
    setEditingField(null);
  };

  const cancelEdit = () => {

    setEditingField(null);

    setTempValue('');
  };

  return (
    <div className="rounded-xl border border-blue-200 bg-gradient-to-br from-blue-50 to-emerald-50 p-4 shadow-sm">

      <div className="text-sm font-semibold text-gray-700 mb-2">
        <span className="inline-block -translate-y-[8px]">
        Tổng chi phí đổi vé</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">

        {/* PHÍ PHẠT */}
        <div className="rounded-lg bg-white/70 p-2">

          <div className="text-xs text-gray-500 mb-1">
            <span className="inline-block -translate-y-[8px]">
            Phí đổi của hãng</span>
          </div>

          {editingField === 'penalty' ? (

            <div className="space-y-2">

              <Input
                type="number"
                value={tempValue}
                onChange={(e) =>
                  setTempValue(e.target.value)
                }
              />

              <div className="flex gap-2">

                <Button
                  size="sm"
                  onClick={saveEdit}
                >
                  OK
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={cancelEdit}
                >
                  Cancel
                </Button>

              </div>
            </div>

          ) : (

            <button
              type="button"
              onClick={() =>
                startEdit('penalty')
              }
              className="font-semibold text-gray-800 hover:underline"
            >
              <span className="inline-block -translate-y-[8px]">{formatCurrencyKRW(penalty)}</span>
            </button>

          )}
        </div>

        {/* PHÍ CHÊNH LỆCH */}
        <div className="rounded-lg bg-white/70 p-2">

          <div className="text-xs text-gray-500 mb-1">
            <span className="inline-block -translate-y-[8px]">
            Phí chênh lệch</span>
          </div>

          {editingField === 'grd' ? (

            <div className="space-y-2">

              <Input
                type="number"
                value={tempValue}
                onChange={(e) =>
                  setTempValue(e.target.value)
                }
              />

              <div className="flex gap-2">

                <Button
                  size="sm"
                  onClick={saveEdit}
                >
                  OK
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={cancelEdit}
                >
                  Cancel
                </Button>

              </div>
            </div>

          ) : (

            <button
              type="button"
              onClick={() =>
                startEdit('grd')
              }
              className="font-semibold text-gray-800 hover:underline"
            >
              <span className="inline-block -translate-y-[8px]">{formatCurrencyKRW(grd)}</span>
            </button>

          )}
        </div>

        {/* TOTAL */}
        <div className="rounded-lg bg-emerald-100 p-2">

          <div className="text-xs text-emerald-700">
            <span className="inline-block -translate-y-[8px]">
            Tổng phí đổi</span>
          </div>

          <div className="font-bold text-emerald-800">
            <span className="inline-block -translate-y-[8px]">{formatCurrencyKRW(total)}</span>
          </div>

        </div>
      </div>
    </div>
  );
};
