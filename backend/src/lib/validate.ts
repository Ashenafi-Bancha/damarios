/**
 * Shared validation rules for request bodies and query strings.
 * The same rules are used by the public forms and the admin, so data is checked the same way everywhere.
 */
import { z } from 'zod';
import { HttpError } from './http';

/** Turns "" and null into "not given", so empty form fields don't become 0, "" or 1 January 1970. */
const blankToUndefined = (v: unknown) => (v === '' || v === null ? undefined : v);

/** Required text, trimmed. */
export const text = (min = 1, max = 200) => z.string().trim().min(min, min > 1 ? `must be at least ${min} characters` : 'is required').max(max, `must be at most ${max} characters`);

/** Optional text: "" and missing both become undefined. */
export const optionalText = (max = 200) => z.preprocess(blankToUndefined, z.string().trim().max(max, `must be at most ${max} characters`).optional());

/** Optional text that can be cleared (stored as null). */
export const nullableText = (max = 200) => z.preprocess((v) => (v === '' ? null : v), z.string().trim().max(max).nullable().optional());

/**
 * A phone number from Ethiopia or abroad: digits with optional +, spaces, dashes and brackets,
 * 7 to 15 digits in total (the international maximum).
 */
export const phone = z.string().trim().max(25).refine((v) => {
  const digits = v.replace(/\D/g, '');
  return /^\+?[\d\s\-().]+$/.test(v) && digits.length >= 7 && digits.length <= 15;
}, 'enter a valid phone number, e.g. 0911 234 567 or +251 911 234 567');

export const optionalPhone = z.preprocess(blankToUndefined, phone.optional());
export const nullablePhone = z.preprocess((v) => (v === '' ? null : v), phone.nullable().optional());

/** At least 8 characters with a letter and a number. */
export const strongPassword = z.string().min(8, 'must be at least 8 characters').max(200)
  .refine((v) => /[A-Za-z]/.test(v) && /\d/.test(v), 'must contain letters and numbers');

export const email = z.string().trim().toLowerCase().max(120).email('enter a valid email address');
export const optionalEmail = z.preprocess(blankToUndefined, email.optional());
export const nullableEmail = z.preprocess((v) => (v === '' ? null : v), email.nullable().optional());

const toDate = (v: unknown) => (typeof v === 'string' || typeof v === 'number' ? new Date(v) : v);
const dateType = z.date({ required_error: 'is required', invalid_type_error: 'is not a valid date' });

/** A required date. Empty or null is "is required" (never 1 January 1970). */
export const requiredDate = z.preprocess((v) => (v === '' || v === null ? undefined : toDate(v)), dateType);
/** A date that may be left out. */
export const optionalDate = z.preprocess((v) => (v === '' || v === null ? undefined : toDate(v)), dateType.optional());
/** A date that can be cleared (stored as null). */
export const nullableDate = z.preprocess((v) => (v === '' ? null : toDate(v)), dateType.nullable().optional());

/** Money in birr: not negative, at most two decimals, below 10 billion. */
export const money = z.coerce.number().min(0, 'cannot be negative').max(9_999_999_999, 'is too large').refine((n) => Number.isInteger(Math.round(n * 100)), 'too many decimals');
export const positiveMoney = money.refine((n) => n > 0, 'must be more than 0');

/** A whole number within limits. */
export const int = (min = 0, max = 1_000_000) => z.coerce.number().int('must be a whole number').min(min, `must be at least ${min}`).max(max, `must be at most ${max}`);

/** A database id (cuid). */
export const id = z.string().trim().min(1).max(40).regex(/^[a-z0-9]+$/i, 'invalid id');
export const optionalId = z.preprocess(blankToUndefined, id.optional());
export const nullableId = z.preprocess((v) => (v === '' ? null : v), id.nullable().optional());

/** An uploaded photo address or nothing. */
export const imageUrl = z.preprocess((v) => (v === '' ? null : v), z.string().trim().max(400).nullable().optional());

/** Reads an optional enum value from the query string; anything else is a 400 instead of a database error. */
export function queryEnum<T extends Record<string, string>>(values: T, raw: unknown, name: string): T[keyof T] | undefined {
  if (typeof raw !== 'string' || raw === '') return undefined;
  if (!Object.values(values).includes(raw)) throw new HttpError(400, `Unknown ${name}: ${raw}`);
  return raw as T[keyof T];
}

/** Reads an optional id from the query string. */
export function queryId(raw: unknown): string | undefined {
  if (typeof raw !== 'string' || raw === '') return undefined;
  const parsed = id.safeParse(raw);
  if (!parsed.success) throw new HttpError(400, 'Invalid id');
  return parsed.data;
}
