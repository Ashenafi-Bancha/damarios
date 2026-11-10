'use client';

import { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import clsx from 'clsx';
import { Loader2, X } from 'lucide-react';
import { api } from '@/lib/api';

/** Loads JSON from the admin API and lets the page reload it after changes. */
export function useApi<T>(path: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(!!path);
  const reload = useCallback(async () => {
    if (!path) return;
    setLoading(true);
    try {
      setData(await api<T>(path));
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load');
    } finally {
      setLoading(false);
    }
  }, [path]);
  useEffect(() => { reload(); }, [reload]);
  return { data, setData, error, loading, reload };
}

export function PageHeader({ title, sub, children }: { title: string; sub?: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="font-display text-[28px] font-bold leading-tight">{title}</h1>
        {sub && <p className="mt-1.5 text-muted">{sub}</p>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  );
}

export function Stat({ label, value, note, tone = 'muted' }: { label: string; value: React.ReactNode; note?: string; tone?: 'good' | 'bad' | 'warn' | 'muted' }) {
  const color = { good: 'text-[#1E7A3A]', bad: 'text-[#B42318]', warn: 'text-[#6B4A00]', muted: 'text-muted' }[tone];
  return (
    <div className="card flex flex-col gap-1.5 px-[18px] py-4">
      <span className="text-[13px] text-muted">{label}</span>
      <span className="font-display text-[26px] font-bold leading-tight">{value}</span>
      {note && <span className={clsx('text-xs font-semibold', color)}>{note}</span>}
    </div>
  );
}

const PILL: Record<string, string> = {
  green: 'bg-[#E3F4E8] text-[#1E6B34]', red: 'bg-[#FDE7E5] text-[#9B1C14]', yellow: 'bg-[#FFF4DC] text-[#6B4A00]',
  blue: 'bg-[#E6EEF8] text-[#1D4E89]', purple: 'bg-[#EDE9FB] text-[#4B3A99]', orange: 'bg-[#FDEBDD] text-[#8A3B0A]',
  teal: 'bg-teal-tint text-teal', gray: 'bg-[#ECF1F8] text-muted',
};
export function Pill({ tone = 'gray', children }: { tone?: keyof typeof PILL | string; children: React.ReactNode }) {
  return <span className={clsx('pill', PILL[tone] ?? PILL.gray)}>{children}</span>;
}

export function Modal({ open, onClose, title, children, wide }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode; wide?: boolean }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink/50 p-4 pt-[8vh] backdrop-blur-sm"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={onClose}>
          <motion.div role="dialog" aria-modal="true" aria-label={title} onMouseDown={(e) => e.stopPropagation()}
            initial={{ y: 24, opacity: 0, scale: 0.98 }} animate={{ y: 0, opacity: 1, scale: 1 }} exit={{ y: 12, opacity: 0 }} transition={{ duration: 0.25 }}
            className={clsx('w-full rounded-2xl bg-white p-6 shadow-2xl', wide ? 'max-w-3xl' : 'max-w-lg')}>
            <div className="mb-5 flex items-center justify-between gap-3">
              <h2 className="font-display text-xl font-bold">{title}</h2>
              <button type="button" onClick={onClose} aria-label="Close" className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-paper"><X className="h-5 w-5" /></button>
            </div>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function Tabs<T extends string>({ tabs, value, onChange }: { tabs: { id: T; name: string; badge?: number }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div role="tablist" className="flex flex-wrap gap-1.5 border-b border-[#DCE4F0]">
      {tabs.map((t) => (
        <button key={t.id} type="button" role="tab" aria-selected={value === t.id} onClick={() => onChange(t.id)}
          className={clsx('relative min-h-[44px] px-4 text-[15px] font-semibold transition-colors', value === t.id ? 'text-ink-soft' : 'text-muted hover:text-ink-soft')}>
          {t.name}{t.badge ? <span className="ml-1.5 rounded-full bg-gold-admin px-1.5 text-xs text-ink">{t.badge}</span> : null}
          {value === t.id && <motion.span layoutId="tab-line" className="absolute inset-x-0 -bottom-px h-[3px] rounded bg-teal" />}
        </button>
      ))}
    </div>
  );
}

export function Loading() {
  return <div className="flex items-center gap-2 py-10 text-muted"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>;
}

export function ErrorNote({ error }: { error: string }) {
  if (!error) return null;
  return <p role="alert" className="rounded-[10px] bg-[#FDE7E5] px-4 py-3 text-sm text-[#9B1C14]">{error}</p>;
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <p className="py-10 text-center text-sm text-muted">{children}</p>;
}

export function Bar({ pct, color = 'bg-teal' }: { pct: number; color?: string }) {
  return (
    <div className="h-2.5 rounded-full bg-[#ECF1F8]">
      <motion.div className={clsx('h-2.5 rounded-full', color)} initial={{ width: 0 }} animate={{ width: `${Math.min(100, Math.max(0, pct))}%` }} transition={{ duration: 0.8, ease: 'easeOut' }} />
    </div>
  );
}

/** Wraps a button action with a busy state and error reporting. */
export function useAction() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const run = useCallback(async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setError('');
    try {
      await fn();
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
      return false;
    } finally {
      setBusy(false);
    }
  }, []);
  return { busy, error, setError, run };
}
