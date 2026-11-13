'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useBlock, useSite } from './SiteContext';
import { Headline } from './Sections';
import Reveal from './Reveal';
import Photo from './Photo';
import { FacebookIcon, InstagramIcon, TelegramIcon, TikTokIcon, YouTubeIcon } from './Icons';
import { api } from '@/lib/api';

export const tgUrl = (handle?: string) => `https://t.me/${(handle || '').replace(/^@|\[|\]/g, '')}`;
export const telUrl = (phone?: string) => `tel:${(phone || '').replace(/[^\d+]/g, '')}`;

export function Contact() {
  const { site } = useSite();
  const block = useBlock('contact');
  const c = site.contact!;
  const rows: [string, React.ReactNode][] = [
    ['ADDRESS', c.address],
    ['HOURS', c.hours],
    ['PRODUCTION & SALES', <a key="p" href={telUrl(c.phone)} className="hover:text-teal">{c.phone}</a>],
    ['TRAINING CENTER', <a key="tp" href={telUrl(c.trainingPhone || c.phone)} className="hover:text-teal">{c.trainingPhone || c.phone}</a>],
    ['EMAIL', <a key="e" href={`mailto:${c.email}`} className="hover:text-teal">{c.email}</a>],
    ['TELEGRAM', <a key="t" href={tgUrl(c.telegram)} className="hover:text-teal">{c.telegram}</a>],
  ];
  const social = [
    { name: 'Telegram', href: tgUrl(c.telegram), Icon: TelegramIcon },
    { name: 'Facebook', href: c.facebook || 'https://facebook.com/', Icon: FacebookIcon },
    { name: 'Instagram', href: c.instagram || 'https://instagram.com/', Icon: InstagramIcon },
    { name: 'TikTok', href: c.tiktok || 'https://tiktok.com/', Icon: TikTokIcon },
    { name: 'YouTube', href: c.youtube || 'https://youtube.com/', Icon: YouTubeIcon },
  ];
  return (
    <section id="contact" className="section">
      <div className="wrap flex flex-wrap items-stretch gap-14">
        <Reveal className="flex min-w-0 flex-[1_1_380px] flex-col gap-7">
          <div><p className="eyebrow text-teal">Contact</p><Headline text={block.headline} /></div>
          <dl className="grid grid-cols-2 gap-x-5 gap-y-6 text-[15px]">
            {rows.map(([k, v]) => (
              <div key={k}><dt className="text-[11px] font-semibold tracking-[.2em] text-[#6B7480]">{k}</dt><dd className="mt-2 leading-relaxed">{v}</dd></div>
            ))}
          </dl>
          <div className="flex flex-wrap gap-2.5">
            {social.map(({ name, href, Icon }) => (
              <a key={name} href={href} target="_blank" rel="noopener noreferrer" aria-label={name}
                className="flex h-12 w-12 items-center justify-center rounded-full bg-ink text-white transition-all duration-300 hover:-translate-y-1 hover:bg-gold hover:text-ink">
                <Icon className="h-5 w-5" />
              </a>
            ))}
          </div>
          <a href={c.mapUrl || 'https://maps.google.com/?q=Wolaita+Sodo'} target="_blank" rel="noopener noreferrer" className="btn btn-line self-start">Get directions</a>
        </Reveal>
        <Reveal delay={0.1} className="flex min-w-0 flex-[1.2_1_460px] flex-col gap-4">
          {/* The DaMarios building, so visitors recognise it when they arrive. The map shows below it once its embed link is set in Settings. */}
          <figure className="relative m-0 overflow-hidden rounded-lg">
            <Photo src="/images/damarios-building.jpg" label="The DaMarios building in Wolaita Sodo, with flower beds along the front"
              sizes="(min-width: 1024px) 55vw, 100vw" position="50% 45%" className="h-[420px] md:h-[540px]" />
            <figcaption className="absolute bottom-4 left-4 right-4 rounded-lg bg-ink/85 p-4 text-white backdrop-blur-sm md:bottom-6 md:left-6 md:right-auto md:max-w-[340px] md:p-5">
              <span className="block text-[11px] font-semibold tracking-[.2em] text-gold">OUR CENTER · WOLAITA SODO</span>
              <span className="mt-1.5 block font-serif text-xl leading-snug md:text-2xl">Production and training, under one roof.</span>
            </figcaption>
          </figure>
          {c.mapUrl?.startsWith('https://www.google.com/maps/embed') && (
            <iframe title="Map to DaMarios" src={c.mapUrl} className="h-[260px] w-full rounded-lg border-0" loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
          )}
        </Reveal>
      </div>
    </section>
  );
}

