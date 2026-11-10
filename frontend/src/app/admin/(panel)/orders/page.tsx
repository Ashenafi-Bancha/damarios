'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import clsx from 'clsx';
import { api } from '@/lib/api';
import { etb, gcDate, label, timeAgo } from '@/lib/format';
import { Empty, ErrorNote, Loading, Modal, PageHeader, Pill, Tabs, useAction, useApi } from '@/components/admin/ui';
import { FieldInput, type FieldDef } from '@/components/admin/ResourceManager';

interface Order {
  id: string; code: string; type: string; stage: string; title: string; quantity: number; total: string; paid: number;
  dueDate: string | null; assignedTo: string | null; notes: string; customer: { id: string; name: string; phone: string | null } | null;
  events: { id: string; text: string; createdAt: string }[];
}
interface WebRequest {
  id: string; type: string; name: string; phone: string; email: string | null; telegram: string | null; neededBy: string | null; budget: string | null;
  company: string | null; country: string | null; product: string | null; quantity: string | null; currency: string | null;
  message: string; attachmentUrl: string | null; status: string; createdAt: string;
}

const STAGES = ['NEW', 'QUOTED', 'SAMPLE', 'IN_PRODUCTION', 'QUALITY_CHECK', 'READY', 'DELIVERED'];
const TYPES = ['WHOLESALE', 'EXPORT', 'PRODUCTION', 'CUSTOM_DESIGN', 'BESPOKE', 'CULTURAL'];
const TYPE_TONE: Record<string, string> = { WHOLESALE: 'teal', EXPORT: 'blue', CULTURAL: 'orange', CUSTOM_DESIGN: 'purple', BESPOKE: 'purple', PRODUCTION: 'blue', MODEL_BOOKING: 'teal', MODEL_CASTING: 'teal', SHOW_SEAT: 'yellow' };

function OrdersPage() {
  const params = useSearchParams();
  const [tab, setTab] = useState<'board' | 'requests'>(params.get('tab') === 'requests' ? 'requests' : 'board');
  const [type, setType] = useState('');
  const { data, error, loading, reload } = useApi<Order[]>(`/admin/orders${type ? `?type=${type}` : ''}`);
  const requests = useApi<WebRequest[]>('/admin/requests');
  const [selected, setSelected] = useState<string | null>(null);
  const [creating, setCreating] = useState(params.get('new') === '1');
  const sel = data?.find((o) => o.id === selected) ?? null;
  const newCount = requests.data?.filter((r) => r.status === 'NEW').length ?? 0;

  return (
    <>
      <PageHeader title="Orders" sub="Every order from first request to delivery.">
        <label className="flex items-center gap-1.5 text-[13px] text-muted">Type
          <select className="a-input w-auto" value={type} onChange={(e) => setType(e.target.value)}>
            <option value="">All types</option>{TYPES.map((t) => <option key={t} value={t}>{label(t)}</option>)}
          </select>
        </label>
        <button type="button" onClick={() => setCreating(true)} className="a-btn a-btn-gold">+ New order</button>
      </PageHeader>
      <Tabs tabs={[{ id: 'board', name: 'Order board' }, { id: 'requests', name: 'Website requests', badge: newCount }]} value={tab} onChange={setTab} />
      <ErrorNote error={error} />

      {tab === 'board' && (loading && !data ? <Loading /> : (
        <div className="flex flex-wrap items-start gap-4">
          <div className="min-w-0 flex-[999_1_640px] overflow-x-auto pb-1.5">
            <div className="grid min-w-[1300px] grid-cols-7 gap-3">
              {STAGES.map((stage) => {
                const cards = data?.filter((o) => o.stage === stage) ?? [];
                return (
                  <section key={stage} className="flex min-h-[560px] flex-col gap-2.5 rounded-[14px] bg-[#ECF1F8] p-3">
                    <h2 className="mx-1 flex items-center justify-between text-sm font-semibold">{label(stage)}<span className="rounded-full bg-white px-2 text-xs">{cards.length}</span></h2>
                    {cards.map((o) => {
                      const late = o.dueDate && new Date(o.dueDate) < new Date() && o.stage !== 'DELIVERED';
                      return (
                        <motion.button layout key={o.id} type="button" onClick={() => setSelected(o.id)}
                          className={clsx('flex flex-col gap-1.5 rounded-xl border-2 bg-white p-3 text-left transition-colors hover:border-teal', selected === o.id ? 'border-teal' : 'border-[#DCE4F0]')}>
                          <span className="flex w-full justify-between gap-2 text-xs text-muted"><span>{o.code}</span><Pill tone={TYPE_TONE[o.type]}>{label(o.type)}</Pill></span>
                          <span className="text-sm font-semibold">{o.customer?.name ?? 'No customer'}</span>
                          <span className="text-[13px] text-muted">{o.title} · {o.quantity} pcs</span>
                          <span className="flex w-full justify-between text-xs"><span className={clsx('font-semibold', late ? 'text-[#B42318]' : 'text-muted')}>{o.dueDate ? `Due ${gcDate(o.dueDate, { day: 'numeric', month: 'short' })}` : 'No due date'}</span><span>{etb(o.total)}</span></span>
                        </motion.button>
                      );
                    })}
                  </section>
                );
              })}
            </div>
          </div>
          {sel ? <OrderPanel order={sel} onChange={reload} onClose={() => setSelected(null)} /> : (
            <aside className="card flex-[1_1_300px] text-sm text-muted">Click an order card to see its details, record payments and move it forward.</aside>
          )}
        </div>
      ))}

      {tab === 'requests' && <RequestsList data={requests.data} loading={requests.loading} error={requests.error} reload={() => { requests.reload(); reload(); }} />}
      <NewOrder open={creating} onClose={() => setCreating(false)} onCreated={(id) => { setCreating(false); reload(); setSelected(id); setTab('board'); }} />
    </>
  );
}

