'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import clsx from 'clsx';
import { api } from '@/lib/api';
import { gcDate, label } from '@/lib/format';
import { ErrorNote, Loading, PageHeader, Pill, Tabs, useAction, useApi } from '@/components/admin/ui';
import ResourceManager from '@/components/admin/ResourceManager';

const SECTIONS: { id: string; name: string }[] = [
  { id: 'hero', name: 'Home (hero)' }, { id: 'about', name: 'About DaMarios' },
  { id: 'production', name: 'Production (intro)' }, { id: 'garments', name: 'Garment production' }, { id: 'spices', name: 'Spice production' },
  { id: 'enquiry', name: 'Wholesale & export' },
  { id: 'training', name: 'Training center (intro)' }, { id: 'dept-fashion', name: 'Fashion design' }, { id: 'dept-culinary', name: 'Culinary arts' },
  { id: 'dept-beauty', name: 'Beautification' }, { id: 'admissions', name: 'Admissions' },
  { id: 'gallery', name: 'Gallery' }, { id: 'news', name: 'News & graduates' }, { id: 'contact', name: 'Contact' },
];
const LANGS = [{ id: 'en', name: 'English' }, { id: 'am', name: 'አማርኛ' }, { id: 'wal', name: 'Wolayttatto' }];

interface Block { section: string; lang: string; headline: string; body: string; visible: boolean }
type R = { id: string; [k: string]: unknown };
type Tab = 'text' | 'gallery' | 'news';

const thumb = (src: unknown) => src
  // eslint-disable-next-line @next/next/no-img-element
  ? <img src={String(src)} alt="" className="h-10 w-10 rounded-lg object-cover" />
  : <span className="ph block h-10 w-10 rounded-lg" />;
const shown = (v: unknown) => <Pill tone={v ? 'green' : 'gray'}>{v ? 'Shown' : 'Hidden'}</Pill>;

export default function WebsitePage() {
  const [tab, setTab] = useState<Tab>('text');
  return (
    <>
      <PageHeader title="Website content" sub="Text, photos and news on the public website. Changes appear on the site within a minute.">
        <Link href="/" target="_blank" className="a-btn a-btn-line">Preview site</Link>
      </PageHeader>
      <Tabs<Tab> value={tab} onChange={setTab} tabs={[{ id: 'text', name: 'Page text' }, { id: 'gallery', name: 'Gallery' }, { id: 'news', name: 'News' }]} />
      {tab === 'text' && <TextEditor />}
      {tab === 'gallery' && (
        <ResourceManager<R> endpoint="/admin/fashion/gallery" noun="photo" search={false}
          columns={[
            { label: 'Photo', render: (g) => thumb(g.imageUrl) },
            { label: 'Title', render: (g) => <span className="font-semibold">{String(g.title)}</span> },
            { label: 'Category', render: (g) => label(String(g.category)) },
            { label: 'Size', render: (g) => (g.tall ? 'Tall' : 'Normal') },
            { label: 'Website', render: (g) => shown(g.published) },
          ]}
          fields={[
            { name: 'title', label: 'Title', required: true },
            { name: 'category', label: 'Category', type: 'select', required: true, options: ['GARMENTS', 'SPICES', 'TRAINING', 'EVENTS'].map((c) => ({ value: c, label: label(c) })) },
            { name: 'imageUrl', label: 'Photo', type: 'image' }, { name: 'tall', label: 'Tall photo (portrait)', type: 'checkbox' }, { name: 'published', label: 'Show on website', type: 'checkbox' },
          ]}
          defaults={{ category: 'GARMENTS', published: true }}
        />
      )}
      {tab === 'news' && (
        <ResourceManager<R> endpoint="/admin/news" noun="news post"
          columns={[
            { label: 'Photo', render: (n) => thumb(n.imageUrl) },
            { label: 'Title', render: (n) => <span className="font-semibold">{String(n.title)}</span> },
            { label: 'Type', render: (n) => String(n.kind) },
            { label: 'Date', render: (n) => gcDate(String(n.date)) },
            { label: 'Website', render: (n) => shown(n.published) },
          ]}
          fields={[
            { name: 'title', label: 'Title', required: true, full: true },
            { name: 'kind', label: 'Type', type: 'select', required: true, options: ['News', 'Graduation', 'New intake', 'Production', 'Event'].map((k) => ({ value: k, label: k })) },
            { name: 'date', label: 'Date', type: 'date', required: true },
            { name: 'body', label: 'Text', type: 'textarea' }, { name: 'imageUrl', label: 'Photo', type: 'image' }, { name: 'published', label: 'Show on website', type: 'checkbox' },
          ]}
          defaults={{ kind: 'News', published: true, date: new Date().toISOString() }}
        />
      )}
    </>
  );
}

