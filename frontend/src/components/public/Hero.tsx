'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import { useReducedMotion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { useBlock, useSite } from './SiteContext';

const Hero3D = dynamic(() => import('./Hero3D'), { ssr: false });

/** Splits the headline into words that rise in one after another (pure CSS, so it works before JavaScript loads). Words in *stars* show in gold italics. */
function RiseText({ text }: { text: string }) {
  const words = text.split(' ');
  return (
    <>
      {words.map((w, i) => {
        const gold = w.includes('*');
        return (
          <span key={i} className="inline-block overflow-hidden pb-2 align-top">
            <span className={'inline-block animate-rise ' + (gold ? 'italic text-gold' : '')} style={{ animationDelay: `${0.15 + i * 0.07}s` }}>
              {w.replace(/\*/g, '')}&nbsp;
            </span>
          </span>
        );
      })}
    </>
  );
}

const fade = (delay: number) => ({ className: 'animate-fadeup', style: { animationDelay: `${delay}s` } });

export default function Hero() {
  const { t } = useSite();
  const hero = useBlock('hero');
  const reduce = useReducedMotion();
  // The 3D scene loads only on larger screens without data saver, to keep phones fast on mobile data.
  const [use3D, setUse3D] = useState(false);
  useEffect(() => {
    const conn = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
    setUse3D(window.innerWidth >= 768 && !conn?.saveData);
  }, []);

  return (
    <section aria-label="Welcome" className="dark relative overflow-hidden bg-ink text-white">
      <div className="pointer-events-none absolute inset-y-0 right-0 w-full bg-[radial-gradient(ellipse_at_85%_30%,rgba(96,165,250,.35),transparent_55%)] opacity-90 lg:w-[55%]">
        {!reduce && use3D && <Hero3D />}
      </div>
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-ink via-ink/85 to-ink/20" />

      <div className="wrap relative pb-20 pt-16 md:pb-24 md:pt-20">
        <div className="mb-12 flex flex-wrap items-end gap-x-16 gap-y-8 md:mb-14">
          <div className="flex min-w-0 flex-[1.3_1_520px] flex-col gap-6">
            <p className={'eyebrow m-0 text-gold ' + fade(0.05).className} style={fade(0.05).style}>Wolaita Sodo, Ethiopia</p>
            <h1 className="m-0 font-serif text-[50px] font-medium leading-[.97] tracking-tight sm:text-[70px] lg:text-[88px]">
              <RiseText text={hero.headline} />
            </h1>
          </div>
          <div className={'flex min-w-0 flex-[1_1_380px] flex-col gap-6 ' + fade(0.55).className} style={fade(0.55).style}>
            <a href="#vision" className="group flex max-w-[460px] items-center gap-4 rounded-[10px] border border-white/15 bg-white/[.06] p-2.5 pr-5 backdrop-blur-sm transition-colors hover:border-gold/60">
              <span className="relative block h-[96px] w-[82px] flex-none overflow-hidden rounded-md">
                <Image src="/images/shimena-loom.jpg" alt="Handwoven fabric on a loom" fill sizes="82px" priority className="object-cover transition-transform duration-700 group-hover:scale-110" />
              </span>
              <span className="flex min-w-0 flex-col gap-1">
                <span className="w-fit rounded-full bg-gold px-2.5 py-0.5 text-[11px] font-bold tracking-wider text-ink">COMING SOON</span>
                <span className="font-serif text-xl leading-tight text-white">Ethiopian weaving, made modern</span>
                <span className="inline-flex items-center gap-1.5 text-sm text-muted-mist">Our vision for ሽመና <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" /></span>
              </span>
            </a>
            <p className="lead text-muted-mist">{hero.body}</p>
            <div className="flex flex-wrap gap-3">
              <a href="#production" className="btn btn-gold">{t.ourProduction}</a>
              <a href="#training" className="btn btn-ghost">{t.training}</a>
            </div>
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <a href="#production" className={'group relative flex min-h-[300px] flex-col justify-end overflow-hidden rounded-[10px] p-7 text-white transition-transform duration-300 hover:-translate-y-1 md:min-h-[340px] md:p-8 ' + fade(0.75).className} style={fade(0.75).style}>
            <Image src="/images/hero-production.jpg" alt="" fill sizes="(min-width: 768px) 50vw, 100vw" className="object-cover transition-transform duration-700 group-hover:scale-105" />
            <span className="absolute inset-0 bg-gradient-to-t from-ink via-ink/60 to-ink/10" />
            <span className="relative text-xs font-semibold tracking-widest2 text-gold">01 · {t.production.toUpperCase()}</span>
            <span className="relative mb-3 mt-2.5 font-serif text-[40px] leading-none md:text-[46px]">Garments &amp; spices</span>
            <span className="relative max-w-[440px] leading-relaxed text-muted-mist">Made in Wolaita Sodo for local and international markets.</span>
            <span className="relative mt-5 inline-flex items-center gap-2.5 font-semibold">{t.ourProduction} <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></span>
          </a>
          <a href="#training" className={'group relative flex min-h-[300px] flex-col justify-end overflow-hidden rounded-[10px] p-7 text-white transition-transform duration-300 hover:-translate-y-1 md:min-h-[340px] md:p-8 ' + fade(0.85).className} style={fade(0.85).style}>
            <Image src="/images/hero-training.jpg" alt="" fill sizes="(min-width: 768px) 50vw, 100vw" className="object-cover transition-transform duration-700 group-hover:scale-105" />
            <span className="absolute inset-0 bg-gradient-to-t from-[#003F87] via-teal/70 to-teal/20" />
            <span className="relative text-xs font-semibold tracking-widest2 text-gold">02 · {t.training.toUpperCase()}</span>
            <span className="relative mb-3 mt-2.5 font-serif text-[40px] leading-none md:text-[46px]">Learn a skill for life</span>
            <span className="relative max-w-[440px] leading-relaxed text-[#D6E4F5]">Fashion design · Culinary arts · Beautification (makeup &amp; hairdressing)</span>
            <span className="relative mt-5 inline-flex items-center gap-2.5 font-semibold">{t.seeCourses} <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></span>
          </a>
        </div>
      </div>
    </section>
  );
}
