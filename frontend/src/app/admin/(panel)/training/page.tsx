'use client';

import { useMemo, useState } from 'react';
import clsx from 'clsx';
import { Award, Printer } from 'lucide-react';
import { api } from '@/lib/api';
import { etb, gcDate, label, timeAgo } from '@/lib/format';
import { Bar, Empty, ErrorNote, Loading, Modal, PageHeader, Pill, Stat, Tabs, useAction, useApi } from '@/components/admin/ui';
import ResourceManager from '@/components/admin/ResourceManager';

type Dept = 'FASHION' | 'CULINARY' | 'BEAUTY';
type Tab = 'applications' | 'classes' | 'students' | 'courses';
interface Course { id: string; name: string; department: Dept; duration: string; fee: string; description: string; published: boolean; [k: string]: unknown }
interface Klass { id: string; name: string; instructor: string; schedule: string; capacity: number; startDate: string | null; endDate: string | null; courseId: string; course: Course; _count: { enrollments: number }; [k: string]: unknown }
interface Application { id: string; department: Dept; name: string; phone: string; preferredTime: string | null; education: string | null; age: number | null; message: string; status: string; createdAt: string; course: Course | null }
interface Enrollment {
  id: string; status: string; fee: string; paid: number; balance: number; attendancePct: number | null; result: string | null; certificateNo: string | null; certificateDate: string | null;
  student: { id: string; code: string; name: string; phone: string }; class: Klass; payments: { id: string; amount: string; method: string; date: string }[];
}
interface Summary { enrolled: number; byDept: Record<Dept, number>; newApplications: number; feesThisMonth: number; owed: number; studentsOwing: number; certificatesReady: number }

const DEPTS: { id: Dept | ''; name: string }[] = [{ id: '', name: 'All' }, { id: 'FASHION', name: 'Fashion design' }, { id: 'CULINARY', name: 'Culinary arts' }, { id: 'BEAUTY', name: 'Beautification' }];
const DEPT_NAME: Record<Dept, string> = { FASHION: 'Fashion design', CULINARY: 'Culinary arts', BEAUTY: 'Beautification' };
const DEPT_TONE: Record<Dept, string> = { FASHION: 'purple', CULINARY: 'orange', BEAUTY: 'red' };
const deptOptions = Object.entries(DEPT_NAME).map(([value, l]) => ({ value, label: l }));