function OrderPanel({ order: o, onChange, onClose }: { order: Order; onChange: () => void; onClose: () => void }) {
  const { busy, error, run } = useAction();
  const [pay, setPay] = useState({ amount: '', method: 'TELEBIRR' });
  const idx = STAGES.indexOf(o.stage);
  const next = STAGES[idx + 1];
  const owed = Math.max(0, Number(o.total) - o.paid);

  return (
    <motion.aside key={o.id} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} className="card flex flex-[1_1_320px] flex-col gap-3.5" aria-label="Order details">
      <div className="flex items-center justify-between gap-2"><span className="text-[13px] text-muted">{o.code}</span><Pill tone="teal">{label(o.stage)}</Pill></div>
      <h2 className="font-display text-[22px] font-bold">{o.customer?.name ?? 'No customer'}</h2>
      <p className="text-sm text-muted">{o.title} · {o.quantity} pcs · {label(o.type)}</p>
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div><div className="text-xs text-muted">Total</div><div className="font-semibold">{etb(o.total)}</div></div>
        <div><div className="text-xs text-muted">Paid</div><div className="font-semibold">{etb(o.paid)}</div></div>
        <div><div className="text-xs text-muted">Still owed</div><div className={clsx('font-semibold', owed ? 'text-[#B42318]' : 'text-[#1E6B34]')}>{etb(owed)}</div></div>
        <div><div className="text-xs text-muted">Due date</div><div className="font-semibold">{o.dueDate ? gcDate(o.dueDate) : '—'}</div></div>
      </div>
      {o.notes && <p className="rounded-lg bg-paper p-3 text-[13px] text-muted">{o.notes}</p>}
      <div>
        <div className="mb-2 text-[13px] font-semibold">History</div>
        <ol className="flex max-h-48 flex-col gap-2 overflow-y-auto text-[13px] text-muted">
          {o.events.map((e) => <li key={e.id}>{e.text} · {gcDate(e.createdAt, { day: 'numeric', month: 'short' })}</li>)}
        </ol>
      </div>
      <form className="flex flex-wrap items-end gap-2" onSubmit={async (e) => { e.preventDefault(); if (await run(() => api(`/admin/orders/${o.id}/payments`, { method: 'POST', body: { amount: Number(pay.amount), method: pay.method } }))) { setPay({ ...pay, amount: '' }); onChange(); } }}>
        <label className="a-label flex-1">Record payment (ETB)<input className="a-input" type="number" min="1" required value={pay.amount} onChange={(e) => setPay({ ...pay, amount: e.target.value })} /></label>
        <select aria-label="Payment method" className="a-input w-auto" value={pay.method} onChange={(e) => setPay({ ...pay, method: e.target.value })}>
          <option value="TELEBIRR">Telebirr</option><option value="CBE_BIRR">CBE Birr</option><option value="BANK">Bank</option><option value="CASH">Cash</option>
        </select>
        <button type="submit" disabled={busy} className="a-btn a-btn-line">Save</button>
      </form>
      <ErrorNote error={error} />
      <div className="grid grid-cols-2 gap-2">
        {next && <button type="button" disabled={busy} onClick={() => run(() => api(`/admin/orders/${o.id}`, { method: 'PATCH', body: { stage: next } })).then(onChange)} className="a-btn a-btn-ink col-span-2">Move to {label(next)}</button>}
        {idx > 0 && <button type="button" disabled={busy} onClick={() => run(() => api(`/admin/orders/${o.id}`, { method: 'PATCH', body: { stage: STAGES[idx - 1] } })).then(onChange)} className="a-btn a-btn-line">Move back</button>}
        <button type="button" onClick={() => window.print()} className="a-btn a-btn-line">Print</button>
        <button type="button" disabled={busy} onClick={async () => { if (window.confirm('Cancel this order?')) { await run(() => api(`/admin/orders/${o.id}`, { method: 'DELETE' })); onClose(); onChange(); } }} className="a-btn border border-[#F3C3BD] text-[#B42318] hover:bg-[#FDE7E5]">Cancel order</button>
      </div>
    </motion.aside>
  );
}

