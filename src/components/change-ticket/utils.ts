/** "18/07/2026" -> "2026-07-18" */
export function formatDateToApi(input: string): string {
  if (!input) return '';
  const [d, m, y] = input.split('/');
  if (!d || !m || !y) return input;
  return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
}

/** "10:05" -> "1005" */
export function formatTimeToApi(input: string): string {
  if (!input) return '';
  return input.replace(':', '').padStart(4, '0');
}

/** 103900 -> "103,900 KRW" */
export function formatCurrencyKRW(value: number | string | undefined | null): string {
  if (value === undefined || value === null || value === '') return '-';
  const n = typeof value === 'number' ? value : parseInt(String(value), 10);
  if (Number.isNaN(n)) return String(value);
  return `${new Intl.NumberFormat('en-US').format(n)} KRW`;
}
