/**
 * Demo mode: the whole site (public pages and staff panel) runs without the API or a database,
 * for showing the prototype from a static host such as Vercel.
 *
 * Turn it on with NEXT_PUBLIC_DEMO=true. The sample staff login is admin@damarios.com / admin@2026!
 * (NEXT_PUBLIC_DEMO_EMAIL and NEXT_PUBLIC_DEMO_PASSWORD override it). It is part of the browser code, so it is
 * not a secret: use it only for this demo, where there is no real data behind it.
 *
 * Every screen reads the answers recorded from the real API (demo-data.json: website content, starter
 * products/courses/gallery/news, and an empty admin). Saving is switched off, with a clear message.
 */
import recorded from './demo-data.json';

export const DEMO = process.env.NEXT_PUBLIC_DEMO === 'true';

const DATA = recorded as unknown as Record<string, unknown>;
const EMAIL = (process.env.NEXT_PUBLIC_DEMO_EMAIL || 'admin@damarios.com').trim().toLowerCase();
const PASSWORD = process.env.NEXT_PUBLIC_DEMO_PASSWORD || 'admin@2026!';
const SESSION_KEY = 'dm-demo-session';

export const DEMO_SAVE_MESSAGE = 'This is a preview: changes are not saved yet. Everything you add will work once the system goes live.';
const DEMO_FORM_MESSAGE = 'This is a preview of the new website, so online forms are not open yet. Please call us or message us on Telegram.';

export class DemoError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

/** Public website content recorded from the API. */
export function demoSite(): unknown {
  return DATA['/public/site?lang=en'];
}

const signedIn = () => {
  try { return localStorage.getItem(SESSION_KEY) === '1'; } catch { return false; }
};
const setSignedIn = (on: boolean) => {
  try { if (on) localStorage.setItem(SESSION_KEY, '1'); else localStorage.removeItem(SESSION_KEY); } catch { /* private mode */ }
};

/** Filters a recorded list the way the API would for the simple query options (department, category, search…). */
function filterList(rows: unknown[], params: URLSearchParams): unknown[] {
  let out = rows as Record<string, unknown>[];
  for (const [key, value] of params) {
    if (!value) continue;
    if (key === 'q') {
      const q = value.toLowerCase();
      out = out.filter((r) => Object.values(r).some((v) => typeof v === 'string' && v.toLowerCase().includes(q)));
    } else if (out.some((r) => key in r)) {
      out = out.filter((r) => String(r[key]) === value);
    }
  }
  return out;
}

/** Answers an API call from the recorded data. Same signature as the real client. */
export async function demoApi<T>(path: string, method: string, body?: unknown): Promise<T> {
  await new Promise((r) => setTimeout(r, 150)); // feels like a real request; lets loading states show
  const [route, query = ''] = path.split('?');
  const params = new URLSearchParams(query);

  // Sign in / out
  if (route === '/auth/login' && method === 'POST') {
    const { email, password } = (body ?? {}) as { email?: string; password?: string };
    if (!PASSWORD) throw new DemoError(401, 'The preview login has not been set up yet.');
    if (String(email ?? '').trim().toLowerCase() !== EMAIL || password !== PASSWORD) throw new DemoError(401, 'Email or password is incorrect');
    setSignedIn(true);
    return { ok: true } as T;
  }
  if (route === '/auth/logout') { setSignedIn(false); return { ok: true } as T; }
  if (route === '/auth/me') {
    if (!signedIn()) throw new DemoError(401, 'Please log in');
    return { ...(DATA['/auth/me'] as object), email: EMAIL } as T;
  }

  // Public forms
  if (route.startsWith('/public/')) {
    if (method === 'GET' && route === '/public/site') return DATA['/public/site?lang=en'] as T;
    throw new DemoError(503, DEMO_FORM_MESSAGE);
  }

  // Staff panel
  if (!signedIn()) throw new DemoError(401, 'Please log in');
  if (method !== 'GET') throw new DemoError(403, DEMO_SAVE_MESSAGE);

  if (route === '/admin/content') return (DATA[`/admin/content?lang=${params.get('lang') ?? 'en'}`] ?? []) as T;
  if (/^\/admin\/people\/payroll\/[^/]+$/.test(route)) return (DATA['/admin/people/payroll/:period'] ?? null) as T;
  if (route === '/admin/users') return [{ ...(DATA['/admin/users'] as object[])[0], email: EMAIL }] as T;

  const found = DATA[route];
  if (Array.isArray(found)) return filterList(found, params) as T;
  if (found !== undefined) return found as T;

  // A single record, e.g. /admin/customers/abc
  const parent = route.slice(0, route.lastIndexOf('/'));
  const id = route.slice(route.lastIndexOf('/') + 1);
  const list = DATA[parent];
  if (Array.isArray(list)) {
    const row = (list as { id?: string }[]).find((r) => r.id === id);
    if (row) return row as T;
  }
  throw new DemoError(404, 'Not found');
}
