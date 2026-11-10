'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import { etb, etDateShort, gcDate, label, periodLabel } from '@/lib/format';
import { Empty, ErrorNote, Loading, Modal, PageHeader, Pill, Stat, Tabs, useAction, useApi } from '@/components/admin/ui';
import ResourceManager from '@/components/admin/ResourceManager';
import { useMe } from '@/components/admin/AdminShell';

type Tab = 'staff' | 'attendance' | 'leave' | 'payroll';
interface Employee { id: string; code: string; name: string; role: string; department: string; payType: string; rate: string; phone: string | null; joinedAt: string; active: boolean; [k: string]: unknown }

const ATT_TONE: Record<string, string> = { PRESENT: 'green', LATE: 'yellow', ABSENT: 'red', LEAVE: 'gray' };
const PAY_TYPES = [{ value: 'MONTHLY', label: 'Monthly salary' }, { value: 'PIECE_RATE', label: 'Piece rate' }, { value: 'PER_BOOKING', label: 'Per day / booking' }];

function EmployeesPage() {
  const params = useSearchParams();
  const me = useMe();
  const canPayroll = me?.role === 'OWNER' || me?.modules.includes('payroll');
  const [tab, setTab] = useState<Tab>((params.get('tab') as Tab) || 'staff');
  return (
    <>
      <PageHeader title="Employees" sub="Staff records, daily attendance, leave and monthly payroll." />
      <Tabs<Tab> value={tab} onChange={setTab} tabs={[
        { id: 'staff', name: 'Staff list' }, { id: 'attendance', name: 'Attendance' }, { id: 'leave', name: 'Leave' },
        ...(canPayroll ? [{ id: 'payroll' as Tab, name: 'Payroll' }] : []),
      ]} />
      {tab === 'staff' && (
        <ResourceManager<Employee> endpoint="/admin/people/employees" noun="employee" canDelete={false}
          columns={[
            { label: 'Employee', render: (e) => <div><div className="font-semibold">{e.name}</div><div className="text-xs text-muted">{e.code}</div></div> },
            { label: 'Role', render: (e) => e.role },
            { label: 'Department', render: (e) => e.department },
            { label: 'Pay type', render: (e) => PAY_TYPES.find((p) => p.value === e.payType)?.label },
            { label: 'Rate', render: (e) => `${etb(e.rate)}${e.payType === 'PIECE_RATE' ? ' / pc' : e.payType === 'PER_BOOKING' ? ' / day' : ''}` },
            { label: 'Phone', render: (e) => e.phone || '—' },
            { label: 'Joined', render: (e) => <span className="font-ethiopic">{etDateShort(e.joinedAt)}</span> },
            { label: 'Status', render: (e) => <Pill tone={e.active ? 'green' : 'gray'}>{e.active ? 'Active' : 'Left'}</Pill> },
          ]}
          fields={[
            { name: 'code', label: 'Employee ID', required: true, placeholder: 'DM-E005' }, { name: 'name', label: 'Full name', required: true },
            { name: 'role', label: 'Role', required: true, placeholder: 'Fashion designer' }, { name: 'department', label: 'Department', required: true, placeholder: 'Design studio' },
            { name: 'payType', label: 'Pay type', type: 'select', required: true, options: PAY_TYPES }, { name: 'rate', label: 'Salary or rate (ETB)', type: 'number' },
            { name: 'phone', label: 'Phone' }, { name: 'joinedAt', label: 'Joined on', type: 'date', required: true }, { name: 'active', label: 'Currently working here', type: 'checkbox' },
          ]}
          defaults={{ payType: 'MONTHLY', active: true, joinedAt: new Date().toISOString() }}
        />
      )}
      {tab === 'attendance' && <Attendance />}
      {tab === 'leave' && <Leave />}
      {tab === 'payroll' && canPayroll && <Payroll />}
    </>
  );
}

