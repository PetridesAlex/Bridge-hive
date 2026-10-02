import type { MetadataRoute } from 'next';

import { SITE_ORIGIN } from '@/components/marketing/nav-config';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/admin',
          '/admin/',
          '/org/',
          '/dashboard',
          '/auth/',
          '/activate-organization-account',
          '/organization-invitations/',
          '/sign-up',
        ],
      },
    ],
    sitemap: `${SITE_ORIGIN}/sitemap.xml`,
  };
}
