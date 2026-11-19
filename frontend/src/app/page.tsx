import HomePage from '@/components/public/HomePage';
import { getSite } from '@/lib/site';
import { SITE_URL } from '@/lib/siteUrl';
import type { SiteData } from '@/lib/types';

export const revalidate = 60;

/** Business details search engines read (name, place, contact, what DaMarios offers). Placeholder values are left out. */
function structuredData(site: SiteData) {
  const c = site.contact;
  const real = (v?: string) => (v && !v.includes('[') ? v : undefined);
  const sameAs = [c?.facebook, c?.instagram, c?.tiktok, c?.youtube].filter((v): v is string => !!v && v.startsWith('https://'));
  return {
    '@context': 'https://schema.org',
    '@type': ['Organization', 'LocalBusiness'],
    name: 'DaMarios Garment and Skill Training Center',
    alternateName: 'ዳማሪዮስ ጋርመንት እና የክህሎት ማሠልጠኛ ማዕከል',
    url: SITE_URL,
    logo: `${SITE_URL}/brand/logo-full.png`,
    image: `${SITE_URL}/images/damarios-building.jpg`,
    description: 'Ethiopian handwoven garments and spices for local and international markets, and skill training in fashion design, culinary arts and beautification.',
    founder: { '@type': 'Person', name: 'Dr. Senait Mario' },
    address: { '@type': 'PostalAddress', addressLocality: 'Wolaita Sodo', addressRegion: 'South Ethiopia', addressCountry: 'ET', streetAddress: real(c?.address) },
    telephone: real(c?.phone),
    email: real(c?.email),
    sameAs: sameAs.length ? sameAs : undefined,
    areaServed: ['Ethiopia', 'Worldwide'],
    knowsLanguage: ['en', 'am'],
  };
}

export default async function Home() {
  const site = await getSite('en');
  return (
    <>
      {/* "<" is escaped so text from the admin can never close this script tag. */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData(site)).replace(/</g, '\\u003c') }} />
      <HomePage initial={site} />
    </>
  );
}
