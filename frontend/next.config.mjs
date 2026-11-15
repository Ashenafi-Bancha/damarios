const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:4000';

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Lets a second build (e.g. the demo) sit beside the normal one: NEXT_DIST_DIR=.next-demo
  distDir: process.env.NEXT_DIST_DIR || '.next',
  poweredByHeader: false,
  // The browser talks to the API through the same origin, so the login cookie just works.
  // In demo mode (NEXT_PUBLIC_DEMO=true) there is no API to forward to.
  async rewrites() {
    if (process.env.NEXT_PUBLIC_DEMO === 'true') return [];
    return [
      { source: '/api/:path*', destination: `${BACKEND_URL}/api/:path*` },
      { source: '/uploads/:path*', destination: `${BACKEND_URL}/uploads/:path*` },
    ];
  },
};

export default nextConfig;
