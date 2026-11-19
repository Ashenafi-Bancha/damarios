import { fileURLToPath } from 'node:url';

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
  // The frontend folder is its own project (the repo root only holds helper scripts).
  outputFileTracingRoot: fileURLToPath(new URL('.', import.meta.url)),
  // Makes the decision above visible to the site's code.
  env: { NEXT_PUBLIC_DEMO: DEMO ? 'true' : 'false' },
  // Browser security headers for every page. The content policy only limits framing, plugins, forms and
  // <base> (it doesn't restrict scripts, so the 3D hero, maps and analytics keep working).
  async headers() {
    const security = [
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
      { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=()' },
      { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
      { key: 'Content-Security-Policy', value: "frame-ancestors 'self'; base-uri 'self'; form-action 'self'; object-src 'none'" },
    ];
    return [
      { source: '/:path*', headers: security },
      // The staff panel never appears in search results.
      { source: '/admin/:path*', headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }] },
    ];
  },
  // The browser talks to the API through the same origin, so the login cookie just works.
  // Locally Next forwards /api to the API. On DigitalOcean the platform routes /api to the API itself
  // (see .do/app.yaml), and BACKEND_URL is the API's private address. In demo mode there is no API.
  async rewrites() {
    if (DEMO) return [];
    return [
      { source: '/api/:path*', destination: `${BACKEND_URL}/api/:path*` },
      { source: '/uploads/:path*', destination: `${BACKEND_URL}/uploads/:path*` },
    ];
  },
};

export default nextConfig;
