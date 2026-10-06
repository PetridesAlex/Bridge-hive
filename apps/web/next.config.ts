import type { NextConfig } from 'next';
import path from 'path';

const nextConfig: NextConfig = {
  transpilePackages: ['@bridge-hive/domain', '@bridge-hive/supabase-types'],
  // Hide the Next.js "N" badge; it sits over login/marketing chrome in local review.
  // Compile/runtime errors still surface. Production is unaffected.
  devIndicators: false,
  images: {
    unoptimized: true,
    qualities: [75, 90, 92, 95],
  },
  // Monorepo: resolve workspace packages from the repo root.
  outputFileTracingRoot: path.join(__dirname, '../..'),
  async headers() {
    return [
      {
        source: '/auth/confirm',
        headers: [
          { key: 'Cache-Control', value: 'no-store, max-age=0' },
          { key: 'Referrer-Policy', value: 'no-referrer' },
          { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
        ],
      },
      {
        source: '/auth/worker/:path*',
        headers: [
          { key: 'Cache-Control', value: 'no-store, max-age=0' },
          { key: 'Referrer-Policy', value: 'no-referrer' },
          { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
        ],
      },
    ];
  },
};

export default nextConfig;
