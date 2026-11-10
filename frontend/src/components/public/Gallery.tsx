'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import clsx from 'clsx';
import { X } from 'lucide-react';
import { useBlock, useSite } from './SiteContext';
import { Headline } from './Sections';
import Reveal from './Reveal';
import Photo from './Photo';
import { gcDate } from '@/lib/format';
import type { GalleryCategory, GalleryItem } from '@/lib/types';

const FILTERS: { id: GalleryCategory | 'ALL'; name: string }[] = [
  { id: 'ALL', name: 'All' }, { id: 'GARMENTS', name: 'Garments' }, { id: 'SPICES', name: 'Spices' },
  { id: 'TRAINING', name: 'Training' }, { id: 'EVENTS', name: 'Events' },
];

export function Gallery() {
  const { site } = useSite();
  const block = useBlock('gallery');
  const [filter, setFilter] = useState<GalleryCategory | 'ALL'>('ALL');
  const [open, setOpen] = useState<GalleryItem | null>(null);
  const items = site.gallery.filter((g) => filter === 'ALL' || g.category === filter);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(null);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <section id="gallery" className="section">
      <div className="wrap">
        <Reveal className="mb-9 flex flex-wrap items-end justify-between gap-6">
          <div><p className="eyebrow text-teal">Gallery</p><Headline text={block.headline} /></div>
          <div role="group" aria-label="Filter gallery" className="flex flex-wrap gap-2">
            {FILTERS.map((f) => (
              <button key={f.id} type="button" onClick={() => setFilter(f.id)} aria-pressed={filter === f.id}
                className={clsx('chip', filter === f.id ? 'border-ink bg-ink text-white' : 'border-[#C9D5E8] hover:border-ink')}>
                {f.name}
              </button>
            ))}
          </div>
        </Reveal>
        <motion.div layout className="grid auto-rows-[180px] grid-cols-2 gap-3.5 [grid-auto-flow:dense] md:auto-rows-[220px] lg:grid-cols-4">
          <AnimatePresence mode="popLayout">
            {items.map((g) => (
              <motion.button key={g.id} type="button" layout onClick={() => setOpen(g)} aria-label={`Open ${g.title}`}
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }}
                className={clsx('group overflow-hidden rounded-md text-left', g.tall && 'row-span-2')}>
                <Photo src={g.imageUrl} label={g.title} className="h-full w-full transition-transform duration-700 group-hover:scale-[1.04]" />
              </motion.button>
            ))}
          </AnimatePresence>
        </motion.div>
        {items.length === 0 && <p className="py-10 text-center text-muted">New photos in this category are coming soon.</p>}
      </div>

      <AnimatePresence>
        {open && (
          <motion.div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/90 p-4 backdrop-blur" role="dialog" aria-modal="true" aria-label={open.title}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setOpen(null)}>
            <motion.div initial={{ scale: 0.92, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.92 }} className="relative w-full max-w-3xl" onClick={(e) => e.stopPropagation()}>
              <Photo src={open.imageUrl} label={open.title} className="h-[70vh] rounded-lg" />
              <p className="mt-3 font-serif text-2xl text-white">{open.title}</p>
              <button type="button" onClick={() => setOpen(null)} aria-label="Close" className="absolute -top-3 right-0 flex h-11 w-11 -translate-y-full items-center justify-center rounded-full bg-white text-ink">
                <X className="h-5 w-5" />
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

const QUOTES = [
  ['[A graduate of fashion design on what the training changed for her.]', 'Fashion design'],
  ['[A culinary graduate now working in a hotel or running a business.]', 'Culinary arts'],
  ['[A beautification graduate who opened her own salon.]', 'Beautification'],
];

export function News() {
  const { site } = useSite();
  const block = useBlock('news');
  return (
    <section id="news" className="section dark bg-teal-night text-white">
      <div className="wrap">
        <Reveal className="mb-10"><p className="eyebrow text-gold">News &amp; graduates</p><Headline text={block.headline} /></Reveal>
        <div className="mb-10 flex snap-x gap-5 overflow-x-auto pb-2 md:grid md:grid-cols-3 md:overflow-visible">
          {site.news.slice(0, 3).map((n, i) => (
            <Reveal key={n.id} delay={i * 0.07} className="w-[260px] flex-none snap-start md:w-auto">
              <article className="flex flex-col gap-3">
                <Photo dark src={n.imageUrl} label={n.title} className="h-[200px] rounded-md md:h-[220px]" />
                <span className="text-[11px] font-semibold tracking-[.2em] text-gold">{n.kind.toUpperCase()}</span>
                <h3 className="font-serif text-[26px] font-medium leading-tight md:text-[28px]">{n.title}</h3>
                <span className="text-sm text-[#A9BBD6]">{gcDate(n.date, { day: 'numeric', month: 'long', year: 'numeric' })}</span>
              </article>
            </Reveal>
          ))}
        </div>
        <div className="grid gap-5 md:grid-cols-3">
          {QUOTES.map(([q, d], i) => (
            <Reveal key={d} delay={i * 0.07}>
              <blockquote className="h-full rounded-lg border border-[#1C4675] p-7">
                <p className="font-serif text-2xl italic leading-snug">“{q}”</p>
                <footer className="mt-3.5 text-[13px] text-[#A9BBD6]">[Graduate name] · {d}</footer>
              </blockquote>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
