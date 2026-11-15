'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { api } from '@/lib/api';

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    setError('');
    try {
      await api('/auth/login', { method: 'POST', body: { email: f.get('email'), password: f.get('password') } });
      const next = params.get('next');
      router.push(next && next.startsWith('/admin') ? next : '/admin');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not log in');
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <label className="a-label">Email<input name="email" type="email" required autoComplete="username" className="a-input min-h-[48px]" /></label>
      <label className="a-label">Password<input name="password" type="password" required autoComplete="current-password" className="a-input min-h-[48px]" /></label>
      {error && <p role="alert" className="rounded-[10px] bg-[#FDE7E5] px-4 py-3 text-sm text-[#9B1C14]">{error}</p>}
      <button type="submit" disabled={busy} className="a-btn a-btn-gold min-h-[48px] text-[15px]">{busy ? <><Loader2 className="h-4 w-4 animate-spin" />Signing in…</> : 'Log in'}</button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div className="flex min-h-screen bg-paper">
      {/* Brand panel: the logo and tagline on the brand blue, no photo. */}
      <div className="relative hidden flex-1 flex-col items-center justify-center overflow-hidden bg-ink p-14 text-center text-white lg:flex">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_30%_20%,rgba(96,165,250,.22),transparent_60%),radial-gradient(ellipse_at_80%_90%,rgba(0,81,161,.45),transparent_55%)]" />
        <div className="relative flex flex-col items-center">
          <Image src="/brand/logo-full-white.png" alt="DaMarios Garment and Skill Training Center" width={900} height={859} priority className="h-48 w-auto xl:h-56" />
          <span aria-hidden="true" className="my-9 h-px w-16 bg-gold/70" />
          <p className="font-serif text-4xl leading-tight xl:text-5xl">Heritage we <em className="text-gold">weave</em>.<br />Skills we <em className="text-gold">pass on</em>.</p>
        </div>
        <p className="absolute bottom-8 text-xs tracking-[.2em] text-muted-dark">STAFF PORTAL · DAMARIOS</p>
      </div>

      {/* Sign-in */}
      <div className="flex flex-1 flex-col items-center justify-center p-5 sm:p-8">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="w-full max-w-[400px]">
          <Image src="/brand/logo-compact.png" alt="DaMarios" width={1200} height={301} priority className="mx-auto mb-8 h-10 w-auto lg:hidden" />
          <div className="rounded-2xl border border-[#DCE4F0] bg-white p-7 shadow-[0_12px_40px_rgba(6,43,87,.08)] sm:p-9">
            <h1 className="font-display text-2xl font-bold">Sign in</h1>
            <p className="mb-7 mt-1.5 text-sm text-muted">Welcome back. Sign in to the DaMarios admin panel.</p>
            <Suspense fallback={null}><LoginForm /></Suspense>
          </div>
          <Link href="/" className="mt-6 block text-center text-sm text-muted hover:text-ink">← Back to the website</Link>
        </motion.div>
      </div>
    </div>
  );
}
