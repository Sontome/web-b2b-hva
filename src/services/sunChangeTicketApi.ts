const SPA_BASE = 'https://apilive.hanvietair.com/spa';
const TIMEOUT_MS = 60000;

export class SunNetworkError extends Error {
  constructor(public kind: 'network' | 'timeout' | 'aborted', msg: string) {
    super(msg);
  }
}

/** Single POST, no retry. Returns HTTP ok flag + parsed JSON (null if not JSON). */
async function postOnce(path: string, body: unknown, signal?: AbortSignal) {
  const ctrl = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    ctrl.abort();
  }, TIMEOUT_MS);
  const onAbort = () => ctrl.abort();
  signal?.addEventListener('abort', onAbort);
  try {
    const res = await fetch(`${SPA_BASE}${path}`, {
      method: 'POST',
      headers: { accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    let json: unknown = null;
    try {
      json = await res.json();
    } catch {
      json = null;
    }
    return { ok: res.ok, json };
  } catch (e) {
    if (timedOut) throw new SunNetworkError('timeout', 'Hết thời gian chờ phản hồi');
    if (signal?.aborted) throw new SunNetworkError('aborted', 'Đã huỷ');
    throw new SunNetworkError('network', e instanceof Error ? e.message : 'Lỗi mạng');
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', onAbort);
  }
}

export const sunCheckPnr = (pnr: string, signal?: AbortSignal) => postOnce('/checkpnr', { pnr }, signal);

export const sunChangePnr = (
  payload: { pnr: string; old_itinerary: unknown[]; new_itinerary: unknown[] },
  signal?: AbortSignal,
) => postOnce('/change-pnr', payload, signal);
