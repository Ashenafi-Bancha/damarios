'use client';

import Image from 'next/image';
import { useBlock } from './SiteContext';
import { Headline } from './Sections';
import Reveal from './Reveal';

/** The founder's plan for Ethiopian weaving (ሽመና), from her announcement: the challenge, and three answers to it. */
const CHALLENGES = ['Lack of modern design', 'Outdated technology', 'Weak links to wider markets'];
const PILLARS = [
  { n: '01', title: 'Design innovation', body: 'Keeping traditional weaving intact while blending it with today’s international fashion.' },
  { n: '02', title: 'Local talent', body: 'Growing the skills of local artisans, modernising their workplaces, and making sure they get the respect and pay they deserve.' },
  { n: '03', title: 'Market linkage', body: 'Quality production, sold digitally to customers in Ethiopia and to the diaspora abroad.' },
];

export function Vision() {
  const vision = useBlock('vision');
  if (!vision.visible || !vision.headline) return null;
  return (
    <section id="vision" aria-label="Our vision" className="section dark relative overflow-hidden bg-ink text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_10%_0%,rgba(96,165,250,.22),transparent_55%)]" />
      <div className="wrap relative">
        <div className="flex flex-wrap items-center gap-12 lg:gap-16">
          <Reveal className="flex min-w-0 flex-[1.2_1_460px] flex-col gap-6">
            <p className="eyebrow m-0 text-gold">Our vision · ሽመና</p>
            <Headline text={vision.headline} />
            <blockquote className="border-l-2 border-gold pl-5 font-serif text-[22px] italic leading-snug text-white md:text-[28px]">“{vision.body}”</blockquote>
            <div className="rounded-lg border border-ink-line bg-ink-soft/60 p-5 md:p-6">
              <p className="text-xs font-semibold tracking-[.2em] text-gold">THE CHALLENGE</p>
              <p className="mt-2 leading-relaxed text-muted-mist">Weaving in Ethiopia has great talent and potential, but three things have held it back:</p>
              <ul className="mt-3 flex flex-wrap gap-2">
                {CHALLENGES.map((c) => <li key={c} className="rounded-full border border-ink-line px-3.5 py-1.5 text-sm text-white">{c}</li>)}
              </ul>
            </div>
          </Reveal>
          <Reveal delay={0.1} className="relative min-w-0 flex-[1_1_340px]">
            <div className="relative mx-auto aspect-[506/590] w-full max-w-[440px] overflow-hidden rounded-lg">
              <Image src="/images/shimena-loom.jpg" alt="Handwoven fabric with a pink pattern on a wooden loom" fill sizes="(min-width: 1024px) 440px, 90vw" className="object-cover" />
            </div>
            <p className="mx-auto mt-3 max-w-[440px] text-sm text-muted-dark">On the loom: Ethiopian handweaving, the heart of the DaMarios collection.</p>
          </Reveal>
        </div>

        <Reveal className="mt-14">
          <p className="text-xs font-semibold tracking-[.2em] text-gold">OUR SOLUTION</p>
          <ol className="mt-5 grid gap-5 md:grid-cols-3">
            {PILLARS.map((p) => (
              <li key={p.n} className="rounded-lg border border-ink-line bg-white/[.03] p-6 md:p-7">
                <span className="font-serif text-4xl text-gold">{p.n}</span>
                <h3 className="mt-3 font-serif text-[28px] leading-tight">{p.title}</h3>
                <p className="mt-2 leading-relaxed text-muted-mist">{p.body}</p>
              </li>
            ))}
          </ol>
        </Reveal>
      </div>
    </section>
  );
}