function Attendance() {
  const today = new Date().toLocaleDateString('en-CA'); // local YYYY-MM-DD
  const [date, setDate] = useState(today);
  const { data, error, loading, reload } = useApi<{ employee: Employee; attendance: { status: string; checkIn: string | null; checkOut: string | null } | null }[]>(`/admin/people/attendance?date=${date}`);
  const act = useAction();
  const isToday = date === today;
  const time = (t: string | null | undefined) => (t ? new Date(t).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '—');
  const count = (s: string) => data?.filter((r) => r.attendance?.status === s).length ?? 0;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-3.5">
        <Stat label="Staff" value={data?.length ?? '—'} />
        <Stat label="Present" value={count('PRESENT')} tone="good" />
        <Stat label="Late" value={count('LATE')} tone="warn" />
        <Stat label="Not checked in" value={data?.filter((r) => !r.attendance).length ?? '—'} />
      </div>
      <section className="card p-0">
        <div className="flex flex-wrap items-center justify-between gap-3 px-[18px] pb-2 pt-4">
          <h2 className="font-display text-[17px] font-bold">{isToday ? 'Today' : gcDate(date)} · <span className="font-ethiopic font-medium">{etDateShort(date)}</span></h2>
          <label className="a-label flex-row items-center gap-2">Date<input type="date" className="a-input w-auto" value={date} onChange={(e) => setDate(e.target.value)} /></label>
        </div>
        <div className="px-[18px]"><ErrorNote error={error || act.error} /></div>
        {loading && !data ? <div className="px-5"><Loading /></div> : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead><tr><th className="th">Employee</th><th className="th">Check in</th><th className="th">Check out</th><th className="th">Status</th><th className="th"><span className="sr-only">Actions</span></th></tr></thead>
              <tbody>
                {data?.map(({ employee: e, attendance: a }) => (
                  <tr key={e.id}>
                    <td className="td"><span className="font-semibold">{e.name}</span> <span className="text-muted">· {e.role}</span></td>
                    <td className="td">{time(a?.checkIn)}</td>
                    <td className="td">{time(a?.checkOut)}</td>
                    <td className="td">{a ? <Pill tone={ATT_TONE[a.status]}>{label(a.status)}</Pill> : <span className="text-muted">—</span>}</td>
                    <td className="td">
                      <span className="flex flex-wrap justify-end gap-1.5">
                        {isToday && !a?.checkIn && <button type="button" disabled={act.busy} onClick={() => act.run(() => api('/admin/people/attendance/check', { method: 'POST', body: { employeeId: e.id, action: 'in' } })).then(reload)} className="a-btn a-btn-ink min-h-[34px] px-3 text-xs">Check in</button>}
                        {isToday && a?.checkIn && !a.checkOut && <button type="button" disabled={act.busy} onClick={() => act.run(() => api('/admin/people/attendance/check', { method: 'POST', body: { employeeId: e.id, action: 'out' } })).then(reload)} className="a-btn a-btn-line min-h-[34px] px-3 text-xs">Check out</button>}
                        <select aria-label={`Status for ${e.name}`} className="a-input min-h-[34px] w-auto text-xs" value={a?.status ?? ''} onChange={(ev) => act.run(() => api('/admin/people/attendance', { method: 'PUT', body: { employeeId: e.id, date, status: ev.target.value } })).then(reload)}>
                          <option value="" disabled>Set status</option>{Object.keys(ATT_TONE).map((s) => <option key={s} value={s}>{label(s)}</option>)}
                        </select>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {data?.length === 0 && <Empty>Add employees first.</Empty>}
          </div>
        )}
      </section>
    </div>
  );
}

function Leave() {
  const { data, error, reload } = useApi<{ id: string; kind: string; fromDate: string; toDate: string; status: string; employee: { name: string; role: string } }[]>('/admin/people/leave');
  const employees = useApi<Employee[]>('/admin/people/employees?active=true');
  const [open, setOpen] = useState(false);
  const [v, setV] = useState({ employeeId: '', kind: 'Annual leave', fromDate: '', toDate: '' });
  const act = useAction();
  const days = (a: string, b: string) => Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000) + 1;

  return (
    <section className="card p-0">
      <div className="flex items-center justify-between px-[18px] pb-2 pt-4"><h2 className="font-display text-[17px] font-bold">Leave requests</h2><button type="button" onClick={() => setOpen(true)} className="a-btn a-btn-gold">+ Add leave</button></div>
      <div className="px-[18px]"><ErrorNote error={error || act.error} /></div>
      {!data?.length ? <Empty>No leave requests.</Empty> : data.map((l) => (
        <div key={l.id} className="flex flex-wrap items-center justify-between gap-3 border-t border-[#ECF1F8] px-[18px] py-3.5">
          <div><div className="font-semibold">{l.employee.name} <span className="font-normal text-muted">· {l.employee.role}</span></div>
            <div className="text-[13px] text-muted">{l.kind} · <span className="font-ethiopic">{etDateShort(l.fromDate)} – {etDateShort(l.toDate)}</span> ({days(l.fromDate, l.toDate)} days)</div></div>
          {l.status === 'PENDING' ? (
            <div className="flex gap-2">
              <button type="button" disabled={act.busy} onClick={() => act.run(() => api(`/admin/people/leave/${l.id}`, { method: 'PATCH', body: { status: 'APPROVED' } })).then(reload)} className="a-btn bg-teal text-white">Approve</button>
              <button type="button" disabled={act.busy} onClick={() => act.run(() => api(`/admin/people/leave/${l.id}`, { method: 'PATCH', body: { status: 'DECLINED' } })).then(reload)} className="a-btn a-btn-line">Decline</button>
            </div>
          ) : <Pill tone={l.status === 'APPROVED' ? 'green' : 'red'}>{label(l.status)}</Pill>}
        </div>
      ))}
      <Modal open={open} onClose={() => setOpen(false)} title="Add leave">
        <form className="grid gap-3.5 sm:grid-cols-2" onSubmit={async (e) => { e.preventDefault(); if (await act.run(() => api('/admin/people/leave', { method: 'POST', body: v }))) { setOpen(false); reload(); } }}>
          <label className="a-label sm:col-span-2">Employee<select className="a-input" required value={v.employeeId} onChange={(e) => setV({ ...v, employeeId: e.target.value })}><option value="">Choose…</option>{employees.data?.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></label>
          <label className="a-label sm:col-span-2">Type<select className="a-input" value={v.kind} onChange={(e) => setV({ ...v, kind: e.target.value })}>{['Annual leave', 'Sick leave', 'Maternity leave', 'Paternity leave', 'Unpaid leave', 'Other'].map((k) => <option key={k}>{k}</option>)}</select></label>
          <label className="a-label">From<input className="a-input" type="date" required value={v.fromDate} onChange={(e) => setV({ ...v, fromDate: e.target.value })} /></label>
          <label className="a-label">To<input className="a-input" type="date" required value={v.toDate} onChange={(e) => setV({ ...v, toDate: e.target.value })} /></label>
          <div className="sm:col-span-2"><ErrorNote error={act.error} /></div>
          <div className="flex justify-end gap-2 sm:col-span-2"><button type="button" onClick={() => setOpen(false)} className="a-btn a-btn-line">Cancel</button><button disabled={act.busy} className="a-btn a-btn-ink">Save</button></div>
        </form>
      </Modal>
    </section>
  );
}

interface PayrollItem { id: string; basic: string; gross: string; tax: string; pensionEmployee: string; pensionEmployer: string; net: string; employee: Employee }
interface Run { id: string; period: string; label: string; status: string; items: PayrollItem[]; warning?: string | null }

function Payroll() {
  const list = useApi<{ current: string; runs: (Run & { totals: Record<string, number> })[] }>('/admin/people/payroll');
  const [period, setPeriod] = useState<string | null>(null);
  const p = period ?? list.data?.current ?? null;
  const run = useApi<Run | null>(p ? `/admin/people/payroll/${p}` : null);
  const [warning, setWarning] = useState<string | null>(null);
  const act = useAction();
  const items = run.data?.items ?? [];
  const sum = (k: keyof PayrollItem) => items.reduce((s, i) => s + Number(i[k]), 0);
  const periods = Array.from(new Set([list.data?.current, ...(list.data?.runs.map((r) => r.period) ?? [])].filter(Boolean))) as string[];

  async function generate() {
    if (!p) return;
    await act.run(async () => {
      const r = await api<Run>(`/admin/people/payroll/${p}/generate`, { method: 'POST' });
      setWarning(r.warning ?? null);
    });
    run.reload(); list.reload();
  }
  async function setStatus(status: string) {
    if (status === 'PAID' && !window.confirm('Mark this payroll as paid? This records the salaries as an expense.')) return;
    await act.run(() => api(`/admin/people/payroll/${p}`, { method: 'PATCH', body: { status } }));
    run.reload(); list.reload();
  }

  return (
    <div className="flex flex-col gap-4">
      <section className="card flex flex-wrap items-center justify-between gap-3.5">
        <div>
          <label className="a-label">Month (Ethiopian calendar)
            <select className="a-input w-auto font-display text-lg font-bold" value={p ?? ''} onChange={(e) => setPeriod(e.target.value)}>
              {periods.map((x) => <option key={x} value={x}>{periodLabel(x)}</option>)}
            </select>
          </label>
          <p className="mt-1.5 text-[13px] text-muted">Monthly salaries, piece-rate pay from production records and per-day pay from attendance. Status: <strong>{run.data ? label(run.data.status) : 'Not started'}</strong></p>
        </div>
        <div className="flex flex-wrap gap-2">
          {(!run.data || run.data.status === 'DRAFT') && <button type="button" disabled={act.busy} onClick={generate} className="a-btn a-btn-line">{run.data ? 'Recalculate' : 'Calculate payroll'}</button>}
          {run.data && <button type="button" onClick={() => window.print()} className="a-btn a-btn-line">Print payslips</button>}
          {run.data?.status === 'DRAFT' && <button type="button" disabled={act.busy} onClick={() => setStatus('APPROVED')} className="a-btn a-btn-ink">Approve</button>}
          {run.data?.status === 'APPROVED' && <button type="button" disabled={act.busy} onClick={() => setStatus('PAID')} className="a-btn a-btn-gold">Mark as paid</button>}
        </div>
      </section>
      <ErrorNote error={act.error || run.error} />
      {warning && <p className="rounded-[10px] bg-[#FFF4DC] px-4 py-3 text-sm font-medium text-[#6B4A00]">{warning}</p>}
      {run.loading && !run.data ? <Loading /> : run.data && (
        <>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-3.5">
            <Stat label="Gross pay" value={etb(sum('gross'))} />
            <Stat label="Income tax" value={etb(sum('tax'))} />
            <Stat label="Pension: employee" value={etb(sum('pensionEmployee'))} />
            <Stat label="Pension: employer" value={etb(sum('pensionEmployer'))} />
            <Stat label="Net to pay" value={etb(sum('net'))} tone="good" />
          </div>
          <section className="card overflow-x-auto p-0">
            <table className="w-full border-collapse">
              <thead><tr>{['Employee', 'Pay type', 'Basic', 'Gross', 'Tax', 'Pension', 'Net'].map((h) => <th key={h} className="th">{h}</th>)}</tr></thead>
              <tbody>{items.map((i) => (
                <tr key={i.id}><td className="td font-semibold">{i.employee.name} <span className="font-normal text-muted">· {i.employee.role}</span></td><td className="td">{label(i.employee.payType)}</td><td className="td">{etb(i.basic)}</td><td className="td">{etb(i.gross)}</td><td className="td">{etb(i.tax)}</td><td className="td">{etb(i.pensionEmployee)}</td><td className="td font-semibold">{etb(i.net)}</td></tr>
              ))}</tbody>
            </table>
          </section>
        </>
      )}
      {!run.loading && !run.data && <Empty>No payroll for this month yet. Press “Calculate payroll”.</Empty>}
      <p className="text-[13px] text-muted">Tax brackets and pension rates are set in Settings › Payroll &amp; tax. Confirm them with the company’s accountant before the first payroll.</p>
    </div>
  );
}

export default function Page() {
  return <Suspense fallback={<Loading />}><EmployeesPage /></Suspense>;
}
