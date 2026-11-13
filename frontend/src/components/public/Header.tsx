'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Image from 'next/image';
import clsx from 'clsx';
import { Menu, X } from 'lucide-react';
import { useSite } from './SiteContext';

export default function Header() {
  const { t } = useSite();
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
    { href: '#top', name: t.home },
    { href: '#about', name: t.about },
    { href: '#production', name: t.production },
    { href: '#training', name: t.training },
    { href: '#gallery', name: t.gallery },
    { href: '#news', name: t.news },
    { href: '#contact', name: t.contact },
  ];
  // Phone menu: the same links, plus the two actions placed after their sections.
  const menuLinks = [...links.slice(0, 3), { href: '#enquiry', name: t.enquire }, links[3], { href: '#apply', name: t.apply }, ...links.slice(4)];

  return (
    <>
      <header className={clsx('sticky top-0 z-40 border-b transition-all duration-300', scrolled ? 'border-ivory-line bg-ivory/85 backdrop-blur-md' : 'border-ivory-line bg-ivory')}>
        <div className={clsx('wrap flex items-center justify-between gap-5 transition-all duration-300', scrolled ? 'min-h-[68px]' : 'min-h-[86px]')}>
          <a href="#top" aria-label="DaMarios home" className="flex items-center gap-3.5 text-ink">
            {/* The compact logo (mark + DAMARIOS) on every screen size: the full name is shown in the hero just below. */}
            <Image src="/brand/logo-compact.png" alt="DaMarios Garment and Skill Training Center" width={1200} height={301} priority
              className={clsx('w-auto transition-all duration-300', scrolled ? 'h-8 sm:h-9' : 'h-9 sm:h-11')} />
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
            <a href="#enquiry" className="btn btn-line hidden min-h-[46px] px-6 lg:inline-flex">{t.enquire}</a>
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
            <nav aria-label="Menu" className="wrap flex flex-1 flex-col justify-center gap-1 overflow-y-auto pb-8">
              {menuLinks.map((l, i) => (
                <motion.a key={l.href} href={l.href} onClick={() => setOpen(false)}
                  initial={{ opacity: 0, x: -24 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 + i * 0.05 }}
                  className="flex items-baseline justify-between border-b border-ink-line py-2.5 font-serif text-[28px] leading-tight hover:text-gold sm:text-5xl">
                  <span>{l.name}</span><span className="font-sans text-xs text-muted-dark">{String(i + 1).padStart(2, '0')}</span>
                </motion.a>
              ))}
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
