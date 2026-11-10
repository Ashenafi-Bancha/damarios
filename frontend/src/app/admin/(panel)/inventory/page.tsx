'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import { etb, label, timeAgo } from '@/lib/format';
import { Empty, ErrorNote, PageHeader, Pill, Tabs, useAction, useApi } from '@/components/admin/ui';
import ResourceManager from '@/components/admin/ResourceManager';

interface Item { id: string; name: string; category: string; unit: string; quantity: string; minLevel: string; unitCost: string; supplier: { name: string } | null; [k: string]: unknown }
interface Supplier { id: string; name: string; location: string | null; phone: string | null; supplies: string; [k: string]: unknown }
interface Movement { id: string; direction: string; quantity: string; reference: string | null; createdAt: string; item: { name: string; unit: string } }

const CATS = ['FABRIC', 'THREAD', 'TRIMS', 'RAW_SPICE', 'PACKED_SPICE', 'PACKAGING', 'TRAINING_SUPPLIES'];

export default function InventoryPage() {
  const [tab, setTab] = useState<'stock' | 'suppliers'>('stock');
  const [cat, setCat] = useState('');
  const [mv, setMv] = useState({ itemId: '', direction: 'IN', quantity: '', reference: '' });
  const [key, setKey] = useState(0);
  const items = useApi<Item[]>(`/admin/inventory/items?k=${key}`);
  const suppliers = useApi<Supplier[]>('/admin/inventory/suppliers');
  const movements = useApi<Movement[]>(`/admin/inventory/movements?k=${key}`);
  const { busy, error, run } = useAction();
  const low = items.data?.filter((i) => Number(i.quantity) < Number(i.minLevel)) ?? [];

  return (
    <>
      <PageHeader title="Inventory & suppliers" sub="Materials in the store. Every stock movement updates the quantity on hand." />
      <Tabs tabs={[{ id: 'stock', name: 'Stock', badge: low.length }, { id: 'suppliers', name: 'Suppliers' }]} value={tab} onChange={setTab} />

      {tab === 'stock' && (
        <div className="flex flex-wrap items-start gap-4">
          <div className="min-w-0 flex-[2_1_560px]">
            <ResourceManager<Item>
              key={`${cat}-${key}`}
              endpoint={`/admin/inventory/items${cat ? `?category=${cat}` : ''}`}
              noun="item"
              toolbar={
                <div role="group" aria-label="Category" className="flex flex-wrap gap-1.5">
                  {['', ...CATS].map((c) => (
                    <button key={c || 'all'} type="button" onClick={() => setCat(c)} aria-pressed={cat === c}
                      className={'min-h-[36px] rounded-full border px-3.5 text-[13px] font-semibold ' + (cat === c ? 'border-ink-soft bg-ink-soft text-white' : 'border-[#C9D5E8]')}>
                      {c ? label(c) : 'All'}
                    </button>
                  ))}
                </div>
              }
              columns={[
                { label: 'Item', render: (i) => <span className="font-semibold">{i.name}</span> },
                { label: 'Category', render: (i) => label(i.category) },
                { label: 'In stock', render: (i) => `${Number(i.quantity)} ${i.unit}` },
                { label: 'Minimum', render: (i) => <span className="text-muted">{Number(i.minLevel)} {i.unit}</span> },
                { label: 'Status', render: (i) => Number(i.quantity) < Number(i.minLevel) ? <Pill tone="red">Low</Pill> : <Pill tone="green">OK</Pill> },
                { label: 'Supplier', render: (i) => i.supplier?.name ?? '—' },
                { label: 'Unit cost', render: (i) => etb(i.unitCost) },
              ]}
              fields={[
                { name: 'name', label: 'Item name', required: true, full: true },
                { name: 'category', label: 'Category', type: 'select', required: true, options: CATS.map((c) => ({ value: c, label: label(c) })) },
                { name: 'unit', label: 'Unit', placeholder: 'm, rolls, pcs, cones' },
                { name: 'quantity', label: 'Quantity now', type: 'number' },
                { name: 'minLevel', label: 'Minimum level', type: 'number' },
                { name: 'unitCost', label: 'Unit cost (ETB)', type: 'number' },
                { name: 'supplierId', label: 'Supplier', type: 'select', options: (suppliers.data ?? []).map((s) => ({ value: s.id, label: s.name })) },
              ]}
              defaults={{ category: 'FABRIC', unit: 'm' }}
            />
          </div>
          <div className="flex min-w-0 flex-[1_1_320px] flex-col gap-4">
            <form className="card flex flex-col gap-3" onSubmit={async (e) => { e.preventDefault(); if (await run(() => api('/admin/inventory/movements', { method: 'POST', body: { ...mv, quantity: Number(mv.quantity), reference: mv.reference || undefined } }))) { setMv({ ...mv, quantity: '', reference: '' }); setKey((k) => k + 1); } }}>
              <h2 className="font-display text-[17px] font-bold">Stock movement</h2>
              <div role="group" aria-label="Direction" className="grid grid-cols-2 gap-1.5">
                {[['IN', 'Stock in'], ['OUT', 'Stock out']].map(([d, n]) => (
                  <button key={d} type="button" aria-pressed={mv.direction === d} onClick={() => setMv({ ...mv, direction: d })}
                    className={'min-h-[40px] rounded-[10px] border border-ink-soft text-sm font-semibold ' + (mv.direction === d ? 'bg-ink-soft text-white' : 'bg-white')}>{n}</button>
                ))}
              </div>
              <label className="a-label">Item<select className="a-input" required value={mv.itemId} onChange={(e) => setMv({ ...mv, itemId: e.target.value })}><option value="">Choose…</option>{items.data?.map((i) => <option key={i.id} value={i.id}>{i.name} ({Number(i.quantity)} {i.unit})</option>)}</select></label>
              <div className="grid grid-cols-2 gap-2.5">
                <label className="a-label">Quantity<input className="a-input" type="number" min="0" step="any" required value={mv.quantity} onChange={(e) => setMv({ ...mv, quantity: e.target.value })} /></label>
                <label className="a-label">{mv.direction === 'IN' ? 'Supplier invoice #' : 'For order / work'}<input className="a-input" value={mv.reference} onChange={(e) => setMv({ ...mv, reference: e.target.value })} placeholder={mv.direction === 'IN' ? 'INV-2231' : 'DM-0142'} /></label>
              </div>
              <ErrorNote error={error} />
              <button disabled={busy} className="a-btn a-btn-gold min-h-[44px]">Save movement</button>
            </form>
            {low.length > 0 && (
              <div className="card border-[#F0D9A8] bg-[#FFF4DC]">
                <div className="mb-1 font-semibold">{low.length} item{low.length > 1 ? 's' : ''} below minimum</div>
                <ul className="text-[13px] text-muted">{low.map((i) => <li key={i.id}>{i.name}: {Number(i.quantity)} of {Number(i.minLevel)} {i.unit}</li>)}</ul>
              </div>
            )}
            <section className="card">
              <h2 className="mb-2 font-display text-[17px] font-bold">Recent movements</h2>
              {!movements.data?.length ? <Empty>No movements yet.</Empty> : movements.data.slice(0, 8).map((m) => (
                <div key={m.id} className="flex justify-between border-t border-[#ECF1F8] py-2 text-[13px]">
                  <span><span className={m.direction === 'IN' ? 'font-semibold text-[#1E6B34]' : 'font-semibold text-[#B42318]'}>{m.direction === 'IN' ? '+' : '−'}{Number(m.quantity)} {m.item.unit}</span> {m.item.name}</span>
                  <span className="text-muted">{timeAgo(m.createdAt)}</span>
                </div>
              ))}
            </section>
          </div>
        </div>
      )}

      {tab === 'suppliers' && (
        <ResourceManager<Supplier>
          endpoint="/admin/inventory/suppliers"
          noun="supplier"
          columns={[
            { label: 'Supplier', render: (s) => <span className="font-semibold">{s.name}</span> },
            { label: 'Location', render: (s) => s.location || '—' },
            { label: 'Phone', render: (s) => s.phone ? <a href={`tel:${s.phone}`}>{s.phone}</a> : '—' },
            { label: 'Supplies', render: (s) => s.supplies },
          ]}
          fields={[
            { name: 'name', label: 'Name', required: true },
            { name: 'location', label: 'Location' },
            { name: 'phone', label: 'Phone' },
            { name: 'supplies', label: 'What they supply', full: true },
          ]}
        />
      )}
    </>
  );
}
