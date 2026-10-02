import type { MetadataRoute } from 'next';

import { PUBLIC_MARKETING_PATHS, SITE_ORIGIN } from '@/components/marketing/nav-config';

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return PUBLIC_MARKETING_PATHS.map((path) => ({
    url: path === '/' ? `${SITE_ORIGIN}/` : `${SITE_ORIGIN}${path}`,
    lastModified,
    changeFrequency: path === '/' ? 'weekly' : 'monthly',
    priority: path === '/' ? 1 : 0.7,
  }));
}
