import type {
  RuleAction,
  RuleEffects,
  RuleSegmentInput,
  RuleTicketInput,
  TicketCampaign,
  TicketRule,
  TicketRulesDataset,
} from '@/types/ticketRules';

// ---------- helpers ----------

const AIRLINE_ALIAS: Record<string, string> = {
  vn: 'vna', vna: 'vna',
  vj: 'vja', vja: 'vja', vietjet: 'vja',
  sun: 'sunpq', sunpq: 'sunpq', vu: 'sunpq', '9g': 'sunpq',
};

function normAirline(a?: string | null): string {
  if (!a) return '';
  const k = String(a).trim().toLowerCase();
  return AIRLINE_ALIAS[k] || k;
}

function normRoute(r?: string | null): string {
  if (!r) return '';
  return String(r).replace(/\s+/g, '').toUpperCase();
}

function normTime(t?: string | null): string {
  if (!t) return '';
  const s = String(t).trim();
  if (/^\d{4}$/.test(s)) return `${s.slice(0, 2)}:${s.slice(2)}`;
  const m = s.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (m) return `${m[1].padStart(2, '0')}:${m[2]}`;
  return s;
}

function parseDate(d?: string | null): Date | null {
  if (!d) return null;
  const s = String(d).trim();
  // dd/MM/yyyy
  let m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) return new Date(`${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}T00:00:00`);
  // yyyy-MM-dd
  m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return new Date(`${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}T00:00:00`);
  const d2 = new Date(s);
  return isNaN(d2.getTime()) ? null : d2;
}

function matchBookingClass(rule: string | null | undefined, cls: string | null | undefined): boolean {
  if (!rule) return true;
  const r = rule.trim();
  if (!r) return true;
  const c = (cls || '').trim().toUpperCase();
  if (!c) return false;
  if (r.startsWith('>=')) return c >= r.slice(2).trim().toUpperCase();
  if (r.startsWith('<=')) return c <= r.slice(2).trim().toUpperCase();
  const list = r.split(',').map((x) => x.trim().toUpperCase()).filter(Boolean);
  return list.includes(c);
}

// ---------- action handlers (Strategy) ----------

type ActionHandler = (effects: RuleEffects, rule: TicketRule) => void;

const handlers = new Map<string, ActionHandler>();

export function registerActionHandler(action: string, handler: ActionHandler) {
  handlers.set(action, handler);
}

registerActionHandler('append_note', (e, r) => {
  const v = (r.value || '').trim();
  if (v && !e.notes.includes(v)) e.notes.push(v);
});
registerActionHandler('append_warning', (e, r) => {
  const v = (r.value || '').trim();
  if (v && !e.warnings.includes(v)) e.warnings.push(v);
});
registerActionHandler('replace_baggage', (e, r) => {
  if (r.value) e.baggage = r.value;
});
registerActionHandler('change_price', (e, r) => {
  const n = parseFloat(String(r.value ?? '').replace(/[^\d.\-]/g, ''));
  if (!isNaN(n)) e.priceOverride = n;
});
registerActionHandler('hide_ticket', (e) => {
  e.hidden = true;
});
registerActionHandler('highlight_ticket', (e, r) => {
  e.highlight = r.value || 'red';
});
registerActionHandler('change_text', (e, r) => {
  const v = r.value || '';
  const idx = v.indexOf('=');
  if (idx > 0) {
    const field = v.slice(0, idx).trim();
    const text = v.slice(idx + 1);
    if (field) e.textOverrides[field] = text;
  }
});

// ---------- core matching ----------

export function createEmptyEffects(): RuleEffects {
  return { notes: [], warnings: [], hidden: false, textOverrides: {}, matchedRuleIds: [] };
}

