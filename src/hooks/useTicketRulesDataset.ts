import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { TicketCampaign, TicketRule, TicketRulesDataset } from '@/types/ticketRules';

export function useTicketRulesDataset() {
  return useQuery<TicketRulesDataset>({
    queryKey: ['ticket-rules-dataset'],
    staleTime: 60_000,
    queryFn: async () => {
      const [campaignsRes, rulesRes] = await Promise.all([
        supabase.from('ticket_campaigns').select('*'),
        supabase.from('ticket_rules').select('*'),
      ]);
      if (campaignsRes.error) throw campaignsRes.error;
      if (rulesRes.error) throw rulesRes.error;
      return {
        campaigns: (campaignsRes.data || []) as TicketCampaign[],
        rules: (rulesRes.data || []) as TicketRule[],
      };
    },
  });
}
