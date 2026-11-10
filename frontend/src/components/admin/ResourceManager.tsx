'use client';

import { useMemo, useState } from 'react';
import { Pencil, Plus, Search, Trash2, Upload } from 'lucide-react';
import { api, uploadImage } from '@/lib/api';
import { Empty, ErrorNote, Loading, Modal, useAction, useApi } from './ui';

export type FieldDef = {
  name: string;
  label: string;
  type?: 'text' | 'number' | 'date' | 'textarea' | 'select' | 'checkbox' | 'image';
  options?: { value: string; label: string }[];
  required?: boolean;
  placeholder?: string;
  full?: boolean;
};

export type Column<T> = { label: string; render: (row: T) => React.ReactNode };

type Row = { id: string } & Record<string, unknown>;

function toInput(v: unknown, type?: FieldDef['type']) {
  if (v === null || v === undefined) return type === 'checkbox' ? false : '';
  if (type === 'date') return String(v).slice(0, 10);
  return v;
}

function fromForm(fields: FieldDef[], values: Record<string, unknown>) {
  const out: Record<string, unknown> = {};
  for (const f of fields) {
    const v = values[f.name];
    if (f.type === 'checkbox') out[f.name] = !!v;
    else if (v === '' || v === undefined) out[f.name] = f.type === 'number' || f.type === 'date' || f.type === 'image' || f.type === 'select' ? null : '';
    else out[f.name] = v;
  }
  return out;
}

