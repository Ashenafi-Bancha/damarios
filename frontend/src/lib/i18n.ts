import type { Lang } from './types';

/**
 * Interface labels for the public site, in English and Amharic. Section text itself comes from the admin's
 * Website content screen. Shorter one-off texts are translated where they are used, with tx(english, amharic).
 */
const EN = {
  home: 'Home', about: 'About', production: 'Production', training: 'Training center', gallery: 'Gallery', news: 'News', contact: 'Contact',
  enquire: 'Order', apply: 'Apply to train', applyShort: 'Apply', order: 'Order', call: 'Call',
  ourProduction: 'Our production', seeCourses: 'See courses & apply', nowEnrolling: 'Now enrolling', menu: 'Menu',
  sendApplication: 'Send my application', requestQuote: 'Request a quotation',
};

const AM: Partial<typeof EN> = {
  home: 'መነሻ', about: 'ስለ እኛ', production: 'ምርት', training: 'ማሠልጠኛ ማዕከል', gallery: 'ጋለሪ', news: 'ዜና', contact: 'ያግኙን',
  enquire: 'ይዘዙ', apply: 'ለስልጠና ያመልክቱ', applyShort: 'ያመልክቱ', order: 'ይዘዙ', call: 'ይደውሉ',
  ourProduction: 'ምርቶቻችን', seeCourses: 'ኮርሶችን ይመልከቱ እና ያመልክቱ', nowEnrolling: 'ምዝገባ ተጀምሯል', menu: 'ማውጫ',
  sendApplication: 'ማመልከቻዬን ላክ', requestQuote: 'ዋጋ ይጠይቁ',
};

export type Labels = typeof EN;

export function labels(lang: Lang): Labels {
  return lang === 'am' ? { ...EN, ...AM } : EN;
}
