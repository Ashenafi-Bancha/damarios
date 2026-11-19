/**
 * The public address of the website, used for search engines and link previews.
 * Production: https://damariosgarment.com (set NEXT_PUBLIC_SITE_URL to change it).
 */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://damariosgarment.com').replace(/\/+$/, '');

/**
 * Only the real website should appear in search results. Previews (Vercel demo, the temporary
 * *.ondigitalocean.app address, local builds) ask search engines to stay away.
 */
export const INDEXABLE = process.env.NEXT_PUBLIC_DEMO !== 'true' && process.env.NODE_ENV === 'production' && process.env.NEXT_PUBLIC_ALLOW_INDEXING !== 'false';
