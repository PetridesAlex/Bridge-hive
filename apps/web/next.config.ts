import type { NextConfig } from 'next';
import path from 'path';

const nextConfig: NextConfig = {
  transpilePackages: ['@bridge-hive/domain', '@bridge-hive/supabase-types'],
  images: {
    unoptimized: true,
  },
  // Monorepo: resolve workspace packages from the repo root.
  outputFileTracingRoot: path.join(__dirname, '../..'),
};

export default nextConfig;
