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
    <div className="flex min-h-screen bg-ink">
      <div className="relative hidden flex-1 overflow-hidden lg:block">
        <div className="phd absolute inset-0" />
        <Image src="/brand/logo-full-white.png" alt="" width={900} height={859} className="absolute left-14 top-14 h-40 w-auto opacity-90" />
        <div className="absolute inset-0 flex flex-col justify-end p-14 text-white">
          <p className="font-serif text-6xl leading-none">Quality we <em className="text-gold">make</em>.<br />Skills we <em className="text-gold">share</em>.</p>
          <p className="mt-4 text-muted-mist">DaMarios admin · production and training in one place.</p>
        </div>
      </div>
      <div className="flex flex-1 items-center justify-center bg-paper p-6">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-3">
            <Image src="/brand/logo-mark.png" alt="DaMarios" width={400} height={417} className="h-12 w-auto" priority />
            <div><h1 className="font-display text-2xl font-bold">Staff login</h1><p className="text-sm text-muted">DaMarios admin panel</p></div>
          </div>
          <Suspense fallback={null}><LoginForm /></Suspense>
          <Link href="/" className="mt-6 block text-center text-sm text-muted hover:text-ink">← Back to the website</Link>
        </motion.div>
      </div>
    </div>
  );
}
