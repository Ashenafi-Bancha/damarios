'use client';

import { useEffect, useState } from 'react';
import clsx from 'clsx';
import { Plus, Trash2 } from 'lucide-react';
import { api } from '@/lib/api';
import { ErrorNote, Loading, PageHeader, useAction, useApi } from '@/components/admin/ui';

type S = Record<string, unknown>;
type Tab = 'business' | 'contact' | 'opening' | 'payroll' | 'payments' | 'notifications';
interface Bracket { from: number; to: number | null; rate: number; deduction: number }

const TABS: { id: Tab; name: string }[] = [
  { id: 'business', name: 'Business details' }, { id: 'contact', name: 'Contact & social' }, { id: 'opening', name: 'Opening date' },
  { id: 'payroll', name: 'Payroll & tax' }, { id: 'payments', name: 'Payment methods' }, { id: 'notifications', name: 'Notifications' },
];

function Text({ label, value, onChange, placeholder, type = 'text', className }: { label: string; value: unknown; onChange: (v: string) => void; placeholder?: string; type?: string; className?: string }) {
  return <label className={clsx('a-label', className)}>{label}<input className="a-input" type={type} value={String(value ?? '')} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} /></label>;
}

export default function SettingsPage() {
  const { data, error, loading, reload } = useApi<Record<string, S>>('/admin/settings');
  const [tab, setTab] = useState<Tab>('business');
  const [draft, setDraft] = useState<Record<string, S>>({});
  const [saved, setSaved] = useState(false);
  const act = useAction();
  useEffect(() => { if (data) setDraft(structuredClone(data)); }, [data]);

  const key = tab === 'opening' ? 'openingDate' : tab;
  const get = (k: string) => (draft[key] as S | undefined)?.[k];
  const set = (k: string, v: unknown) => { setSaved(false); setDraft((d) => ({ ...d, [key]: { ...((d[key] as S) ?? {}), [k]: v } })); };

  async function save() {
    const value = draft[key];
    if (await act.run(() => api(`/admin/settings/${key}`, { method: 'PUT', body: { value } }))) { setSaved(true); reload(); }
  }

  if (loading && !data) return <Loading />;
  const brackets = (get('brackets') as Bracket[] | undefined) ?? [];
  const setBracket = (i: number, k: keyof Bracket, v: string) => set('brackets', brackets.map((b, j) => (j === i ? { ...b, [k]: v === '' ? (k === 'to' ? null : 0) : Number(v) } : b)));

  return (
    <>
      <PageHeader title="Settings" sub="Business details and the rules the whole system follows." />
      <ErrorNote error={error} />
      <div className="flex flex-wrap items-start gap-4">
        <nav aria-label="Settings sections" className="card flex flex-[1_1_240px] flex-col gap-1 p-2.5">
          {TABS.map((t) => (
            <button key={t.id} type="button" onClick={() => { setTab(t.id); setSaved(false); }} aria-current={tab === t.id ? 'page' : undefined}
              className={clsx('min-h-[46px] rounded-[10px] px-3.5 text-left text-sm', tab === t.id ? 'bg-[#EAF1FB] font-bold' : 'hover:bg-paper')}>{t.name}</button>
          ))}
        </nav>
        <section className="card flex flex-[3_1_560px] flex-col gap-4 p-[22px]">
          {tab === 'business' && (
            <>
              <h2 className="font-display text-xl font-bold">Business details</h2>
              <div className="grid gap-3.5 sm:grid-cols-2">
                <Text label="Business name" value={get('name')} onChange={(v) => set('name', v)} />
                <label className="a-label">Name in Amharic<input className="a-input font-ethiopic" value={String(get('nameAm') ?? '')} onChange={(e) => set('nameAm', e.target.value)} /></label>
                <Text label="TIN number" value={get('tin')} onChange={(v) => set('tin', v)} />
                <Text label="Trade licence number" value={get('licence')} onChange={(v) => set('licence', v)} />
                <Text label="Working days" value={get('workingDays')} onChange={(v) => set('workingDays', v)} />
                <Text label="Work starts at (late after +10 min)" type="time" value={get('startTime')} onChange={(v) => set('startTime', v)} />
              </div>
            </>
          )}
          {tab === 'contact' && (
            <>
              <h2 className="font-display text-xl font-bold">Contact &amp; social</h2>
              <p className="-mt-2 text-sm text-muted">Shown in the Contact section and footer of the public website.</p>
              <div className="grid gap-3.5 sm:grid-cols-2">
                <Text label="Production & sales phone" value={get('phone')} onChange={(v) => set('phone', v)} />
                <Text label="Training center phone" value={get('trainingPhone')} onChange={(v) => set('trainingPhone', v)} />
                <Text label="Email" value={get('email')} onChange={(v) => set('email', v)} />
                <Text label="Telegram username" value={get('telegram')} onChange={(v) => set('telegram', v)} placeholder="@damarios" />
                <Text label="Opening hours" value={get('hours')} onChange={(v) => set('hours', v)} />
                <Text label="Address" value={get('address')} onChange={(v) => set('address', v)} className="sm:col-span-2" />
                <Text label="Instagram link" value={get('instagram')} onChange={(v) => set('instagram', v)} placeholder="https://instagram.com/…" />
                <Text label="TikTok link" value={get('tiktok')} onChange={(v) => set('tiktok', v)} />
                <Text label="Facebook link" value={get('facebook')} onChange={(v) => set('facebook', v)} />
                <Text label="YouTube link" value={get('youtube')} onChange={(v) => set('youtube', v)} />
                <Text label="Google Maps embed link" value={get('mapUrl')} onChange={(v) => set('mapUrl', v)} placeholder="https://www.google.com/maps/embed?pb=…" className="sm:col-span-2" />
              </div>
            </>
          )}
          {tab === 'opening' && (
            <>
              <h2 className="font-display text-xl font-bold">Grand opening date</h2>
              <p className="-mt-2 text-sm text-muted">Drives the countdown on the website.</p>
              <label className="a-label max-w-xs">Date<input className="a-input" type="date" value={typeof draft.openingDate === 'string' ? (draft.openingDate as unknown as string) : ''}
                onChange={(e) => { setSaved(false); setDraft((d) => ({ ...d, openingDate: e.target.value as unknown as S })); }} /></label>
            </>
          )}
          {tab === 'payroll' && (
            <>
              <h2 className="font-display text-xl font-bold">Payroll &amp; tax</h2>
              <p className="rounded-[10px] bg-[#FFF4DC] px-3.5 py-3 text-sm font-medium text-[#6B4A00]">Ethiopian tax and pension rules change. Ask the company’s accountant to confirm every value here before the first payroll.</p>
              <div className="grid gap-3.5 sm:grid-cols-3">
                <Text label="Pension: employee (%)" type="number" value={get('pensionEmployee')} onChange={(v) => set('pensionEmployee', Number(v))} />
                <Text label="Pension: employer (%)" type="number" value={get('pensionEmployer')} onChange={(v) => set('pensionEmployer', Number(v))} />
                <Text label="Overtime (× hourly pay)" type="number" value={get('overtimeMultiplier')} onChange={(v) => set('overtimeMultiplier', Number(v))} />
              </div>
              <div>
                <div className="mb-2 text-[13px] font-medium">Monthly income tax brackets (ETB)</div>
                <table className="w-full border-collapse text-sm">
                  <thead><tr>{['From', 'To (empty = and above)', 'Rate %', 'Deduction', ''].map((h) => <th key={h} className="th">{h}</th>)}</tr></thead>
                  <tbody>
                    {brackets.map((b, i) => (
                      <tr key={i}>
                        {(['from', 'to', 'rate', 'deduction'] as const).map((k) => (
                          <td key={k} className="border-b border-[#ECF1F8] p-1.5"><input aria-label={k} className="a-input min-h-[38px]" type="number" value={b[k] ?? ''} onChange={(e) => setBracket(i, k, e.target.value)} /></td>
                        ))}
                        <td className="border-b border-[#ECF1F8] p-1.5"><button type="button" aria-label="Remove bracket" onClick={() => set('brackets', brackets.filter((_, j) => j !== i))} className="flex h-9 w-9 items-center justify-center rounded-lg text-[#B42318] hover:bg-[#FDE7E5]"><Trash2 className="h-4 w-4" /></button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {brackets.length === 0 && <p className="py-3 text-sm text-muted">No brackets yet. Payroll calculates income tax as 0 until you add them.</p>}
                <button type="button" onClick={() => set('brackets', [...brackets, { from: brackets.length ? (brackets[brackets.length - 1].to ?? 0) + 1 : 0, to: null, rate: 0, deduction: 0 }])} className="a-btn a-btn-line mt-2"><Plus className="h-4 w-4" />Add bracket</button>
              </div>
            </>
          )}
          {tab === 'payments' && (
            <>
              <h2 className="font-display text-xl font-bold">Payment methods</h2>
              <div className="grid gap-3.5 sm:grid-cols-2">
                <Text label="Telebirr merchant / short code" value={get('telebirr')} onChange={(v) => set('telebirr', v)} />
                <Text label="CBE Birr account" value={get('cbeBirr')} onChange={(v) => set('cbeBirr', v)} />
                <Text label="Bank name and account" value={get('bank')} onChange={(v) => set('bank', v)} className="sm:col-span-2" />
                <Text label="Deposit for custom orders (%)" type="number" value={get('depositPercent')} onChange={(v) => set('depositPercent', Number(v))} />
              </div>
            </>
          )}
          {tab === 'notifications' && (
            <>
              <h2 className="font-display text-xl font-bold">Telegram notifications</h2>
              <p className="-mt-2 text-sm text-muted">The bot itself is connected in the server’s .env file (TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID).</p>
              {[['newRequest', 'New request from the website'], ['newApplication', 'New job or model application'], ['lowStock', 'Low stock alert'], ['overdue', 'Order is overdue'], ['dailySummary', 'Daily summary every evening'], ['payment', 'Payment received']].map(([k, l]) => (
                <label key={k} className="flex min-h-[48px] items-center justify-between gap-3 border-t border-[#ECF1F8] text-sm">
                  {l}<input type="checkbox" checked={!!get(k)} onChange={(e) => set(k, e.target.checked)} className="h-5 w-5 accent-teal" />
                </label>
              ))}
            </>
          )}
          <ErrorNote error={act.error} />
          <div className="flex items-center gap-3 border-t border-[#ECF1F8] pt-4">
            <button type="button" disabled={act.busy} onClick={save} className="a-btn a-btn-gold min-h-[44px]">{act.busy ? 'Saving…' : 'Save settings'}</button>
            {saved && <span role="status" className="text-sm font-semibold text-[#1E6B34]">Saved</span>}
          </div>
        </section>
      </div>
    </>
  );
}
