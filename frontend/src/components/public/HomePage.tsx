'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion, useScroll, useSpring } from 'framer-motion';
import SmoothScroll, { useSmoothScroll } from './SmoothScroll';
import { SiteContext } from './SiteContext';
import Header from './Header';
import Hero from './Hero';
import { About, Marquee } from './Sections';
import { Enquiry, Production } from './Production';
import { Collection } from './Collection';
import { Admissions, Training } from './Training';
import { Gallery, News } from './Gallery';
import { Contact, Footer, telUrl, tgUrl } from './Contact';
import { TelegramIcon } from './Icons';
import { labels } from '@/lib/i18n';
import { normalizeSite } from '@/lib/site';
import type { Lang, SiteData, TrainingDept } from '@/lib/types';

type Product = 'Garments' | 'Spices' | 'Both';

function Page({ initial }: { initial: SiteData }) {
  const [site, setSite] = useState(initial);
  const [lang, setLangState] = useState<Lang>('en');
  const [dept, setDept] = useState<TrainingDept>('FASHION');
  const [courseId, setCourseId] = useState('');
  const [enquiryProduct, setEnquiryProduct] = useState<Product>('Garments');
  const { scrollTo } = useSmoothScroll();
  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 120, damping: 30 });

  // The site is English only for now: a language saved from an earlier visit is ignored.
  // The language machinery below stays in place so Amharic can be switched back on later.
  useEffect(() => {
    document.documentElement.lang = lang === 'am' ? 'am' : 'en';
    if (lang === 'en') { setSite(initial); return; }
    fetch(`/api/public/site?lang=${lang}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d: Partial<SiteData>) => setSite(normalizeSite({ ...d, content: { ...initial.content, ...(d.content ?? {}) } })))
      .catch(() => { /* keep current content */ });
  }, [lang, initial]);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try { localStorage.setItem('dm-lang', l); } catch { /* ignore */ }
  }, []);

  const changeDept = useCallback((d: TrainingDept) => { setDept(d); setCourseId(''); }, []);
  const startApply = useCallback((d: TrainingDept, id?: string) => { setDept(d); setCourseId(id ?? ''); scrollTo('#apply'); }, [scrollTo]);
  const startEnquiry = useCallback((p: Product) => { setEnquiryProduct(p); scrollTo('#enquiry'); }, [scrollTo]);

  const t = labels(lang);
  const ctx = useMemo(() => ({
    site, lang, setLang, t, dept, setDept: changeDept, startApply, courseId, setCourseId, startEnquiry, enquiryProduct, setEnquiryProduct,
  }), [site, lang, setLang, t, dept, changeDept, startApply, courseId, startEnquiry, enquiryProduct]);

  return (
    <SiteContext.Provider value={ctx}>
      <motion.div aria-hidden="true" className="fixed inset-x-0 top-0 z-[60] h-[3px] origin-left bg-gold" style={{ scaleX: progress }} />
      <div id="top">
        <Header />
        <main>
          <Hero />
          <Marquee />
          <About />
          <Production />
          <Collection />
          <Enquiry />
          <Training />
          <Admissions />
          <Gallery />
          <News />
          <Contact />
        </main>
        <Footer />
      </div>
      <a href={tgUrl(site.contact?.telegram)} target="_blank" rel="noopener noreferrer" aria-label="Chat with DaMarios on Telegram"
        className="fixed bottom-6 right-6 z-40 hidden h-[60px] w-[60px] items-center justify-center rounded-full bg-gold text-ink shadow-[0_10px_30px_rgba(0,0,0,.25)] transition-transform hover:scale-110 md:flex">
        <TelegramIcon className="h-6 w-6" />
      </a>
      <nav aria-label="Quick actions" className="fixed inset-x-3 bottom-3.5 z-40 grid grid-cols-3 gap-1.5 rounded-full bg-ink p-1.5 shadow-[0_12px_30px_rgba(0,0,0,.3)] md:hidden">
        <a href={telUrl(site.contact?.phone)} className="flex min-h-[48px] items-center justify-center rounded-full text-[13px] font-semibold text-white">{t.call}</a>
        <a href="#enquiry" className="flex min-h-[48px] items-center justify-center rounded-full text-[13px] font-semibold text-white">{t.order}</a>
        <a href="#apply" className="flex min-h-[48px] items-center justify-center rounded-full bg-gold text-[13px] font-semibold text-ink">{t.applyShort}</a>
      </nav>
      {site.offline && (
        <p className="fixed bottom-20 left-3 z-40 rounded-full bg-[#FFF4DC] px-3 py-1.5 text-xs font-semibold text-[#6B4A00] shadow md:bottom-6 md:left-6">
          Sample content: the API is not connected
        </p>
      )}
    </SiteContext.Provider>
  );
}

export default function HomePage({ initial }: { initial: SiteData }) {
  return (
    <SmoothScroll>
      <Page initial={initial} />
    </SmoothScroll>
  );
}
