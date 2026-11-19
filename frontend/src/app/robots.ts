import type { MetadataRoute } from 'next';
import { INDEXABLE, SITE_URL } from '@/lib/siteUrl';

/** robots.txt: the public website can be indexed; the admin panel and API never. Previews are not indexed at all. */
export default function robots(): MetadataRoute.Robots {
  if (!INDEXABLE) return { rules: { userAgent: '*', disallow: '/' } };
  return {
    rules: { userAgent: '*', allow: '/', disallow: ['/admin', '/api/'] },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
