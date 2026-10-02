import { useQuery } from '@tanstack/react-query';
import type { TicketRulesDataset } from '@/types/ticketRules';
import { CACHE_TTL, loadTicketRulesDataset } from '@/lib/appDataCache';

export function useTicketRulesDataset() {
  return useQuery<TicketRulesDataset>({
    queryKey: ['ticket-rules-dataset'],
    queryFn: () => loadTicketRulesDataset(),
    staleTime: CACHE_TTL,
    gcTime: CACHE_TTL,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: false,
  });
}
