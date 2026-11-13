import type { SiteData, TrainingDept } from './types';

const block = (section: string, headline: string, body = '') => ({ section, headline, body, visible: true });

/** Shown when the API is not running yet, so the site always renders. Mirrors the backend seed. */
export const FALLBACK_SITE: SiteData = {
  offline: true,
  openingDate: '2027-01-15',
  content: {
    hero: block('hero', 'Heritage we *weave*. Skills we *pass on*.', 'DaMarios produces garments and spices for local and international markets, and trains the next generation in fashion design, culinary arts and beautification.'),
    about: block('about', 'Ethiopian weaving, *made modern*.', 'Ethiopia has a rich weaving heritage and a great potential that is still largely untapped. DaMarios was founded to take this beautiful, overlooked handcraft to a higher level by blending it with modern design. Working with the natural talent and skill of local weavers, we make quality products that meet today’s fashion, and our training center passes these skills on to the next generation. Our work keeps our cultural heritage alive, creates better jobs and income for our artisans, and carries Ethiopia’s name onto the international stage.'),
    vision: block('vision', 'From the loom *to the world*.', 'Our vision is to transform Ethiopia’s under-valued weaving sector into a modern, high-quality creative industry that is ready for the international market.'),
    production: block('production', 'Made in Wolaita Sodo, *for the world*.', 'Two production lines under one roof: garments and Ethiopian spices, for local customers and international buyers.'),
    garments: block('garments', 'Garments for local & international markets', 'Ethiopian handwoven fabric and Wolaita dinguza, made into modern garments for local, international and diaspora customers. Quality checked at every step, with capacity for bulk and export orders.'),
    spices: block('spices', 'Ethiopian spices, cleaned, ground & packed', '[Which spices, how they are sourced and processed.] Packed in retail and wholesale sizes.'),
    enquiry: block('enquiry', 'Buy from *DaMarios*.', 'Shops, restaurants, distributors, international buyers and the Ethiopian diaspora: tell us what you need and we will send a quotation.'),
    training: block('training', 'Learn a skill. *Build a future.*', 'Hands-on training by working professionals, in real workshops, with a certificate at the end.'),
    'dept-fashion': block('dept-fashion', 'Fashion design', 'From drawing and pattern making to cutting, sewing and finishing. Students practise in our own garment workshop.'),
    'dept-culinary': block('dept-culinary', 'Culinary arts', 'Ethiopian and international cooking, baking and kitchen hygiene, with practice in a real training kitchen.'),
    'dept-beauty': block('dept-beauty', 'Beautification', 'Professional makeup, bridal looks, hair cutting, braiding and styling, plus how to run your own salon.'),
    admissions: block('admissions', 'Apply in *four steps*.', 'Next intake: [Date]. Registration fee: ETB [·], payable by Telebirr, CBE Birr or cash.'),
    gallery: block('gallery', 'Inside *DaMarios*.'),
    news: block('news', 'Stories from *the center*.'),
    contact: block('contact', 'Visit *DaMarios*.'),
  },
  products: [
    { id: 'p1', name: '[Garment product]', division: 'GARMENT', description: 'Ready-to-wear for the local market.', packSizes: '', markets: 'Local' },
    { id: 'p2', name: '[Garment product]', division: 'GARMENT', description: 'Bulk and private-label production.', packSizes: '', markets: 'Local · Export' },
    { id: 'p3', name: '[e.g. Berbere]', division: 'SPICE', description: 'Cleaned, ground and packed.', packSizes: '250 g · 500 g · 1 kg · bulk', markets: 'Retail · Wholesale · Export' },
    { id: 'p4', name: '[e.g. Mitmita]', division: 'SPICE', description: 'Cleaned, ground and packed.', packSizes: '100 g · 250 g · bulk', markets: 'Retail · Wholesale' },
    { id: 'p5', name: '[e.g. Shiro]', division: 'SPICE', description: 'Roasted and milled.', packSizes: '500 g · 1 kg · bulk', markets: 'Retail · Wholesale · Export' },
  ],
  courses: ([
    ['c1', 'Basic sewing & tailoring', 'FASHION', '[3 months]'], ['c2', 'Pattern making & design', 'FASHION', '[6 months]'], ['c3', 'Advanced fashion design', 'FASHION', '[1 year]'],
    ['c4', 'Basic cooking & food safety', 'CULINARY', '[3 months]'], ['c5', 'Pastry & baking', 'CULINARY', '[4 months]'], ['c6', 'Professional chef course', 'CULINARY', '[1 year]'],
    ['c7', 'Makeup artistry', 'BEAUTY', '[3 months]'], ['c8', 'Hairdressing & braiding', 'BEAUTY', '[4 months]'], ['c9', 'Salon business basics', 'BEAUTY', '[1 month]'],
  ] as [string, string, TrainingDept, string][]).map(([id, name, department, duration]) => ({ id, name, department, duration, fee: 0, description: '' })),
  news: [
    { id: 'n1', title: 'Registration open for all three departments', kind: 'New intake', body: '', date: '2026-11-01', imageUrl: '/images/news-intake.jpg' },
    { id: 'n2', title: 'First graduation ceremony', kind: 'Graduation', body: '', date: '2026-10-20', imageUrl: '/images/news-graduation.jpg' },
    { id: 'n3', title: '[First export shipment / market fair]', kind: 'Production', body: '', date: '2026-09-25', imageUrl: '/images/news-market.jpg' },
  ],
  gallery: [
    { id: 'g1', title: 'Garment production line', category: 'GARMENTS', tall: true, imageUrl: '/images/gallery-tailor.jpg' }, { id: 'g2', title: 'Spice cleaning & grinding', category: 'SPICES', tall: false, imageUrl: '/images/gallery-chili.jpg' },
    { id: 'g3', title: 'Fashion students at work', category: 'TRAINING', tall: false, imageUrl: '/images/gallery-studio.jpg' }, { id: 'g4', title: 'Culinary class', category: 'TRAINING', tall: false, imageUrl: '/images/gallery-chef.jpg' },
    { id: 'g5', title: 'Packed spices ready for market', category: 'SPICES', tall: true, imageUrl: '/images/gallery-spice-shop.jpg' }, { id: 'g6', title: 'Bridal makeup practice', category: 'TRAINING', tall: true, imageUrl: '/images/gallery-makeup.jpg' },
    { id: 'g7', title: 'Finished garments', category: 'GARMENTS', tall: false, imageUrl: '/images/gallery-fabric.jpg' }, { id: 'g8', title: 'Graduation day', category: 'EVENTS', tall: false, imageUrl: '/images/gallery-graduation.jpg' },
  ],
  contact: {
    phone: '+251 [sales phone]', trainingPhone: '+251 [training phone]', email: 'info@[domain]', telegram: '@[damarios]',
    address: '[Kebele / landmark], Wolaita Sodo, Ethiopia', hours: 'Mon–Sat · 8:00–18:00',
  },
};