function NewOrder({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: (id: string) => void }) {
  const customers = useApi<{ id: string; name: string }[]>(open ? '/admin/customers' : null);
  const fields: FieldDef[] = useMemo(() => [
    { name: 'customerId', label: 'Customer', type: 'select', options: (customers.data ?? []).map((c) => ({ value: c.id, label: c.name })) },
    { name: 'type', label: 'Type', type: 'select', required: true, options: TYPES.map((t) => ({ value: t, label: label(t) })) },
    { name: 'title', label: 'What is being made', required: true, full: true, placeholder: 'e.g. Bridal cultural set' },
    { name: 'quantity', label: 'Quantity', type: 'number' },
    { name: 'total', label: 'Total price (ETB)', type: 'number' },
    { name: 'dueDate', label: 'Due date', type: 'date' },
    { name: 'assignedTo', label: 'Assigned to', placeholder: 'Design studio, Line 1…' },
    { name: 'notes', label: 'Notes', type: 'textarea' },
  ], [customers.data]);
  const [values, setValues] = useState<Record<string, unknown>>({ type: 'CUSTOM_DESIGN', quantity: '1' });
  const { busy, error, run } = useAction();
  useEffect(() => { if (open) setValues({ type: 'CUSTOM_DESIGN', quantity: '1' }); }, [open]);

  return (
    <Modal open={open} onClose={onClose} title="New order" wide>
      <form className="grid gap-4 sm:grid-cols-2" onSubmit={async (e) => {
        e.preventDefault();
        let id = '';
        const ok = await run(async () => {
          const o = await api<Order>('/admin/orders', { method: 'POST', body: { ...values, customerId: values.customerId || null, dueDate: values.dueDate || null, quantity: Number(values.quantity || 1), total: Number(values.total || 0) } });
          id = o.id;
        });
        if (ok) onCreated(id);
      }}>
        {fields.map((f) => <FieldInput key={f.name} field={f} value={values[f.name]} onChange={(v) => setValues((s) => ({ ...s, [f.name]: v }))} />)}
        <div className="sm:col-span-2"><ErrorNote error={error} /></div>
        <div className="flex justify-end gap-2 sm:col-span-2"><button type="button" onClick={onClose} className="a-btn a-btn-line">Cancel</button><button disabled={busy} className="a-btn a-btn-ink">{busy ? 'Saving…' : 'Create order'}</button></div>
      </form>
    </Modal>
  );
}

