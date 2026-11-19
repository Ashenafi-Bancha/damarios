'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useBlock, useSite } from './SiteContext';
import { Headline } from './Sections';
import Reveal from './Reveal';
import Photo from './Photo';
import { FacebookIcon, InstagramIcon, TelegramIcon, TikTokIcon, WhatsAppIcon, YouTubeIcon } from './Icons';
import { api } from '@/lib/api';
import { isEmail, isPhone, isTelegram, whatsappUrl } from '@/lib/forms';

export const tgUrl = (handle?: string) => `https://t.me/${(handle || '').replace(/^@|\[|\]/g, '')}`;
export const telUrl = (phone?: string) => `tel:${(phone || '').replace(/[^\d+]/g, '')}`;

export function Contact() {
  const { site, tx } = useSite();
  const block = useBlock('contact');
  const c = site.contact!;
  const wa = whatsappUrl(c.whatsapp);
  const rows: [string, React.ReactNode][] = [
    [tx('ADDRESS', 'አድራሻ'), c.address],
    [tx('HOURS', 'የሥራ ሰዓት'), c.hours],
    [tx('PRODUCTION & SALES', 'ምርት እና ሽያጭ'), <a key="p" href={telUrl(c.phone)} className="hover:text-teal">{c.phone}</a>],
    [tx('TRAINING CENTER', 'ማሠልጠኛ ማዕከል'), <a key="tp" href={telUrl(c.trainingPhone || c.phone)} className="hover:text-teal">{c.trainingPhone || c.phone}</a>],
    [tx('EMAIL', 'ኢሜይል'), <a key="e" href={`mailto:${c.email}`} className="hover:text-teal">{c.email}</a>],
    [tx('TELEGRAM', 'ቴሌግራም'), <a key="t" href={tgUrl(c.telegram)} className="hover:text-teal">{c.telegram}</a>],
    ...(wa ? [[tx('WHATSAPP', 'ዋትስአፕ'), <a key="w" href={wa} target="_blank" rel="noopener noreferrer" className="hover:text-teal">{c.whatsapp}</a>] as [string, React.ReactNode]] : []),
  ];
  const social = [
    { name: 'Telegram', href: tgUrl(c.telegram), Icon: TelegramIcon },
    ...(wa ? [{ name: 'WhatsApp', href: wa, Icon: WhatsAppIcon }] : []),
    { name: 'Facebook', href: c.facebook || 'https://facebook.com/', Icon: FacebookIcon },
    { name: 'Instagram', href: c.instagram || 'https://instagram.com/', Icon: InstagramIcon },
    { name: 'TikTok', href: c.tiktok || 'https://tiktok.com/', Icon: TikTokIcon },
    { name: 'YouTube', href: c.youtube || 'https://youtube.com/', Icon: YouTubeIcon },
  ];
  return (
    <section id="contact" className="section">
      <div className="wrap flex flex-wrap items-stretch gap-14">
        <Reveal className="flex min-w-0 flex-[1_1_380px] flex-col gap-7">
          <div><p className="eyebrow text-teal">{tx('Contact', 'ያግኙን')}</p><Headline text={block.headline} /></div>
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
          <a href={c.mapUrl || 'https://maps.google.com/?q=Wolaita+Sodo'} target="_blank" rel="noopener noreferrer" className="btn btn-line self-start">{tx('Get directions', 'አቅጣጫ ያግኙ')}</a>
        </Reveal>
        <Reveal delay={0.1} className="flex min-w-0 flex-[1.2_1_460px] flex-col gap-4">
          {/* The DaMarios building, so visitors recognise it when they arrive. The map shows below it once its embed link is set in Settings. */}
          <figure className="relative m-0 overflow-hidden rounded-lg">
            <Photo src="/images/damarios-building.jpg" label={tx('The DaMarios building in Wolaita Sodo, with flower beds along the front', 'በወላይታ ሶዶ የሚገኘው የዳማሪዮስ ሕንፃ፣ ከፊት ለፊቱ የአበባ ቦታዎች ያሉት')}
              sizes="(min-width: 1024px) 55vw, 100vw" position="50% 45%" className="h-[420px] md:h-[540px]" />
            <figcaption className="absolute bottom-4 left-4 right-4 rounded-lg bg-ink/85 p-4 text-white backdrop-blur-sm md:bottom-6 md:left-6 md:right-auto md:max-w-[340px] md:p-5">
              <span className="block text-[11px] font-semibold tracking-[.2em] text-gold">{tx('OUR CENTER · WOLAITA SODO', 'ማዕከላችን · ወላይታ ሶዶ')}</span>
              <span className="mt-1.5 block font-serif text-xl leading-snug md:text-2xl">{tx('Production and Training Center', 'የምርት እና የማሠልጠኛ ማዕከል')}</span>
            </figcaption>
          </figure>
          {c.mapUrl?.startsWith('https://www.google.com/maps/embed') && (
            <iframe title={tx('Map to DaMarios', 'ወደ ዳማሪዮስ የሚወስድ ካርታ')} src={c.mapUrl} className="h-[260px] w-full rounded-lg border-0" loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
          )}
        </Reveal>
      </div>
    </section>
  );
}

