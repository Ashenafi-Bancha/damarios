'use client';

import { createContext, useContext, useEffect, useRef } from 'react';
import Lenis from 'lenis';

const ScrollCtx = createContext<{ scrollTo: (target: string) => void }>({ scrollTo: () => {} });
export const useSmoothScroll = () => useContext(ScrollCtx);

/** Smooth, inertial scrolling for the public site. In-page links (#about…) glide instead of jumping. */
export default function SmoothScroll({ children }: { children: React.ReactNode }) {
  const lenis = useRef<Lenis | null>(null);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const l = new Lenis({ duration: 1.15, smoothWheel: true });
    lenis.current = l;
    let raf = 0;
    const loop = (t: number) => { l.raf(t); raf = requestAnimationFrame(loop); };
    raf = requestAnimationFrame(loop);

    const onClick = (e: MouseEvent) => {
      const a = (e.target as HTMLElement).closest('a[href^="#"]') as HTMLAnchorElement | null;
      if (!a) return;
      const id = a.getAttribute('href')!;
      if (id.length < 2 || !document.querySelector(id)) return;
      e.preventDefault();
      l.scrollTo(id, { offset: -10 });
      history.replaceState(null, '', id);
    };
    document.addEventListener('click', onClick);
    return () => { cancelAnimationFrame(raf); document.removeEventListener('click', onClick); l.destroy(); };
  }, []);

  const scrollTo = (target: string) => {
    if (lenis.current) lenis.current.scrollTo(target, { offset: -10 });
    else document.querySelector(target)?.scrollIntoView({ behavior: 'smooth' });
  };

  return <ScrollCtx.Provider value={{ scrollTo }}>{children}</ScrollCtx.Provider>;
}
