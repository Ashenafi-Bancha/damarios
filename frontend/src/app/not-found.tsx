import Link from 'next/link';
import Image from 'next/image';

export const metadata = { title: 'Page not found' };

/** Shown for any address that doesn't exist. */
export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-ink px-5 text-center text-white">
      <Image src="/brand/logo-compact-white.png" alt="DaMarios" width={1200} height={301} className="h-10 w-auto" />
      <p className="text-xs font-semibold tracking-[.2em] text-gold">404</p>
      <h1 className="font-serif text-4xl md:text-5xl">This page doesn’t exist.</h1>
      <p className="max-w-md text-muted-mist">
        The link may be old or mistyped. <span lang="am" className="font-ethiopic">የፈለጉት ገጽ አልተገኘም።</span>
      </p>
      <Link href="/" className="btn btn-gold">Go to the home page · ወደ መነሻ</Link>
    </main>
  );
}
