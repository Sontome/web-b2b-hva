import { supabase } from "@/integrations/supabase/client";

export type HeldAirline = "VJ" | "VNA" | "SUN" | "OTHER";

export interface HeldSegmentInput {
  segment_order: number;
  departure_airport: string;
  arrival_airport: string;
  /** Accepts YYYY-MM-DD or DD/MM/YYYY */
  departure_date: string;
  /** "HH:MM" */
  departure_time: string;
  /** Optional override; defaults to `${dep}-${arr}` */
  trip?: string;
}

export interface SaveHeldTicketInput {
  user_id: string;
  pnr: string;
  airline: HeldAirline;
  namelist: string[];
  segments: HeldSegmentInput[];
  expire_date?: string | null;
  ticket_status?: string;
}

/**
 * Normalize a date string to ISO `YYYY-MM-DD`.
 * Supports `YYYY-MM-DD`, `DD/MM/YYYY` and `D/M/YYYY`.
 */
export const normalizeIsoDate = (input: string): string => {
  if (!input) return input;
  if (/^\d{4}-\d{2}-\d{2}/.test(input)) return input.slice(0, 10);
  const parts = input.split("/");
  if (parts.length === 3) {
    const [d, m, y] = parts;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  return input;
};

/** Map common airline labels to canonical short codes. */
export const resolveAirlineCode = (label?: string | null): HeldAirline => {
  if (!label) return "OTHER";
  const v = label.toUpperCase();
  if (v.includes("VJ") || v.includes("VIETJET")) return "VJ";
  if (v.includes("VNA") || v.includes("VIETNAM AIR")) return "VNA";
  if (v.includes("SUN") || v.includes("SPA")) return "SUN";
  return "OTHER";
};

/**
 * Persist a held ticket plus its segments in two related inserts.
 * Returns the created `held_tickets.id` on success.
 */
export const saveHeldTicket = async (input: SaveHeldTicketInput): Promise<string | null> => {
  const namelist = input.namelist.map((n) => n.trim()).filter(Boolean);

  const { data: ticket, error: ticketErr } = await supabase
    .from("held_tickets")
    .insert({
      user_id: input.user_id,
      pnr: input.pnr,
      airline: input.airline,
      namelist,
      number_person: Math.max(namelist.length, 1),
      payment_status: false,
      ticket_status: input.ticket_status ?? "holding",
      expire_date: input.expire_date ?? null,
    })
    .select("id")
    .single();

  if (ticketErr || !ticket) {
    console.error("saveHeldTicket: ticket insert failed", ticketErr);
    return null;
  }

  if (input.segments.length > 0) {
    const rows = input.segments.map((s) => ({
      held_ticket_id: ticket.id,
      segment_order: s.segment_order,
      departure_airport: s.departure_airport,
      arrival_airport: s.arrival_airport,
      departure_date: normalizeIsoDate(s.departure_date),
      departure_time: s.departure_time || "00:00",
      trip: s.trip || `${s.departure_airport}-${s.arrival_airport}`,
    }));
    const { error: segErr } = await supabase.from("held_ticket_segments").insert(rows);
    if (segErr) console.error("saveHeldTicket: segments insert failed", segErr);
  }

  return ticket.id;
};

/** Build a passenger display name from common shapes used across the app. */
export const buildPassengerName = (p: any): string => {
  const last = p?.lastName ?? p?.Họ ?? "";
  const first = p?.firstName ?? p?.Tên ?? "";
  return `${last} ${first}`.trim();
};
