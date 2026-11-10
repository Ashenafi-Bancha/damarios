'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Image from 'next/image';
import clsx from 'clsx';
import { Menu, X } from 'lucide-react';
import { useSite } from './SiteContext';
import type { Lang } from '@/lib/types';

const LANGS: { id: Lang; name: string }[] = [
  { id: 'en', name: 'EN' },
  { id: 'am', name: 'አማ' },
  { id: 'wal', name: 'WOL' },
];

export default function Header() {
  const { t, lang, setLang } = useSite();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
  }, [open]);

  const links = [
    { href: '#about', name: t.about },
    { href: '#production', name: t.production },
    { href: '#training', name: t.training },
    { href: '#gallery', name: t.gallery },
    { href: '#news', name: t.news },
    { href: '#contact', name: t.contact },
  ];
  const menuLinks = [...links.slice(0, 2), { href: '#enquiry', name: t.enquire }, links[2], { href: '#apply', name: t.apply }, ...links.slice(3)];

  return (
    <>
      <div className="bg-ink text-[13px] text-[#E6EEF8]">
        <div className="wrap flex min-h-[42px] flex-wrap items-center justify-between gap-x-5 gap-y-1 py-1.5">
          <a href="#apply" className="inline-flex items-center gap-2.5 hover:text-white">
            <span className="h-[7px] w-[7px] rounded-full bg-gold" />
            <span>{t.nowEnrolling}: Fashion design · Culinary arts · Beautification · <span className="font-semibold text-gold">{t.applyShort} →</span></span>
          </a>
          <div role="group" aria-label="Language" className="hidden gap-0.5 sm:flex">
            {LANGS.map((l) => (
              <button key={l.id} type="button" onClick={() => setLang(l.id)} aria-pressed={lang === l.id}
                className={clsx('min-h-[32px] rounded px-2.5 text-xs font-medium tracking-wider transition-colors', lang === l.id ? 'bg-gold text-ink' : 'hover:text-white')}>
                {l.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      <header className={clsx('sticky top-0 z-40 border-b transition-all duration-300', scrolled ? 'border-ivory-line bg-ivory/85 backdrop-blur-md' : 'border-transparent bg-ivory')}>
        <div className={clsx('wrap flex items-center justify-between gap-5 transition-all duration-300', scrolled ? 'min-h-[68px]' : 'min-h-[86px]')}>
          <a href="#top" aria-label="DaMarios home" className="flex items-center gap-3.5 text-ink">
            {/* Compact logo on phones, full logo (with the full name) on larger screens. */}
            <Image src="/brand/logo-compact.png" alt="DaMarios Garment and Skill Training Center" width={1200} height={301} priority
              className={clsx('w-auto transition-all duration-300 sm:hidden', scrolled ? 'h-8' : 'h-9')} />
            <Image src="/brand/logo-horizontal.png" alt="DaMarios Garment and Skill Training Center" width={1400} height={320} priority
              className={clsx('hidden w-auto transition-all duration-300 sm:block', scrolled ? 'h-10' : 'h-12')} />
          </a>
          <nav aria-label="Main" className="hidden items-center gap-6 xl:flex">
            {links.map((l) => (
              <a key={l.href} href={l.href} className="group relative py-3.5 text-sm font-medium tracking-wide text-ink">
                {l.name}
                <span className="absolute inset-x-0 bottom-2 h-px origin-left scale-x-0 bg-teal transition-transform duration-300 group-hover:scale-x-100" />
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-2.5">
            <a href="#enquiry" className="btn btn-line hidden min-h-[46px] px-5 lg:inline-flex">{t.enquire}</a>
            <a href="#apply" className="btn btn-ink hidden min-h-[46px] px-[22px] sm:inline-flex">{t.apply}</a>
            <button type="button" onClick={() => setOpen(true)} aria-label={t.menu} aria-expanded={open}
              className="flex h-12 w-12 flex-none items-center justify-center rounded-full border border-ink text-ink transition-colors hover:bg-ink hover:text-white xl:hidden">
              <Menu className="h-5 w-5" strokeWidth={1.6} />
            </button>
          </div>
        </div>
      </header>

      <AnimatePresence>
        {open && (
          <motion.div className="fixed inset-0 z-50 flex flex-col bg-ink text-white" role="dialog" aria-modal="true" aria-label={t.menu}
            initial={{ clipPath: 'circle(0% at 95% 5%)' }} animate={{ clipPath: 'circle(150% at 95% 5%)' }} exit={{ clipPath: 'circle(0% at 95% 5%)' }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}>
            <div className="wrap flex min-h-[86px] items-center justify-between">
              <Image src="/brand/logo-compact-white.png" alt="DaMarios Garment and Skill Training Center" width={1200} height={301} className="h-9 w-auto" />
              <button type="button" onClick={() => setOpen(false)} aria-label="Close menu" className="flex h-12 w-12 items-center justify-center rounded-full border border-white/40">
                <X className="h-5 w-5" strokeWidth={1.6} />
              </button>
            </div>
            <nav aria-label="Menu" className="wrap flex flex-1 flex-col justify-center gap-1">
              {menuLinks.map((l, i) => (
                <motion.a key={l.href} href={l.href} onClick={() => setOpen(false)}
                  initial={{ opacity: 0, x: -24 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 + i * 0.05 }}
                  className="flex items-baseline justify-between border-b border-ink-line py-3 font-serif text-[32px] leading-tight hover:text-gold sm:text-5xl">
                  <span>{l.name}</span><span className="font-sans text-xs text-muted-dark">{String(i + 1).padStart(2, '0')}</span>
                </motion.a>
              ))}
            </nav>
            <div className="wrap flex gap-2 pb-8">
              {LANGS.map((l) => (
                <button key={l.id} type="button" onClick={() => setLang(l.id)} aria-pressed={lang === l.id}
                  className={clsx('min-h-[44px] flex-1 rounded-full border text-sm', lang === l.id ? 'border-gold bg-gold text-ink' : 'border-[#2C5288]')}>
                  {l.name}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
