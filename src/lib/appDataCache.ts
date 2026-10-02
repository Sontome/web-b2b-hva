// Shared data layer for profiles, user_roles, ticket_rules, ticket_campaigns.
// localStorage cache with TTL + in-flight promise dedupe. User data is keyed by user_id.
import { supabase } from '@/integrations/supabase/client';
import type { TicketCampaign, TicketRule, TicketRulesDataset } from '@/types/ticketRules';

export const CACHE_TTL = 6 * 60 * 60 * 1000; // 6 hours

const KEYS = {
  rules: 'ticket_rules_cache',
  campaigns: 'ticket_campaigns_cache',
  profile: (id: string) => `profile_cache_${id}`,
  roles: (id: string) => `user_roles_cache_${id}`,
};
const timeKey = (key: string) => key.replace(/_cache/, '_cache_time');

function readCache<T>(key: string): { data: T; fresh: boolean } | null {
  try {
    const raw = localStorage.getItem(key);
    const t = Number(localStorage.getItem(timeKey(key)));
    if (raw == null || !t) return null;
    return { data: JSON.parse(raw) as T, fresh: Date.now() - t < CACHE_TTL };
  } catch {
    return null;
  }
}

function writeCache(key: string, data: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
    localStorage.setItem(timeKey(key), String(Date.now()));
  } catch { /* quota / private mode */ }
}

function removeCache(key: string) {
  try {
    localStorage.removeItem(key);
    localStorage.removeItem(timeKey(key));
  } catch { /* noop */ }
}

const inflight = new Map<string, Promise<any>>();

/** Cache-first loader: fresh cache → return; else one shared fetch; on failure fall back to stale cache. */
async function cached<T>(key: string, fetcher: () => Promise<T>, force = false): Promise<T> {
  const hit = readCache<T>(key);
  if (hit?.fresh && !force) return hit.data;
  const pending = inflight.get(key);
  if (pending) return pending;

  const p = (async () => {
    try {
      const data = await fetcher();
      writeCache(key, data);
      return data;
    } catch (err) {
      console.error(`[appDataCache] fetch failed for ${key}`, err);
      if (hit) return hit.data; // keep using stale cache, no retry loop
      throw err;
    } finally {
      inflight.delete(key);
    }
  })();
  inflight.set(key, p);
  return p;
}

// ---------- profiles ----------
export function loadProfile(userId: string, force = false) {
  return cached<any | null>(KEYS.profile(userId), async () => {
    const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
    if (error && error.code !== 'PGRST116') throw error;
    return data ?? null;
  }, force);
}

/** Merge a local update into the user's cached profile (after a successful write). */
export function patchProfileCache(userId: string, patch: Record<string, any>) {
  const hit = readCache<any>(KEYS.profile(userId));
  if (hit?.data) writeCache(KEYS.profile(userId), { ...hit.data, ...patch });
}

// ---------- user_roles ----------
export function loadUserRole(userId: string, force = false) {
  return cached<string | null>(KEYS.roles(userId), async () => {
    const { data, error } = await supabase.from('user_roles').select('role').eq('user_id', userId).single();
    if (error && error.code !== 'PGRST116') throw error;
    return (data?.role as string) ?? null;
  }, force);
}

export function clearUserCache(userId: string) {
  removeCache(KEYS.profile(userId));
  removeCache(KEYS.roles(userId));
}

// ---------- ticket_rules / ticket_campaigns ----------
export function loadTicketCampaigns(force = false) {
  return cached<TicketCampaign[]>(KEYS.campaigns, async () => {
    const { data, error } = await supabase.from('ticket_campaigns').select('*');
    if (error) throw error;
    return (data || []) as TicketCampaign[];
  }, force);
}

export function loadTicketRules(force = false) {
  return cached<TicketRule[]>(KEYS.rules, async () => {
    const { data, error } = await supabase.from('ticket_rules').select('*');
    if (error) throw error;
    return (data || []) as TicketRule[];
  }, force);
}

export async function loadTicketRulesDataset(force = false): Promise<TicketRulesDataset> {
  const [campaigns, rules] = await Promise.all([loadTicketCampaigns(force), loadTicketRules(force)]);
  return { campaigns, rules };
}

export function invalidateTicketRulesCache() {
  removeCache(KEYS.rules);
  removeCache(KEYS.campaigns);
}
