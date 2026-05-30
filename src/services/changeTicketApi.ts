import type {
  PreChangeResponse,
  ChangeTicketResponse,
  ChangePnrRequest,
} from '@/types/changeTicket';

const BASE_URL = 'https://apilive.hanvietair.com';

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try {
      const j = await res.json();
      msg = (j as { message?: string; detail?: string }).message
        || (j as { detail?: string }).detail
        || msg;
    } catch {
      /* ignore */
    }
    throw new Error(msg);
  }
  return res.json() as Promise<T>;
}

export const preChangePnr = (pnr: string) =>
  postJson<PreChangeResponse>(`${BASE_URL}/pre-change-pnr`, { pnr });

export const changePnr = (payload: ChangePnrRequest) =>
  postJson<ChangeTicketResponse>(`${BASE_URL}/change-pnr`, payload);
