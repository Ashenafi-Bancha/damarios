'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import { etb, gcDate, label } from '@/lib/format';
import { PageHeader, Pill, Tabs, useApi } from '@/components/admin/ui';
import ResourceManager from '@/components/admin/ResourceManager';

type R = { id: string; [k: string]: unknown };
type Tab = 'models' | 'bookings' | 'events' | 'designs' | 'collections' | 'looks' | 'gallery';

const LOOK_CATS = [{ value: 'READY_TO_WEAR', label: 'Ready-to-wear' }, { value: 'CULTURAL', label: 'Cultural' }, { value: 'BRIDAL', label: 'Bridal & occasion' }, { value: 'MENSWEAR', label: 'Menswear' }];
const PAY_TONE: Record<string, string> = { PAID: 'green', DEPOSIT: 'yellow', UNPAID: 'red' };
const img = (src: unknown) => src
  // eslint-disable-next-line @next/next/no-img-element
  ? <img src={String(src)} alt="" className="h-10 w-10 rounded-lg object-cover" />
  : <span className="ph block h-10 w-10 rounded-lg" />;
const yesNo = (v: unknown, yes = 'Shown', no = 'Hidden') => <Pill tone={v ? 'green' : 'gray'}>{v ? yes : no}</Pill>;

export default function FashionPage() {
  const [tab, setTab] = useState<Tab>('designs');
  const collections = useApi<R[]>(tab === 'looks' ? '/admin/fashion/collections' : null);

  return (
    <>
      <PageHeader title="Designs & events" sub="Garment designs and patterns, plus events such as graduations, open days and market fairs." />
      <Tabs<Tab> value={tab} onChange={setTab} tabs={[
        { id: 'designs', name: 'Design catalog' }, { id: 'events', name: 'Events' },
      ]} />

      {tab === 'models' && (
        <ResourceManager<R> endpoint="/admin/fashion/models" noun="model"
          columns={[
            { label: 'Photo', render: (m) => img(m.imageUrl) },
            { label: 'Name', render: (m) => <span className="font-semibold">{String(m.name)}</span> },
            { label: 'Specialty', render: (m) => String(m.info) },
            { label: 'Height', render: (m) => (m.heightCm ? `${m.heightCm} cm` : '—') },
            { label: 'Status', render: (m) => <Pill tone={m.available ? 'green' : 'yellow'}>{m.available ? 'Available' : 'Booked'}</Pill> },
            { label: 'Website', render: (m) => yesNo(m.published) },
          ]}
          fields={[
            { name: 'name', label: 'Name', required: true }, { name: 'heightCm', label: 'Height (cm)', type: 'number' },
            { name: 'info', label: 'Specialty', placeholder: 'Runway · Editorial', full: true }, { name: 'specialties', label: 'Notes / skills', type: 'textarea' },
            { name: 'imageUrl', label: 'Portrait', type: 'image' }, { name: 'available', label: 'Available for bookings', type: 'checkbox' }, { name: 'published', label: 'Show on website', type: 'checkbox' },
          ]}
          defaults={{ available: true, published: true }}
        />
      )}

      {tab === 'bookings' && (
        <ResourceManager<R> endpoint="/admin/fashion/bookings" noun="booking" search={false}
          columns={[
            { label: 'Date', render: (b) => gcDate(String(b.date)) },
            { label: 'Client', render: (b) => <span className="font-semibold">{String(b.client)}</span> },
            { label: 'Type', render: (b) => String(b.kind) },
            { label: 'Models', render: (b) => String(b.modelsCount) },
            { label: 'Fee', render: (b) => etb(String(b.fee)) },
            { label: 'Payment', render: (b) => <Pill tone={PAY_TONE[String(b.payStatus)]}>{label(String(b.payStatus))}</Pill> },
          ]}
          fields={[
            { name: 'client', label: 'Client', required: true }, { name: 'kind', label: 'Type', required: true, placeholder: 'Photo shoot, wedding, advert…' },
            { name: 'date', label: 'Date', type: 'date', required: true }, { name: 'modelsCount', label: 'Number of models', type: 'number' },
            { name: 'fee', label: 'Fee (ETB)', type: 'number' },
            { name: 'payStatus', label: 'Payment', type: 'select', required: true, options: [{ value: 'UNPAID', label: 'Unpaid' }, { value: 'DEPOSIT', label: 'Deposit' }, { value: 'PAID', label: 'Paid' }] },
            { name: 'notes', label: 'Notes', type: 'textarea' },
          ]}
          defaults={{ payStatus: 'UNPAID', modelsCount: 1 }}
        />
      )}

      {tab === 'events' && <EventsTab />}

      {tab === 'designs' && (
        <ResourceManager<R> endpoint="/admin/fashion/designs" noun="design"
          columns={[
            { label: 'Photo', render: (d) => img(d.imageUrl) },
            { label: 'Code', render: (d) => <span className="font-mono text-[13px]">{String(d.code)}</span> },
            { label: 'Name', render: (d) => <span className="font-semibold">{String(d.name)}</span> },
            { label: 'Category', render: (d) => <Pill tone={d.category === 'CULTURAL' ? 'orange' : 'purple'}>{label(String(d.category))}</Pill> },
            { label: 'Fabric', render: (d) => String(d.fabric ?? '—') },
          ]}
          fields={[
            { name: 'code', label: 'Design code', required: true, placeholder: 'WC-002' }, { name: 'name', label: 'Name', required: true },
            { name: 'category', label: 'Category', type: 'select', required: true, options: ['CULTURAL', 'FASHION', 'BRIDAL', 'MENSWEAR', 'PRODUCTION'].map((c) => ({ value: c, label: label(c) })) },
            { name: 'fabric', label: 'Fabric' }, { name: 'notes', label: 'Notes, pattern details', type: 'textarea' }, { name: 'imageUrl', label: 'Sketch or photo', type: 'image' },
          ]}
          defaults={{ category: 'FASHION' }}
        />
      )}

      {tab === 'collections' && (
        <ResourceManager<R> endpoint="/admin/fashion/collections" noun="collection"
          columns={[
            { label: 'Cover', render: (c) => img(c.coverUrl) },
            { label: 'Name', render: (c) => <span className="font-semibold">{String(c.name)}</span> },
            { label: 'Season', render: (c) => String(c.season ?? '—') },
            { label: 'Looks', render: (c) => String((c.looks as unknown[])?.length ?? 0) },
            { label: 'Featured', render: (c) => (c.featured ? <Pill tone="yellow">Featured</Pill> : '—') },
            { label: 'Website', render: (c) => yesNo(c.published) },
          ]}
          fields={[
            { name: 'name', label: 'Name', required: true }, { name: 'slug', label: 'Web address name', required: true, placeholder: 'debut-collection' },
            { name: 'season', label: 'Season' }, { name: 'description', label: 'Description', type: 'textarea' }, { name: 'coverUrl', label: 'Cover photo', type: 'image' },
            { name: 'featured', label: 'Feature on the home page', type: 'checkbox' }, { name: 'published', label: 'Show on website', type: 'checkbox' },
          ]}
          defaults={{ published: true }}
        />
      )}

      {tab === 'looks' && (
        <ResourceManager<R> endpoint="/admin/fashion/looks" noun="look" search={false}
          columns={[
            { label: 'Photo', render: (l) => img(l.imageUrl) },
            { label: 'Name', render: (l) => <span className="font-semibold">{String(l.name)}</span> },
            { label: 'Category', render: (l) => LOOK_CATS.find((c) => c.value === l.category)?.label },
            { label: 'Collection', render: (l) => String(collections.data?.find((c) => c.id === l.collectionId)?.name ?? '—') },
            { label: 'Order', render: (l) => String(l.sortOrder) },
            { label: 'Website', render: (l) => yesNo(l.published) },
          ]}
          fields={[
            { name: 'name', label: 'Look name', required: true }, { name: 'category', label: 'Category', type: 'select', required: true, options: LOOK_CATS },
            { name: 'collectionId', label: 'Collection', type: 'select', options: (collections.data ?? []).map((c) => ({ value: c.id, label: String(c.name) })) },
            { name: 'sortOrder', label: 'Position (lower first)', type: 'number' }, { name: 'imageUrl', label: 'Photo', type: 'image' }, { name: 'published', label: 'Show on website', type: 'checkbox' },
          ]}
          defaults={{ category: 'READY_TO_WEAR', published: true, sortOrder: 0 }}
        />
      )}

      {tab === 'gallery' && (
        <ResourceManager<R> endpoint="/admin/fashion/gallery" noun="photo" search={false}
          columns={[
            { label: 'Photo', render: (g) => img(g.imageUrl) },
            { label: 'Title', render: (g) => <span className="font-semibold">{String(g.title)}</span> },
            { label: 'Category', render: (g) => label(String(g.category)) },
            { label: 'Size', render: (g) => (g.tall ? 'Tall' : 'Normal') },
            { label: 'Website', render: (g) => yesNo(g.published) },
          ]}
          fields={[
            { name: 'title', label: 'Title', required: true },
            { name: 'category', label: 'Category', type: 'select', required: true, options: ['RUNWAY', 'ATELIER', 'CAMPAIGN', 'BEHIND_THE_SCENES'].map((c) => ({ value: c, label: label(c) })) },
            { name: 'imageUrl', label: 'Photo', type: 'image' }, { name: 'tall', label: 'Tall photo (portrait)', type: 'checkbox' }, { name: 'published', label: 'Show on website', type: 'checkbox' },
          ]}
          defaults={{ category: 'ATELIER', published: true }}
        />
      )}
    </>
  );
}

