'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import { etb, gcDate, label } from '@/lib/format';
import { ErrorNote, Modal, PageHeader, Pill, useAction } from '@/components/admin/ui';
import ResourceManager from '@/components/admin/ResourceManager';

interface Customer {
  id: string; name: string; type: string; phone: string | null; telegram: string | null; email: string | null; notes: string;
  measurements: Record<string, string> | null;
  orders: { id: string; code: string; title: string; stage: string; total: string; createdAt: string; payments: { amount: string; kind: string }[] }[];
  [k: string]: unknown;
}

const MEASURES = ['chest', 'waist', 'hip', 'shoulder', 'sleeve', 'length', 'inseam', 'neck'];

function totals(c: Customer) {
  const spent = c.orders.reduce((s, o) => s + o.payments.filter((p) => p.kind === 'INCOME').reduce((a, p) => a + Number(p.amount), 0), 0);
  const owed = c.orders.filter((o) => o.stage !== 'CANCELLED').reduce((s, o) => s + Number(o.total), 0) - spent;
  return { spent, owed: Math.max(0, owed) };
}

export default function CustomersPage() {
  const [measuring, setMeasuring] = useState<{ c: Customer; reload: () => void } | null>(null);
  return (
    <>
      <PageHeader title="Customers" sub="Everyone who has ordered, with their measurements, orders and balance." />
      <ResourceManager<Customer>
        endpoint="/admin/customers"
        noun="customer"
        columns={[
          { label: 'Customer', render: (c) => <span className="font-semibold">{c.name}</span> },
          { label: 'Type', render: (c) => <Pill tone={c.type === 'BUSINESS' ? 'purple' : c.type === 'GROUP' ? 'teal' : 'orange'}>{label(c.type)}</Pill> },
          { label: 'Phone', render: (c) => c.phone ? <a href={`tel:${c.phone}`} className="hover:text-teal">{c.phone}</a> : '—' },
          { label: 'Telegram', render: (c) => c.telegram || '—' },
          { label: 'Orders', render: (c) => c.orders.length },
          { label: 'Paid', render: (c) => etb(totals(c).spent) },
          { label: 'Owes', render: (c) => { const o = totals(c).owed; return <span className={o ? 'font-semibold text-[#B42318]' : 'text-[#1E6B34]'}>{etb(o)}</span>; } },
          { label: 'Last order', render: (c) => c.orders[0] ? `${c.orders[0].code} · ${gcDate(c.orders[0].createdAt, { day: 'numeric', month: 'short' })}` : '—' },
        ]}
        fields={[
          { name: 'name', label: 'Name', required: true },
          { name: 'type', label: 'Type', type: 'select', required: true, options: [{ value: 'INDIVIDUAL', label: 'Individual' }, { value: 'BUSINESS', label: 'Business / brand' }, { value: 'GROUP', label: 'Group' }] },
          { name: 'phone', label: 'Phone' },
          { name: 'telegram', label: 'Telegram' },
          { name: 'email', label: 'Email' },
          { name: 'notes', label: 'Notes', type: 'textarea' },
        ]}
        defaults={{ type: 'INDIVIDUAL' }}
        extraActions={(c, reload) => <button type="button" onClick={() => setMeasuring({ c, reload })} className="a-btn h-9 min-h-0 px-3 text-xs text-teal hover:bg-teal-tint">Measurements</button>}
      />
      {measuring && <Measurements customer={measuring.c} onClose={() => { setMeasuring(null); measuring.reload(); }} />}
    </>
  );
}

function Measurements({ customer, onClose }: { customer: Customer; onClose: () => void }) {
  const [m, setM] = useState<Record<string, string>>(customer.measurements ?? {});
  const { busy, error, run } = useAction();
  return (
    <Modal open onClose={onClose} title={`Measurements · ${customer.name}`}>
      <form className="flex flex-col gap-4" onSubmit={async (e) => { e.preventDefault(); if (await run(() => api(`/admin/customers/${customer.id}`, { method: 'PATCH', body: { measurements: m } }))) onClose(); }}>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {MEASURES.map((k) => (
            <label key={k} className="a-label capitalize">{k} (cm)<input className="a-input" inputMode="decimal" value={m[k] ?? ''} onChange={(e) => setM({ ...m, [k]: e.target.value })} /></label>
          ))}
        </div>
        <p className="text-xs text-muted">For groups and companies, keep a size sheet in the notes instead.</p>
        <ErrorNote error={error} />
        <div className="flex justify-end gap-2"><button type="button" onClick={onClose} className="a-btn a-btn-line">Cancel</button><button disabled={busy} className="a-btn a-btn-ink">Save</button></div>
      </form>
    </Modal>
  );
}
