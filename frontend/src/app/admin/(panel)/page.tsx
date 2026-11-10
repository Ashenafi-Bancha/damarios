'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Bar, Empty, ErrorNote, Loading, PageHeader, Pill, Stat, useApi } from '@/components/admin/ui';
import { useMe } from '@/components/admin/AdminShell';
import { etb, gcDate, label, periodLabel, shortEtb, timeAgo } from '@/lib/format';

interface Dash {
  period: string;
  kpis: { newOrders: number; newToday: number; inProduction: number; dueThisWeek: number; present: number; late: number; staff: number; lowStock: number; income30: number; expense30: number; students: number; newApplications: number };
  stages: { stage: string; count: number }[];
  requests: { id: string; name: string; type: string; message: string; createdAt: string }[];
  production: { id: string; name: string; target: number; done: number }[];
  lowStock: { id: string; name: string; quantity: string; unit: string }[];
  attendance: { present: number; late: number; absent: number; total: number };
  upcoming: { date: string; title: string; sub: string; kind: string }[];
}

export default function Dashboard() {
  const me = useMe();
  const { data, error, loading } = useApi<Dash>('/admin/dashboard');
  if (loading && !data) return <Loading />;
  if (!data) return <ErrorNote error={error} />;
  const k = data.kpis;
  const maxStage = Math.max(1, ...data.stages.map((s) => s.count));
  const presentPct = data.attendance.total ? (data.attendance.present / data.attendance.total) * 100 : 0;
  const latePct = data.attendance.total ? (data.attendance.late / data.attendance.total) * 100 : 0;
  const hour = new Date().getHours();

  return (
    <>
      <PageHeader title={`Good ${hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening'}, ${me?.name ?? ''}`} sub={`Here is what is happening at Da Marios · ${periodLabel(data.period)}`}>
        <Link href="/admin/orders?new=1" className="a-btn a-btn-gold">+ New order</Link>
        <Link href="/admin/employees?tab=attendance" className="a-btn a-btn-line">Take attendance</Link>
      </PageHeader>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(170px,1fr))] gap-3.5">
        {[
          <Stat key="a" label="New orders" value={k.newOrders} note={`${k.newToday} in the last 24 h`} tone="good" />,
          <Stat key="b" label="In production" value={k.inProduction} />,
          <Stat key="c" label="Due this week" value={k.dueThisWeek} tone={k.dueThisWeek ? 'warn' : 'muted'} />,
          <Stat key="d" label="Present today" value={`${k.present} / ${k.staff}`} note={k.late ? `${k.late} late` : undefined} tone="warn" />,
          <Stat key="e" label="Low stock items" value={k.lowStock} note={k.lowStock ? 'Order soon' : 'All good'} tone={k.lowStock ? 'bad' : 'good'} />,
          <Stat key="g" label="Students enrolled" value={k.students} note={k.newApplications ? `${k.newApplications} new applications` : undefined} tone="good" />,
          <Stat key="f" label="Income, last 30 days" value={shortEtb(k.income30)} note={`Expenses ${shortEtb(k.expense30)}`} />,
        ].map((s, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>{s}</motion.div>
        ))}
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(320px,1fr))] gap-4">
        <section className="card">
          <h2 className="mb-3.5 flex justify-between font-display text-[17px] font-bold">Orders by stage <Link href="/admin/orders" className="font-sans text-[13px] font-semibold text-teal">Open board →</Link></h2>
          <div className="flex flex-col gap-3">
            {data.stages.map((s) => (
              <div key={s.stage} className="grid grid-cols-[120px_minmax(0,1fr)_32px] items-center gap-2.5 text-sm">
                <span className="text-muted">{label(s.stage)}</span><Bar pct={(s.count / maxStage) * 100} /><span className="text-right font-semibold">{s.count}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="card">
          <h2 className="mb-2 flex justify-between font-display text-[17px] font-bold">New from the website <Link href="/admin/orders?tab=requests" className="font-sans text-[13px] font-semibold text-teal">See all →</Link></h2>
          {data.requests.length === 0 ? <Empty>No new requests.</Empty> : data.requests.map((r) => (
            <div key={r.id} className="flex items-center justify-between gap-2.5 border-t border-[#ECF1F8] py-2.5">
              <div className="min-w-0"><div className="text-sm font-semibold">{r.name}</div><div className="truncate text-[13px] text-muted">{r.message || label(r.type)}</div></div>
              <div className="flex flex-none flex-col items-end gap-1"><Pill tone={r.type === 'MODEL_CASTING' ? 'purple' : r.type === 'MODEL_BOOKING' ? 'blue' : 'teal'}>{label(r.type)}</Pill><span className="text-xs text-muted">{timeAgo(r.createdAt)}</span></div>
            </div>
          ))}
        </section>

        <section className="card">
          <h2 className="mb-3.5 flex justify-between font-display text-[17px] font-bold">Production <Link href="/admin/production" className="font-sans text-[13px] font-semibold text-teal">Details →</Link></h2>
          <div className="flex flex-col gap-3.5">
            {data.production.length === 0 ? <Empty>No active work orders.</Empty> : data.production.map((l) => (
              <div key={l.id} className="flex flex-col gap-1.5 text-sm">
                <div className="flex justify-between"><span className="font-semibold">{l.name}</span><span className="text-muted">{l.done} / {l.target}</span></div>
                <Bar pct={l.target ? (l.done / l.target) * 100 : 0} color="bg-gold-admin" />
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(320px,1fr))] gap-4">
        <section className="card">
          <h2 className="mb-2 flex justify-between font-display text-[17px] font-bold">Low stock <Link href="/admin/inventory" className="font-sans text-[13px] font-semibold text-teal">Inventory →</Link></h2>
          {data.lowStock.length === 0 ? <Empty>Everything is above its minimum.</Empty> : data.lowStock.map((s) => (
            <div key={s.id} className="flex justify-between border-t border-[#ECF1F8] py-2.5 text-sm"><span>{s.name}</span><span className="font-semibold text-[#B42318]">{Number(s.quantity)} {s.unit} left</span></div>
          ))}
        </section>

        <section className="card">
          <h2 className="mb-3.5 flex justify-between font-display text-[17px] font-bold">Attendance today <Link href="/admin/employees?tab=attendance" className="font-sans text-[13px] font-semibold text-teal">Details →</Link></h2>
          <div className="flex items-center gap-5">
            <div className="flex h-28 w-28 flex-none items-center justify-center rounded-full" style={{ background: `conic-gradient(#0051A1 0 ${presentPct}%, #8CC4FF ${presentPct}% ${presentPct + latePct}%, #ECF1F8 ${presentPct + latePct}% 100%)` }}>
              <div className="flex h-[78px] w-[78px] flex-col items-center justify-center rounded-full bg-white"><span className="font-display text-[22px] font-bold">{data.attendance.present + data.attendance.late}</span><span className="text-[11px] text-muted">of {data.attendance.total}</span></div>
            </div>
            <ul className="flex flex-col gap-2 text-sm">
              <li className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-sm bg-teal" />Present: {data.attendance.present}</li>
              <li className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-sm bg-gold-admin" />Late: {data.attendance.late}</li>
              <li className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-sm bg-[#C9D5E8]" />Absent / leave: {data.attendance.absent}</li>
            </ul>
          </div>
        </section>

        <section className="card">
          <h2 className="mb-2 flex justify-between font-display text-[17px] font-bold">Coming up <Link href="/admin/training" className="font-sans text-[13px] font-semibold text-teal">Training →</Link></h2>
          {data.upcoming.length === 0 ? <Empty>Nothing scheduled.</Empty> : data.upcoming.map((u, i) => (
            <div key={i} className="flex items-center gap-3.5 border-t border-[#ECF1F8] py-2.5">
              <div className="w-12 flex-none rounded-[10px] bg-paper py-1.5 text-center"><div className="font-display text-lg font-bold leading-none">{gcDate(u.date, { day: '2-digit' })}</div><div className="text-[11px] text-muted">{gcDate(u.date, { month: 'short' })}</div></div>
              <div className="min-w-0"><div className="text-sm font-semibold">{u.title}</div><div className="text-[13px] text-muted">{u.sub}</div></div>
            </div>
          ))}
        </section>
      </div>

      <p className="text-[13px] text-muted">Income in the last 30 days: {etb(k.income30)} · Expenses: {etb(k.expense30)}</p>
    </>
  );
}
