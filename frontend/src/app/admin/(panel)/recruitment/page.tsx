'use client';

import { useState } from 'react';
import clsx from 'clsx';
import { api } from '@/lib/api';
import { timeAgo } from '@/lib/format';
import { Empty, ErrorNote, Loading, Modal, PageHeader, useAction, useApi } from '@/components/admin/ui';
import ResourceManager from '@/components/admin/ResourceManager';

interface Job { id: string; title: string; kind: string; description: string; published: boolean; _count?: { applicants: number }; [k: string]: unknown }
interface Applicant { id: string; name: string; phone: string; note: string; stage: string; attachmentUrl: string | null; createdAt: string; jobId: string | null; job: { title: string } | null }

const STAGES = ['NEW', 'INTERVIEW', 'OFFER', 'HIRED'];
const STAGE_NAME: Record<string, string> = { NEW: 'New', INTERVIEW: 'Interview', OFFER: 'Offer', HIRED: 'Hired', REJECTED: 'Rejected' };

export default function RecruitmentPage() {
  const jobs = useApi<Job[]>('/admin/recruitment/jobs');
  const [jobId, setJobId] = useState('');
  const apps = useApi<Applicant[]>(`/admin/recruitment/applicants${jobId ? `?jobId=${jobId}` : ''}`);
  const [hiring, setHiring] = useState<Applicant | null>(null);
  const act = useAction();

  const move = (a: Applicant, stage: string) => act.run(() => api(`/admin/recruitment/applicants/${a.id}`, { method: 'PATCH', body: { stage } })).then(apps.reload);

  return (
    <>
      <PageHeader title="Recruitment" sub="Jobs marked “shown” appear on the website. Applications and casting requests come back here." />
      <ResourceManager<Job> key="jobs" endpoint="/admin/recruitment/jobs" noun="job" title="Open jobs" search={false}
        columns={[
          { label: 'Job', render: (j) => <button type="button" onClick={() => setJobId(jobId === j.id ? '' : j.id)} className={clsx('font-semibold hover:text-teal', jobId === j.id && 'text-teal underline')}>{j.title}</button> },
          { label: 'Type', render: (j) => j.kind },
          { label: 'Applied', render: (j) => j._count?.applicants ?? 0 },
          { label: 'Website', render: (j) => (j.published ? <span className="text-[#1E6B34]">Shown</span> : <span className="text-muted">Hidden</span>) },
        ]}
        fields={[
          { name: 'title', label: 'Job title', required: true }, { name: 'kind', label: 'Type', placeholder: 'Full time, Casting…' },
          { name: 'description', label: 'Description', type: 'textarea' }, { name: 'published', label: 'Show on website', type: 'checkbox' },
        ]}
        defaults={{ kind: 'Full time', published: true }}
      />

      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg font-bold">Applicants {jobId && <>· {jobs.data?.find((j) => j.id === jobId)?.title} <button type="button" onClick={() => setJobId('')} className="ml-2 text-sm font-semibold text-teal">Show all</button></>}</h2>
      </div>
      <ErrorNote error={apps.error || act.error} />
      {apps.loading && !apps.data ? <Loading /> : (
        <div className="overflow-x-auto pb-1">
          <div className="grid min-w-[900px] grid-cols-4 gap-3">
            {STAGES.map((stage) => {
              const cards = apps.data?.filter((a) => a.stage === stage) ?? [];
              return (
                <section key={stage} className="flex min-h-[420px] flex-col gap-2.5 rounded-[14px] bg-[#ECF1F8] p-3">
                  <h3 className="mx-1 flex justify-between text-sm font-semibold">{STAGE_NAME[stage]}<span className="rounded-full bg-white px-2 text-xs">{cards.length}</span></h3>
                  {cards.length === 0 && <Empty>—</Empty>}
                  {cards.map((a) => {
                    const i = STAGES.indexOf(a.stage);
                    return (
                      <div key={a.id} className="flex flex-col gap-1.5 rounded-xl border border-[#DCE4F0] bg-white p-3">
                        <div className="text-sm font-semibold">{a.name}</div>
                        <div className="text-[13px] text-muted">{a.job?.title ?? 'General'} · {timeAgo(a.createdAt)}</div>
                        {a.note && <div className="text-xs text-muted">{a.note}</div>}
                        <div className="flex flex-wrap gap-2 text-[13px] font-semibold">
                          <a href={`tel:${a.phone}`} className="text-teal">Call</a>
                          {a.attachmentUrl && <a href={a.attachmentUrl} target="_blank" rel="noreferrer" className="text-teal">Photo</a>}
                        </div>
                        <div className="mt-1 flex flex-wrap gap-1.5">
                          {stage !== 'HIRED' && STAGES[i + 1] !== 'HIRED' && <button type="button" disabled={act.busy} onClick={() => move(a, STAGES[i + 1])} className="a-btn a-btn-line min-h-[32px] px-2.5 text-xs">→ {STAGE_NAME[STAGES[i + 1]]}</button>}
                          {stage === 'OFFER' && <button type="button" onClick={() => setHiring(a)} className="a-btn a-btn-ink min-h-[32px] px-2.5 text-xs">Hire</button>}
                          {stage !== 'HIRED' && <button type="button" disabled={act.busy} onClick={() => move(a, 'REJECTED')} className="a-btn min-h-[32px] px-2.5 text-xs text-muted hover:bg-paper">Reject</button>}
                        </div>
                      </div>
                    );
                  })}
                </section>
              );
            })}
          </div>
        </div>
      )}
      {hiring && <HireModal applicant={hiring} onClose={() => setHiring(null)} onDone={() => { setHiring(null); apps.reload(); jobs.reload(); }} />}
    </>
  );
}

function HireModal({ applicant, onClose, onDone }: { applicant: Applicant; onClose: () => void; onDone: () => void }) {
  const [v, setV] = useState({ department: 'Workshop', payType: 'MONTHLY', rate: '' });
  const act = useAction();
  return (
    <Modal open onClose={onClose} title={`Hire ${applicant.name}`}>
      <form className="flex flex-col gap-3.5" onSubmit={async (e) => { e.preventDefault(); if (await act.run(() => api(`/admin/recruitment/applicants/${applicant.id}/hire`, { method: 'POST', body: { ...v, rate: Number(v.rate || 0) } }))) onDone(); }}>
        <p className="text-sm text-muted">This creates their employee record in Employees, with the job title “{applicant.job?.title ?? 'New hire'}”.</p>
        <label className="a-label">Department<input className="a-input" required value={v.department} onChange={(e) => setV({ ...v, department: e.target.value })} /></label>
        <label className="a-label">Pay type<select className="a-input" value={v.payType} onChange={(e) => setV({ ...v, payType: e.target.value })}><option value="MONTHLY">Monthly salary</option><option value="PIECE_RATE">Piece rate</option><option value="PER_BOOKING">Per day / booking</option></select></label>
        <label className="a-label">Salary or rate (ETB)<input className="a-input" type="number" min="0" value={v.rate} onChange={(e) => setV({ ...v, rate: e.target.value })} /></label>
        <ErrorNote error={act.error} />
        <div className="flex justify-end gap-2"><button type="button" onClick={onClose} className="a-btn a-btn-line">Cancel</button><button disabled={act.busy} className="a-btn a-btn-ink">Create employee record</button></div>
      </form>
    </Modal>
  );
}
