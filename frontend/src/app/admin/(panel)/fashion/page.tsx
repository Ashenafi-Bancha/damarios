'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import { etb, gcDate, label } from '@/lib/format';
import { ErrorNote, PageHeader, Pill, Tabs, useAction, useApi } from '@/components/admin/ui';
import ResourceManager from '@/components/admin/ResourceManager';

type R = { id: string; [k: string]: unknown };
type Tab = 'designs' | 'events';

const img = (src: unknown) => src
  // eslint-disable-next-line @next/next/no-img-element
  ? <img src={String(src)} alt="" className="h-10 w-10 rounded-lg object-cover" />
  : <span className="ph block h-10 w-10 rounded-lg" />;

/** Garment designs and patterns, and events such as graduations, open days and market fairs. */
export default function DesignsPage() {
  const [tab, setTab] = useState<Tab>('designs');
  return (
    <>
      <PageHeader title="Designs & events" sub="Garment designs and patterns, plus events such as graduations, open days and market fairs." />
      <Tabs<Tab> value={tab} onChange={setTab} tabs={[{ id: 'designs', name: 'Design catalog' }, { id: 'events', name: 'Events' }]} />

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
            { name: 'code', label: 'Design code', required: true, placeholder: 'WC-002', minLength: 2, maxLength: 30 },
            { name: 'name', label: 'Name', required: true, minLength: 2, maxLength: 120 },
            { name: 'category', label: 'Category', type: 'select', required: true, options: ['CULTURAL', 'FASHION', 'BRIDAL', 'MENSWEAR', 'PRODUCTION'].map((c) => ({ value: c, label: label(c) })) },
            { name: 'fabric', label: 'Fabric', maxLength: 120 },
            { name: 'notes', label: 'Notes, pattern details', type: 'textarea', maxLength: 3000 },
            { name: 'imageUrl', label: 'Sketch or photo', type: 'image' },
          ]}
          defaults={{ category: 'FASHION' }}
        />
      )}

      {tab === 'events' && <EventsTab />}
    </>
  );
}

type Task = { label: string; done: boolean };

function EventsTab() {
  const events = useApi<(R & { tasks?: Task[] })[]>('/admin/fashion/events');
  const act = useAction();
  const [newTask, setNewTask] = useState('');
  const next = events.data?.find((e) => new Date(String(e.date)) >= new Date(Date.now() - 86400000));

  async function saveTasks(tasks: Task[]) {
    if (!next) return;
    await act.run(() => api(`/admin/fashion/events/${next.id}`, { method: 'PATCH', body: { tasks } }));
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
                <input type="checkbox" checked={t.done} disabled={act.busy} className="h-[18px] w-[18px] accent-teal" onChange={() => saveTasks((next.tasks ?? []).map((x, j) => (j === i ? { ...x, done: !x.done } : x)))} />
                <span className={t.done ? 'text-muted line-through' : ''}>{t.label}</span>
              </label>
            ))}
            <form className="mt-2 flex gap-2" onSubmit={(e) => { e.preventDefault(); if (newTask.trim()) { saveTasks([...(next.tasks ?? []), { label: newTask.trim(), done: false }]); setNewTask(''); } }}>
              <input className="a-input" value={newTask} maxLength={200} onChange={(e) => setNewTask(e.target.value)} placeholder="Add a task…" aria-label="New task" />
              <button className="a-btn a-btn-line" disabled={act.busy}>Add</button>
            </form>
            <div className="mt-2"><ErrorNote error={act.error} /></div>
          </div>
        </section>
      )}
      <ResourceManager<R> endpoint="/admin/fashion/events" noun="event" search={false}
        columns={[
          { label: 'Date', render: (e) => gcDate(String(e.date)) },
          { label: 'Event', render: (e) => <span className="font-semibold">{String(e.name)}</span> },
          { label: 'Venue', render: (e) => String(e.venue) },
          { label: 'Budget', render: (e) => `${etb(String(e.spent))} / ${etb(String(e.budget))}` },
        ]}
        fields={[
          { name: 'name', label: 'Event name', required: true, full: true, minLength: 2, maxLength: 120 },
          { name: 'date', label: 'Date', type: 'date', required: true },
          { name: 'venue', label: 'Venue', required: true, minLength: 2, maxLength: 120 },
          { name: 'budget', label: 'Budget (ETB)', type: 'number', min: 0 },
          { name: 'spent', label: 'Spent so far (ETB)', type: 'number', min: 0 },
          { name: 'description', label: 'Description', type: 'textarea', maxLength: 3000 },
        ]}
        onChange={events.reload}
      />
    </div>
  );
}
