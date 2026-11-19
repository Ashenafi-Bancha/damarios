import { revalidateTag } from 'next/cache';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * POST /admin/revalidate: refreshes the public website right after staff change its content
 * (otherwise it refreshes by itself within a minute). Only for signed-in staff: the session cookie is
 * checked with the API before anything happens.
 */
export async function POST(req: NextRequest) {
  const base = process.env.BACKEND_URL || 'http://localhost:4000';
  const cookie = req.headers.get('cookie') ?? '';
  try {
    const me = await fetch(`${base}/api/auth/me`, { headers: { cookie }, cache: 'no-store', signal: AbortSignal.timeout(5000) });
    if (!me.ok) return NextResponse.json({ error: 'Please log in' }, { status: 401 });
  } catch {
    return NextResponse.json({ error: 'Could not check the session' }, { status: 503 });
  }
  revalidateTag('site');
  return NextResponse.json({ ok: true });
}
