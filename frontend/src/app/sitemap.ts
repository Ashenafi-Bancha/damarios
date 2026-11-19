import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/siteUrl';

/** sitemap.xml: the home page in English and Amharic. */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    {
      url: `${SITE_URL}/`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 1,
      alternates: { languages: { en: `${SITE_URL}/`, am: `${SITE_URL}/?lang=am` } },
    },
  ];
}
