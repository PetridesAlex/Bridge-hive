import { readFileSync } from 'node:fs';
import path from 'node:path';

import { switchLocaleHref } from '@/lib/marketing-i18n/routes';
import {
  COOKIE_POLICY_ARTICLES,
  COOKIE_POLICY_HEADER,
  COOKIE_POLICY_PUBLISH_APPROVED,
  COOKIE_POLICY_TAX_ID,
  assertFinalCookiePolicyContent,
  cookiePolicyIsBlockedHere,
  cookiePolicyIsFinal,
  cookiePolicyIsPublishable,
} from '@/lib/cookie-policy/content';
import type { PolicyBlock } from '@/lib/legal-policy/types';

function textOf(block: PolicyBlock): string[] {
  if (typeof block === 'string') return [block];
  if (block.kind === 'h3') return [block.text];
  if (block.kind === 'lines') return block.lines;
  return block.items;
}

const allText = [
  COOKIE_POLICY_HEADER.company,
  COOKIE_POLICY_HEADER.title,
  COOKIE_POLICY_HEADER.subtitle,
  ...COOKIE_POLICY_HEADER.linesBeforeTaxId,
  ...COOKIE_POLICY_HEADER.linesAfterTaxId,
  COOKIE_POLICY_HEADER.version,
  COOKIE_POLICY_HEADER.lastUpdated,
  ...COOKIE_POLICY_ARTICLES.flatMap((a) => [
    a.title,
    ...a.blocks.flatMap(textOf),
  ]),
  COOKIE_POLICY_HEADER.end,
  COOKIE_POLICY_HEADER.endVersion,
].join('\n');

describe('cookie policy', () => {
  it('has the 10 supplied sections in order with the supplied titles', () => {
    expect(COOKIE_POLICY_ARTICLES).toHaveLength(10);
    const expected = [
      '1 \u2014 Introduction',
      '2 \u2014 What Are Cookies?',
      '3 \u2014 Essential Cookies and Technologies',
      '4 \u2014 Analytics and Advertising Cookies',
      '5 \u2014 Cookie Notice',
      '6 \u2014 Cookie Duration and Browser Storage',
      '7 \u2014 Managing Cookies',
      '8 \u2014 Third-Party Service Providers',
      '9 \u2014 Changes to This Policy',
      '10 \u2014 Contact',
    ];
    COOKIE_POLICY_ARTICLES.forEach((article, index) => {
      expect(article.title).toBe(expected[index]);
    });
  });

  it('keeps key final statements and named inventory', () => {
    expect(allText).toContain(
      'Based on the technical review of the public BridgeHive website conducted on 12 November 2026, and reconfirmed on the release-candidate website on 18 November 2026, Google Analytics, Google Tag Manager and Meta Pixel were not detected.',
    );
    expect(allText).toContain(
      'Selecting \u201cUnderstood\u201d acknowledges the notice and stores a first-party localStorage preference (bh:m-storage-notice, versioned information acknowledgement) so the notice is not displayed repeatedly in that browser.',
    );
    expect(allText).toContain(
      'BridgeHive uses technical infrastructure providers, including Vercel and Supabase.',
    );
    expect(allText).toContain('bh:m-storage-notice');
    expect(allText).toContain('bh_org_remember');
    expect(allText).toContain('sb-<project-ref>-auth-token');
    expect(allText).not.toMatch(/subject to final technical verification/i);
    expect(allText).not.toMatch(/Draft for Legal Review/i);
    expect(allText).toContain(
      'It does not claim that the website storage notice covers every native mobile application SDK',
    );
  });

  it('keeps final Version 1.0 identity, TIN and revision date', () => {
    expect(COOKIE_POLICY_HEADER.lastUpdated).toBe(
      'Last Updated: 18 November 2026',
    );
    expect(COOKIE_POLICY_HEADER.version).toBe('Version: 1.0');
    expect(COOKIE_POLICY_HEADER.endVersion).toBe(
      'Version 1.0 \u2014 18 November 2026',
    );
    expect(COOKIE_POLICY_TAX_ID).toBe('60418646N');
    expect(allText).toContain('Website: https://bridgehive.app');
    expect(allText).toContain('Contact: info@bridgehive.app');
    expect(allText).toContain('BRIDGEHIVE MEDICAL RECRUITMENT LIMITED');
    expect(allText).toContain('Company Registration Number: HE 498387');
    expect(COOKIE_POLICY_HEADER.version).not.toMatch(/draft/i);
    expect(COOKIE_POLICY_HEADER.endVersion).not.toMatch(/draft/i);
  });

  it('is final and publishable without production block', () => {
    expect(cookiePolicyIsFinal()).toBe(true);
    expect(() => assertFinalCookiePolicyContent()).not.toThrow();
    expect(COOKIE_POLICY_PUBLISH_APPROVED).toBe(true);
    expect(cookiePolicyIsPublishable()).toBe(true);
    expect(cookiePolicyIsBlockedHere({ VERCEL_ENV: 'production' })).toBe(false);
    expect(cookiePolicyIsBlockedHere({ VERCEL_ENV: 'preview' })).toBe(false);
    expect(cookiePolicyIsBlockedHere({})).toBe(false);
  });

  it('keeps the language switch on the cookie policy page', () => {
    expect(switchLocaleHref('/cookie-policy', '', 'el')).toBe(
      '/el/cookie-policy',
    );
    expect(switchLocaleHref('/el/cookie-policy', '', 'en')).toBe(
      '/cookie-policy',
    );
  });

  it('is listed in the sitemap route table and footer', () => {
    const root = path.join(__dirname, '..', '..');
    const routes = readFileSync(
      path.join(root, 'lib/marketing-i18n/routes.ts'),
      'utf8',
    );
    expect(routes).toMatch(/cookiePolicy\s*:/);
    const footer = readFileSync(
      path.join(root, 'components/marketing/MarketingFooter.tsx'),
      'utf8',
    );
    expect(footer).toContain('cookie-policy');
    expect(footer).toContain('CookieSettingsButton');
  });

  it('renders TIN identity from the cookie policy page without Draft banners', () => {
    const page = readFileSync(
      path.join(
        __dirname,
        '..',
        '..',
        'components/marketing/pages/CookiePolicyPage.tsx',
      ),
      'utf8',
    );
    expect(page).toContain('COOKIE_POLICY_TAX_ID');
    expect(page).toContain('taxIdLabel');
    expect(page).not.toContain('draftBannerEn');
    expect(page).not.toContain('Draft for Legal Review');
  });
});
