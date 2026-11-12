'use client';

import { useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, X } from 'lucide-react';
import { useSite } from './SiteContext';
import { Headline } from './Sections';
import Reveal from './Reveal';

/** Designs from the DaMarios collection (owner's photos in /public/images/collection). */
const DESIGNS = [
  { src: '/images/collection/wolaita-dinguza.jpg', title: 'Wolaita dinguza gown', note: 'Structured gown with cascading ruffles', w: 540, h: 960 },
  { src: '/images/collection/wolaita-dinguza-2.jpg', title: 'Dinguza design sketches', note: 'Three looks drawn in Wolaita dinguza', w: 526, h: 700 },
  { src: '/images/collection/collection-2.jpg', title: 'Dinguza maxi dress', note: 'Full-length dress in Wolaita dinguza pattern', w: 526, h: 789 },
  { src: '/images/collection/collection-3.jpg', title: 'Dinguza coat dress', note: 'Long-sleeve coat dress with belt', w: 526, h: 789 },
  { src: '/images/collection/collection-4.jpg', title: 'Dinguza blazer dress', note: 'Tailored blazer dress with belt', w: 678, h: 960 },
  { src: '/images/collection/collection-5.jpg', title: 'Blazer dress, styled', note: 'The dinguza blazer dress, worn', w: 799, h: 1063 },
  { src: '/images/collection/collection-1.jpg', title: 'From the sketchbook', note: 'Design sketches for the collection', w: 526, h: 701 },
  { src: '/images/collection/collection-6.jpg', title: 'White embroidered maxi dress', note: 'Light, flowing everyday elegance', w: 590, h: 590 },
];

export function Collection() {
  const { startEnquiry } = useSite();
  const [open, setOpen] = useState<number | null>(null);

  const step = useCallback((dir: 1 | -1) => setOpen((i) => (i === null ? i : (i + dir + DESIGNS.length) % DESIGNS.length)), []);

  useEffect(() => {
    if (open === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(null);
      if (e.key === 'ArrowRight') step(1);
      if (e.key === 'ArrowLeft') step(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, step]);

  const current = open === null ? null : DESIGNS[open];

  return (
    <section id="collection" aria-label="Our collection" className="section bg-ivory-warm">
      <div className="wrap">
        <Reveal className="mb-10 flex flex-wrap items-end justify-between gap-5">
          <div>
            <p className="eyebrow text-teal">Designed &amp; made at DaMarios</p>
            <Headline text="Our *collection*." />
            <p className="lead mt-4 text-muted">Garments designed in-house, from the first sketch to the finished piece: Wolaita dinguza and Ethiopian cultural patterns in modern cuts.</p>
          </div>
          <button type="button" onClick={() => startEnquiry('Garments')} className="btn btn-ink">Order from the collection</button>
        </Reveal>

        <ul className="grid grid-cols-2 gap-3.5 md:grid-cols-4 md:gap-5">
          {DESIGNS.map((d, i) => (
            <li key={d.src}>
              <Reveal delay={(i % 4) * 0.06}>
                <button type="button" onClick={() => setOpen(i)} aria-label={`View larger: ${d.title}`}
                  className="group block w-full overflow-hidden rounded-lg bg-white text-left shadow-[0_10px_30px_rgba(6,43,87,.06)]">
                  <span className="relative block aspect-[3/4] overflow-hidden">
                    <Image src={d.src} alt={d.title} fill sizes="(min-width: 768px) 25vw, 50vw" className="object-cover transition-transform duration-700 group-hover:scale-[1.04]" />
                  </span>
                  <span className="block p-3.5 md:p-5">
                    <span className="block font-serif text-lg leading-tight md:text-2xl">{d.title}</span>
                    <span className="mt-1 block text-xs text-muted md:text-sm">{d.note}</span>
                  </span>
                </button>
              </Reveal>
            </li>
          ))}
        </ul>
      </div>

      <AnimatePresence>
        {current && (
          <motion.div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/90 p-4 backdrop-blur" role="dialog" aria-modal="true" aria-label={current.title}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setOpen(null)}>
            <motion.figure key={current.src} initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ opacity: 0 }}
              className="relative flex max-h-full flex-col items-center" onClick={(e) => e.stopPropagation()}>
              <Image src={current.src} alt={current.title} width={current.w} height={current.h} sizes="(min-width: 768px) 60vw, 100vw"
                className="max-h-[78vh] w-auto rounded-lg object-contain" />
              <figcaption className="mt-3 text-center text-white">
                <span className="block font-serif text-2xl">{current.title}</span>
                <span className="text-sm text-muted-mist">{current.note}</span>
              </figcaption>
            </motion.figure>
            <button type="button" onClick={(e) => { e.stopPropagation(); setOpen(null); }} aria-label="Close" className="absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-full bg-white text-ink"><X className="h-5 w-5" /></button>
            <button type="button" onClick={(e) => { e.stopPropagation(); step(-1); }} aria-label="Previous design" className="absolute left-3 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-ink"><ArrowLeft className="h-5 w-5" /></button>
            <button type="button" onClick={(e) => { e.stopPropagation(); step(1); }} aria-label="Next design" className="absolute right-3 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-ink"><ArrowRight className="h-5 w-5" /></button>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
