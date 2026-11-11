'use client';

import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import clsx from 'clsx';
import { Check, Loader2 } from 'lucide-react';
import { useBlock, useSite } from './SiteContext';
import { Headline } from './Sections';
import Reveal from './Reveal';
import Photo from './Photo';
import { api } from '@/lib/api';
import type { Division, Product } from '@/lib/types';

const PROCESS = [
  ['01', 'Sourcing', 'Fabric and raw spices from trusted suppliers.'],
  ['02', 'Production', 'Cutting, sewing, cleaning and grinding.'],
  ['03', 'Quality check', 'Every batch and garment inspected.'],
  ['04', 'Packaging', 'Labelled retail and bulk packs.'],
  ['05', 'Delivery & export', 'Across Ethiopia and abroad.'],
];

function DivisionCard({ division, products }: { division: Division; products: Product[] }) {
  const block = useBlock(division === 'GARMENT' ? 'garments' : 'spices');
  const { startEnquiry } = useSite();
  const spice = division === 'SPICE';
  const sizes = Array.from(new Set(products.flatMap((p) => p.packSizes.split('·').map((s) => s.trim())).filter(Boolean)));
  return (
    <article className="flex flex-col overflow-hidden rounded-[10px] bg-white">
      <Photo src={spice ? '/images/spices.jpg' : '/images/garments.jpg'} label={spice ? 'Bowls of colourful ground spices' : 'Tailor smiling at his sewing machine'} sizes="(min-width: 1024px) 50vw, 100vw" className="h-[260px] md:h-[320px]" />
      <div className="flex flex-1 flex-col gap-3.5 p-7 md:p-[34px]">
        <span className={clsx('text-xs font-semibold tracking-[.2em]', spice ? 'text-[#8A3B0A]' : 'text-teal')}>{spice ? 'SPICE PRODUCTION' : 'GARMENT PRODUCTION'}</span>
        <h3 className="font-serif text-[32px] font-medium leading-tight md:text-[38px]">{block.headline}</h3>
        <p className="leading-relaxed text-muted">{block.body}</p>
        <ul className="flex flex-wrap gap-2" aria-label="Products">
          {products.map((p) => (
            <li key={p.id} title={p.description} className={clsx('rounded-full border px-3.5 py-1.5 text-[13px]', spice ? 'border-[#E0C9A8] bg-[#FBF4EA]' : 'border-[#C9D5E8]')}>{p.name}</li>
          ))}
        </ul>
        <div className="mt-auto flex flex-wrap gap-x-6 gap-y-1 border-t border-ivory-warm pt-3.5 text-sm">
          {spice && sizes.length > 0 && <span><strong>Packs:</strong> {sizes.join(' · ')}</span>}
          <span><strong>Markets:</strong> {spice ? 'Retail · Wholesale · Export' : 'Ethiopia · International'}</span>
        </div>
        <button type="button" onClick={() => startEnquiry(spice ? 'Spices' : 'Garments')} className="btn btn-line mt-1 self-start">Ask for a quotation</button>
      </div>
    </article>
  );
}