type Task = { label: string; done: boolean };

function EventsTab() {
  const events = useApi<(R & { tasks?: Task[] })[]>('/admin/fashion/events');
  const [newTask, setNewTask] = useState('');
  const next = events.data?.find((e) => new Date(String(e.date)) >= new Date(Date.now() - 86400000));

  async function saveTasks(tasks: Task[]) {
    if (!next) return;
    await api(`/admin/fashion/events/${next.id}`, { method: 'PATCH', body: { tasks } });
    events.reload();
  }

  return (
    <div className="flex flex-col gap-4">
      {next && (
        <section className="card flex flex-wrap gap-6">
          <div className="flex-[1_1_260px]">
            <Pill tone="yellow">Next event · {gcDate(String(next.date), { day: 'numeric', month: 'short' })}</Pill>
            <h2 className="mt-2 font-display text-[22px] font-bold">{String(next.name)}</h2>
            <p className="text-sm text-muted">{String(next.venue)}</p>
            <p className="mt-2 text-sm">Budget: {etb(String(next.spent))} spent of {etb(String(next.budget))}</p>
          </div>
          <div className="flex-[1_1_300px]">
            <div className="mb-2 text-[13px] font-semibold">Preparation · {(next.tasks ?? []).filter((t) => t.done).length} of {(next.tasks ?? []).length} done</div>
            {(next.tasks ?? []).map((t, i) => (
              <label key={i} className="flex min-h-[34px] items-center gap-2.5 text-sm">
                <input type="checkbox" checked={t.done} className="h-[18px] w-[18px] accent-teal" onChange={() => saveTasks((next.tasks ?? []).map((x, j) => (j === i ? { ...x, done: !x.done } : x)))} />
                <span className={t.done ? 'text-muted line-through' : ''}>{t.label}</span>
              </label>
            ))}
            <form className="mt-2 flex gap-2" onSubmit={(e) => { e.preventDefault(); if (newTask.trim()) { saveTasks([...(next.tasks ?? []), { label: newTask.trim(), done: false }]); setNewTask(''); } }}>
              <input className="a-input" value={newTask} onChange={(e) => setNewTask(e.target.value)} placeholder="Add a task…" aria-label="New task" />
              <button className="a-btn a-btn-line">Add</button>
            </form>
          </div>
        </section>
      )}
      <ResourceManager<R> endpoint="/admin/fashion/events" noun="event" search={false}
        columns={[
          { label: 'Date', render: (e) => gcDate(String(e.date)) },
          { label: 'Event', render: (e) => <span className="font-semibold">{String(e.name)}</span> },
          { label: 'Venue', render: (e) => String(e.venue) },
          { label: 'Budget', render: (e) => `${etb(String(e.spent))} / ${etb(String(e.budget))}` },
          { label: 'Website', render: (e) => yesNo(e.published) },
        ]}
        fields={[
          { name: 'name', label: 'Event name', required: true, full: true }, { name: 'date', label: 'Date', type: 'date', required: true },
          { name: 'venue', label: 'Venue', required: true }, { name: 'budget', label: 'Budget (ETB)', type: 'number' }, { name: 'spent', label: 'Spent so far (ETB)', type: 'number' },
          { name: 'description', label: 'Description (shown on the website)', type: 'textarea' }, { name: 'published', label: 'Show on website', type: 'checkbox' },
        ]}
        defaults={{ published: true }}
      />
    </div>
  );
}
