import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface RepriceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface PassengerPrice {
  name: string;
  price: number;
}

interface PNRResult {
  pnr: string;
  status: 'success' | 'error';
  originalPrice?: PassengerPrice[];
  customerType?: string;
  error?: string;
}

interface PNRRepriceResult extends PNRResult {
  priceComparison?: PriceComparison;
}

interface PriceComparison {
  oldTotal: number;
  newTotal: number;
  passengers: {
    name: string;
    oldPrice: number;
    newPrice: number;
  }[];
}

type ModalStep = 'check' | 'reprice' | 'result';

export const RepriceModal: React.FC<RepriceModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [pnrInput, setPnrInput] = useState('');
  const [customerTypes, setCustomerTypes] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<ModalStep>('check');
  const [pnrResults, setPnrResults] = useState<PNRResult[]>([]);
  const [repriceResults, setRepriceResults] = useState<PNRRepriceResult[]>([]);
  const [showDetails, setShowDetails] = useState<Record<string, boolean>>({});

  const handleClose = () => {
    setPnrInput('');
    setCustomerTypes({});
    setStep('check');
    setPnrResults([]);
    setRepriceResults([]);
    setShowDetails({});
    onClose();
  };

  const parsePNRInput = (input: string): string[] => {
    // Split by space, comma, or semicolon and filter valid 6-character PNRs
    const pnrs = input
      .split(/[\s,;]+/)
      .map(pnr => pnr.trim().toUpperCase())
      .filter(pnr => pnr.length === 6);
    return [...new Set(pnrs)]; // Remove duplicates
  };

  const parsePriceText = (priceText: string): PassengerPrice[] => {
    const passengers: PassengerPrice[] = [];
    
    // Nếu có GRAND TOTAL
    if (/GRAND TOTAL KRW/i.test(priceText)) {
      const totalMatch = priceText.match(/GRAND TOTAL KRW\s+(\d+)/i);
      const totalPrice = totalMatch ? parseInt(totalMatch[1]) : 0;
      // Match all passengers on the line, not just start of line
      const paxMatches = [...priceText.matchAll(/\d+\.\s*([A-Z\/\s]+?\([A-Z/0-9]+\))/gi)];
      for (const match of paxMatches) {
        passengers.push({
          name: match[1].trim(),
          price: totalPrice
        });
      }
      return passengers;
    }
  
    // Trường hợp parse theo từng dòng
    const lines = priceText.split('\n');
    for (const line of lines) {
      const match = line.match(/^\s*\d+\s+\.?\d+\s*I?\s+([\w\/\s\(\)\+\-]+?)\s+KRW\s+(\d+)/);
      if (match) {
        passengers.push({
          name: match[1].trim(),
          price: parseInt(match[2])
        });
      }
    }
    
    return passengers;
  };

  const comparePrices = (oldPriceText: string, newPriceText: string): PriceComparison => {
    const oldPassengers = parsePriceText(oldPriceText);
    const newPassengers = parsePriceText(newPriceText);
    
    const oldTotal = oldPassengers.reduce((sum, p) => sum + p.price, 0);
    const newTotal = newPassengers.reduce((sum, p) => sum + p.price, 0);
    
    const passengers = oldPassengers.map(oldP => {
      const matchingNewPassenger = newPassengers.find(newP => newP.name === oldP.name);
      return {
        name: oldP.name,
        oldPrice: oldP.price,
        newPrice: matchingNewPassenger?.price || 0
      };
    });
    
    return { oldTotal, newTotal, passengers };
  };

  const handleCheck = async () => {
    const pnrs = parsePNRInput(pnrInput);
    
    if (pnrs.length === 0) {
      toast.error('Vui lòng nhập ít nhất 1 mã PNR (mỗi PNR gồm 6 ký tự)');
      return;
    }

    setIsLoading(true);
    const results: PNRResult[] = [];

    for (const pnr of pnrs) {
      try {
        const response = await fetch(
          `https://thuhongtour.com/beginReprice?pnr=${pnr}`
        );
        
        const data = await response.json();
        
        // Check if response contains "IGNORED - {PNR}"
        const responseText = data.model?.output?.crypticResponse?.response || '';
        const isSuccess = responseText.includes(`IGNORED - ${pnr}`);
        
        if (isSuccess && data.pricegoc) {
          const prices = parsePriceText(data.pricegoc);
          
          // Auto-detect customer type from pricegoc
          const detectedType = data.pricegoc.includes('RSTU') ? 'STU' : 'VFR';
          
          results.push({
            pnr,
            status: 'success',
            originalPrice: prices,
            customerType: detectedType
          });
        } else {
          results.push({
            pnr,
            status: 'error',
            error: 'Kiểm tra PNR thất bại'
          });
        }
      } catch (error) {
        console.error(`Error checking PNR ${pnr}:`, error);
        results.push({
          pnr,
          status: 'error',
          error: 'Lỗi kết nối'
        });
      }
    }

    setPnrResults(results);
    
    // Set customer type for each successful result
    const types: Record<string, string> = {};
    results.forEach(result => {
      if (result.status === 'success' && result.customerType) {
        types[result.pnr] = result.customerType;
      }
    });
    setCustomerTypes(types);
    
    setIsLoading(false);
    
    const successCount = results.filter(r => r.status === 'success').length;
    if (successCount > 0) {
      setStep('reprice');
      toast.success(`Kiểm tra thành công ${successCount}/${pnrs.length} PNR`);
    } else {
      toast.error('Tất cả PNR đều kiểm tra thất bại');
    }
  };

  const handleReprice = async () => {
    const successfulPNRs = pnrResults.filter(r => r.status === 'success');
    
    if (successfulPNRs.length === 0) {
      toast.error('Không có PNR nào để reprice');
      return;
    }
    
    setIsLoading(true);
    const results: PNRRepriceResult[] = [];

    for (const result of successfulPNRs) {
      try {
        const pnrCustomerType = customerTypes[result.pnr] || 'VFR';
        const response = await fetch(
          `https://thuhongtour.com/reprice?pnr=${result.pnr}&doituong=${pnrCustomerType}`
        );
        
        const data = await response.json();
        
        const responseText = JSON.stringify(data).toUpperCase();
        const isSuccess = responseText.includes('TRANSACTION COMPLETE');
        
        if (isSuccess && data.pricegoc && data.pricemoi) {
          const comparison = comparePrices(data.pricegoc, data.pricemoi);
          results.push({
            ...result,
            priceComparison: comparison
          });
        } else {
          results.push({
            ...result,
            status: 'error',
            error: 'Reprice thất bại'
          });
        }
      } catch (error) {
        console.error(`Error repricing PNR ${result.pnr}:`, error);
        results.push({
          ...result,
          status: 'error',
          error: 'Lỗi kết nối'
        });
      }
    }

    setRepriceResults(results);
    setIsLoading(false);
    
    const successCount = results.filter(r => r.priceComparison).length;
    if (successCount > 0) {
      setStep('result');
      toast.success(`Reprice thành công ${successCount}/${successfulPNRs.length} PNR`);
    } else {
      toast.error('Tất cả PNR đều reprice thất bại');
    }
  };

  const handleReset = () => {
    setPnrInput('');
    setCustomerTypes({});
    setStep('check');
    setPnrResults([]);
    setRepriceResults([]);
    setShowDetails({});
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-center text-xl font-bold text-primary">
            Reprice PNR
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          <div>
            <Label htmlFor="pnr-input">Mã PNR</Label>
            <Input
              id="pnr-input"
              placeholder="Nhập mã PNR (phân tách bằng space, dấu phẩy hoặc dấu chấm phẩy)"
              value={pnrInput}
              onChange={(e) => setPnrInput(e.target.value)}
              className="mt-1"
              disabled={isLoading || step !== 'check'}
            />
            <p className="text-sm text-muted-foreground mt-1">
              Mỗi PNR gồm 6 ký tự. Ví dụ: FM4NJ6 FM4NJ7 hoặc FM4NJ6,FM4NJ7
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
                {pnrResults.map((result, index) => (
                  <div 
                    key={index} 
                    className={`p-3 rounded-lg border ${
                      result.status === 'success' 
                        ? 'bg-green-50 border-green-200' 
                        : 'bg-red-50 border-red-200'
                    }`}
                  >
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-semibold">PNR: {result.pnr}</span>
                      <span className={`text-xs px-2 py-1 rounded ${
                        result.status === 'success' 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {result.status === 'success' ? 'Thành công' : 'Thất bại'}
                      </span>
                    </div>
                    
                     {result.status === 'success' && result.originalPrice ? (
                      <div className="space-y-2">
                        <div className="space-y-1">
                          {result.originalPrice.map((passenger, pIndex) => (
                            <div key={pIndex} className="flex justify-between text-xs">
                              <span>{passenger.name}</span>
                              <span className="font-semibold">{passenger.price.toLocaleString()} KRW</span>
                            </div>
                          ))}
                          <div className="pt-1 mt-1 border-t border-green-200 flex justify-between text-xs font-bold">
                            <span>Tổng:</span>
                            <span>{result.originalPrice.reduce((sum, p) => sum + p.price, 0).toLocaleString()} KRW</span>
                          </div>
                        </div>
                        <div>
                          <Label className="text-xs">Đối Tượng</Label>
                          <Select 
                            value={customerTypes[result.pnr] || 'VFR'} 
                            onValueChange={(value) => setCustomerTypes(prev => ({ ...prev, [result.pnr]: value }))}
                            disabled={isLoading}
                          >
                            <SelectTrigger className="h-8 text-xs mt-1">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="ADT">ADT</SelectItem>
                              <SelectItem value="VFR">VFR</SelectItem>
                              <SelectItem value="STU">STU</SelectItem>
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
                <Button
                  onClick={handleReset}
                  variant="outline"
                  className="flex-1"
                  disabled={isLoading}
                >
                  Nhập lại
                </Button>
                <Button
                  onClick={handleReprice}
                  disabled={isLoading}
                  className="flex-1"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Đang xử lý...
                    </>
                  ) : (
                    'Reprice'
                  )}
                </Button>
              </div>
            </>
          )}

          {step === 'result' && (
            <>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                <h3 className="font-semibold">Kết quả Reprice:</h3>
                {repriceResults.map((result, index) => (
                  <div 
                    key={index} 
                    className={`p-3 rounded-lg border ${
                      result.priceComparison 
                        ? 'bg-green-50 border-green-200' 
                        : 'bg-red-50 border-red-200'
                    }`}
                  >
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-semibold">PNR: {result.pnr}</span>
                      <span className={`text-xs px-2 py-1 rounded ${
                        result.priceComparison 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {result.priceComparison ? 'Thành công' : 'Thất bại'}
                      </span>
                    </div>
                    
                    {result.priceComparison ? (
                      <>
                        <div className="flex items-center gap-3 mb-2">
                          <div className="text-xs">
                            <span className="text-muted-foreground">Giá cũ: </span>
                            <span className="font-semibold">
                              {result.priceComparison.oldTotal.toLocaleString()} KRW
                            </span>
                          </div>
                          <div className="text-xs">
                            <span className="text-muted-foreground">Giá mới: </span>
                            <span className="font-semibold">
                              {result.priceComparison.newTotal.toLocaleString()} KRW
                            </span>
                          </div>
                          <div
                            className={`text-xs font-bold px-2 py-1 rounded ${
                              result.priceComparison.newTotal < result.priceComparison.oldTotal
                                ? 'bg-green-100 text-green-700'
                                : result.priceComparison.newTotal > result.priceComparison.oldTotal
                                ? 'bg-red-100 text-red-700'
                                : 'bg-gray-100 text-gray-700'
                            }`}
                          >
                            {result.priceComparison.newTotal < result.priceComparison.oldTotal
                              ? `↓ ${(result.priceComparison.oldTotal - result.priceComparison.newTotal).toLocaleString()}`
                              : result.priceComparison.newTotal > result.priceComparison.oldTotal
                              ? `↑ ${(result.priceComparison.newTotal - result.priceComparison.oldTotal).toLocaleString()}`
                              : '= Không đổi'}
                          </div>
                        </div>
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowDetails(prev => ({ ...prev, [result.pnr]: !prev[result.pnr] }))}
                          className="h-6 text-xs"
                        >
                          {showDetails[result.pnr] ? 'Ẩn chi tiết' : 'Chi tiết'}
                        </Button>

                        {showDetails[result.pnr] && (
                          <div className="space-y-1 mt-2 pt-2 border-t border-green-200">
                            <div className="text-xs font-semibold text-muted-foreground grid grid-cols-3 gap-2 pb-1">
                              <div>Tên khách</div>
                              <div className="text-right">Giá cũ</div>
                              <div className="text-right">Giá mới</div>
                            </div>
                            {result.priceComparison.passengers.map((passenger, pIndex) => (
                              <div
                                key={pIndex}
                                className="text-xs grid grid-cols-3 gap-2 py-1"
                              >
                                <div className="font-medium">{passenger.name}</div>
                                <div className="text-right">{passenger.oldPrice.toLocaleString()}</div>
                                <div className="text-right">{passenger.newPrice.toLocaleString()}</div>
                              </div>
                            ))}
                          </div>
                        )}
                      </>
                    ) : (
                      <p className="text-xs text-red-600">{result.error}</p>
                    )}
                  </div>
                ))}
              </div>

              <Button
                onClick={handleReset}
                className="w-full"
              >
                Reprice PNR khác
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
