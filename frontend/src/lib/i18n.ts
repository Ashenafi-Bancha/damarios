import type { Lang } from './types';

/**
 * Interface labels for the public site. Section text itself comes from the admin's Website content screen.
 * For now the site is English only (no language switcher). The Amharic labels are kept for later and
 * should be reviewed by a native speaker before the switcher is brought back.
 */
const EN = {
  home: 'Home', about: 'About', production: 'Production', training: 'Training center', gallery: 'Gallery', news: 'News', contact: 'Contact',
  enquire: 'Order', apply: 'Apply to train', applyShort: 'Apply', order: 'Order', call: 'Call',
  ourProduction: 'Our production', seeCourses: 'See courses & apply', nowEnrolling: 'Now enrolling', menu: 'Menu',
  sendApplication: 'Send my application', requestQuote: 'Request a quotation',
};

const AM: Partial<typeof EN> = {
  home: 'መነሻ', about: 'ስለ እኛ', production: 'ምርት', training: 'የስልጠና ማዕከል', gallery: 'ጋለሪ', news: 'ዜና', contact: 'ያግኙን',
  enquire: 'ይዘዙ / ይጠይቁ', apply: 'ለስልጠና ያመልክቱ', applyShort: 'ያመልክቱ', order: 'ይዘዙ', call: 'ይደውሉ',
  ourProduction: 'ምርቶቻችን', seeCourses: 'ኮርሶችን ይመልከቱ', nowEnrolling: 'ምዝገባ ተጀምሯል', menu: 'ማውጫ',
  sendApplication: 'ማመልከቻዬን ላክ', requestQuote: 'ዋጋ ይጠይቁ',
};

export type Labels = typeof EN;

export function labels(lang: Lang): Labels {
  return lang === 'am' ? { ...EN, ...AM } : EN;
}
