const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:4000';

/**
 * Demo mode (no API or database, see src/lib/demo.ts) is on when NEXT_PUBLIC_DEMO=true, and also by itself
 * when the site is built on Vercel without a BACKEND_URL, so a plain Vercel deploy works with no settings.
 * Set NEXT_PUBLIC_DEMO=false to force it off.
 */
const DEMO = process.env.NEXT_PUBLIC_DEMO
  ? process.env.NEXT_PUBLIC_DEMO === 'true'
  : Boolean(process.env.VERCEL) && !process.env.BACKEND_URL;

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Lets a second build (e.g. the demo) sit beside the normal one: NEXT_DIST_DIR=.next-demo
  distDir: process.env.NEXT_DIST_DIR || '.next',
  poweredByHeader: false,
  // Makes the decision above visible to the site's code.
  env: { NEXT_PUBLIC_DEMO: DEMO ? 'true' : 'false' },
  // The browser talks to the API through the same origin, so the login cookie just works.
  // In demo mode there is no API to forward to.
  async rewrites() {
    if (DEMO) return [];
    return [
      { source: '/api/:path*', destination: `${BACKEND_URL}/api/:path*` },
      { source: '/uploads/:path*', destination: `${BACKEND_URL}/uploads/:path*` },
    ];
  },
};

export default nextConfig;
