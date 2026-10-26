import type { Metadata } from 'next';

import type { MarketingLocale } from './locales';
import { OG_LOCALE } from './locales';
import { getDictionary } from './get-dictionary';
import {
  absoluteUrl,
  englishPath,
  localizePath,
  type MarketingRouteKey,
} from './routes';

type PageMeta = { title: string; description: string };

function pageMeta(
  locale: MarketingLocale,
  routeKey: MarketingRouteKey,
): PageMeta {
  const d = getDictionary(locale);
  switch (routeKey) {
    case 'home':
      return { title: d.home.meta.title, description: d.home.meta.description };
    case 'organizations':
      return {
        title: d.organizations.meta.title,
        description: d.organizations.meta.description,
      };
    case 'professionals':
      return {
        title: d.professionals.meta.title,
        description: d.professionals.meta.description,
      };
    case 'recruitment':
      return {
        title: d.recruitment.meta.title,
        description: d.recruitment.meta.description,
      };
    case 'recruitmentApply':
      return {
        title: d.recruitmentApply.meta.title,
        description: d.recruitmentApply.meta.description,
      };
    case 'howItWorks':
      return {
        title: d.howItWorks.meta.title,
        description: d.howItWorks.meta.description,
      };
    case 'about':
      return { title: d.about.meta.title, description: d.about.meta.description };
    case 'contact':
      return {
        title: d.contact.meta.title,
        description: d.contact.meta.description,
      };
    default: {
      const _exhaustive: never = routeKey;
      return _exhaustive;
    }
  }
}

export function buildMarketingMetadata(
  routeKey: MarketingRouteKey,
  locale: MarketingLocale,
): Metadata {
  const d = getDictionary(locale);
  const { title, description } = pageMeta(locale, routeKey);
  const selfPath = localizePath(routeKey, locale);
  const enPath = localizePath(routeKey, 'en');
  const elPath = localizePath(routeKey, 'el');
  const canonical = absoluteUrl(selfPath);
  const enUrl = absoluteUrl(enPath);
  const elUrl = absoluteUrl(elPath);
  const isHome = routeKey === 'home';
  const isApply = routeKey === 'recruitmentApply';

  return {
    title: isHome ? { absolute: title } : title,
    description,
    alternates: {
      canonical,
      languages: {
        en: enUrl,
        el: elUrl,
        'x-default': enUrl,
      },
    },
    openGraph: {
      title,
      description,
      url: canonical,
      siteName: d.meta.siteName,
      locale: OG_LOCALE[locale],
      alternateLocale: [OG_LOCALE[locale === 'en' ? 'el' : 'en']],
      type: 'website',
      images: [
        {
          url: '/marketing/og-default.png',
          width: 1200,
          height: 630,
          alt: d.meta.ogImageAlt,
        },
      ],
    },
    robots: isApply
      ? { index: false, follow: false }
      : { index: true, follow: true },
  };
}

export function buildMarketingLayoutMetadata(locale: MarketingLocale): Metadata {
  const d = getDictionary(locale);
  const homePath = localizePath('home', locale);
  const enHome = absoluteUrl(localizePath('home', 'en'));
  const elHome = absoluteUrl(localizePath('home', 'el'));
  const canonical = absoluteUrl(homePath);

  return {
    metadataBase: new URL('https://bridgehive.app'),
    title: {
      default: d.meta.defaultTitle,
      template: d.meta.titleTemplate,
    },
    description: d.meta.defaultDescription,
    alternates: {
      canonical,
      languages: {
        en: enHome,
        el: elHome,
        'x-default': enHome,
      },
    },
    openGraph: {
      title: d.meta.defaultTitle,
      description: d.meta.defaultDescription,
      url: canonical,
      siteName: d.meta.siteName,
      locale: OG_LOCALE[locale],
      alternateLocale: [OG_LOCALE[locale === 'en' ? 'el' : 'en']],
      type: 'website',
      images: [
        {
          url: '/marketing/og-default.png',
          width: 1200,
          height: 630,
          alt: d.meta.ogImageAlt,
        },
      ],
    },
    robots: { index: true, follow: true },
  };
}

/** @deprecated Prefer buildMarketingMetadata — kept for route table absolute paths. */
export function marketingEnglishPath(routeKey: MarketingRouteKey): string {
  return englishPath(routeKey);
}
