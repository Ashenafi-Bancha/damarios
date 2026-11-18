/**
 * All server settings, read from the environment once at startup and checked.
 * In production a missing or placeholder value stops the server with a clear message,
 * instead of failing later in the middle of a request.
 */
import 'dotenv/config';
import { z } from 'zod';

const PLACEHOLDER = /^(SET_IN_DIGITALOCEAN|CHANGE_ME|change-me)/i;
const isProd = process.env.NODE_ENV === 'production';

/** Empty strings count as "not set", so optional values can be left blank in .env files. */
const optional = z.string().trim().optional().transform((v) => v || undefined);
const notPlaceholder = (name: string) => (v: string) => !PLACEHOLDER.test(v) || `${name} still has its placeholder value`;

const schema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  JWT_SECRET: isProd
    ? z.string().min(32, 'JWT_SECRET must be at least 32 characters in production').refine((v) => !PLACEHOLDER.test(v), 'JWT_SECRET still has its placeholder value')
    : z.string().default('dev-only-secret-not-for-production'),
  /** Website addresses allowed to call the API from the browser, comma separated. */
  FRONTEND_URL: z.string().default('http://localhost:3000'),

  // Uploaded photos. With all four SPACES_* values set, photos go to DigitalOcean Spaces; otherwise to the local uploads/ folder.
  SPACES_ENDPOINT: optional, // e.g. https://fra1.digitaloceanspaces.com
  SPACES_BUCKET: optional,
  SPACES_KEY: optional,
  SPACES_SECRET: optional,
  /** Public address of the bucket, e.g. its CDN address https://damarios-media.fra1.cdn.digitaloceanspaces.com */
  SPACES_PUBLIC_URL: optional,

  TELEGRAM_BOT_TOKEN: optional,
  TELEGRAM_CHAT_ID: optional,
});

function load() {
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const problems = parsed.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`).join('\n');
    throw new Error(`The server settings are not valid:\n${problems}`);
  }
  const env = parsed.data;

  const spacesKeys = ['SPACES_ENDPOINT', 'SPACES_BUCKET', 'SPACES_KEY', 'SPACES_SECRET'] as const;
  const spacesSet = spacesKeys.filter((k) => env[k]);
  if (spacesSet.length > 0 && spacesSet.length < spacesKeys.length) {
    throw new Error(`Photo storage is half set up. Set all of ${spacesKeys.join(', ')}, or none of them.`);
  }
  for (const k of spacesSet) {
    const check = notPlaceholder(k)(env[k]!);
    if (check !== true) throw new Error(check);
  }
  const spaces = spacesSet.length
    ? {
        endpoint: env.SPACES_ENDPOINT!,
        bucket: env.SPACES_BUCKET!,
        key: env.SPACES_KEY!,
        secret: env.SPACES_SECRET!,
        publicUrl: (env.SPACES_PUBLIC_URL || `https://${env.SPACES_BUCKET}.${new URL(env.SPACES_ENDPOINT!).hostname}`).replace(/\/+$/, ''),
      }
    : null;

  if (isProd && !spaces) {
    console.warn('Warning: SPACES_* is not set, so uploaded photos are saved on the server disk and are lost on the next deploy.');
  }

  return {
    isProd,
    port: env.PORT,
    jwtSecret: env.JWT_SECRET,
    frontendOrigins: env.FRONTEND_URL.split(',').map((s) => s.trim().replace(/\/+$/, '')).filter(Boolean),
    spaces,
    telegram: env.TELEGRAM_BOT_TOKEN && env.TELEGRAM_CHAT_ID ? { token: env.TELEGRAM_BOT_TOKEN, chatId: env.TELEGRAM_CHAT_ID } : null,
  };
}

export const config = load();
