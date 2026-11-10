'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import { label, timeAgo } from '@/lib/format';
import { ErrorNote, Loading, Modal, PageHeader, Pill, useAction, useApi } from '@/components/admin/ui';
import { useMe } from '@/components/admin/AdminShell';

interface User { id: string; name: string; email: string; phone: string | null; role: string; active: boolean; lastActiveAt: string | null }
interface Perms { modules: string[]; roles: string[]; granted: string[] }
interface Activity { id: string; action: string; createdAt: string; user: { name: string } | null }

const ROLES = ['OWNER', 'MANAGER', 'DESIGNER', 'ACCOUNTANT', 'STOREKEEPER', 'SALES'];
const ROLE_NAME: Record<string, string> = { OWNER: 'Owner', MANAGER: 'Manager', DESIGNER: 'Designer', ACCOUNTANT: 'Accountant / HR', STOREKEEPER: 'Store keeper', SALES: 'Sales' };

export default function UsersPage() {
  const me = useMe();
  const users = useApi<User[]>('/admin/users');
  const perms = useApi<Perms>('/admin/permissions');
  const log = useApi<Activity[]>('/admin/activity');
  const [editing, setEditing] = useState<User | 'new' | null>(null);
  const act = useAction();

  async function toggle(role: string, module: string, allowed: boolean) {
    if (!perms.data) return;
    const key = `${role}|${module}`;
    perms.setData({ ...perms.data, granted: allowed ? [...perms.data.granted, key] : perms.data.granted.filter((g) => g !== key) });
    const ok = await act.run(() => api('/admin/permissions', { method: 'PUT', body: { role, module, allowed } }));
    if (!ok) perms.reload();
  }

  return (
    <>
      <PageHeader title="Users & roles" sub="Who can log in to the admin panel, and what each role can open.">
        <button type="button" onClick={() => setEditing('new')} className="a-btn a-btn-gold">+ Invite user</button>
      </PageHeader>
      <ErrorNote error={users.error || act.error} />
      <div className="flex flex-wrap items-start gap-4">
        <section className="card flex-[3_1_560px] overflow-x-auto p-0">
          <h2 className="px-[18px] pb-1.5 pt-4 font-display text-[17px] font-bold">Team accounts</h2>
          {users.loading && !users.data ? <div className="px-5"><Loading /></div> : (
            <table className="w-full border-collapse">
              <thead><tr>{['Name', 'Role', 'Email', 'Status', 'Last active', ''].map((h) => <th key={h} className="th">{h}</th>)}</tr></thead>
              <tbody>{users.data?.map((u) => (
                <tr key={u.id}>
                  <td className="td font-semibold">{u.name}{u.id === me?.id && <span className="ml-1.5 text-xs font-normal text-muted">(you)</span>}</td>
                  <td className="td">{ROLE_NAME[u.role]}</td>
                  <td className="td text-muted">{u.email}</td>
                  <td className="td"><Pill tone={u.active ? 'green' : 'gray'}>{u.active ? 'Active' : 'Disabled'}</Pill></td>
                  <td className="td text-muted">{u.lastActiveAt ? timeAgo(u.lastActiveAt) : 'Never'}</td>
                  <td className="td text-right"><button type="button" onClick={() => setEditing(u)} className="font-semibold text-teal">Edit</button></td>
                </tr>
              ))}</tbody>
            </table>
          )}
        </section>
        <section className="card flex-[2_1_320px]">
          <h2 className="mb-3 font-display text-[17px] font-bold">Activity log</h2>
          <ol className="flex max-h-[380px] flex-col gap-3 overflow-y-auto text-[13px]">
            {log.data?.map((l) => (
              <li key={l.id} className="flex gap-2.5"><span className="w-16 flex-none text-muted">{timeAgo(l.createdAt)}</span><span><strong>{l.user?.name ?? 'System'}</strong> {l.action}</span></li>
            ))}
            {log.data?.length === 0 && <li className="text-muted">Nothing yet.</li>}
          </ol>
        </section>
      </div>

      <section className="card overflow-x-auto p-0">
        <div className="flex flex-wrap items-center justify-between gap-2 px-[18px] pb-1.5 pt-4">
          <h2 className="font-display text-[17px] font-bold">What each role can open</h2>
          <span className="text-[13px] text-muted">Tick a box to give or remove access. The owner always has everything.</span>
        </div>
        {perms.data && (
          <table className="w-full border-collapse">
            <thead><tr><th className="th">Section</th><th className="th text-center">Owner</th>{perms.data.roles.map((r) => <th key={r} className="th text-center">{ROLE_NAME[r]}</th>)}</tr></thead>
            <tbody>{perms.data.modules.map((m) => (
              <tr key={m}>
                <td className="td font-semibold">{label(m)}</td>
                <td className="td text-center"><input type="checkbox" checked disabled aria-label={`Owner can open ${m}`} className="h-[18px] w-[18px] accent-teal" /></td>
                {perms.data!.roles.map((r) => {
                  const on = perms.data!.granted.includes(`${r}|${m}`);
                  return <td key={r} className="td text-center"><input type="checkbox" checked={on} onChange={() => toggle(r, m, !on)} aria-label={`${ROLE_NAME[r]} can open ${m}`} className="h-[18px] w-[18px] accent-teal" /></td>;
                })}
              </tr>
            ))}</tbody>
          </table>
        )}
      </section>

      {editing && <UserModal user={editing === 'new' ? null : editing} isOwner={me?.role === 'OWNER'} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); users.reload(); log.reload(); }} />}
    </>
  );
}

