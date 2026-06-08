import type {
  PreChangeVJResponse,
  ChangeVJResponse,
  ChangeVJRequest,
} from '@/types/changeTicketVJ';

const BASE_URL = 'https://apilive.hanvietair.com';

async function request<T>(url: string, init: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try {
      const j = await res.json();
      msg =
        (j as { message?: string; detail?: string }).message ||
        (j as { detail?: string }).detail ||
        msg;
    } catch {
      /* ignore */
    }
    throw new Error(msg);
  }
  return res.json() as Promise<T>;
}

export const preChangeVJPnr = (pnr: string) =>
  request<PreChangeVJResponse>(
    `${BASE_URL}/pre-change-vj-pnr?pnr=${encodeURIComponent(pnr)}`,
    {
      method: 'POST',
      headers: { accept: 'application/json' },
    }
  );

export const changeVJPnr = (payload: ChangeVJRequest) =>
  request<ChangeVJResponse>(`${BASE_URL}/change-vj-pnr`, {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
