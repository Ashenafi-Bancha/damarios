'use client';

import { useEffect } from 'react';
import Link from 'next/link';

/** Shown if a page fails unexpectedly; the visitor can try again without losing the site. */
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]);
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-5 bg-ivory px-5 text-center text-ink">
      <h1 className="font-serif text-4xl">Something went wrong.</h1>
      <p className="max-w-md text-muted">
        Please try again. If it keeps happening, call or message us on Telegram. <span lang="am" className="font-ethiopic">ችግር ተፈጥሯል፤ እባክዎ እንደገና ይሞክሩ።</span>
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        <button type="button" onClick={reset} className="btn btn-ink">Try again</button>
        <Link href="/" className="btn btn-line">Home page</Link>
      </div>
    </main>
  );
}