function UserModal({ user, isOwner, onClose, onSaved }: { user: User | null; isOwner: boolean; onClose: () => void; onSaved: () => void }) {
  const [v, setV] = useState({ name: user?.name ?? '', email: user?.email ?? '', phone: user?.phone ?? '', role: user?.role ?? 'SALES', password: '', active: user?.active ?? true });
  const act = useAction();
  const roles = isOwner ? ROLES : ROLES.filter((r) => r !== 'OWNER');
  return (
    <Modal open onClose={onClose} title={user ? `Edit ${user.name}` : 'Invite user'}>
      <form className="grid gap-3.5 sm:grid-cols-2" onSubmit={async (e) => {
        e.preventDefault();
        const ok = await act.run(() => user
          ? api(`/admin/users/${user.id}`, { method: 'PATCH', body: { name: v.name, phone: v.phone, role: v.role, active: v.active, ...(v.password ? { password: v.password } : {}) } })
          : api('/admin/users', { method: 'POST', body: { name: v.name, email: v.email, phone: v.phone || undefined, role: v.role, password: v.password } }));
        if (ok) onSaved();
      }}>
        <label className="a-label">Full name<input className="a-input" required value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} /></label>
        <label className="a-label">Role<select className="a-input" value={v.role} onChange={(e) => setV({ ...v, role: e.target.value })}>{roles.map((r) => <option key={r} value={r}>{ROLE_NAME[r]}</option>)}</select></label>
        <label className="a-label">Email (for login)<input className="a-input" type="email" required disabled={!!user} value={v.email} onChange={(e) => setV({ ...v, email: e.target.value })} /></label>
        <label className="a-label">Phone<input className="a-input" value={v.phone} onChange={(e) => setV({ ...v, phone: e.target.value })} /></label>
        <label className="a-label sm:col-span-2">{user ? 'New password (leave empty to keep)' : 'Temporary password (8+ characters)'}
          <input className="a-input" type="password" autoComplete="new-password" minLength={8} required={!user} value={v.password} onChange={(e) => setV({ ...v, password: e.target.value })} />
        </label>
        {user && <label className="flex items-center gap-2.5 text-sm sm:col-span-2"><input type="checkbox" checked={v.active} onChange={(e) => setV({ ...v, active: e.target.checked })} className="h-[18px] w-[18px] accent-teal" />Account active (untick to block login)</label>}
        <div className="sm:col-span-2"><ErrorNote error={act.error} /></div>
        <div className="flex justify-end gap-2 sm:col-span-2"><button type="button" onClick={onClose} className="a-btn a-btn-line">Cancel</button><button disabled={act.busy} className="a-btn a-btn-ink">Save</button></div>
      </form>
    </Modal>
  );
}