export default function TrainingPage() {
  const [tab, setTab] = useState<Tab>('applications');
  const [dept, setDept] = useState<Dept | ''>('');
  const summary = useApi<Summary>('/admin/training/summary');
  const s = summary.data;

  return (
    <>
      <PageHeader title="Training center" sub="Applications, classes, students, fees and certificates for all three departments." />
      {s && (
        <div className="grid grid-cols-[repeat(auto-fit,minmax(170px,1fr))] gap-3.5">
          <Stat label="Students enrolled" value={s.enrolled} note={`Fashion ${s.byDept.FASHION} · Culinary ${s.byDept.CULINARY} · Beauty ${s.byDept.BEAUTY}`} />
          <Stat label="New applications" value={s.newApplications} note="From the website" tone="good" />
          <Stat label="Fees collected this month" value={etb(s.feesThisMonth)} />
          <Stat label="Fees still owed" value={etb(s.owed)} note={`${s.studentsOwing} students`} tone={s.owed ? 'bad' : 'good'} />
          <Stat label="Certificates ready" value={s.certificatesReady} note="Finished and fully paid" tone="warn" />
        </div>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs<Tab> value={tab} onChange={setTab} tabs={[
          { id: 'applications', name: 'Applications', badge: s?.newApplications }, { id: 'classes', name: 'Classes' },
          { id: 'students', name: 'Students & fees' }, { id: 'courses', name: 'Courses' },
        ]} />
        <div role="group" aria-label="Department" className="flex flex-wrap gap-1.5">
          {DEPTS.map((d) => (
            <button key={d.id || 'all'} type="button" onClick={() => setDept(d.id)} aria-pressed={dept === d.id}
              className={clsx('min-h-[36px] rounded-full border px-3.5 text-[13px] font-semibold', dept === d.id ? 'border-ink-soft bg-ink-soft text-white' : 'border-[#C9D5E8] bg-white')}>{d.name}</button>
          ))}
        </div>
      </div>
      {tab === 'applications' && <Applications dept={dept} onChange={summary.reload} />}
      {tab === 'classes' && <Classes dept={dept} />}
      {tab === 'students' && <Students dept={dept} onChange={summary.reload} />}
      {tab === 'courses' && (
        <ResourceManager<Course> key={dept} endpoint={`/admin/training/courses${dept ? `?department=${dept}` : ''}`} noun="course"
          columns={[
            { label: 'Course', render: (c) => <span className="font-semibold">{c.name}</span> },
            { label: 'Department', render: (c) => <Pill tone={DEPT_TONE[c.department]}>{DEPT_NAME[c.department]}</Pill> },
            { label: 'Duration', render: (c) => c.duration || '—' },
            { label: 'Fee', render: (c) => etb(c.fee) },
            { label: 'Website', render: (c) => <Pill tone={c.published ? 'green' : 'gray'}>{c.published ? 'Shown' : 'Hidden'}</Pill> },
          ]}
          fields={[
            { name: 'name', label: 'Course name', required: true, full: true },
            { name: 'department', label: 'Department', type: 'select', required: true, options: deptOptions },
            { name: 'duration', label: 'Duration', placeholder: '3 months' },
            { name: 'fee', label: 'Total fee (ETB)', type: 'number' },
            { name: 'sortOrder', label: 'Position (lower first)', type: 'number' },
            { name: 'description', label: 'Description', type: 'textarea' },
            { name: 'published', label: 'Show on website', type: 'checkbox' },
          ]}
          defaults={{ department: dept || 'FASHION', published: true, sortOrder: 0 }}
        />
      )}
    </>
  );
}

function Applications({ dept, onChange }: { dept: Dept | ''; onChange: () => void }) {
  const { data, error, loading, reload } = useApi<Application[]>('/admin/training/applications');
  const classes = useApi<Klass[]>('/admin/training/classes');
  const [accepting, setAccepting] = useState<Application | null>(null);
  const act = useAction();
  const list = (data ?? []).filter((a) => !dept || a.department === dept);
  if (loading && !data) return <Loading />;
  return (
    <section className="card p-0">
      <div className="p-4"><ErrorNote error={error || act.error} /></div>
      {list.length === 0 ? <Empty>No applications yet.</Empty> : (
        <ul>
          {list.map((a) => (
            <li key={a.id} className="flex flex-wrap items-start justify-between gap-3 border-t border-[#ECF1F8] px-5 py-4">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold">{a.name}</span>
                  <Pill tone={DEPT_TONE[a.department]}>{DEPT_NAME[a.department]}</Pill>
                  <Pill tone={a.status === 'NEW' ? 'yellow' : a.status === 'ACCEPTED' ? 'green' : 'gray'}>{label(a.status)}</Pill>
                </div>
                <div className="mt-1 text-sm text-muted">
                  {a.course?.name ?? 'Course not chosen'} · {a.preferredTime ?? 'any time'}{a.education ? ` · ${a.education}` : ''}{a.age ? ` · age ${a.age}` : ''} · {a.phone} · {timeAgo(a.createdAt)}
                </div>
                {a.message && <p className="mt-2 text-sm">{a.message}</p>}
              </div>
              <div className="flex flex-wrap gap-2">
                <a href={`tel:${a.phone}`} className="a-btn a-btn-line">Call</a>
                {a.status === 'NEW' && <button type="button" onClick={() => setAccepting(a)} className="a-btn bg-teal text-white">Accept &amp; enroll</button>}
                {a.status === 'NEW' && <button type="button" disabled={act.busy} onClick={() => act.run(() => api(`/admin/training/applications/${a.id}`, { method: 'PATCH', body: { status: 'REJECTED' } })).then(() => { reload(); onChange(); })} className="a-btn text-muted hover:bg-paper">Decline</button>}
              </div>
            </li>
          ))}
        </ul>
      )}
      {accepting && (
        <AcceptModal app={accepting} classes={(classes.data ?? []).filter((c) => c.course.department === accepting.department)} onClose={() => setAccepting(null)}
          onDone={() => { setAccepting(null); reload(); onChange(); }} />
      )}
    </section>
  );
}

function AcceptModal({ app, classes, onClose, onDone }: { app: Application; classes: Klass[]; onClose: () => void; onDone: () => void }) {
  const preferred = classes.find((c) => c.courseId === app.course?.id && c._count.enrollments < c.capacity);
  const [classId, setClassId] = useState(preferred?.id ?? '');
  const act = useAction();
  return (
    <Modal open onClose={onClose} title={`Enroll ${app.name}`}>
      <form className="flex flex-col gap-4" onSubmit={async (e) => { e.preventDefault(); if (await act.run(() => api(`/admin/training/applications/${app.id}/accept`, { method: 'POST', body: { classId } }))) onDone(); }}>
        <p className="text-sm text-muted">This creates their student record (or finds it by phone number) and enrolls them. The course fee is added to their balance.</p>
        <label className="a-label">Class
          <select className="a-input" required value={classId} onChange={(e) => setClassId(e.target.value)}>
            <option value="">Choose a class…</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id} disabled={c._count.enrollments >= c.capacity}>
                {c.course.name} · {c.name} · {c.schedule} ({c._count.enrollments}/{c.capacity}{c._count.enrollments >= c.capacity ? ', full' : ''})
              </option>
            ))}
          </select>
        </label>
        {classes.length === 0 && <p className="text-sm text-[#B42318]">There are no classes in this department yet. Add one in the Classes tab first.</p>}
        <ErrorNote error={act.error} />
        <div className="flex justify-end gap-2"><button type="button" onClick={onClose} className="a-btn a-btn-line">Cancel</button><button disabled={act.busy || !classId} className="a-btn a-btn-ink">Enroll student</button></div>
      </form>
    </Modal>
  );
}

