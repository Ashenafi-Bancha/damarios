/** Browser-side API client. Calls go through Next's /api proxy, so the session cookie is sent automatically. */
import { DEMO, DEMO_SAVE_MESSAGE, DemoError, demoApi } from './demo';

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

/** Sends a signed-out admin visitor to the login page (except from the login page itself). */
function toLogin() {
  if (typeof window !== 'undefined' && window.location.pathname.startsWith('/admin') && !window.location.pathname.startsWith('/admin/login')) {
    window.location.href = `/admin/login?next=${encodeURIComponent(window.location.pathname)}`;
  }
}

export async function api<T = unknown>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  // Demo mode (no API or database): answer from the recorded data.
  if (DEMO) {
    try {
      return await demoApi<T>(path, init.method ?? 'GET', init.body);
    } catch (e) {
      if (e instanceof DemoError) {
        if (e.status === 401 && path !== '/auth/login') toLogin();
        throw new ApiError(e.status, e.message);
      }
      throw e;
    }
  }

  const res = await fetch(`/api${path}`, {
    method: init.method ?? 'GET',
    credentials: 'include',
    headers: init.body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
    body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
  });
  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401) toLogin();
    throw new ApiError(res.status, (data as { error?: string }).error ?? 'Something went wrong');
  }
  return data as T;
}

export async function uploadImage(file: File, scope: 'public' | 'admin' = 'admin'): Promise<string> {
  if (DEMO) throw new ApiError(403, DEMO_SAVE_MESSAGE);
  const body = new FormData();
  body.append('file', file);
  const res = await fetch(`/api/${scope}/uploads`, { method: 'POST', body, credentials: 'include' });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, (data as { error?: string }).error ?? 'Upload failed');
  return (data as { url: string }).url;
}
