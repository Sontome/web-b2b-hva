export type RuleAction =
  | 'append_note'
  | 'append_warning'
  | 'replace_baggage'
  | 'change_price'
  | 'hide_ticket'
  | 'highlight_ticket'
  | 'change_text';

export type LegScope = 'outbound' | 'return' | 'any';
export type MatchScope = 'direct' | 'connecting' | 'any';

export interface TicketCampaign {
  id: string;
  name: string;
  description: string | null;
  start_date: string | null;
  end_date: string | null;
  enabled: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface TicketRule {
  id: string;
  campaign_id: string;
  airline: string | null;
  route: string | null;
  departure_time: string | null;
  arrival_time: string | null;
  segment_position: number | null;
  leg_scope: LegScope | null;
  match_scope: MatchScope | null;
  booking_class: string | null;
  require_other_leg_direct: boolean;
  action: RuleAction;
  value: string | null;
  priority: number;
  enabled: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface RuleSegmentInput {
  airline: string;
  from: string;
  to: string;
  departure_time?: string | null;
  arrival_time?: string | null;
  departure_date?: string | null; // dd/MM/yyyy or yyyy-MM-dd
  segment_order: number; // 1-based within leg
  leg_index: number | null; // 0 = outbound, 1 = return, null = OW single leg
  leg_size: number; // number of segments in this leg
  booking_class?: string | null;
}

export interface RuleTicketInput {
  segments: RuleSegmentInput[];
  raw?: unknown;
}

export interface RuleEffects {
  notes: string[];
  warnings: string[];
  hidden: boolean;
  highlight?: string;
  baggage?: string;
  priceOverride?: number;
  textOverrides: Record<string, string>;
  matchedRuleIds: string[];
}

export interface TicketRulesDataset {
  campaigns: TicketCampaign[];
  rules: TicketRule[];
}
