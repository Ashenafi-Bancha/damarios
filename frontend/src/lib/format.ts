/** Ethiopian calendar and number formatting used across the site and admin. */

export const ET_MONTHS = ['Meskerem', 'Tikimt', 'Hidar', 'Tahsas', 'Tir', 'Yekatit', 'Megabit', 'Miyazya', 'Ginbot', 'Sene', 'Hamle', 'Nehase', 'Pagume'];
export const ET_MONTHS_AM = ['መስከረም', 'ጥቅምት', 'ኅዳር', 'ታኅሣሥ', 'ጥር', 'የካቲት', 'መጋቢት', 'ሚያዝያ', 'ግንቦት', 'ሰኔ', 'ሐምሌ', 'ነሐሴ', 'ጳጉሜ'];

const EPOCH_OFFSET = 1723856;

function toJdn(y: number, m: number, d: number) {
  const a = Math.floor((14 - m) / 12);
  const yy = y + 4800 - a;
  const mm = m + 12 * a - 3;
  return d + Math.floor((153 * mm + 2) / 5) + 365 * yy + Math.floor(yy / 4) - Math.floor(yy / 100) + Math.floor(yy / 400) - 32045;
}

export function toEthiopian(date: Date) {
  const jdn = toJdn(date.getFullYear(), date.getMonth() + 1, date.getDate());
  const r = (jdn - EPOCH_OFFSET) % 1461;
  const n = (r % 365) + 365 * Math.floor(r / 1460);
  return {
    year: 4 * Math.floor((jdn - EPOCH_OFFSET) / 1461) + Math.floor(r / 365) - Math.floor(r / 1460),
    month: Math.floor(n / 30) + 1,
    day: (n % 30) + 1,
  };
}

/** "ጥቅምት 26, 2019 ዓ.ም." */
export function etDateAm(date: Date | string) {
  const e = toEthiopian(new Date(date));
  return `${ET_MONTHS_AM[e.month - 1]} ${e.day}, ${e.year} ዓ.ም.`;
}

/** "Tikimt 26" */
export function etDateShort(date: Date | string) {
  const e = toEthiopian(new Date(date));
  return `${ET_MONTHS[e.month - 1]} ${e.day}`;
}

export function periodLabel(period: string) {
  const [y, m] = period.split('-').map(Number);
  return `${ET_MONTHS[m - 1]} ${y}`;
}

export function gcDate(date: Date | string, opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' }) {
  return new Date(date).toLocaleDateString('en-GB', opts);
}

export function etb(n: number | string | null | undefined) {
  return `ETB ${Number(n ?? 0).toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
}

export function shortEtb(n: number) {
  return n >= 1000 ? `ETB ${Math.round(n / 1000)}k` : etb(n);
}

export function timeAgo(date: Date | string) {
  const s = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} hr ago`;
  if (s < 172800) return 'yesterday';
  return gcDate(date, { day: 'numeric', month: 'short' });
}

export const label = (s: string) => s.replace(/_/g, ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase());
