'use client';

import { motion } from 'framer-motion';
import { useBlock, useSite } from './SiteContext';
import Reveal from './Reveal';
import Photo from './Photo';

const CRAFTS = ['Ethiopian handweaving', 'Garment production', 'Spice production', 'Fashion design training', 'Culinary arts', 'Makeup & hairdressing'];
const CRAFTS_AM = ['የኢትዮጵያ የእጅ ሽመና', 'የአልባሳት ምርት', 'የቅመማ ቅመም ምርት', 'የፋሽን ዲዛይን ስልጠና', 'የምግብ ዝግጅት', 'ሜካፕ እና የፀጉር ሥራ'];

export function Marquee() {
  const { lang } = useSite();
  const crafts = lang === 'am' ? CRAFTS_AM : CRAFTS;
  const items = [...crafts, ...crafts];
  return (
    <div aria-hidden="true" className="overflow-hidden whitespace-nowrap bg-gold py-4 text-ink md:py-5">
      <div className="inline-flex animate-marquee gap-12 pr-12 font-serif text-xl italic md:text-[26px]">
        {items.map((c, i) => (
          <span key={i} className="flex items-center gap-12">{c}<span className="not-italic">✦</span></span>
        ))}
      </div>
    </div>
  );
}

/** Renders a headline, putting words wrapped in *stars* in italics. */
export function Headline({ text, as: Tag = 'h2', className = 'h2' }: { text: string; as?: 'h2' | 'h3'; className?: string }) {
  const parts = text.split(/(\*[^*]+\*)/g);
  return (
    <Tag className={className}>
      {parts.map((p, i) => (p.startsWith('*') ? <em key={i}>{p.slice(1, -1)}</em> : <span key={i}>{p}</span>))}
    </Tag>
  );
}

export function About() {
  const { tx } = useSite();
  const about = useBlock('about');
  if (!about.visible) return null;
  return (
    <section id="about" className="section">
      <div className="wrap flex flex-wrap items-center gap-16 lg:gap-[72px]">
        <Reveal className="relative min-w-0 flex-[1_1_420px]">
          <Photo src="/images/founder-senait-wolaita.jpg" label={tx('Dr. Senait Mario, founder of DaMarios, in a Wolaita dinguza blazer', 'የዳማሪዮስ መሥራች ዶ/ር ሰናይት ማሪዮ በወላይታ ዲንጉዛ ጃኬት')} sizes="(min-width: 1024px) 45vw, 100vw" position="50% 20%" className="h-[440px] rounded-lg md:h-[560px]" />
          <motion.div className="absolute -bottom-8 right-3 w-[230px] rounded-lg bg-ink p-6 text-white md:-right-6"
            initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.3, duration: 0.8 }}>
            <p className="font-serif text-[22px] italic leading-snug">“{tx('We blend craft with quality production, and bring it to you.', 'የእጅ ጥበብን ከጥራት ያለው ምርት ጋር አዋሕደን ወደ እርስዎ እናደርሳለን።')}”</p>
            <p className="mt-3.5 text-xs tracking-[.14em] text-gold">{tx('DR. SENAIT MARIO · FOUNDER', 'ዶ/ር ሰናይት ማሪዮ · መሥራች')}</p>
          </motion.div>
        </Reveal>
        <Reveal delay={0.1} className="flex min-w-0 flex-[1_1_460px] flex-col gap-6 pt-6">
          <p className="eyebrow text-teal">{tx('About DaMarios', 'ስለ ዳማሪዮስ')}</p>
          <Headline text={about.headline} />
          <p className="lead text-muted">{about.body}</p>
          <div className="mt-3 grid grid-cols-3 gap-5 border-t border-ivory-line pt-7">
            {[['2', tx('Production lines: garments & spices', 'የምርት ዘርፎች፦ አልባሳት እና ቅመማ ቅመም')], ['3', tx('Training departments', 'የስልጠና ክፍሎች')], [tx('Local + global', 'አገር ውስጥ + ዓለም'), tx('Markets we serve', 'የምናገለግላቸው ገበያዎች')]].map(([h, b]) => (
              <div key={b}><div className="font-serif text-3xl leading-none md:text-[40px]">{h}</div><div className="mt-1.5 text-sm leading-normal text-muted">{b}</div></div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