export function Production() {
  const { site } = useSite();
  const block = useBlock('production');
  const garments = site.products.filter((p) => p.division === 'GARMENT');
  const spices = site.products.filter((p) => p.division === 'SPICE');
  return (
    <section id="production" className="section pt-10">
      <div className="wrap">
        <Reveal className="mb-11 flex flex-wrap items-end justify-between gap-5">
          <div><p className="eyebrow text-teal">01 · Production</p><Headline text={block.headline} /><p className="lead mt-4 text-muted">{block.body}</p></div>
          <a href="#enquiry" className="btn btn-ink">Wholesale &amp; export enquiry</a>
        </Reveal>
        <div className="grid gap-6 lg:grid-cols-2">
          <Reveal><DivisionCard division="GARMENT" products={garments} /></Reveal>
          <Reveal delay={0.1}><DivisionCard division="SPICE" products={spices} /></Reveal>
        </div>
        <ol className="mt-11 grid grid-cols-1 border-t border-ink sm:grid-cols-2 lg:grid-cols-5">
          {PROCESS.map(([n, name, text], i) => (
            <Reveal key={n} delay={i * 0.06}>
              <li className="flex flex-col gap-1.5 pr-4 pt-5">
                <span className="text-xs font-semibold tracking-[.2em] text-teal">{n}</span>
                <span className="font-serif text-2xl font-semibold">{name}</span>
                <span className="text-sm leading-normal text-muted">{text}</span>
              </li>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  );
}

export function Enquiry() {
  const { enquiryProduct, setEnquiryProduct, t } = useSite();
  const block = useBlock('enquiry');
  const [state, setState] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [error, setError] = useState('');
  const [currency, setCurrency] = useState<'ETB' | 'USD'>('ETB');

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    const f = new FormData(e.currentTarget);
    const country = String(f.get('country') || '');
    const isExport = country !== '' && !/^ethiopia$/i.test(country.trim());
    setState('sending');
    try {
      await api('/public/requests', {
        method: 'POST',
        body: {
          type: isExport ? 'EXPORT' : 'WHOLESALE',
          name: f.get('name'), company: f.get('company'), country, product: enquiryProduct,
          quantity: f.get('quantity'), currency, phone: f.get('phone'), email: f.get('email'), message: f.get('message') || '',
        },
      });
      setState('sent');
    } catch (err) {
      setState('idle');
      setError(err instanceof Error ? err.message : 'Could not send. Please try again.');
    }
  }

  const input = 'min-h-[50px] w-full rounded-xl border border-[#24497A] bg-[#18212C] px-4 py-3 text-[15px] text-white placeholder:text-[#6B7480] focus:border-gold focus:outline-none';
  const field = 'flex flex-col gap-2 text-[13px] font-medium text-[#E6EEF8]';

  return (
    <section id="enquiry" className="section dark bg-ink text-white">
      <div className="wrap flex flex-wrap items-start gap-16">
        <Reveal className="flex min-w-0 flex-[1_1_360px] flex-col gap-5">
          <p className="eyebrow m-0 text-gold">Wholesale &amp; export</p>
          <Headline text={block.headline} />
          <p className="lead text-muted-mist">{block.body}</p>
          <ul className="flex flex-col gap-3 text-[15px] text-[#E6EEF8]">
            {['Garments and spices in bulk', 'Samples before large orders', 'Quotations in ETB or USD', 'We reply in English or Amharic'].map((x) => (
              <li key={x} className="flex items-center gap-3"><Check className="h-4 w-4 text-gold" />{x}</li>
            ))}
          </ul>
        </Reveal>
        <Reveal delay={0.1} className="min-w-0 flex-[1.3_1_520px] rounded-xl border border-ink-line bg-ink-soft p-6 md:p-9">
          <AnimatePresence mode="wait">
            {state === 'sent' ? (
              <motion.div key="ok" role="status" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center gap-4 py-12 text-center">
                <span className="flex h-16 w-16 items-center justify-center rounded-full bg-gold text-ink"><Check className="h-7 w-7" /></span>
                <h3 className="font-serif text-4xl">Thank you.</h3>
                <p className="max-w-sm text-muted-mist">Our sales team will send your quotation soon.</p>
                <button type="button" onClick={() => setState('idle')} className="btn btn-ghost">Send another enquiry</button>
              </motion.div>
            ) : (
              <motion.form key="f" onSubmit={submit} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="grid gap-4 sm:grid-cols-2">
                <fieldset className={clsx(field, 'sm:col-span-2')}>
                  <legend className="mb-2">Product</legend>
                  <div className="flex flex-wrap gap-2">
                    {(['Garments', 'Spices', 'Both'] as const).map((p) => (
                      <button key={p} type="button" onClick={() => setEnquiryProduct(p)} aria-pressed={enquiryProduct === p}
                        className={clsx('chip', enquiryProduct === p ? 'border-gold bg-gold text-ink' : 'border-[#2C5288] text-white hover:border-gold')}>{p}</button>
                    ))}
                  </div>
                </fieldset>
                <label className={field}>Company / business<input className={input} name="company" placeholder="Company name" /></label>
                <label className={field}>Your name<input className={input} name="name" required minLength={2} autoComplete="name" /></label>
                <label className={field}>Country<input className={input} name="country" placeholder="Ethiopia, Kenya, UAE…" autoComplete="country-name" /></label>
                <label className={field}>Quantity<input className={input} name="quantity" placeholder="e.g. 2,000 pcs or 500 kg" /></label>
                <label className={field}>Phone<input className={input} name="phone" type="tel" autoComplete="tel" placeholder="+251…" /></label>
                <label className={field}>Email<input className={input} name="email" type="email" autoComplete="email" /></label>
                <fieldset className={clsx(field, 'sm:col-span-2')}>
                  <legend className="mb-2">Quotation currency</legend>
                  <div className="flex gap-2">
                    {(['ETB', 'USD'] as const).map((c) => (
                      <button key={c} type="button" onClick={() => setCurrency(c)} aria-pressed={currency === c}
                        className={clsx('chip', currency === c ? 'border-gold bg-gold text-ink' : 'border-[#2C5288] text-white')}>{c}</button>
                    ))}
                  </div>
                </fieldset>
                <label className={clsx(field, 'sm:col-span-2')}>Details<textarea className={input} name="message" rows={3} placeholder="Products, sizes, packaging, delivery date…" /></label>
                {error && <p role="alert" className="rounded-lg bg-[#3A1D1B] px-4 py-3 text-sm text-[#F4A29A] sm:col-span-2">{error}</p>}
                <p className="text-xs text-muted-dark sm:col-span-2">Please give a phone number or an email address so we can reply.</p>
                <button type="submit" disabled={state === 'sending'} className="btn btn-gold sm:col-span-2">
                  {state === 'sending' ? <><Loader2 className="h-4 w-4 animate-spin" />Sending…</> : t.requestQuote}
                </button>
              </motion.form>
            )}
          </AnimatePresence>
        </Reveal>
      </div>
    </section>
  );
}
