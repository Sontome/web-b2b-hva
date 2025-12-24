import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Copy } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export interface PassengerInfo {
  Họ: string;
  Tên: string;
  Hộ_chiếu: string;
  Giới_tính: "nam" | "nữ";
  Quốc_tịch: string;
}

export interface PassengerWithType extends PassengerInfo {
  type: "người_lớn" | "trẻ_em";
  infant?: PassengerInfo;
}

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  bookingKey: string;
  bookingKeyReturn?: string;
  tripType: "OW" | "RT";
  departureAirport: string;
  maxSeats: number;
  mode?: "save" | "book"; // 'save' = lưu thông tin, 'book' = giữ vé ngay
  initialPassengers?: PassengerWithType[]; // Dữ liệu hành khách ban đầu
  onBookingSuccess?: (pnr: string) => void;
  onSavePassengers?: (passengers: PassengerWithType[]) => void; // Callback khi lưu thông tin
}

export const BookingModal = ({
  isOpen,
  onClose,
  bookingKey,
  bookingKeyReturn,
  tripType,
  departureAirport,
  maxSeats,
  mode = "book",
  initialPassengers,
  onBookingSuccess,
  onSavePassengers,
}: BookingModalProps) => {
  const [passengers, setPassengers] = useState<PassengerWithType[]>(
    initialPassengers || [
      {
        Họ: "",
        Tên: "",
        Hộ_chiếu: "B12345678",
        Giới_tính: "nam",
        Quốc_tịch: "VN",
        type: "người_lớn",
      },
    ],
  );
  const [isLoading, setIsLoading] = useState(false);
  const [ticketEmail, setTicketEmail] = useState("");
  const [ticketPhone, setTicketPhone] = useState("");

  // Popup dữ liệu khi giữ vé thành công
  const [successData, setSuccessData] = useState<{ code: string; deadline: string } | null>(null);

  // Load user profile data on mount
  useEffect(() => {
    const loadProfile = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("ticket_email, ticket_phone")
          .eq("id", user.id)
          .single();

        if (profile) {
          setTicketEmail(profile.ticket_email || "");
          setTicketPhone(profile.ticket_phone || "");
        }
      }
    };
    loadProfile();
  }, []);

  // Remove Vietnamese diacritics
  const removeVietnameseDiacritics = (str: string) => {
    const vietnameseMap: { [key: string]: string } = {
      à: "a",
      á: "a",
      ả: "a",
      ã: "a",
      ạ: "a",
      ă: "a",
      ằ: "a",
      ắ: "a",
      ẳ: "a",
      ẵ: "a",
      ặ: "a",
      â: "a",
      ầ: "a",
      ấ: "a",
      ẩ: "a",
      ẫ: "a",
      ậ: "a",
      đ: "d",
      è: "e",
      é: "e",
      ẻ: "e",
      ẽ: "e",
      ẹ: "e",
      ê: "e",
      ề: "e",
      ế: "e",
      ể: "e",
      ễ: "e",
      ệ: "e",
      ì: "i",
      í: "i",
      ỉ: "i",
      ĩ: "i",
      ị: "i",
      ò: "o",
      ó: "o",
      ỏ: "o",
      õ: "o",
      ọ: "o",
      ô: "o",
      ồ: "o",
      ố: "o",
      ổ: "o",
      ỗ: "o",
      ộ: "o",
      ơ: "o",
      ờ: "o",
      ớ: "o",
      ở: "o",
      ỡ: "o",
      ợ: "o",
      ù: "u",
      ú: "u",
      ủ: "u",
      ũ: "u",
      ụ: "u",
      ư: "u",
      ừ: "u",
      ứ: "u",
      ử: "u",
      ữ: "u",
      ự: "u",
      ỳ: "y",
      ý: "y",
      ỷ: "y",
      ỹ: "y",
      ỵ: "y",
      À: "A",
      Á: "A",
      Ả: "A",
      Ã: "A",
      Ạ: "A",
      Ă: "A",
      Ằ: "A",
      Ắ: "A",
      Ẳ: "A",
      Ẵ: "A",
      Ặ: "A",
      Â: "A",
      Ầ: "A",
      Ấ: "A",
      Ẩ: "A",
      Ẫ: "A",
      Ậ: "A",
      Đ: "D",
      È: "E",
      É: "E",
      Ẻ: "E",
      Ẽ: "E",
      Ẹ: "E",
      Ê: "E",
      Ề: "E",
      Ế: "E",
      Ể: "E",
      Ễ: "E",
      Ệ: "E",
      Ì: "I",
      Í: "I",
      Ỉ: "I",
      Ĩ: "I",
      Ị: "I",
      Ò: "O",
      Ó: "O",
      Ỏ: "O",
      Õ: "O",
      Ọ: "O",
      Ô: "O",
      Ồ: "O",
      Ố: "O",
      Ổ: "O",
      Ỗ: "O",
      Ộ: "O",
      Ơ: "O",
      Ờ: "O",
      Ớ: "O",
      Ở: "O",
      Ỡ: "O",
      Ợ: "O",
      Ù: "U",
      Ú: "U",
      Ủ: "U",
      Ũ: "U",
      Ụ: "U",
      Ư: "U",
      Ừ: "U",
      Ứ: "U",
      Ử: "U",
      Ữ: "U",
      Ự: "U",
      Ỳ: "Y",
      Ý: "Y",
      Ỷ: "Y",
      Ỹ: "Y",
      Ỵ: "Y",
    };
    return str
      .split("")
      .map((char) => vietnameseMap[char] || char)
      .join("");
  };

  const formatName = (name: string, isLastName: boolean = false) => {
    let formatted = removeVietnameseDiacritics(name.trim());
    if (isLastName) {
      formatted = formatted.split(" ")[0];
      return formatted.charAt(0).toUpperCase() + formatted.slice(1).toLowerCase();
    } else {
      return formatted
        .split(" ")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(" ");
    }
  };

  const parseExpireDate = (deadline: string): string => {
    // deadline format: "19:51 07/11/2025"
    const [time, date] = deadline.split(" ");
    const [day, month, year] = date.split("/");
    const [hour, minute] = time.split(":");
    return `${year}-${month}-${day}T${hour}:${minute}:00`;
  };

  const handlePassengerChange = (index: number, field: keyof PassengerInfo, value: string) => {
    const newPassengers = [...passengers];
    newPassengers[index][field] = value as any;
    setPassengers(newPassengers);
  };

  const handleTypeChange = (index: number, value: "người_lớn" | "trẻ_em") => {
    const newPassengers = [...passengers];
    newPassengers[index].type = value;
    if (value === "trẻ_em") {
      delete newPassengers[index].infant;
    }
    setPassengers(newPassengers);
  };

  const handleInfantChange = (index: number, field: keyof PassengerInfo, value: string) => {
    const newPassengers = [...passengers];
    if (!newPassengers[index].infant) {
      newPassengers[index].infant = {
        Họ: "",
        Tên: "",
        Hộ_chiếu: "B12345678",
        Giới_tính: "nam",
        Quốc_tịch: "VN",
      };
    }
    newPassengers[index].infant![field] = value as any;
    setPassengers(newPassengers);
  };

  const addPassenger = () => {
    if (passengers.length >= maxSeats) {
      toast({
        title: "Lỗi",
        description: `Số lượng khách không được vượt quá ${maxSeats} ghế còn lại`,
        variant: "destructive",
      });
      return;
    }
    setPassengers([
      ...passengers,
      {
        Họ: "",
        Tên: "",
        Hộ_chiếu: "B12345678",
        Giới_tính: "nam",
        Quốc_tịch: "VN",
        type: "người_lớn",
      },
    ]);
  };

  const removePassenger = (index: number) => {
    if (passengers.length === 1) {
      toast({
        title: "Lỗi",
        description: "Phải có ít nhất 1 hành khách",
        variant: "destructive",
      });
      return;
    }
    setPassengers(passengers.filter((_, i) => i !== index));
  };

  const addInfant = (index: number) => {
    const newPassengers = [...passengers];
    newPassengers[index].infant = {
      Họ: "",
      Tên: "",
      Hộ_chiếu: "B12345678",
      Giới_tính: "nam",
      Quốc_tịch: "VN",
    };
    setPassengers(newPassengers);
  };

  const removeInfant = (index: number) => {
    const newPassengers = [...passengers];
    delete newPassengers[index].infant;
    setPassengers(newPassengers);
  };

  const handleSubmit = async () => {
    try {
      // Validate email and phone for booking mode
      if (mode === "book") {
        if (!ticketEmail || !ticketEmail.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
          throw new Error("Vui lòng nhập địa chỉ email hợp lệ");
        }
        if (!ticketPhone || !ticketPhone.match(/^\+\d{10,15}$/)) {
          throw new Error("Vui lòng nhập số điện thoại hợp lệ (ví dụ: +840764301092)");
        }
      }

      const formattedPassengers = passengers.map((passenger) => {
        const formattedLastName = formatName(passenger.Họ, true);
        const formattedFirstName = formatName(passenger.Tên, false);
        if (formattedLastName.includes(" ")) throw new Error("Họ chỉ được phép có 1 từ (ví dụ: Tran)");
        if (!formattedLastName || !formattedFirstName || !passenger.Hộ_chiếu)
          throw new Error("Vui lòng điền đầy đủ thông tin hành khách");

        const result: PassengerWithType = { ...passenger, Họ: formattedLastName, Tên: formattedFirstName };

        if (passenger.infant) {
          const formattedInfantLastName = formatName(passenger.infant.Họ, true);
          const formattedInfantFirstName = formatName(passenger.infant.Tên, false);
          if (formattedInfantLastName.includes(" ")) throw new Error("Họ của trẻ sơ sinh chỉ được phép có 1 từ");
          if (!formattedInfantLastName || !formattedInfantFirstName || !passenger.infant.Hộ_chiếu)
            throw new Error("Vui lòng điền đầy đủ thông tin trẻ sơ sinh");
          result.infant = {
            ...passenger.infant,
            Họ: formattedInfantLastName,
            Tên: formattedInfantFirstName,
          };
        }
        return result;
      });

      // Save email and phone to profile
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user && (ticketEmail || ticketPhone)) {
        await supabase
          .from("profiles")
          .update({
            ticket_email: ticketEmail,
            ticket_phone: ticketPhone,
          })
          .eq("id", user.id);
      }

      // Nếu mode = 'save', chỉ lưu thông tin và không gọi API
      if (mode === "save") {
        if (onSavePassengers) {
          onSavePassengers(formattedPassengers);
        }
        toast({
          title: "Đã lưu thông tin hành khách",
          description: "Thông tin đã được lưu thành công",
        });
        onClose();
        return;
      }

      const ds_khach = { người_lớn: [], trẻ_em: [], em_bé: [] } as {
        người_lớn: PassengerInfo[];
        trẻ_em: PassengerInfo[];
        em_bé: PassengerInfo[];
      };

      formattedPassengers.forEach((passenger) => {
        const { type, infant, ...info } = passenger;
        if (type === "người_lớn") ds_khach.người_lớn.push(info);
        else ds_khach.trẻ_em.push(info);
        if (infant) ds_khach.em_bé.push(infant);
      });

      // Parse phone number to extract country code and phone
      const phoneMatch = ticketPhone.match(/^\+(\d{2})(\d+)$/);
      const exten = phoneMatch ? phoneMatch[1] : "84";
      const phone = phoneMatch ? phoneMatch[2] : ticketPhone.replace(/^\+/, "");
      const iso = exten === "82" ? "KR" : "VN";

      const requestData = {
        ds_khach,
        bookingkey: bookingKey,
        bookingkeychieuve: tripType === "RT" ? bookingKeyReturn || "" : "",
        sochieu: tripType,
        sanbaydi: departureAirport,
        iso,
        exten,
        phone,
        email: ticketEmail,
      };

      setIsLoading(true);
      const response = await fetch("https://thuhongtour.com/vj/booking", {
        method: "POST",
        headers: { accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify(requestData),
      });

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();

      if (data.mã_giữ_vé) {
        setSuccessData({ code: data.mã_giữ_vé, deadline: data.hạn_thanh_toán });

        // Save to database
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          const expireDate = parseExpireDate(data.hạn_thanh_toán);
          const { error: insertError } = await supabase.from("held_tickets").insert([
            {
              user_id: user.id,
              pnr: data.mã_giữ_vé,
              flight_details: JSON.parse(
                JSON.stringify({
                  bookingKey,
                  bookingKeyReturn,
                  tripType,
                  departureAirport,
                  passengers: formattedPassengers,
                  deadline: data.hạn_thanh_toán,
                }),
              ),
              expire_date: expireDate,
              status: "holding",
            },
          ]);

          if (insertError) {
            console.error("Error saving held ticket:", insertError);
          }
        }

        // Call callback and auto-open ticket modal
        if (onBookingSuccess) {
          setTimeout(() => {
            setSuccessData(null);
            onClose();
            onBookingSuccess(data.mã_giữ_vé);
          }, 100);
        }
      } else {
        toast({
          title: "Lỗi giữ vé",
          description: data.mess || "Không thể giữ vé. Vui lòng thử lại.",
          variant: "destructive",
          duration: 10000,
        });
      }
    } catch (error: any) {
      console.error("Error booking:", error);
      toast({
        title: "Lỗi",
        description: error.message || "Không thể giữ vé. Vui lòng thử lại.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Thông Tin Hành Khách - Giữ Vé</DialogTitle>
          </DialogHeader>

          {/* danh sách hành khách */}
          <div className="space-y-6">
            {passengers.map((passenger, index) => (
              <div key={index} className="border rounded-lg p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">Hành khách {index + 1}</h3>
                  {passengers.length > 1 && (
                    <Button variant="destructive" size="sm" onClick={() => removePassenger(index)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Họ</Label>
                    <Input
                      value={passenger.Họ}
                      onChange={(e) => handlePassengerChange(index, "Họ", e.target.value)}
                      placeholder="Nguyen"
                    />
                  </div>
                  <div>
                    <Label>Tên</Label>
                    <Input
                      value={passenger.Tên}
                      onChange={(e) => handlePassengerChange(index, "Tên", e.target.value)}
                      placeholder="Van A"
                    />
                  </div>
                  <div>
                    <Label>Hộ chiếu</Label>
                    <Input
                      value={passenger.Hộ_chiếu}
                      onChange={(e) => handlePassengerChange(index, "Hộ_chiếu", e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Giới tính</Label>
                    <Select
                      value={passenger.Giới_tính}
                      onValueChange={(v: "nam" | "nữ") => handlePassengerChange(index, "Giới_tính", v)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="nam">Nam</SelectItem>
                        <SelectItem value="nữ">Nữ</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Quốc tịch</Label>
                    <Input
                      value={passenger.Quốc_tịch}
                      onChange={(e) => handlePassengerChange(index, "Quốc_tịch", e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Loại khách</Label>
                    <Select
                      value={passenger.type}
                      onValueChange={(v: "người_lớn" | "trẻ_em") => handleTypeChange(index, v)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="người_lớn">Người lớn</SelectItem>
                        <SelectItem value="trẻ_em">Trẻ em</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {passenger.type === "người_lớn" && !passenger.infant && (
                  <Button variant="outline" size="sm" onClick={() => addInfant(index)} className="w-full">
                    <Plus className="w-4 h-4 mr-2" /> Thêm trẻ sơ sinh
                  </Button>
                )}

                {passenger.infant && (
                  <div className="ml-4 border-l-2 pl-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-sm">Trẻ sơ sinh kèm theo</h4>
                      <Button variant="ghost" size="sm" onClick={() => removeInfant(index)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Họ</Label>
                        <Input
                          value={passenger.infant.Họ}
                          onChange={(e) => handleInfantChange(index, "Họ", e.target.value)}
                        />
                      </div>
                      <div>
                        <Label>Tên</Label>
                        <Input
                          value={passenger.infant.Tên}
                          onChange={(e) => handleInfantChange(index, "Tên", e.target.value)}
                        />
                      </div>
                      <div>
                        <Label>Hộ chiếu</Label>
                        <Input
                          value={passenger.infant.Hộ_chiếu}
                          onChange={(e) => handleInfantChange(index, "Hộ_chiếu", e.target.value)}
                        />
                      </div>
                      <div>
                        <Label>Giới tính</Label>
                        <Select
                          value={passenger.infant.Giới_tính}
                          onValueChange={(v: "nam" | "nữ") => handleInfantChange(index, "Giới_tính", v)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="nam">Nam</SelectItem>
                            <SelectItem value="nữ">Nữ</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Quốc tịch</Label>
                        <Input
                          value={passenger.infant.Quốc_tịch}
                          onChange={(e) => handleInfantChange(index, "Quốc_tịch", e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}

            <Button variant="outline" onClick={addPassenger} className="w-full">
              <Plus className="w-4 h-4 mr-2" /> Thêm hành khách
            </Button>

            {/* Contact fields for ticket sending */}
            <div className="border rounded-lg p-4 space-y-4 bg-blue-50/50">
              <h3 className="font-semibold text-sm">Thông tin gửi mặt vé</h3>
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <Label>Email gửi mặt vé *</Label>
                  <Input
                    type="email"
                    value={ticketEmail}
                    onChange={(e) => setTicketEmail(e.target.value)}
                    placeholder="hanvietair247@gmail.com"
                  />
                </div>
                <div>
                  <Label>Số điện thoại gửi mặt vé *</Label>
                  <Input
                    value={ticketPhone}
                    onChange={(e) => setTicketPhone(e.target.value)}
                    placeholder="+840764301092 hoặc +821035463396"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Nhập số điện thoại có mã vùng (ví dụ: +84 cho Việt Nam, +82 cho Hàn Quốc)
                  </p>
                </div>
              </div>
            </div>

            <Button className="w-full" onClick={handleSubmit} disabled={isLoading}>
              {isLoading ? "Đang xử lý..." : mode === "save" ? "Lưu thông tin" : "Giữ vé ngay"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Popup thông báo giữ vé thành công */}
      <Dialog open={!!successData} onOpenChange={() => setSuccessData(null)}>
        <DialogContent className="max-w-sm text-center">
          <DialogHeader>
            <DialogTitle>🎉 Giữ vé thành công!</DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-3">
            <p className="text-sm text-gray-600">Mã giữ vé:</p>
            <div className="flex items-center justify-center gap-2">
              <span className="text-xl font-bold text-green-600">{successData?.code}</span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  navigator.clipboard.writeText(successData?.code || "");
                  toast({ title: "Đã copy mã giữ vé ✈️" });
                }}
              >
                <Copy className="w-4 h-4 mr-1" /> Copy
              </Button>
            </div>
            <p className="text-sm text-gray-500">
              Hạn thanh toán: <b>{successData?.deadline}</b>
            </p>
          </div>

          <div className="flex justify-center mt-4">
            <Button
              onClick={() => {
                setSuccessData(null);
                onClose();
              }}
            >
              OK
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
