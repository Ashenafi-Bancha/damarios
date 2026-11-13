'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import clsx from 'clsx';
import {
  Bell, Boxes, BriefcaseBusiness, ExternalLink, Factory, Gauge, Globe, GraduationCap, LogOut, Menu, Settings, ShieldCheck, Shirt,
  ShoppingBag, Sparkles, UserRound, Users, Wallet, X,
} from 'lucide-react';
import { api } from '@/lib/api';
import { etDateAm, gcDate } from '@/lib/format';

export interface Me { id: string; name: string; email: string; role: string; modules: string[] }
const MeCtx = createContext<Me | null>(null);
export const useMe = () => useContext(MeCtx);

const NAV: { group: string; items: { href: string; label: string; module: string; Icon: typeof Gauge }[] }[] = [
  { group: 'Overview', items: [{ href: '/admin', label: 'Dashboard', module: 'dashboard', Icon: Gauge }] },
  { group: 'Sales', items: [
    { href: '/admin/orders', label: 'Orders', module: 'orders', Icon: ShoppingBag },
    { href: '/admin/customers', label: 'Customers', module: 'customers', Icon: UserRound },
  ] },
  { group: 'Production', items: [
    { href: '/admin/production', label: 'Garments & spices', module: 'production', Icon: Factory },
    { href: '/admin/inventory', label: 'Inventory', module: 'inventory', Icon: Boxes },
    { href: '/admin/fashion', label: 'Designs & events', module: 'fashion', Icon: Sparkles },
  ] },
  { group: 'Training center', items: [{ href: '/admin/training', label: 'Classes & students', module: 'training', Icon: GraduationCap }] },
  { group: 'People', items: [
    { href: '/admin/employees', label: 'Employees & payroll', module: 'employees', Icon: Users },
    { href: '/admin/recruitment', label: 'Recruitment', module: 'recruitment', Icon: BriefcaseBusiness },
  ] },
  { group: 'Business', items: [
    { href: '/admin/finance', label: 'Finance & reports', module: 'finance', Icon: Wallet },
    { href: '/admin/website', label: 'Website content', module: 'website', Icon: Globe },
    { href: '/admin/users', label: 'Users & roles', module: 'users', Icon: ShieldCheck },
    { href: '/admin/settings', label: 'Settings', module: 'settings', Icon: Settings },
  ] },
];

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const [me, setMe] = useState<Me | null>(null);
  const [failed, setFailed] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    api<Me>('/auth/me').then(setMe).catch(() => setFailed(true));
  }, []);
  useEffect(() => { setNavOpen(false); }, [pathname]);

  if (failed) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-paper p-6 text-center">
        <div className="card max-w-sm">
          <p className="mb-4">Please log in to open the admin panel.</p>
          <Link href={`/admin/login?next=${encodeURIComponent(pathname)}`} className="a-btn a-btn-ink">Go to login</Link>
        </div>
      </div>
    );
  }
  if (!me) return <div className="flex min-h-screen items-center justify-center bg-paper text-muted">Loading the admin panel…</div>;

  const can = (m: string) => me.role === 'OWNER' || me.modules.includes(m);
  const active = (href: string) => (href === '/admin' ? pathname === '/admin' : pathname.startsWith(href));
  const logout = async () => { await api('/auth/logout', { method: 'POST' }).catch(() => {}); router.push('/admin/login'); };
  const current = NAV.flatMap((g) => g.items).filter((i) => active(i.href)).pop();
  const allowedHere = !current || can(current.module);

  const sidebar = (
    <aside className="flex h-full flex-col gap-5 bg-ink-soft px-3.5 py-5 text-muted-mist">
      <div className="flex items-center justify-between px-1.5">
        <Link href="/admin" className="flex items-center gap-2.5">
          <span className="flex flex-col gap-1">
            <Image src="/brand/logo-compact-white.png" alt="DaMarios" width={1200} height={301} className="h-8 w-auto" />
            <span className="text-xs">Admin panel</span>
          </span>
        </Link>
        <button type="button" onClick={() => setNavOpen(false)} aria-label="Close menu" className="flex h-10 w-10 items-center justify-center rounded-lg lg:hidden"><X className="h-5 w-5" /></button>
      </div>
      <nav aria-label="Admin" className="flex flex-1 flex-col gap-3.5 overflow-y-auto">
        {NAV.map((g) => {
          const items = g.items.filter((i) => can(i.module));
          if (!items.length) return null;
          return (
            <div key={g.group} className="flex flex-col gap-0.5">
              <span className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-[.12em] text-[#8F99A8]">{g.group}</span>
              {items.map(({ href, label, Icon }) => (
                <Link key={href} href={href} aria-current={active(href) ? 'page' : undefined}
                  className={clsx('flex min-h-[40px] items-center gap-2.5 rounded-lg px-3 text-sm font-medium transition-colors', active(href) ? 'bg-gold-admin text-ink' : 'hover:bg-[#222D3B] hover:text-white')}>
                  <Icon className="h-4 w-4" />{label}
                </Link>
              ))}
            </div>
          );
        })}
      </nav>
      <Link href="/" target="_blank" className="flex min-h-[40px] items-center gap-2.5 rounded-lg px-3 text-sm hover:bg-[#222D3B] hover:text-white"><ExternalLink className="h-4 w-4" />View website</Link>
    </aside>
  );

  return (
    <MeCtx.Provider value={me}>
      <div className="min-h-screen bg-paper font-sans text-ink-soft">
        <div className="fixed inset-y-0 left-0 z-30 hidden w-[248px] lg:block">{sidebar}</div>
        {navOpen && (
          <div className="fixed inset-0 z-40 lg:hidden">
            <button type="button" aria-label="Close menu" className="absolute inset-0 bg-ink/50" onClick={() => setNavOpen(false)} />
            <div className="relative h-full w-[272px]">{sidebar}</div>
          </div>
        )}
        <div className="lg:pl-[248px]">
          <header className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-3 border-b border-[#DCE4F0] bg-white/90 px-4 py-3 backdrop-blur md:px-7">
            <button type="button" onClick={() => setNavOpen(true)} aria-label="Open menu" className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#C9D5E8] lg:hidden"><Menu className="h-5 w-5" /></button>
            <div className="hidden text-sm text-muted md:block">{current?.label ?? 'Admin'}</div>
            <div className="ml-auto flex items-center gap-4">
              <div className="hidden flex-col items-end text-[13px] leading-tight sm:flex">
                <span className="font-ethiopic font-medium">{etDateAm(new Date())}</span>
                <span className="text-muted">{gcDate(new Date())}</span>
              </div>
              <Link href="/admin/orders?tab=requests" aria-label="Website requests" className="flex h-10 w-10 items-center justify-center rounded-[10px] border border-[#C9D5E8] hover:bg-paper"><Bell className="h-5 w-5" /></Link>
              <div className="flex items-center gap-2.5">
                <span className="flex h-[38px] w-[38px] items-center justify-center rounded-full bg-gold-admin font-semibold">{me.name.charAt(0).toUpperCase()}</span>
                <span className="hidden flex-col text-[13px] leading-tight md:flex"><span className="font-semibold">{me.name}</span><span className="capitalize text-muted">{me.role.toLowerCase()}</span></span>
              </div>
              <button type="button" onClick={logout} aria-label="Log out" title="Log out" className="flex h-10 w-10 items-center justify-center rounded-[10px] hover:bg-paper"><LogOut className="h-5 w-5" /></button>
            </div>
          </header>
          <main className="flex flex-col gap-5 p-4 pb-10 md:p-7">
            {allowedHere ? children : (
              <div className="card text-center"><Shirt className="mx-auto mb-3 h-8 w-8 text-muted" /><p>Your role cannot open this section. Ask the owner for access.</p></div>
            )}
          </main>
        </div>
      </div>
    </MeCtx.Provider>
  );
}
