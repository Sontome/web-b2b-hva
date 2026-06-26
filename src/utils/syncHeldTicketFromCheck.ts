import { supabase } from "@/integrations/supabase/client";

/**
 * Sync data returned from a checkpnr API into held_tickets row (if exists).
 * - Fills tongbillgiagoc (integer, dropping decimals) when row exists and is empty/0.
 * - Sets payment_status = true when API reports paymentstatus true.
 */
export const syncHeldTicketFromCheck = async (
  pnr: string,
  data: any
): Promise<void> => {
  try {
    if (!pnr || !data) return;
    const code = pnr.trim().toUpperCase();
    if (!code) return;

    const { data: rows, error } = await supabase
      .from("held_tickets")
      .select("id, tongbillgiagoc, payment_status")
      .eq("pnr", code);
    if (error || !rows || rows.length === 0) return;

    const rawPrice = Number(
      data?.tongbillgiagoc ?? data?.total_price ?? data?.tongtien ?? 0
    );
    const priceInt = Number.isFinite(rawPrice) ? Math.trunc(rawPrice) : 0;
    const paid = !!(data?.paymentstatus ?? data?.paid);

    for (const row of rows) {
      const update: Record<string, any> = {};
      if (priceInt > 0 && (!row.tongbillgiagoc || Number(row.tongbillgiagoc) === 0)) {
        update.tongbillgiagoc = priceInt;
      }
      if (paid && !row.payment_status) {
        update.payment_status = true;
      }
      if (Object.keys(update).length > 0) {
        await supabase.from("held_tickets").update(update).eq("id", row.id);
      }
    }
  } catch (e) {
    console.warn("syncHeldTicketFromCheck failed", e);
  }
};
