import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { SunPQTrip, SunPQPassenger, SunPQPaxType } from '@/types/sunpq';
import { bookingSunPQ } from '@/services/sunpqService';
import SunPQTicketModal from './SunPQTicketModal';
import { supabase } from '@/integrations/supabase/client';
import { saveHeldTicket } from '@/utils/heldTickets';
import { useTicketRulesDataset } from '@/hooks/useTicketRulesDataset';
import SunPQFlightCard from './SunPQFlightCard';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  flights: SunPQTrip[];
  searchData: {
    tripType: 'OW' | 'RT';
    departure?: string;
    arrival?: string;
    departureDate?: string;
    returnDate?: string;
    adults?: number;
    children?: number;
    infants?: number;
    sunpqOneWayFee?: number;
    sunpqRoundTripFee?: number;
  } | null;
}

const removeDiacritics = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');

interface BookingFormProps {
  trip: SunPQTrip;
  searchData: Props['searchData'];
  onClose: () => void;
  onSuccess: (pnr: string) => void;
}

const SunPQBookingForm: React.FC<BookingFormProps> = ({ trip, searchData, onClose, onSuccess }) => {
  const initialPax = useMemo<SunPQPassenger[]>(() => {
    const list: SunPQPassenger[] = [];
    let id = 1;
    const adults = searchData?.adults ?? 1;
    const children = searchData?.children ?? 0;
    const infants = searchData?.infants ?? 0;
    for (let i = 0; i < adults; i++)
      list.push({ pax_id: id++, type: 'ADULT', title: 'MR', first_name: '', last_name: '', parent_id: null });
    for (let i = 0; i < children; i++)
      list.push({ pax_id: id++, type: 'CHILD', title: 'MSTR', first_name: '', last_name: '', parent_id: null, date_of_birth: '' });
    for (let i = 0; i < infants; i++)
      list.push({ pax_id: id++, type: 'INFANT', title: 'MSTR', first_name: '', last_name: '', parent_id: 1, date_of_birth: '' });
    return list;
  }, [searchData]);

  const [passengers, setPassengers] = useState<SunPQPassenger[]>(initialPax);
  const [contact, setContact] = useState({ full_name: 'Hanvietair', email: '', phone_number: '' });
  const [submitting, setSubmitting] = useState(false);

  const updatePax = (idx: number, patch: Partial<SunPQPassenger>) => {
    setPassengers((prev) => prev.map((p, i) => (i === idx ? { ...p, ...patch } : p)));
  };

  const addPax = (type: SunPQPaxType) => {
    setPassengers((prev) => {
      const nextId = (prev.reduce((m, p) => Math.max(m, p.pax_id), 0) || 0) + 1;
      const title: SunPQPassenger['title'] = type === 'ADULT' ? 'MR' : 'MSTR';
      const parent = type === 'INFANT' ? prev.find((p) => p.type === 'ADULT')?.pax_id ?? 1 : null;
      return [
        ...prev,
        {
          pax_id: nextId,
          type,
          title,
          first_name: '',
          last_name: '',
          parent_id: parent,
          date_of_birth: type !== 'ADULT' ? '' : undefined,
        },
      ];
    });
  };

  const removePax = (idx: number) =>
    setPassengers((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev));

  const paxLabel = (t: SunPQPaxType) =>
    t === 'ADULT' ? 'Người lớn' : t === 'CHILD' ? 'Trẻ em' : 'Em bé';

  const handleSubmit = async () => {
    try {
      for (const p of passengers) {
        if (!p.last_name.trim() || !p.first_name.trim())
          throw new Error('Họ và tên không được để trống');
        if (p.type !== 'ADULT' && !p.date_of_birth)
          throw new Error('Trẻ em/Em bé cần ngày sinh');
      }

      const normalizedPax: SunPQPassenger[] = passengers.map((p) => ({
        ...p,
        last_name: removeDiacritics(p.last_name).trim().split(' ')[0].toUpperCase(),
        first_name: removeDiacritics(p.first_name).trim().toUpperCase(),
      }));

      const list_itinerary = [
        ...(trip.chiều_đi?.list_itinerary || []),
        ...(trip.chiều_về?.list_itinerary || []),
      ];

      setSubmitting(true);
      const result = await bookingSunPQ({
        list_itinerary,
        list_passenger: normalizedPax,
        contact_info: contact,
        promo_code: '',
        corporate_code: '',
        currency: 'KRW',
        send_email: true,
      });

      if (result?.pnr) {
        toast.success(`Giữ vé thành công: ${result.pnr}`);
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            const segments = [trip.chiều_đi, trip.chiều_về].filter(Boolean).map((leg, idx) => ({
              segment_order: idx + 1,
              departure_airport: leg!.nơi_đi,
              arrival_airport: leg!.nơi_đến,
              departure_date: leg!.ngày_cất_cánh,
              departure_time: leg!.giờ_cất_cánh || '00:00',
            }));
            const namelist = normalizedPax.map((p) => `${p.last_name} ${p.first_name}`.trim());
            await saveHeldTicket({
              user_id: user.id,
              pnr: result.pnr,
              airline: 'SUN',
              namelist,
              segments,
            });
          }
        } catch (e) {
          console.error('SunPQ saveHeldTicket failed', e);
        }
        onSuccess(result.pnr);
      } else {
        throw new Error(result?.message || 'Giữ vé thất bại');
      }
    } catch (e: any) {
      toast.error(e?.message || 'Lỗi giữ vé');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="space-y-1">
          <Label>Họ tên liên hệ</Label>
          <Input
            placeholder="Hanvietair"
            value={contact.full_name}
            onChange={(e) => setContact({ ...contact, full_name: e.target.value })}
          />
        </div>
        <div className="space-y-1">
          <Label>Email</Label>
          <Input
            type="email"
            value={contact.email}
            onChange={(e) => setContact({ ...contact, email: e.target.value })}
          />
        </div>
        <div className="space-y-1">
          <Label>SĐT</Label>
          <Input
            inputMode="numeric"
            value={contact.phone_number}
            onChange={(e) =>
              setContact({ ...contact, phone_number: e.target.value.replace(/\D/g, '') })
            }
          />
        </div>
      </div>

      <div className="space-y-3">
        {passengers.map((p, idx) => (
          <div key={idx} className="border-2 border-orange-200 rounded-lg p-3 space-y-2 bg-orange-50/40">
            <div className="flex items-center justify-between">
              <div className="font-semibold text-sm text-orange-700">
                Hành khách {idx + 1} ({paxLabel(p.type)})
              </div>
              {passengers.length > 1 && (
                <Button size="icon" variant="destructive" onClick={() => removePax(idx)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <div>
                <Label className="text-xs">Họ</Label>
                <Input value={p.last_name} onChange={(e) => updatePax(idx, { last_name: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs">Tên</Label>
                <Input value={p.first_name} onChange={(e) => updatePax(idx, { first_name: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs">Title</Label>
                <Select
                  value={p.title}
                  onValueChange={(v) => updatePax(idx, { title: v as SunPQPassenger['title'] })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MR">MR</SelectItem>
                    <SelectItem value="MRS">MRS</SelectItem>
                    <SelectItem value="MSTR">MSTR</SelectItem>
                    <SelectItem value="MISS">MISS</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Ngày sinh{p.type !== 'ADULT' ? ' *' : ''}</Label>
                <Input
                  type="date"
                  value={p.date_of_birth || ''}
                  onChange={(e) => updatePax(idx, { date_of_birth: e.target.value })}
                />
              </div>
              {p.type === 'INFANT' && (
                <div>
                  <Label className="text-xs">Parent pax_id</Label>
                  <Input
                    type="number"
                    value={p.parent_id ?? 1}
                    onChange={(e) => updatePax(idx, { parent_id: parseInt(e.target.value) || 1 })}
                  />
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={() => addPax('ADULT')}>
          <Plus className="h-4 w-4 mr-1" /> Người lớn
        </Button>
        <Button size="sm" variant="outline" onClick={() => addPax('CHILD')}>
          <Plus className="h-4 w-4 mr-1" /> Trẻ em
        </Button>
        <Button size="sm" variant="outline" onClick={() => addPax('INFANT')}>
          <Plus className="h-4 w-4 mr-1" /> Em bé
        </Button>
      </div>

      <div className="flex justify-end gap-2 pt-3 border-t">
        <Button variant="outline" onClick={onClose}>
          Hủy
        </Button>
        <Button
          className="bg-orange-500 hover:bg-orange-600 text-white"
          onClick={handleSubmit}
          disabled={submitting}
        >
          {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Xác nhận giữ vé
        </Button>
      </div>
    </div>
  );
};

const SunPQModal: React.FC<Props> = ({ isOpen, onClose, flights, searchData }) => {
  const tripType = searchData?.tripType ?? 'OW';
  const [bookingTrip, setBookingTrip] = useState<SunPQTrip | null>(null);
  const [ticketPNR, setTicketPNR] = useState<string | null>(null);

  const sorted = useMemo(() => {
    return [...(flights || [])].sort((a, b) => {
      const pa =
        Number(a.thông_tin_chung?.giá_vé_gốc ?? a.thông_tin_chung?.giá_vé ?? 0) ||
        (a.chiều_đi?.giá_vé_gốc || 0) + (a.chiều_về?.giá_vé_gốc || 0);
      const pb =
        Number(b.thông_tin_chung?.giá_vé_gốc ?? b.thông_tin_chung?.giá_vé ?? 0) ||
        (b.chiều_đi?.giá_vé_gốc || 0) + (b.chiều_về?.giá_vé_gốc || 0);
      return pa - pb;
    });
  }, [flights]);

  const { data: rulesDataset } = useTicketRulesDataset();

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-orange-600">
              <span className="bg-orange-500 text-white px-2 py-0.5 rounded text-xs font-bold">
                SUNPQ
              </span>
              Kết quả tìm vé SunPQ ({sorted.length})
            </DialogTitle>
          </DialogHeader>

          {sorted.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              Không có vé SunPQ cho hành trình này
            </div>
          ) : (
            <div className="space-y-4">
              {sorted.map((trip, i) => (
                <SunPQFlightCard
                  key={i}
                  trip={trip}
                  tripType={tripType}
                  oneWayFee={searchData?.sunpqOneWayFee ?? 0}
                  roundTripFee={searchData?.sunpqRoundTripFee ?? 0}
                  rulesDataset={rulesDataset}
                  onBook={(t) => setBookingTrip(t)}
                />
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>



      <Dialog open={!!bookingTrip} onOpenChange={(o) => !o && setBookingTrip(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-orange-600">Giữ vé SunPQ</DialogTitle>
          </DialogHeader>
          {bookingTrip && (
            <SunPQBookingForm
              trip={bookingTrip}
              searchData={searchData}
              onClose={() => setBookingTrip(null)}
              onSuccess={(pnr) => {
                setBookingTrip(null);
                setTicketPNR(pnr);
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      <SunPQTicketModal
        isOpen={!!ticketPNR}
        onClose={() => setTicketPNR(null)}
        initialPNR={ticketPNR ?? undefined}
      />
    </>
  );
};

export default SunPQModal;