export function matchRuleAgainstSegment(rule: TicketRule, seg: RuleSegmentInput): boolean {
  if (rule.airline && normAirline(rule.airline) !== normAirline(seg.airline)) return false;

  if (rule.route) {
    const ruleRoute = normRoute(rule.route);
    const segRoute = `${normRoute(seg.from)}-${normRoute(seg.to)}`;
    if (ruleRoute !== segRoute) return false;
  }

  if (rule.departure_time && normTime(rule.departure_time) !== normTime(seg.departure_time)) return false;
  if (rule.arrival_time && normTime(rule.arrival_time) !== normTime(seg.arrival_time)) return false;

  if (rule.segment_position != null && rule.segment_position !== seg.segment_order) return false;

  if (rule.leg_scope && rule.leg_scope !== 'any' && seg.leg_index != null) {
    if (rule.leg_scope === 'outbound' && seg.leg_index !== 0) return false;
    if (rule.leg_scope === 'return' && seg.leg_index !== 1) return false;
  }

  if (rule.match_scope && rule.match_scope !== 'any') {
    if (rule.match_scope === 'direct' && seg.leg_size !== 1) return false;
    if (rule.match_scope === 'connecting' && seg.leg_size < 2) return false;
  }

  if (!matchBookingClass(rule.booking_class, seg.booking_class)) return false;

  return true;
}

function campaignActiveOn(campaign: TicketCampaign, dateStr?: string | null): boolean {
  if (!campaign.enabled) return false;
  const target = parseDate(dateStr) || new Date();
  target.setHours(0, 0, 0, 0);
  if (campaign.start_date) {
    const s = parseDate(campaign.start_date);
    if (s && target < s) return false;
  }
  if (campaign.end_date) {
    const e = parseDate(campaign.end_date);
    if (e && target > e) return false;
  }
  return true;
}

export function indexRules(dataset: TicketRulesDataset) {
  const campaignById = new Map(dataset.campaigns.map((c) => [c.id, c]));
  // group rules by campaign, filter enabled, sort by priority desc
  const enabledRules = dataset.rules
    .filter((r) => r.enabled && campaignById.get(r.campaign_id)?.enabled)
    .sort((a, b) => (b.priority || 0) - (a.priority || 0));
  return { campaignById, enabledRules };
}

export function applyTicketRules(ticket: RuleTicketInput, dataset: TicketRulesDataset | null | undefined): RuleEffects {
  const effects = createEmptyEffects();
  if (!dataset || !dataset.rules?.length) return effects;
  const { campaignById, enabledRules } = indexRules(dataset);

  // legSizeByIndex: derive from ticket
  const legSizeByIndex = new Map<number, number>();
  for (const s of ticket.segments) {
    if (s.leg_index != null) legSizeByIndex.set(s.leg_index, s.leg_size);
  }
  const isOW = legSizeByIndex.size <= 1;

  for (const seg of ticket.segments) {
    for (const rule of enabledRules) {
      const camp = campaignById.get(rule.campaign_id);
      if (!camp) continue;
      if (!campaignActiveOn(camp, seg.departure_date)) continue;
      if (!matchRuleAgainstSegment(rule, seg)) continue;

      if (rule.require_other_leg_direct) {
        if (!isOW && seg.leg_index != null) {
          const otherIdx = seg.leg_index === 0 ? 1 : 0;
          const otherSize = legSizeByIndex.get(otherIdx);
          if (otherSize == null || otherSize !== 1) continue;
        }
      }

      const handler = handlers.get(rule.action);
      if (handler) {
        handler(effects, rule);
        if (!effects.matchedRuleIds.includes(rule.id)) effects.matchedRuleIds.push(rule.id);
      }
    }
  }

  return effects;
}

export function testMatch(input: RuleSegmentInput, dataset: TicketRulesDataset | null | undefined): TicketRule[] {
  if (!dataset) return [];
  const { campaignById, enabledRules } = indexRules(dataset);
  const result: TicketRule[] = [];
  for (const rule of enabledRules) {
    const camp = campaignById.get(rule.campaign_id);
    if (!camp) continue;
    if (!campaignActiveOn(camp, input.departure_date)) continue;
    if (!matchRuleAgainstSegment(rule, input)) continue;
    // require_other_leg_direct in test mode: caller passes leg_size for other via segments; treat here based on leg_index/leg_size only when we don't know the other. Skip check if OW.
    result.push(rule);
  }
  return result;
}

export function formatNotesLine(notes: string[]): string {
  const cleaned = Array.from(new Set(notes.map((n) => (n || '').trim()).filter(Boolean)));
  if (!cleaned.length) return '';
  return `(${cleaned.join(' | ')})`;
}