function RequestsList({ data, loading, error, reload }: { data: WebRequest[] | null; loading: boolean; error: string; reload: () => void }) {
  const { busy, error: actError, run } = useAction();
  if (loading && !data) return <Loading />;
  return (
    <section className="card p-0">
      <div className="p-4"><ErrorNote error={error || actError} /></div>
      {!data?.length ? <Empty>No requests from the website yet.</Empty> : (
        <ul>
          {data.map((r) => (
            <li key={r.id} className="flex flex-wrap items-start justify-between gap-3 border-t border-[#ECF1F8] px-5 py-4">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2"><span className="font-semibold">{r.company ? `${r.company} · ${r.name}` : r.name}</span><Pill tone={TYPE_TONE[r.type]}>{label(r.type)}</Pill><Pill tone={r.status === 'NEW' ? 'yellow' : r.status === 'CONVERTED' ? 'green' : 'gray'}>{label(r.status)}</Pill></div>
                {(r.product || r.quantity || r.country) && (
                  <div className="mt-1 text-sm font-medium">{[r.product, r.quantity, r.country, r.currency ? `quote in ${r.currency}` : ''].filter(Boolean).join(' · ')}</div>
                )}
                <div className="mt-1 text-sm text-muted">{[r.phone, r.email, r.telegram].filter(Boolean).join(' · ')}{r.neededBy ? ` · needed ${gcDate(r.neededBy)}` : ''}{r.budget ? ` · ${r.budget}` : ''} · {timeAgo(r.createdAt)}</div>
                {r.message && <p className="mt-2 text-sm">{r.message}</p>}
                {r.attachmentUrl && <a href={r.attachmentUrl} target="_blank" rel="noreferrer" className="mt-1 inline-block text-sm font-semibold text-teal">View inspiration photo</a>}
              </div>
              <div className="flex flex-wrap gap-2">
                {r.phone && <a href={`tel:${r.phone}`} className="a-btn a-btn-line">Call</a>}
                {r.email && <a href={`mailto:${r.email}`} className="a-btn a-btn-line">Email</a>}
                {r.status !== 'CONVERTED' && r.type !== 'MODEL_CASTING' && <button type="button" disabled={busy} onClick={() => run(() => api(`/admin/requests/${r.id}/convert`, { method: 'POST', body: {} })).then(reload)} className="a-btn a-btn-ink">Make order</button>}
                {r.status === 'NEW' && <button type="button" disabled={busy} onClick={() => run(() => api(`/admin/requests/${r.id}`, { method: 'PATCH', body: { status: 'CONTACTED' } })).then(reload)} className="a-btn a-btn-line">Mark contacted</button>}
                {r.status !== 'CLOSED' && r.status !== 'CONVERTED' && <button type="button" disabled={busy} onClick={() => run(() => api(`/admin/requests/${r.id}`, { method: 'PATCH', body: { status: 'CLOSED' } })).then(reload)} className="a-btn text-muted hover:bg-paper">Close</button>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default function Page() {
  return <Suspense fallback={<Loading />}><OrdersPage /></Suspense>;
}
