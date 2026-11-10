'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import { gcDate, label } from '@/lib/format';
import { Bar, Empty, ErrorNote, Loading, Modal, PageHeader, Pill, useAction, useApi } from '@/components/admin/ui';
import ResourceManager from '@/components/admin/ResourceManager';

interface WorkOrder { id: string; title: string; unit: string; target: number; done: number; dueDate: string | null; status: string; order: { code: string } | null }
interface Line { id: string; name: string; division: 'GARMENT' | 'SPICE'; workers: number; workOrders: WorkOrder[] }
interface Product { id: string; name: string; division: string; description: string; packSizes: string; markets: string; imageUrl: string | null; published: boolean; [k: string]: unknown }
interface Output { id: string; pieces: number; defects: number; createdAt: string; employee: { name: string; role: string }; workOrder: { title: string; order: { code: string } | null } }
interface Employee { id: string; name: string; role: string }

const STATUS_TONE: Record<string, string> = { ON_TRACK: 'green', BEHIND: 'red', DONE: 'blue', PLANNED: 'gray' };

export default function ProductionPage() {
  const lines = useApi<Line[]>('/admin/production/lines');
  const output = useApi<Output[]>('/admin/production/output');
  const employees = useApi<Employee[]>('/admin/people/employees?active=true');
  const orders = useApi<{ id: string; code: string; title: string }[]>('/admin/orders');
  const [entry, setEntry] = useState({ employeeId: '', workOrderId: '', pieces: '', defects: '0' });
  const [saved, setSaved] = useState(false);
  const [newWo, setNewWo] = useState(false);
  const [newLine, setNewLine] = useState(false);
  const { busy, error, run } = useAction();
  const allWo = (lines.data ?? []).flatMap((l) => l.workOrders.map((w) => ({ ...w, line: l.name })));
  const total = output.data?.reduce((s, o) => s + o.pieces, 0) ?? 0;
  const defects = output.data?.reduce((s, o) => s + o.defects, 0) ?? 0;

  async function record(e: React.FormEvent) {
    e.preventDefault();
    setSaved(false);
    if (await run(() => api('/admin/production/output', { method: 'POST', body: { ...entry, pieces: Number(entry.pieces), defects: Number(entry.defects || 0) } }))) {
      setSaved(true);
      setEntry({ ...entry, pieces: '', defects: '0' });
      output.reload(); lines.reload();
    }
  }

  return (
    <>
      <PageHeader title="Garments & spices" sub="What every garment and spice line is making, and how much is done.">
        <button type="button" onClick={() => setNewLine(true)} className="a-btn a-btn-line">+ Production line</button>
        <button type="button" onClick={() => setNewWo(true)} className="a-btn a-btn-gold">+ Work order</button>
      </PageHeader>
      <ErrorNote error={lines.error} />
      {lines.loading && !lines.data ? <Loading /> : (
        <div className="grid grid-cols-[repeat(auto-fit,minmax(250px,1fr))] gap-3.5">
          {lines.data?.map((l) => {
            const target = l.workOrders.reduce((s, w) => s + w.target, 0);
            const done = l.workOrders.reduce((s, w) => s + w.done, 0);
            const w = l.workOrders[0];
            return (
              <div key={l.id} className="card flex flex-col gap-2 p-4">
                <div className="flex items-center justify-between gap-2"><span className="font-display text-base font-bold">{l.name}</span>{w ? <Pill tone={STATUS_TONE[w.status]}>{label(w.status)}</Pill> : <Pill>Free</Pill>}</div>
                <div><Pill tone={l.division === 'SPICE' ? 'orange' : 'blue'}>{l.division === 'SPICE' ? 'Spices' : 'Garments'}</Pill></div>
                <div className="text-[13px] text-muted">{w ? `${w.order?.code ?? ''} ${w.title}` : 'No active work order'} · {l.workers} workers</div>
                <Bar pct={target ? (done / target) * 100 : 0} />
                <div className="flex justify-between text-[13px]"><span className="font-semibold">{done} / {target} {w?.unit ?? (l.division === 'SPICE' ? 'kg' : 'pcs')}</span><span className="text-muted">{w?.dueDate ? `Due ${gcDate(w.dueDate, { day: 'numeric', month: 'short' })}` : ''}</span></div>
              </div>
            );
          })}
        </div>
      )}

      <div className="flex flex-wrap items-start gap-4">
        <form onSubmit={record} className="card flex flex-[1_1_320px] flex-col gap-3">
          <h2 className="font-display text-[17px] font-bold">Record output</h2>
          <p className="text-[13px] text-muted">Supervisors enter pieces (garments) or kilograms (spices) at the end of each shift. This feeds piece-rate pay.</p>
          <label className="a-label">Worker
            <select className="a-input" required value={entry.employeeId} onChange={(e) => setEntry({ ...entry, employeeId: e.target.value })}>
              <option value="">Choose…</option>{employees.data?.map((x) => <option key={x.id} value={x.id}>{x.name} · {x.role}</option>)}
            </select>
          </label>
          <label className="a-label">Work order
            <select className="a-input" required value={entry.workOrderId} onChange={(e) => setEntry({ ...entry, workOrderId: e.target.value })}>
              <option value="">Choose…</option>{allWo.map((w) => <option key={w.id} value={w.id}>{w.line} · {w.title} ({w.unit})</option>)}
            </select>
          </label>
          <div className="grid grid-cols-2 gap-2.5">
            <label className="a-label">Amount done ({allWo.find((w) => w.id === entry.workOrderId)?.unit ?? 'pcs'})<input className="a-input" type="number" min="0" required value={entry.pieces} onChange={(e) => setEntry({ ...entry, pieces: e.target.value })} /></label>
            <label className="a-label">Defects<input className="a-input" type="number" min="0" value={entry.defects} onChange={(e) => setEntry({ ...entry, defects: e.target.value })} /></label>
          </div>
          <ErrorNote error={error} />
          <button disabled={busy} className="a-btn a-btn-gold min-h-[44px]">Save entry</button>
          {saved && <p role="status" className="text-[13px] font-semibold text-[#1E6B34]">Saved. Added to today’s log.</p>}
        </form>

        <section className="card flex-[2_1_520px] p-0">
          <h2 className="px-[18px] pb-1.5 pt-4 font-display text-[17px] font-bold">Today’s output log</h2>
          {!output.data?.length ? <Empty>No output recorded today.</Empty> : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead><tr><th className="th">Time</th><th className="th">Worker</th><th className="th">Work order</th><th className="th">Amount</th><th className="th">Defects</th></tr></thead>
                <tbody>{output.data.map((o) => (
                  <tr key={o.id}><td className="td">{new Date(o.createdAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</td><td className="td font-semibold">{o.employee.name}</td><td className="td">{o.workOrder.order?.code ?? ''} {o.workOrder.title}</td><td className="td">{o.pieces}</td><td className={'td font-semibold ' + (o.defects ? 'text-[#B42318]' : 'text-muted')}>{o.defects}</td></tr>
                ))}</tbody>
              </table>
            </div>
          )}
          <div className="flex flex-wrap gap-6 px-[18px] py-3.5 text-sm"><span>Entries today: <strong>{output.data?.length ?? 0}</strong></span><span>Defect rate: <strong className="text-[#B42318]">{total ? ((defects / total) * 100).toFixed(1) : '0'}%</strong></span></div>
        </section>
      </div>

      <ResourceManager<Product> endpoint="/admin/production/products" noun="product" title="Product catalog (shown on the website)"
        columns={[
          // eslint-disable-next-line @next/next/no-img-element
          { label: 'Photo', render: (p) => (p.imageUrl ? <img src={p.imageUrl} alt="" className="h-10 w-10 rounded-lg object-cover" /> : <span className="ph block h-10 w-10 rounded-lg" />) },
          { label: 'Product', render: (p) => <span className="font-semibold">{p.name}</span> },
          { label: 'Division', render: (p) => <Pill tone={p.division === 'SPICE' ? 'orange' : 'blue'}>{p.division === 'SPICE' ? 'Spices' : 'Garments'}</Pill> },
          { label: 'Pack sizes', render: (p) => p.packSizes || '—' },
          { label: 'Markets', render: (p) => p.markets || '—' },
          { label: 'Website', render: (p) => <Pill tone={p.published ? 'green' : 'gray'}>{p.published ? 'Shown' : 'Hidden'}</Pill> },
        ]}
        fields={[
          { name: 'name', label: 'Product name', required: true },
          { name: 'division', label: 'Division', type: 'select', required: true, options: [{ value: 'GARMENT', label: 'Garments' }, { value: 'SPICE', label: 'Spices' }] },
          { name: 'packSizes', label: 'Pack sizes (spices)', placeholder: '250 g · 500 g · 1 kg · bulk' },
          { name: 'markets', label: 'Markets', placeholder: 'Local · Wholesale · Export' },
          { name: 'description', label: 'Short description', type: 'textarea' },
          { name: 'sortOrder', label: 'Position (lower first)', type: 'number' },
          { name: 'imageUrl', label: 'Photo', type: 'image' },
          { name: 'published', label: 'Show on website', type: 'checkbox' },
        ]}
        defaults={{ division: 'GARMENT', published: true, sortOrder: 0 }}
      />

      <WorkOrderModal open={newWo} onClose={() => setNewWo(false)} lines={lines.data ?? []} orders={orders.data ?? []} onSaved={() => { setNewWo(false); lines.reload(); }} />
      <LineModal open={newLine} onClose={() => setNewLine(false)} onSaved={() => { setNewLine(false); lines.reload(); }} />
    </>
  );
}

function WorkOrderModal({ open, onClose, lines, orders, onSaved }: { open: boolean; onClose: () => void; lines: Line[]; orders: { id: string; code: string; title: string }[]; onSaved: () => void }) {
  const [v, setV] = useState({ lineId: '', orderId: '', title: '', target: '', dueDate: '', unit: 'pcs' });
  const { busy, error, run } = useAction();
  return (
    <Modal open={open} onClose={onClose} title="New work order">
      <form className="grid gap-3.5 sm:grid-cols-2" onSubmit={async (e) => { e.preventDefault(); if (await run(() => api('/admin/production/work-orders', { method: 'POST', body: { ...v, orderId: v.orderId || null, dueDate: v.dueDate || null, target: Number(v.target), status: 'ON_TRACK' } }))) onSaved(); }}>
        <label className="a-label">Production line<select className="a-input" required value={v.lineId} onChange={(e) => { const l = lines.find((x) => x.id === e.target.value); setV({ ...v, lineId: e.target.value, unit: l?.division === 'SPICE' ? 'kg' : 'pcs' }); }}><option value="">Choose…</option>{lines.map((l) => <option key={l.id} value={l.id}>{l.name} ({l.division === 'SPICE' ? 'spices' : 'garments'})</option>)}</select></label>
        <label className="a-label">For order (optional)<select className="a-input" value={v.orderId} onChange={(e) => { const o = orders.find((x) => x.id === e.target.value); setV({ ...v, orderId: e.target.value, title: v.title || o?.title || '' }); }}><option value="">—</option>{orders.map((o) => <option key={o.id} value={o.id}>{o.code} · {o.title}</option>)}</select></label>
        <label className="a-label sm:col-span-2">What is being made<input className="a-input" required value={v.title} onChange={(e) => setV({ ...v, title: e.target.value })} /></label>
        <div className="grid grid-cols-[1fr_96px] gap-2">
          <label className="a-label">Target amount<input className="a-input" type="number" min="1" required value={v.target} onChange={(e) => setV({ ...v, target: e.target.value })} /></label>
          <label className="a-label">Unit<select className="a-input" value={v.unit} onChange={(e) => setV({ ...v, unit: e.target.value })}><option>pcs</option><option>kg</option><option>packs</option></select></label>
        </div>
        <label className="a-label">Due date<input className="a-input" type="date" value={v.dueDate} onChange={(e) => setV({ ...v, dueDate: e.target.value })} /></label>
        <div className="sm:col-span-2"><ErrorNote error={error} /></div>
        <div className="flex justify-end gap-2 sm:col-span-2"><button type="button" onClick={onClose} className="a-btn a-btn-line">Cancel</button><button disabled={busy} className="a-btn a-btn-ink">Create</button></div>
      </form>
    </Modal>
  );
}

function LineModal({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: () => void }) {
  const [v, setV] = useState({ name: '', workers: '', division: 'GARMENT' });
  const { busy, error, run } = useAction();
  return (
    <Modal open={open} onClose={onClose} title="New production line">
      <form className="flex flex-col gap-3.5" onSubmit={async (e) => { e.preventDefault(); if (await run(() => api('/admin/production/lines', { method: 'POST', body: { name: v.name, division: v.division, workers: Number(v.workers || 0) } }))) onSaved(); }}>
        <label className="a-label">Name<input className="a-input" required value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} placeholder="e.g. Garment line 2, Spice packing" /></label>
        <label className="a-label">Division<select className="a-input" value={v.division} onChange={(e) => setV({ ...v, division: e.target.value })}><option value="GARMENT">Garments</option><option value="SPICE">Spices</option></select></label>
        <label className="a-label">Workers<input className="a-input" type="number" min="0" value={v.workers} onChange={(e) => setV({ ...v, workers: e.target.value })} /></label>
        <ErrorNote error={error} />
        <div className="flex justify-end gap-2"><button type="button" onClick={onClose} className="a-btn a-btn-line">Cancel</button><button disabled={busy} className="a-btn a-btn-ink">Create</button></div>
      </form>
    </Modal>
  );
}
