import { buildVnaBookingV3 } from '@/lib/vnaBookingV3';

export async function bookVnaMultiCity(input: Parameters<typeof buildVnaBookingV3>, transport: typeof fetch = fetch) {
  const request = buildVnaBookingV3(...input);
  const response = await transport(request.url, {
    method: 'POST', headers: { accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify(request.body),
  });
  const data = await response.json();
  if (!response.ok || data?.status === 'Error' || typeof data?.mã_giữ_vé !== 'string' || !data.mã_giữ_vé.trim()) {
    const detail = typeof data?.detail === 'string' ? data.detail : data?.mess || data?.message;
    throw new Error(detail || `Không thể giữ vé VNA (${response.status}). Vui lòng kiểm tra PNR trước khi thử lại.`);
  }
  return { status: 'OK', pnr: data.mã_giữ_vé.trim() };
}
