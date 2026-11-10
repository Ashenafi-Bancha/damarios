/** Browser-side API client. Calls go through Next's /api proxy, so the session cookie is sent automatically. */

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export async function api<T = unknown>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  const res = await fetch(`/api${path}`, {
    method: init.method ?? 'GET',
    credentials: 'include',
    headers: init.body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
    body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
  });
  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401 && typeof window !== 'undefined' && window.location.pathname.startsWith('/admin') && !window.location.pathname.startsWith('/admin/login')) {
      window.location.href = `/admin/login?next=${encodeURIComponent(window.location.pathname)}`;
    }
    throw new ApiError(res.status, (data as { error?: string }).error ?? 'Something went wrong');
  }
  return data as T;
}

export async function uploadImage(file: File, scope: 'public' | 'admin' = 'admin'): Promise<string> {
  const body = new FormData();
  body.append('file', file);
  const res = await fetch(`/api/${scope}/uploads`, { method: 'POST', body, credentials: 'include' });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, (data as { error?: string }).error ?? 'Upload failed');
  return (data as { url: string }).url;
}