function Classes({ dept }: { dept: Dept | '' }) {
  const courses = useApi<Course[]>('/admin/training/courses');
  const list = useMemo(() => (courses.data ?? []).filter((c) => !dept || c.department === dept), [courses.data, dept]);
  return (
    <ResourceManager<Klass> key={dept} endpoint="/admin/training/classes" noun="class"
      columns={[
        { label: 'Class', render: (c) => <div><div className="font-semibold">{c.course.name}</div><div className="text-xs text-muted">{c.name}</div></div> },
        { label: 'Department', render: (c) => <Pill tone={DEPT_TONE[c.course.department]}>{DEPT_NAME[c.course.department]}</Pill> },
        { label: 'Instructor', render: (c) => c.instructor || '—' },
        { label: 'Schedule', render: (c) => <span className="text-muted">{c.schedule || '—'}</span> },
        { label: 'Students', render: (c) => <div className="flex w-36 items-center gap-2"><div className="flex-1"><Bar pct={(c._count.enrollments / c.capacity) * 100} /></div><span>{c._count.enrollments}/{c.capacity}</span></div> },
        { label: 'Dates', render: (c) => <span className="text-muted">{c.startDate ? gcDate(c.startDate, { day: 'numeric', month: 'short' }) : '?'} – {c.endDate ? gcDate(c.endDate, { day: 'numeric', month: 'short', year: 'numeric' }) : '?'}</span> },
      ]}
      fields={[
        { name: 'courseId', label: 'Course', type: 'select', required: true, options: list.map((c) => ({ value: c.id, label: `${c.name} (${DEPT_NAME[c.department]})` })) },
        { name: 'name', label: 'Group name', required: true, placeholder: 'Morning group' },
        { name: 'instructor', label: 'Instructor' },
        { name: 'schedule', label: 'Schedule', placeholder: 'Mon–Fri 8:30–11:30' },
        { name: 'capacity', label: 'Places', type: 'number' },
        { name: 'startDate', label: 'Starts', type: 'date' },
        { name: 'endDate', label: 'Ends', type: 'date' },
      ]}
      defaults={{ capacity: 20, courseId: list[0]?.id ?? '' }}
    />
  );
}

