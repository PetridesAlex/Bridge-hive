import type { MetadataRoute } from 'next';

import {
  MARKETING_ROUTE_TABLE,
  SITE_ORIGIN,
  absoluteUrl,
  indexableMarketingPaths,
  localizePath,
  type MarketingRouteKey,
} from '@/lib/marketing-i18n/routes';

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  const indexableKeys = (Object.keys(MARKETING_ROUTE_TABLE) as MarketingRouteKey[])
    .filter((key) => MARKETING_ROUTE_TABLE[key].indexable);

  const enPaths = indexableMarketingPaths('en');
  const elPaths = indexableMarketingPaths('el');

  // Keep the EN entries as the canonical rows (sitemap-standard practice);
  // add hreflang alternates per language. Recruitment/apply stays excluded via
  // the `indexable: false` flag in MARKETING_ROUTE_TABLE.
  return enPaths.map((path, index) => {
    const key = indexableKeys[index];
    const alt = elPaths[index];
    return {
      url: path === '/' ? `${SITE_ORIGIN}/` : `${SITE_ORIGIN}${path}`,
      lastModified,
      changeFrequency: path === '/' ? 'weekly' : 'monthly',
      priority: path === '/' ? 1 : 0.7,
      alternates: {
        languages: {
          en: absoluteUrl(localizePath(key, 'en')),
          el: absoluteUrl(alt ?? localizePath(key, 'el')),
          'x-default': absoluteUrl(localizePath(key, 'en')),
        },
      },
    } satisfies MetadataRoute.Sitemap[number];
  });
}