function TextEditor() {
  const [lang, setLang] = useState('en');
  const [section, setSection] = useState('hero');
  const { data, error, loading, reload } = useApi<Block[]>(`/admin/content?lang=${lang}`);
  const english = useApi<Block[]>('/admin/content?lang=en');
  const current = data?.find((b) => b.section === section);
  const fallback = english.data?.find((b) => b.section === section);
  const [form, setForm] = useState({ headline: '', body: '', visible: true });
  const [saved, setSaved] = useState(false);
  const act = useAction();

  useEffect(() => {
    setSaved(false);
    setForm({ headline: current?.headline ?? '', body: current?.body ?? '', visible: current?.visible ?? true });
  }, [current, section, lang]);

  async function publish(e: React.FormEvent) {
    e.preventDefault();
    if (await act.run(() => api(`/admin/content/${section}/${lang}`, { method: 'PUT', body: form }))) {
      setSaved(true);
      reload();
      if (lang === 'en') english.reload();
    }
  }

  return (
    <>
      <ErrorNote error={error} />
      <div className="flex flex-wrap items-start gap-4">
        <nav aria-label="Website sections" className="card flex flex-[1_1_240px] flex-col gap-1 p-2.5">
          {SECTIONS.map((s) => {
            const b = data?.find((x) => x.section === s.id);
            return (
              <button key={s.id} type="button" onClick={() => setSection(s.id)} aria-current={section === s.id ? 'true' : undefined}
                className={clsx('flex min-h-[44px] items-center justify-between gap-2 rounded-[10px] px-3 text-left text-sm', section === s.id ? 'bg-[#EAF1FB] font-bold' : 'hover:bg-paper')}>
                <span>{s.name}</span>
                {lang !== 'en' && !b ? <Pill tone="yellow">Not translated</Pill> : b && !b.visible ? <Pill tone="red">Hidden</Pill> : <Pill tone="green">Visible</Pill>}
              </button>
            );
          })}
        </nav>

        <form onSubmit={publish} className="card flex flex-[3_1_520px] flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-2.5">
            <h2 className="font-display text-xl font-bold">{SECTIONS.find((s) => s.id === section)?.name}</h2>
            <div role="tablist" aria-label="Language" className="flex gap-1 rounded-[10px] bg-paper p-1">
              {LANGS.map((l) => (
                <button key={l.id} type="button" role="tab" aria-selected={lang === l.id} onClick={() => setLang(l.id)}
                  className={clsx('min-h-[36px] rounded-lg px-3.5 text-[13px] font-semibold', lang === l.id ? 'bg-white shadow-sm' : 'text-muted')}>{l.name}</button>
              ))}
            </div>
          </div>
          {loading && !data ? <Loading /> : (
            <>
              {lang !== 'en' && fallback && <p className="rounded-[10px] bg-paper p-3 text-[13px] text-muted">English: <strong>{fallback.headline}</strong>{fallback.body ? ` · ${fallback.body}` : ''}</p>}
              <label className="a-label">Headline<input className={clsx('a-input', lang === 'am' && 'font-ethiopic')} required value={form.headline} onChange={(e) => setForm({ ...form, headline: e.target.value })} /></label>
              <p className="-mt-2 text-xs text-muted">Tip: put one word between *stars* to show it in gold italics, e.g. “Heritage, *reimagined*.”</p>
              <label className="a-label">Text<textarea className={clsx('a-input py-2.5', lang === 'am' && 'font-ethiopic')} rows={5} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} /></label>
              <label className="flex items-center gap-2.5 text-sm"><input type="checkbox" checked={form.visible} onChange={(e) => setForm({ ...form, visible: e.target.checked })} className="h-[18px] w-[18px] accent-teal" />Show this section on the website</label>
              <p className="text-[13px] text-muted">Products are managed in <Link href="/admin/production" className="font-semibold text-teal">Garments &amp; spices</Link>, courses in <Link href="/admin/training" className="font-semibold text-teal">Training center</Link>, and photos and news in the tabs above. The opening date and contact details are in <Link href="/admin/settings" className="font-semibold text-teal">Settings</Link>.</p>
              <ErrorNote error={act.error} />
              <div className="flex flex-wrap items-center gap-3">
                <button disabled={act.busy} className="a-btn a-btn-gold">{act.busy ? 'Publishing…' : 'Publish changes'}</button>
                {saved && <span role="status" className="text-sm font-semibold text-[#1E6B34]">Published.</span>}
              </div>
            </>
          )}
        </form>
      </div>
    </>
  );
}