export function Footer() {
  const [contact, setContact] = useState('');
  const [joined, setJoined] = useState<'idle' | 'ok' | 'err'>('idle');

  async function join(e: React.FormEvent) {
    e.preventDefault();
    try {
      await api('/public/subscribe', { method: 'POST', body: { contact } });
      setJoined('ok');
    } catch {
      setJoined('err');
    }
  }

  const cols: [string, [string, string][]][] = [
    ['Production', [['Garments', '#production'], ['Spices', '#production'], ['Wholesale & export', '#enquiry']]],
    ['Training', [['Fashion design', '#training'], ['Culinary arts', '#training'], ['Beautification', '#training'], ['Apply', '#apply']]],
    ['DaMarios', [['About', '#about'], ['Gallery', '#gallery'], ['News', '#news'], ['Contact', '#contact']]],
  ];

  return (
    <footer className="bg-ink-deep pb-24 text-[#BFCCE0] md:pb-0">
      <div className="wrap pb-7 pt-16 md:pt-[68px]">
        <div className="flex flex-wrap justify-between gap-10 border-b border-[#173A66] pb-12">
          <div className="flex max-w-[420px] flex-[1_1_320px] flex-col gap-3">
            <Image src="/brand/logo-horizontal-white.png" alt="DaMarios Garment and Skill Training Center" width={1400} height={320} className="h-14 w-auto self-start" />
            <span className="font-ethiopic text-[#E6EEF8]">ዳማሪዮስ ጋርመንት እና የሙያ ስልጠና ማዕከል</span>
            <span>Wolaita Sodo, Ethiopia</span>
            <form onSubmit={join} className="mt-3 flex flex-col gap-2">
              <label htmlFor="nl" className="text-[13px] text-white">Get news about new intakes and products</label>
              {joined === 'ok' ? (
                <p role="status" className="font-semibold text-gold">You’re on the list. Thank you.</p>
              ) : (
                <div className="flex gap-2">
                  <input id="nl" value={contact} onChange={(e) => setContact(e.target.value)} required minLength={4} placeholder="Phone or Telegram"
                    className="min-h-[48px] min-w-0 flex-1 rounded-full border border-[#24497A] bg-[#0A2A52] px-4 text-[15px] text-white placeholder:text-[#6B7480] focus:border-gold focus:outline-none" />
                  <button type="submit" className="btn btn-gold min-h-[48px] px-[22px]"><TelegramIcon className="h-4 w-4" />Join</button>
                </div>
              )}
              {joined === 'err' && <p role="alert" className="text-sm text-[#F4A29A]">Could not sign you up. Please try again.</p>}
            </form>
          </div>
          <div className="grid grid-cols-2 gap-8 text-[15px] sm:grid-cols-3">
            {cols.map(([h, links]) => (
              <div key={h} className="flex flex-col gap-3">
                <span className="font-semibold text-white">{h}</span>
                {links.map(([n, href]) => <a key={n} href={href} className="py-0.5 hover:text-gold">{n}</a>)}
              </div>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap justify-between gap-3 pt-6 text-[13px]">
          <span>© {new Date().getFullYear()} DaMarios Garment and Skill Training Center</span>
          <span className="flex flex-wrap gap-5">
            <a href="#top" className="hover:text-gold">Back to top ↑</a>
            <Link href="/admin" className="hover:text-gold">Staff login</Link>
          </span>
        </div>
      </div>
    </footer>
  );
}