/** A searchable table with add, edit and delete, driven by a list of fields. Used by most admin screens. */
export default function ResourceManager<T extends Row>({
  endpoint, columns, fields, title, noun, defaults = {}, search = true, canDelete = true, extraActions, toolbar, transform, onChange,
}: {
  /** Called after any add, edit or delete, e.g. to refresh totals elsewhere on the page. */
  onChange?: () => void;
  endpoint: string;
  columns: Column<T>[];
  fields: FieldDef[];
  title?: string;
  noun: string;
  defaults?: Record<string, unknown>;
  search?: boolean;
  canDelete?: boolean;
  extraActions?: (row: T, reload: () => void) => React.ReactNode;
  toolbar?: React.ReactNode;
  transform?: (body: Record<string, unknown>) => Record<string, unknown>;
}) {
  const [q, setQ] = useState('');
  const path = useMemo(() => (q ? `${endpoint}${endpoint.includes('?') ? '&' : '?'}q=${encodeURIComponent(q)}` : endpoint), [endpoint, q]);
  const { data, error, loading, reload } = useApi<T[]>(path);
  const [editing, setEditing] = useState<T | 'new' | null>(null);
  const [values, setValues] = useState<Record<string, unknown>>({});
  const { busy, error: saveError, run, setError } = useAction();
  const base = endpoint.split('?')[0];

  function open(row: T | 'new') {
    setError('');
    setEditing(row);
    const src = row === 'new' ? defaults : row;
    setValues(Object.fromEntries(fields.map((f) => [f.name, toInput((src as Record<string, unknown>)[f.name], f.type)])));
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    let body = fromForm(fields, values);
    if (transform) body = transform(body);
    const ok = await run(() => (editing === 'new' ? api(base, { method: 'POST', body }) : api(`${base}/${(editing as T).id}`, { method: 'PATCH', body })));
    if (ok) { setEditing(null); reload(); onChange?.(); }
  }

  async function remove(row: T) {
    if (!window.confirm(`Delete this ${noun}? This cannot be undone.`)) return;
    await run(() => api(`${base}/${row.id}`, { method: 'DELETE' }));
    reload();
    onChange?.();
  }

  return (
    <section className="card p-0">
      <div className="flex flex-wrap items-center justify-between gap-3 px-[18px] pb-2 pt-4">
        {title && <h2 className="font-display text-[17px] font-bold">{title}</h2>}
        <div className="ml-auto flex flex-wrap items-center gap-2">
          {toolbar}
          {search && (
            <label className="flex min-h-[40px] items-center gap-2 rounded-[10px] border border-[#C9D5E8] px-3">
              <Search className="h-4 w-4 text-muted" />
              <span className="sr-only">Search</span>
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…" className="w-40 bg-transparent text-sm outline-none" />
            </label>
          )}
          <button type="button" onClick={() => open('new')} className="a-btn a-btn-gold"><Plus className="h-4 w-4" />Add {noun}</button>
        </div>
      </div>
      <div className="px-[18px]"><ErrorNote error={error} /></div>
      {loading && !data ? <div className="px-5"><Loading /></div> : data && data.length === 0 ? <Empty>No {noun}s yet.</Empty> : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead><tr>{columns.map((c) => <th key={c.label} className="th">{c.label}</th>)}<th className="th"><span className="sr-only">Actions</span></th></tr></thead>
            <tbody>
              {data?.map((row) => (
                <tr key={row.id} className="hover:bg-[#F7FAFD]">
                  {columns.map((c) => <td key={c.label} className="td">{c.render(row)}</td>)}
                  <td className="td text-right">
                    <span className="inline-flex items-center gap-1">
                      {extraActions?.(row, reload)}
                      <button type="button" onClick={() => open(row)} aria-label={`Edit ${noun}`} className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-paper"><Pencil className="h-4 w-4" /></button>
                      {canDelete && <button type="button" onClick={() => remove(row)} aria-label={`Delete ${noun}`} className="flex h-9 w-9 items-center justify-center rounded-lg text-[#B42318] hover:bg-[#FDE7E5]"><Trash2 className="h-4 w-4" /></button>}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={editing !== null} onClose={() => setEditing(null)} title={editing === 'new' ? `Add ${noun}` : `Edit ${noun}`} wide={fields.length > 6}>
        <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
          {fields.map((f) => <FieldInput key={f.name} field={f} value={values[f.name]} onChange={(v) => setValues((s) => ({ ...s, [f.name]: v }))} />)}
          <div className="sm:col-span-2"><ErrorNote error={saveError} /></div>
          <div className="flex justify-end gap-2 sm:col-span-2">
            <button type="button" onClick={() => setEditing(null)} className="a-btn a-btn-line">Cancel</button>
            <button type="submit" disabled={busy} className="a-btn a-btn-ink">{busy ? 'Saving…' : 'Save'}</button>
          </div>
        </form>
      </Modal>
    </section>
  );
}

export function FieldInput({ field: f, value, onChange }: { field: FieldDef; value: unknown; onChange: (v: unknown) => void }) {
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState('');
  const span = f.full || f.type === 'textarea' || f.type === 'image' ? 'sm:col-span-2' : '';
  if (f.type === 'checkbox') {
    return (
      <label className={`flex min-h-[42px] items-center gap-2.5 text-sm ${span}`}>
        <input type="checkbox" checked={!!value} onChange={(e) => onChange(e.target.checked)} className="h-[18px] w-[18px] accent-teal" />{f.label}
      </label>
    );
  }
  return (
    <label className={`a-label ${span}`}>
      {f.label}{f.required && <span className="sr-only"> (required)</span>}
      {f.type === 'textarea' ? (
        <textarea className="a-input py-2.5" rows={3} value={String(value ?? '')} placeholder={f.placeholder} onChange={(e) => onChange(e.target.value)} />
      ) : f.type === 'select' ? (
        <select className="a-input" value={String(value ?? '')} required={f.required} onChange={(e) => onChange(e.target.value)}>
          {!f.required && <option value="">—</option>}
          {f.options?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      ) : f.type === 'image' ? (
        <span className="flex items-center gap-3">
          {value ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={String(value)} alt="" className="h-16 w-16 rounded-lg object-cover" />
          ) : <span className="ph h-16 w-16 rounded-lg" />}
          <span className="a-btn a-btn-line relative cursor-pointer">
            <Upload className="h-4 w-4" />{uploading ? 'Uploading…' : value ? 'Replace photo' : 'Upload photo'}
            <input type="file" accept="image/jpeg,image/png,image/webp" className="absolute inset-0 cursor-pointer opacity-0"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                setUploading(true); setErr('');
                try { onChange(await uploadImage(file)); } catch (x) { setErr(x instanceof Error ? x.message : 'Upload failed'); } finally { setUploading(false); }
              }} />
          </span>
          {value ? <button type="button" onClick={() => onChange('')} className="text-sm text-[#B42318]">Remove</button> : null}
          {err && <span className="text-sm text-[#B42318]">{err}</span>}
        </span>
      ) : (
        <input className="a-input" type={f.type ?? 'text'} step={f.type === 'number' ? 'any' : undefined} value={String(value ?? '')} required={f.required} placeholder={f.placeholder} onChange={(e) => onChange(e.target.value)} />
      )}
    </label>
  );
}
