'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import { ErrorNote, PageHeader, useAction } from '@/components/admin/ui';
import { useMe } from '@/components/admin/AdminShell';

const ROLE_NAME: Record<string, string> = { OWNER: 'Owner', MANAGER: 'Manager', DESIGNER: 'Designer', ACCOUNTANT: 'Accountant / HR', STOREKEEPER: 'Store keeper', SALES: 'Sales' };

/** Every signed-in person: their account details and changing their own password. */
export default function AccountPage() {
  const me = useMe();
  const act = useAction();
  const [v, setV] = useState({ current: '', password: '', confirm: '' });
  const [done, setDone] = useState(false);

  const mismatch = v.confirm !== '' && v.password !== v.confirm;
  const weak = v.password !== '' && !(v.password.length >= 8 && /[A-Za-z]/.test(v.password) && /\d/.test(v.password));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (mismatch || weak) return;
    setDone(false);
    if (await act.run(() => api('/auth/password', { method: 'POST', body: { current: v.current, password: v.password } }))) {
      setV({ current: '', password: '', confirm: '' });
      setDone(true);
    }
  }

  return (
    <>
      <PageHeader title="My account" sub="Your login details and password." />
      <div className="flex flex-wrap items-start gap-4">
        <section className="card flex-[1_1_280px]">
          <h2 className="mb-3 font-display text-[17px] font-bold">Account</h2>
          <dl className="grid gap-3 text-sm">
            <div><dt className="text-muted">Name</dt><dd className="font-semibold">{me?.name}</dd></div>
            <div><dt className="text-muted">Email (login)</dt><dd className="font-semibold">{me?.email}</dd></div>
            <div><dt className="text-muted">Role</dt><dd className="font-semibold">{me ? ROLE_NAME[me.role] ?? me.role : ''}</dd></div>
          </dl>
          <p className="mt-4 text-[13px] text-muted">To change your name, email or role, ask the owner.</p>
        </section>

        <section className="card flex-[2_1_380px]">
          <h2 className="mb-3 font-display text-[17px] font-bold">Change password</h2>
          <form onSubmit={submit} className="grid max-w-md gap-3.5">
            <label className="a-label">Current password
              <input className="a-input" type="password" autoComplete="current-password" required maxLength={200} value={v.current} onChange={(e) => setV({ ...v, current: e.target.value })} />
            </label>
            <label className="a-label">New password
              <input className="a-input" type="password" autoComplete="new-password" required minLength={8} maxLength={200} value={v.password} onChange={(e) => setV({ ...v, password: e.target.value })} aria-invalid={weak} />
              <span className={weak ? 'text-xs font-normal text-[#B42318]' : 'text-xs font-normal text-muted'}>At least 8 characters, with letters and numbers.</span>
            </label>
            <label className="a-label">Repeat the new password
              <input className="a-input" type="password" autoComplete="new-password" required maxLength={200} value={v.confirm} onChange={(e) => setV({ ...v, confirm: e.target.value })} aria-invalid={mismatch} />
              {mismatch && <span className="text-xs font-normal text-[#B42318]">The two passwords are not the same.</span>}
            </label>
            <ErrorNote error={act.error} />
            {done && <p role="status" className="rounded-[10px] bg-[#E3F4E8] px-4 py-3 text-sm text-[#1E6B34]">Password changed. You stay signed in here; other devices are signed out.</p>}
            <div><button type="submit" disabled={act.busy || mismatch || weak} className="a-btn a-btn-ink">{act.busy ? 'Saving…' : 'Change password'}</button></div>
          </form>
        </section>
      </div>
    </>
  );
}
