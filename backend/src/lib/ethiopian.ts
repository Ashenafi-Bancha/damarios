/** Ethiopian calendar helpers (used for payroll periods and dates on reports). */

export const ET_MONTHS = [
  'Meskerem', 'Tikimt', 'Hidar', 'Tahsas', 'Tir', 'Yekatit', 'Megabit',
  'Miyazya', 'Ginbot', 'Sene', 'Hamle', 'Nehase', 'Pagume',
];

// Standard Amete Mihret epoch offset used by the conversion formulas (1 Meskerem 1 E.C. is this + 365).
const EPOCH_OFFSET = 1723856;

function gregorianToJdn(y: number, m: number, d: number) {
  const a = Math.floor((14 - m) / 12);
  const yy = y + 4800 - a;
  const mm = m + 12 * a - 3;
  return d + Math.floor((153 * mm + 2) / 5) + 365 * yy + Math.floor(yy / 4) - Math.floor(yy / 100) + Math.floor(yy / 400) - 32045;
}

export function toEthiopian(date: Date) {
  const jdn = gregorianToJdn(date.getFullYear(), date.getMonth() + 1, date.getDate());
  const r = (jdn - EPOCH_OFFSET) % 1461;
  const n = (r % 365) + 365 * Math.floor(r / 1460);
  const year = 4 * Math.floor((jdn - EPOCH_OFFSET) / 1461) + Math.floor(r / 365) - Math.floor(r / 1460);
  const month = Math.floor(n / 30) + 1;
  const day = (n % 30) + 1;
  return { year, month, day };
}

function jdnToGregorian(jdn: number) {
  const a = jdn + 32044;
  const b = Math.floor((4 * a + 3) / 146097);
  const c = a - Math.floor((146097 * b) / 4);
  const d = Math.floor((4 * c + 3) / 1461);
  const e = c - Math.floor((1461 * d) / 4);
  const m = Math.floor((5 * e + 2) / 153);
  const day = e - Math.floor((153 * m + 2) / 5) + 1;
  const month = m + 3 - 12 * Math.floor(m / 10);
  const year = 100 * b + d - 4800 + Math.floor(m / 10);
  return new Date(year, month - 1, day);
}

export function fromEthiopian(year: number, month: number, day: number) {
  const jdn = EPOCH_OFFSET + 365 + 365 * (year - 1) + Math.floor(year / 4) + 30 * month + day - 31;
  return jdnToGregorian(jdn);
}

/** First and last Gregorian day of an Ethiopian month ("2019-02"). */
export function etPeriodRange(period: string) {
  const [y, m] = period.split('-').map(Number);
  const start = fromEthiopian(y, m, 1);
  const end = m === 13 ? fromEthiopian(y + 1, 1, 1) : fromEthiopian(y, m + 1, 1);
  return { start, end }; // end is exclusive
}

/** Payroll period key, e.g. "2019-02" for Tikimt 2019. */
export function etPeriod(date = new Date()) {
  const { year, month } = toEthiopian(date);
  return `${year}-${String(month).padStart(2, '0')}`;
}

export function etPeriodLabel(period: string) {
  const [y, m] = period.split('-').map(Number);
  return `${ET_MONTHS[m - 1]} ${y}`;
}
