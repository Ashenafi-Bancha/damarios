import { FALLBACK_SITE } from './fallback';
import type { SiteData } from './types';

/** Fills any missing list or section with an empty value, so partial or older API responses can't break the page. */
export function normalizeSite(data: Partial<SiteData>): SiteData {
  return {
    content: { ...FALLBACK_SITE.content, ...(data.content ?? {}) },
    products: Array.isArray(data.products) ? data.products : [],
    courses: Array.isArray(data.courses) ? data.courses : [],
    news: Array.isArray(data.news) ? data.news : [],
    gallery: Array.isArray(data.gallery) ? data.gallery : [],
    contact: { ...FALLBACK_SITE.contact!, ...(data.contact ?? {}) },
    openingDate: (data.openingDate as string | null | undefined) ?? FALLBACK_SITE.openingDate,
  };
}

/** Loads the public website content on the server. Falls back to sample content if the API is down. */
export async function getSite(lang = 'en'): Promise<SiteData> {
  const base = process.env.BACKEND_URL || 'http://localhost:4000';
  try {
    const res = await fetch(`${base}/api/public/site?lang=${lang}`, { next: { revalidate: 60, tags: ['site'] } });
    if (!res.ok) throw new Error(String(res.status));
    return normalizeSite((await res.json()) as Partial<SiteData>);
  } catch {
    return FALLBACK_SITE;
  }
}
