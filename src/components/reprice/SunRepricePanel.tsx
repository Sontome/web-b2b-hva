import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Plane } from 'lucide-react';
import { toast } from 'sonner';
import {
  beginSunReprice,
  parseSunPriceText,
  repriceSun,
  type SunBeginRepriceResponse,
} from '@/services/sunRepriceService';

type Step = 'check' | 'reprice' | 'result';

interface CheckResult {
  pnr: string;
  ok: boolean;
  data?: SunBeginRepriceResponse;
  error?: string;
}

interface RepriceResult {
  pnr: string;
  ok: boolean;
  oldTotal?: number | null;
  newTotal?: number | null;
  message: string;
}

const formatMoney = (v?: number | null) =>
  v === null || v === undefined ? '—' : `${v.toLocaleString()} KRW`;

const paxName = (p: { lastName?: string; firstName?: string }) =>
  [p.lastName, p.firstName].filter(Boolean).join('/');

export const SunRepricePanel: React.FC = () => {
  const [pnrInput, setPnrInput] = useState('');
  const [step, setStep] = useState<Step>('check');
  const [isLoading, setIsLoading] = useState(false);
  const [checkResults, setCheckResults] = useState<CheckResult[]>([]);
  const [customerTypes, setCustomerTypes] = useState<Record<string, string>>({});
  const [repriceResults, setRepriceResults] = useState<RepriceResult[]>([]);

  const parsePNRInput = (input: string): string[] => {
    const pnrs = input
      .split(/[\s,;]+/)
      .map((p) => p.trim().toUpperCase())
      .filter((p) => p.length === 6);
    return [...new Set(pnrs)];
  };

  const handleReset = () => {
    setPnrInput('');
    setStep('check');
    setCheckResults([]);
    setCustomerTypes({});
    setRepriceResults([]);
  };

  const handleCheck = async () => {
    const pnrs = parsePNRInput(pnrInput);
    if (pnrs.length === 0) {
      toast.error('Vui lòng nhập ít nhất 1 mã PNR (mỗi PNR gồm 6 ký tự)');
      return;
    }

    setIsLoading(true);
    const results: CheckResult[] = [];
    const types: Record<string, string> = {};

    for (const pnr of pnrs) {
      try {
        const data = await beginSunReprice(pnr);
        const ok = data?.status === 'OK' || (data?.chang?.length ?? 0) > 0;
        if (ok) {
          const detected = (data.doituong || '').toUpperCase() === 'VFR' ? 'VFR' : 'ADT';
          types[pnr] = detected;
          results.push({ pnr, ok: true, data });
        } else {
          results.push({
            pnr,
            ok: false,
            error: data?.reason || data?.response || 'Kiểm tra PNR thất bại',
          });
        }
      } catch (e: any) {
        results.push({ pnr, ok: false, error: e?.message || 'Lỗi kết nối' });
      }
    }

    setCheckResults(results);
    setCustomerTypes(types);
    setIsLoading(false);

    const successCount = results.filter((r) => r.ok).length;
    if (successCount > 0) {
      setStep('reprice');
      toast.success(`Kiểm tra thành công ${successCount}/${pnrs.length} PNR`);
    } else {
      toast.error('Tất cả PNR đều kiểm tra thất bại');
    }
  };

  const handleReprice = async () => {
    const targets = checkResults.filter((r) => r.ok);
    if (targets.length === 0) {
      toast.error('Không có PNR nào để reprice');
      return;
    }

    setIsLoading(true);
    const results: RepriceResult[] = [];

    for (const item of targets) {
      try {
        const res = await repriceSun(item.pnr, customerTypes[item.pnr] || 'ADT');
        const ok = (res.status || '').toUpperCase() === 'OK';
        if (ok) {
          const beginPrice = parseSunPriceText(item.data?.pricegoc);
          const oldTotal =
            beginPrice ??
            (item.data?.tongbillgiagoc !== undefined && item.data?.tongbillgiagoc !== null
              ? Number(item.data.tongbillgiagoc)
              : null);
          const newTotal = parseSunPriceText(res.pricemoi) ?? parseSunPriceText(res.pricegoc);
          results.push({
            pnr: item.pnr,
            ok: true,
            oldTotal,
            newTotal,
            message:
              [res.reason, res.response].filter(Boolean).join('\n') || 'Reprice thành công',
          });
        } else {
          results.push({
            pnr: item.pnr,
            ok: false,
            message:
              [res.reason, res.response].filter(Boolean).join('\n') || JSON.stringify(res),
          });
        }
      } catch (e: any) {
        results.push({ pnr: item.pnr, ok: false, message: e?.message || 'Lỗi kết nối' });
      }
    }

    setRepriceResults(results);
    setIsLoading(false);

    const successCount = results.filter((r) => r.ok).length;
    if (successCount > 0) {
      toast.success(`Reprice thành công ${successCount}/${targets.length} PNR`);
    } else {
      toast.error('Tất cả PNR đều reprice thất bại');
    }
    setStep('result');
  };

  const renderSegments = (data?: SunBeginRepriceResponse) => (
    <div className="space-y-1">
      {(data?.chang || []).map((seg, i) => (
        <div key={i} className="flex items-center justify-between text-xs bg-white/60 rounded px-2 py-1">
          <div className="flex items-center gap-2">
            <Plane className="h-3 w-3 text-muted-foreground" />
            <span className="font-semibold">
              {seg.departure}-{seg.arrival}
            </span>
            <span>{seg.giocatcanh}</span>
            <span className="text-muted-foreground">{seg.ngaycatcanh}</span>
            <span className="text-muted-foreground">{seg.sohieumaybay}</span>
          </div>
          {seg.loaive && (
            <span className="text-[10px] px-2 py-0.5 rounded bg-blue-100 text-blue-700 font-semibold">
              {seg.loaive}
            </span>
          )}
        </div>
      ))}
    </div>
  );

  const renderPassengers = (data?: SunBeginRepriceResponse) => (
    <div className="space-y-0.5">
      {(data?.passengers || []).map((p, i) => (
        <div key={i} className="flex justify-between text-xs">
          <span>
            {i + 1}. {paxName(p)}
          </span>
          <span className="text-muted-foreground">{p.loaikhach}</span>
        </div>
      ))}
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <Label htmlFor="sun-pnr-input">Mã PNR (SunPQ)</Label>
        <Input
          id="sun-pnr-input"
          placeholder="Nhập mã PNR (phân tách bằng space, dấu phẩy hoặc dấu chấm phẩy)"
          value={pnrInput}
          onChange={(e) => setPnrInput(e.target.value)}
          className="mt-1"
          disabled={isLoading || step !== 'check'}
        />
        <p className="text-sm text-muted-foreground mt-1">
          Mỗi PNR gồm 6 ký tự. Ví dụ: EKLC7S EKLC7T hoặc EKLC7S,EKLC7T
        </p>
      </div>

      {step === 'check' && (
        <Button
          onClick={handleCheck}
          disabled={isLoading || pnrInput.trim().length === 0}
          className="w-full"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Đang kiểm tra...
            </>
          ) : (
            'Check'
          )}
        </Button>
      )}

      {step === 'reprice' && (
        <>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            <h3 className="font-semibold">Kết quả kiểm tra:</h3>
            {checkResults.map((result, index) => (
              <div
                key={index}
                className={`p-3 rounded-lg border ${
                  result.ok ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                }`}
              >
                <div className="flex justify-between items-center mb-2">
                  <span className="font-semibold">PNR: {result.pnr}</span>
                  <span
                    className={`text-xs px-2 py-1 rounded ${
                      result.ok ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {result.ok ? 'Thành công' : 'Thất bại'}
                  </span>
                </div>

                {result.ok ? (
                  <div className="space-y-2">
                    {renderSegments(result.data)}
                    {renderPassengers(result.data)}
                    <div className="flex justify-between text-xs font-bold pt-1 border-t border-green-200">
                      <span>Giá cũ:</span>
                      <span>
                        {formatMoney(
                          parseSunPriceText(result.data?.pricegoc) ??
                            (result.data?.tongbillgiagoc !== undefined &&
                            result.data?.tongbillgiagoc !== null
                              ? Number(result.data.tongbillgiagoc)
                              : null)
                        )}
                      </span>
                    </div>
                    <div>
                      <Label className="text-xs">Đối Tượng</Label>
                      <Select
                        value={customerTypes[result.pnr] || 'ADT'}
                        onValueChange={(value) =>
                          setCustomerTypes((prev) => ({ ...prev, [result.pnr]: value }))
                        }
                        disabled={isLoading}
                      >
                        <SelectTrigger className="h-8 text-xs mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ADT">ADT</SelectItem>
                          <SelectItem value="VFR">VFR</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-red-600">{result.error}</p>
                )}
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <Button onClick={handleReset} variant="outline" className="flex-1" disabled={isLoading}>
              Nhập lại
            </Button>
            <Button onClick={handleReprice} disabled={isLoading} className="flex-1">
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Đang xử lý...
                </>
              ) : (
                'Xác nhận Reprice'
              )}
            </Button>
          </div>
        </>
      )}

      {step === 'result' && (
        <>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            <h3 className="font-semibold">Kết quả Reprice:</h3>
            {repriceResults.map((result, index) => {
              const begin = checkResults.find((c) => c.pnr === result.pnr)?.data;
              const hasPrices =
                result.ok &&
                (result.oldTotal !== undefined || result.newTotal !== undefined) &&
                !(result.oldTotal == null && result.newTotal == null);
              return (
                <div
                  key={index}
                  className={`p-3 rounded-lg border ${
                    result.ok ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                  }`}
                >
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-semibold">PNR: {result.pnr}</span>
                    <span
                      className={`text-xs px-2 py-1 rounded ${
                        result.ok ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {result.ok ? 'Thành công' : 'Thất bại'}
                    </span>
                  </div>

                  <div className="space-y-2">
                    {renderSegments(begin)}
                    {renderPassengers(begin)}
                    <div className="text-xs text-muted-foreground">
                      Đối tượng: {customerTypes[result.pnr] || 'ADT'}
                    </div>

                    {hasPrices && (
                      <div className="flex items-center gap-3">
                        <div className="text-xs">
                          <span className="text-muted-foreground">Giá cũ: </span>
                          <span className="font-semibold">{formatMoney(result.oldTotal)}</span>
                        </div>
                        <div className="text-xs">
                          <span className="text-muted-foreground">Giá mới: </span>
                          <span className="font-semibold">{formatMoney(result.newTotal)}</span>
                        </div>
                        {result.oldTotal != null && result.newTotal != null && (
                          <div
                            className={`text-xs font-bold px-2 py-1 rounded ${
                              result.newTotal < result.oldTotal
                                ? 'bg-green-100 text-green-700'
                                : result.newTotal > result.oldTotal
                                ? 'bg-red-100 text-red-700'
                                : 'bg-gray-100 text-gray-700'
                            }`}
                          >
                            {result.newTotal < result.oldTotal
                              ? `↓ ${(result.oldTotal - result.newTotal).toLocaleString()}`
                              : result.newTotal > result.oldTotal
                              ? `↑ ${(result.newTotal - result.oldTotal).toLocaleString()}`
                              : '= Không đổi'}
                          </div>
                        )}
                      </div>
                    )}

                    <pre
                      className={`font-sans whitespace-pre-wrap text-xs ${
                        result.ok ? 'text-green-700' : 'text-red-600'
                      }`}
                    >
                      {result.message}
                    </pre>
                  </div>
                </div>
              );
            })}
          </div>

          <Button onClick={handleReset} className="w-full">
            Reprice PNR khác
          </Button>
        </>
      )}
    </div>
  );
};

export default SunRepricePanel;
