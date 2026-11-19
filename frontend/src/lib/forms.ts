/**
 * Checks shared by the website's forms. They mirror the server's rules (backend/src/lib/validate.ts),
 * so visitors see a clear message before sending; the server checks everything again.
 */

/** Phone numbers from Ethiopia or abroad: digits with optional +, spaces, dashes, brackets and dots (v-flag safe). */
export const PHONE_PATTERN = String.raw`\+?[0-9\s\-\(\)\.]{7,25}`;

/** 7–15 digits in total (the international maximum), e.g. 0911 234 567 or +44 20 7946 0958. */
export function isPhone(v: string): boolean {
  const digits = v.replace(/\D/g, '');
  return /^\+?[\d\s\-().]+$/.test(v.trim()) && digits.length >= 7 && digits.length <= 15;
}

export function isEmail(v: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim());
}

/** A Telegram username: @name, 5–32 letters, numbers or underscores. */
export function isTelegram(v: string): boolean {
  return /^@?[A-Za-z][A-Za-z0-9_]{4,31}$/.test(v.trim());
}

/** Turns a phone number into a wa.me link (digits only, with country code). */
export function whatsappUrl(number?: string): string | null {
  const digits = (number ?? '').replace(/\D/g, '');
  if (digits.length < 9) return null;
  // Ethiopian numbers typed as 09… become 2519…
  const intl = digits.startsWith('0') ? `251${digits.slice(1)}` : digits;
  return `https://wa.me/${intl}`;
}