function Students({ dept, onChange }: { dept: Dept | ''; onChange: () => void }) {
  const { data, error, loading, reload } = useApi<Enrollment[]>(`/admin/training/enrollments${dept ? `?department=${dept}` : ''}`);
  const [paying, setPaying] = useState<Enrollment | null>(null);
  const [cert, setCert] = useState<Enrollment | null>(null);
  const [adding, setAdding] = useState(false);
  const act = useAction();
  const refresh = () => { reload(); onChange(); };

  return (
    <section className="card p-0">
      <div className="flex flex-wrap items-center justify-between gap-2 px-[18px] pb-2 pt-4">
        <h2 className="font-display text-[17px] font-bold">Students &amp; fees</h2>
        <button type="button" onClick={() => setAdding(true)} className="a-btn a-btn-gold">+ Enroll a student</button>
      </div>
      <div className="px-[18px]"><ErrorNote error={error || act.error} /></div>
      {loading && !data ? <div className="px-5"><Loading /></div> : !data?.length ? <Empty>No students enrolled yet.</Empty> : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead><tr>{['Student', 'Class', 'Fee', 'Paid', 'Balance', 'Attendance', 'Status', ''].map((h) => <th key={h} className="th">{h}</th>)}</tr></thead>
            <tbody>
              {data.map((e) => (
                <tr key={e.id} className="hover:bg-[#F7FAFD]">
                  <td className="td"><div className="font-semibold">{e.student.name}</div><div className="text-xs text-muted">{e.student.code} · {e.student.phone}</div></td>
                  <td className="td">{e.class.course.name}<div className="text-xs text-muted">{e.class.name}</div></td>
                  <td className="td">{etb(e.fee)}</td>
                  <td className="td">{etb(e.paid)}</td>
                  <td className={clsx('td font-semibold', e.balance ? 'text-[#B42318]' : 'text-[#1E6B34]')}>{etb(e.balance)}</td>
                  <td className="td">
                    <select aria-label={`Attendance for ${e.student.name}`} className="a-input min-h-[34px] w-24 text-xs" value={e.attendancePct ?? ''}
                      onChange={(ev) => act.run(() => api(`/admin/training/enrollments/${e.id}`, { method: 'PATCH', body: { attendancePct: ev.target.value === '' ? null : Number(ev.target.value) } })).then(reload)}>
                      <option value="">—</option>{[100, 95, 90, 85, 80, 75, 70, 60, 50].map((p) => <option key={p} value={p}>{p}%</option>)}
                    </select>
                  </td>
                  <td className="td">{e.certificateNo ? <Pill tone="green">Certified</Pill> : <Pill tone={e.status === 'ENROLLED' ? 'blue' : e.status === 'COMPLETED' ? 'green' : 'gray'}>{label(e.status)}</Pill>}</td>
                  <td className="td">
                    <span className="flex justify-end gap-1.5">
                      {e.balance > 0 && <button type="button" onClick={() => setPaying(e)} className="a-btn a-btn-line min-h-[34px] px-3 text-xs">Record payment</button>}
                      {e.status !== 'DROPPED' && (e.certificateNo
                        ? <button type="button" onClick={() => setCert(e)} className="a-btn a-btn-line min-h-[34px] px-3 text-xs"><Printer className="h-3.5 w-3.5" />Certificate</button>
                        : <button type="button" disabled={act.busy} onClick={async () => { if (window.confirm(`Mark ${e.student.name} as completed and issue a certificate?`)) { await act.run(() => api(`/admin/training/enrollments/${e.id}/certificate`, { method: 'POST' })); refresh(); } }} className="a-btn min-h-[34px] px-3 text-xs text-teal hover:bg-teal-tint"><Award className="h-3.5 w-3.5" />Issue certificate</button>)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {paying && <PaymentModal enrollment={paying} onClose={() => setPaying(null)} onDone={() => { setPaying(null); refresh(); }} />}
      {cert && <CertificateModal enrollment={cert} onClose={() => setCert(null)} />}
      {adding && <EnrollModal onClose={() => setAdding(false)} onDone={() => { setAdding(false); refresh(); }} />}
    </section>
  );
}

function PaymentModal({ enrollment: e, onClose, onDone }: { enrollment: Enrollment; onClose: () => void; onDone: () => void }) {
  const [v, setV] = useState({ amount: String(e.balance), method: 'TELEBIRR' });
  const act = useAction();
  return (
    <Modal open onClose={onClose} title={`Fee payment · ${e.student.name}`}>
      <form className="flex flex-col gap-4" onSubmit={async (ev) => { ev.preventDefault(); if (await act.run(() => api(`/admin/training/enrollments/${e.id}/payments`, { method: 'POST', body: { amount: Number(v.amount), method: v.method } }))) onDone(); }}>
        <p className="text-sm text-muted">{e.class.course.name} · balance {etb(e.balance)}. The payment also appears in Finance.</p>
        <div className="grid grid-cols-2 gap-3">
          <label className="a-label">Amount (ETB)<input className="a-input" type="number" min="1" max={e.balance} required value={v.amount} onChange={(x) => setV({ ...v, amount: x.target.value })} /></label>
          <label className="a-label">Method<select className="a-input" value={v.method} onChange={(x) => setV({ ...v, method: x.target.value })}><option value="TELEBIRR">Telebirr</option><option value="CBE_BIRR">CBE Birr</option><option value="BANK">Bank</option><option value="CASH">Cash</option></select></label>
        </div>
        {e.payments.length > 0 && <ul className="text-[13px] text-muted">{e.payments.map((p) => <li key={p.id}>{gcDate(p.date)} · {etb(p.amount)} · {label(p.method)}</li>)}</ul>}
        <ErrorNote error={act.error} />
        <div className="flex justify-end gap-2"><button type="button" onClick={onClose} className="a-btn a-btn-line">Cancel</button><button disabled={act.busy} className="a-btn a-btn-ink">Save payment</button></div>
      </form>
    </Modal>
  );
}

function EnrollModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const classes = useApi<Klass[]>('/admin/training/classes');
  const [v, setV] = useState({ name: '', phone: '', age: '', education: '', classId: '' });
  const act = useAction();
  return (
    <Modal open onClose={onClose} title="Enroll a student">
      <form className="grid gap-3.5 sm:grid-cols-2" onSubmit={async (e) => {
        e.preventDefault();
        const ok = await act.run(async () => {
          const s = await api<{ id: string }>('/admin/training/students', { method: 'POST', body: { name: v.name, phone: v.phone, age: v.age ? Number(v.age) : null, education: v.education || null } });
          await api('/admin/training/enrollments', { method: 'POST', body: { studentId: s.id, classId: v.classId } });
        });
        if (ok) onDone();
      }}>
        <label className="a-label">Full name<input className="a-input" required minLength={2} value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} /></label>
        <label className="a-label">Phone<input className="a-input" required minLength={7} value={v.phone} onChange={(e) => setV({ ...v, phone: e.target.value })} /></label>
        <label className="a-label">Age<input className="a-input" type="number" min="10" max="90" value={v.age} onChange={(e) => setV({ ...v, age: e.target.value })} /></label>
        <label className="a-label">Education<input className="a-input" value={v.education} onChange={(e) => setV({ ...v, education: e.target.value })} placeholder="Grade 12 complete" /></label>
        <label className="a-label sm:col-span-2">Class
          <select className="a-input" required value={v.classId} onChange={(e) => setV({ ...v, classId: e.target.value })}>
            <option value="">Choose a class…</option>
            {classes.data?.map((c) => <option key={c.id} value={c.id} disabled={c._count.enrollments >= c.capacity}>{c.course.name} · {c.name} ({c._count.enrollments}/{c.capacity})</option>)}
          </select>
        </label>
        <div className="sm:col-span-2"><ErrorNote error={act.error} /></div>
        <div className="flex justify-end gap-2 sm:col-span-2"><button type="button" onClick={onClose} className="a-btn a-btn-line">Cancel</button><button disabled={act.busy} className="a-btn a-btn-ink">Enroll</button></div>
      </form>
    </Modal>
  );
}

/** A printable certificate. Use the browser's print dialog to print or save as PDF. */
function CertificateModal({ enrollment: e, onClose }: { enrollment: Enrollment; onClose: () => void }) {
  return (
    <Modal open onClose={onClose} title="Certificate" wide>
      <div id="certificate" className="rounded-lg border-[6px] border-double border-gold-admin p-10 text-center">
        <p className="font-serif text-sm tracking-[.3em] text-muted">DAMARIOS GARMENT AND SKILL TRAINING CENTER</p>
        <p className="mt-1 font-ethiopic text-sm text-muted">ዳማሪዮስ ጋርመንት እና የሙያ ስልጠና ማዕከል</p>
        <h3 className="mt-6 font-serif text-5xl">Certificate of Completion</h3>
        <p className="mt-6 text-muted">This certifies that</p>
        <p className="mt-2 font-serif text-4xl italic">{e.student.name}</p>
        <p className="mx-auto mt-4 max-w-md text-muted">has successfully completed the course <strong className="text-ink">{e.class.course.name}</strong> ({DEPT_NAME[e.class.course.department]}){e.class.course.duration ? `, ${e.class.course.duration}` : ''}{e.result ? `, with the result: ${e.result}` : ''}.</p>
        <div className="mt-10 flex items-end justify-between text-left text-sm">
          <div><div className="font-semibold">{e.certificateNo}</div><div className="text-muted">Issued {e.certificateDate ? gcDate(e.certificateDate, { day: 'numeric', month: 'long', year: 'numeric' }) : ''}</div></div>
          <div className="text-center"><div className="w-48 border-t border-ink pt-1">Dr. Senait Mario, Founder</div></div>
        </div>
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <button type="button" onClick={onClose} className="a-btn a-btn-line">Close</button>
        <button type="button" onClick={() => window.print()} className="a-btn a-btn-ink"><Printer className="h-4 w-4" />Print</button>
      </div>
    </Modal>
  );
}