export function Footer() {
  const { tx } = useSite();
  const [contact, setContact] = useState('');
  const [joined, setJoined] = useState<'idle' | 'sending' | 'ok' | 'err'>('idle');
  const [joinError, setJoinError] = useState('');

  async function join(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const value = contact.trim();
    if (!isPhone(value) && !isEmail(value) && !isTelegram(value)) {
      setJoined('err');
      setJoinError(tx('Enter a phone number, an email address or a Telegram @username.', 'ስልክ ቁጥር፣ ኢሜይል ወይም የቴሌግራም @ስም ያስገቡ።'));
      return;
    }
    setJoined('sending');
    try {
      await api('/public/subscribe', { method: 'POST', body: { contact: value, website: new FormData(e.currentTarget).get('website') || '' } });
      setJoined('ok');
    } catch (err) {
      setJoined('err');
      setJoinError(err instanceof Error && err.message ? err.message : tx('Could not sign you up. Please try again.', 'መመዝገብ አልተቻለም። እባክዎ እንደገና ይሞክሩ።'));
    }
  }

  const cols: [string, [string, string][]][] = [
    [tx('Production', 'ምርት'), [[tx('Garments', 'አልባሳት'), '#production'], [tx('Spices', 'ቅመማ ቅመም'), '#production'], [tx('Wholesale & export', 'ጅምላ እና ኤክስፖርት'), '#enquiry']]],
    [tx('Training', 'ስልጠና'), [[tx('Fashion design', 'ፋሽን ዲዛይን'), '#training'], [tx('Culinary arts', 'የምግብ ዝግጅት'), '#training'], [tx('Beautification', 'የውበት ሙያ'), '#training'], [tx('Apply', 'ያመልክቱ'), '#apply']]],
    [tx('DaMarios', 'ዳማሪዮስ'), [[tx('About', 'ስለ እኛ'), '#about'], [tx('Gallery', 'የፎቶ ማዕከል'), '#gallery'], [tx('News', 'ዜና'), '#news'], [tx('Contact', 'ያግኙን'), '#contact']]],
  ];

  return (
    <footer className="bg-ink-deep pb-24 text-[#BFCCE0] md:pb-0">
      <div className="wrap pb-7 pt-16 md:pt-[68px]">
        <div className="flex flex-wrap justify-between gap-10 border-b border-[#173A66] pb-12">
          <div className="flex max-w-[420px] flex-[1_1_320px] flex-col gap-3">
            <Image src="/brand/logo-horizontal-white.png" alt="DaMarios Garment and Skill Training Center" width={1400} height={320} className="h-14 w-auto self-start" />
            <span className="font-ethiopic text-[#E6EEF8]">ዳማሪዮስ ጋርመንት እና የክህሎት ማሠልጠኛ ማዕከል</span>
            <span>{tx('Wolaita Sodo, Ethiopia', 'ወላይታ ሶዶ፣ ኢትዮጵያ')}</span>
            <form onSubmit={join} className="relative mt-3 flex flex-col gap-2">
              <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="absolute -left-[9999px] h-px w-px opacity-0" />
              <label htmlFor="nl" className="text-[13px] text-white">{tx('Get news about new intakes and products', 'ስለ አዲስ ምዝገባ እና ምርቶች መረጃ ያግኙ')}</label>
              {joined === 'ok' ? (
                <p role="status" className="font-semibold text-gold">{tx('You’re on the list. Thank you.', 'ተመዝግበዋል። እናመሰግናለን።')}</p>
              ) : (
                <div className="flex gap-2">
                  <input id="nl" value={contact} onChange={(e) => { setContact(e.target.value); if (joined === 'err') setJoined('idle'); }} required maxLength={80} placeholder={tx('Phone, email or Telegram', 'ስልክ፣ ኢሜይል ወይም ቴሌግራም')}
                    className="min-h-[48px] min-w-0 flex-1 rounded-full border border-[#24497A] bg-[#0A2A52] px-4 text-[15px] text-white placeholder:text-[#6B7480] focus:border-gold focus:outline-none" />
                  <button type="submit" disabled={joined === 'sending'} className="btn btn-gold min-h-[48px] px-[22px]"><TelegramIcon className="h-4 w-4" />{tx('Join', 'ይመዝገቡ')}</button>
                </div>
              )}
              {joined === 'err' && <p role="alert" className="text-sm text-[#F4A29A]">{joinError}</p>}
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
          <span>© {new Date().getFullYear()} {tx('DaMarios Garment and Skill Training Center', 'ዳማሪዮስ ጋርመንት እና የክህሎት ማሠልጠኛ ማዕከል')}</span>
          <span className="flex flex-wrap gap-5">
            <a href="#top" className="hover:text-gold">{tx('Back to top ↑', 'ወደ ላይ ↑')}</a>
            <Link href="/admin" className="hover:text-gold">{tx('Staff login', 'የሠራተኞች መግቢያ')}</Link>
          </span>
        </div>
      </div>
    </footer>
  );
}
