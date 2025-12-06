import React, { useState, useRef } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ChevronLeft, Camera, Copy, User } from "lucide-react";
import html2canvas from "html2canvas";

interface VNATicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialPNR?: string;
}

interface FlightSegment {
  sochang: number;
  departure: string;
  departurename: string;
  arrival: string;
  arrivalname: string;
  loaive: string;
  status: string;
  giocatcanh: string;
  ngaycatcanh: string;
  giohacanh: string;
  ngayhacanh: string;
  thoigianbay: string;
  sohieumaybay: string;
}

interface Infant {
  lastName: string;
  firstName: string;
}

interface Passenger {
  lastName: string;
  firstName: string;
  loaikhach: string;
  ngaysinh?: string | null;
  inf?: Infant;
}

interface VNAPNRData {
  pnr: string;
  chang: FlightSegment[];
  passengers: Passenger[];
  paymentstatus: boolean;
  tongbillgiagoc: number;
  doituong: string;
  status: string;
}

export const VNATicketModal: React.FC<VNATicketModalProps> = ({ isOpen, onClose, initialPNR }) => {
  const [pnr, setPnr] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [pnrData, setPnrData] = useState<VNAPNRData | null>(null);
  const captureRef = useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (isOpen && initialPNR && !pnrData) {
      setPnr(initialPNR);
      setTimeout(() => {
        handleCheck(initialPNR);
      }, 100);
    }
  }, [isOpen, initialPNR]);

  const handleCapture = async () => {
    if (!captureRef.current) return;

    await document.fonts.ready; // đảm bảo font load xong

    const canvas = await html2canvas(captureRef.current, {
      scale: 2, // ảnh nét
      useCORS: true, // load ảnh cross-origin
      backgroundColor: null, // giữ trong suốt
      scrollX: 0,
      scrollY: 0, // ✅ đừng để -window.scrollY
      windowWidth: document.documentElement.scrollWidth,
      windowHeight: document.documentElement.scrollHeight,
    });

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
    if (!blob) throw new Error("Không tạo được ảnh");

    await navigator.clipboard.write([
      new ClipboardItem({
        "image/png": blob,
      }),
    ]);
    toast.success("Ảnh vé đã được copy vào clipboard ✈️");
  };
  const handleCheck = async (pnrToCheck?: string) => {
    const checkPnr = pnrToCheck || pnr;
    if (!checkPnr.trim()) {
      toast.error("Vui lòng nhập PNR");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`https://thuhongtour.com/checkvechoVNA?pnr=${checkPnr.trim()}`, {
        method: "GET",
        headers: {
          accept: "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Không thể kiểm tra PNR");
      }

      const data = await response.json();

      if (data.status === "OK") {
        setPnrData(data);
        toast.success("Lấy thông tin PNR thành công");
      } else {
        toast.error("PNR không hợp lệ");
      }
    } catch (error) {
      console.error("Error checking PNR:", error);
      toast.error("Có lỗi xảy ra khi kiểm tra PNR");
    } finally {
      setIsLoading(false);
    }
  };
  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`Đã copy ${label}`);
  };
  const formatDate = (dateStr: string) => {
    const parts = dateStr.includes("/") ? dateStr.split("/") : dateStr.split("-").reverse();
    const date = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
    const weekdays = ["Chủ Nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"];
    const dayName = weekdays[date.getDay()];
    return `${dayName}, ${parts.join("/")}`;
  };

  const formatDuration = (duration: string) => {
    if (!duration) return "";
    const [hours, mins] = duration.split(":");
    return `${hours} giờ ${mins} phút`;
  };

  const handleClose = () => {
    setPnr("");
    setPnrData(null);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="w-[80vw] max-w-[1300px] max-h-[90vh] overflow-y-auto">
        <div className="space-y-6">
          {!pnrData && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="pnr">Mã đặt chỗ (PNR) - Vietnam Airlines</Label>
                <Input
                  id="pnr"
                  value={pnr}
                  onChange={(e) => setPnr(e.target.value.toUpperCase())}
                  placeholder="Nhập PNR"
                  className="mt-1"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleCheck();
                    }
                  }}
                />
              </div>
              <Button onClick={() => handleCheck()} disabled={isLoading} className="w-full">
                {isLoading ? "Đang kiểm tra..." : "Kiểm tra"}
              </Button>
            </div>
          )}

          {pnrData && (
            <div className="space-y-5 relative p-2">
              <Button
                variant="outline"
                size="icon"
                onClick={handleCapture}
                className="absolute top-0 right-0 bg-white border hover:bg-gray-100"
                title="Chụp ảnh vé"
              >
                <Camera className="h-5 w-5 text-gray-700" />
              </Button>

              {/* Header */}
              <div className="flex items-center bg-white p-4">
                <b className="text-base lg:text-xl ml-2">
                  <span className="text-cyan-600">{pnrData.pnr}</span>
                </b>
                <Button variant="ghost" size="sm" onClick={() => copyToClipboard(pnrData.pnr, "PNR")} className="ml-2">
                  <Copy className="h-4 w-4" />
                </Button>
              </div>

              {pnrData.doituong && (
                <div className="mt-2 ml-4">
                  <p className="text-base text-gray-800 font-semibold">
                    Đối tượng: <span className="text-cyan-700 font-bold text-xl">{pnrData.doituong}</span>
                  </p>
                </div>
              )}

              {!pnrData.paymentstatus && (
                <div className="px-4 py-3 rounded" style={{ backgroundColor: "#fffad6" }}>
                  <p className="text-lg text-black font-semibold">
                    Tổng tiền:{" "}
                    <span className="text-red-600"> {Math.round(pnrData.tongbillgiagoc).toLocaleString("en-US")}</span>{" "}
                    <span className="text-gray-800">KRW</span>
                  </p>
                </div>
              )}

              <div ref={captureRef} className="[&_p]:m-0 [&_span]:m-0 [&_div]:leading-tight [&_p]:leading-tight">
                {/* Passenger Information */}

                <div className="bg-white p-4 gap-4">
                  <div className="mb-4 flex gap-4 justify-between">
                    <b className="text-lg font-bold relative -translate-y-[8px]">Thông Tin Hành Khách</b>
                  </div>

                  <div className="flex flex-col gap-3">
                    {pnrData.passengers.map((passenger, index) => {
                      const passengerType =
                        passenger.loaikhach === "ADT"
                          ? "NGƯỜI LỚN"
                          : passenger.loaikhach === "CHD"
                            ? "TRẺ EM"
                            : passenger.loaikhach;
                      const infantInfo = passenger.inf
                        ? ` ( Em bé : ${passenger.inf.lastName} ${passenger.inf.firstName} )`
                        : "";

                      return (
                        <div key={index} className="overflow-hidden bg-[#F3F6FA] px-2 lg:px-4">
                          <div className="cursor-pointer">
                            <div className="flex justify-between py-3 items-center">
                              <div className="flex items-center gap-1">
                                <div className="flex">
                                  <span className="font-bold text-sm lg:text-base relative -translate-y-[8px]">
                                    {passengerType} : {passenger.lastName} {passenger.firstName}
                                    {infantInfo && <span className="text-sm font-bold">{infantInfo}</span>}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Itinerary */}
                <div className="bg-white p-4">
                  <div className="flex justify-between mb-5">
                    <p className="text-lg font-bold">Chặng Bay</p>
                  </div>

                  <div className="flex flex-col gap-4">
                    {pnrData.chang.map((segment) => (
                      <div
                        key={segment.sochang}
                        className="border rounded-md border-[#E3EBF1] shadow p-4 px-6 text-base"
                      >
                        <div className="flex flex-col lg:flex-row w-full flex-wrap items-center gap-2 lg:gap-5">
                          {/* Segment number */}
                          <div className="h-7 w-7 rounded bg-[#2898A1] text-center font-medium text-white flex items-center justify-center">
                            <span className="relative -translate-y-[8px]">{segment.sochang}</span>
                          </div>

                          {/* Date and flight info */}
                          <div className="flex flex-col lg:flex-row items-center justify-center gap-1">
                            <div className="text-center mr-3 w-[120px] relative -translate-y-[8px]">
                              <p className="text-xl font-medium text-[#005463] first-letter:uppercase">
                                {formatDate(segment.ngaycatcanh).split(",")[0]}
                              </p>
                              <p className="text-base font-normal text-[#1B2132]">{segment.ngaycatcanh}</p>
                            </div>

                            <div className="flex items-center justify-between w-[260px]">
                              <div className="flex flex-col items-center gap-4 relative -translate-y-[8px]">
                                <p className="text-lg font-medium">{segment.departure}</p>
                                <p>{segment.giocatcanh}</p>
                              </div>

                              <div className="flex items-center">
                                <div className="h-3 w-3 rounded-full border-2 border-solid border-cyan-700"></div>
                                <div className="w-[110px] text-center">
                                  <p className="whitespace-nowrap relative -translate-y-[8px]">Bay thẳng</p>
                                  <hr />
                                  <p className="whitespace-nowrap relative -translate-y-[8px]">
                                    {formatDuration(segment.thoigianbay)}
                                  </p>
                                </div>
                                <div className="h-3 w-3 rounded-full border-2 border-solid border-cyan-700 bg-cyan-600"></div>
                              </div>

                              <div className="flex flex-col items-center gap-4 relative -translate-y-[8px]">
                                <p className="text-lg font-medium">{segment.arrival}</p>
                                <p>{segment.giohacanh}</p>
                              </div>
                            </div>
                          </div>

                          {/* Flight details */}
                          <div className="flex flex-col items-center gap-1 text-center text-sm font-normal text-[#1B2132]">
                            <div className="flex items-center gap-2 ">
                              <img alt="" loading="lazy" width="20" height="20" src="/icon/vn_logo.gif" />

                              <div className="flex">
                                <p className="w-max relative -translate-y-[8px]">{segment.sohieumaybay}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="flex">
                                <p className="cursor-pointer text-base font-medium text-blue-600 underline relative -translate-y-[8px]">
                                  Thêm thông tin
                                </p>
                              </div>
                            </div>
                          </div>

                          {/* Class */}
                          <div className="ml-0 flex flex-col items-center relative -translate-y-[8px]">
                            <div className="text-center font-medium text-[#535E71]">Class</div>
                            <div className="text-center text-[#1B2132]">Phổ thông ({segment.loaive})</div>
                          </div>

                          {/* Status */}
                          <div className="ml-0 lg:ml-8 inline-flex flex-col items-center justify-center relative -translate-y-[8px]">
                            <div className="text-center font-medium text-[#535E71]">Trạng thái</div>
                            <div className="text-[#1B2132]">{segment.status}</div>
                          </div>

                          {/* Ticketed badge */}
                          <div className="mx-auto mt-4">
                            {pnrData.paymentstatus ? (
                              <div className="flex h-[30px] w-fit items-center whitespace-nowrap rounded-full px-3 py-1 text-center text-sm font-bold bg-[#DCFCD9] text-[#075835] -translate-y-[2px]">
                                <span className="relative -translate-y-[7px]">Đã thanh toán</span>
                              </div>
                            ) : (
                              <div className="flex h-[30px] w-fit items-center whitespace-nowrap rounded-full px-3 py-1 text-center text-sm font-bold bg-[#FFDADA] text-[#B50000]">
                                <span className="relative -translate-y-[7px]">Chưa thanh toán</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t">
                <Button
                  onClick={() => {
                    setPnrData(null);
                    setPnr("");
                  }}
                  variant="outline"
                  className="flex-1"
                >
                  Kiểm tra PNR khác
                </Button>
                <Button onClick={handleClose} className="flex-1">
                  Đóng
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
