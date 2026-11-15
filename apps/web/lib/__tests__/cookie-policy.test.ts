import { readFileSync } from 'node:fs';
import path from 'node:path';

import { switchLocaleHref } from '@/lib/marketing-i18n/routes';
import {
  COOKIE_POLICY_ARTICLES,
  COOKIE_POLICY_HEADER,
  COOKIE_POLICY_PUBLISH_APPROVED,
  cookiePolicyIsBlockedHere,
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
  ...COOKIE_POLICY_HEADER.identityLines,
  COOKIE_POLICY_HEADER.version,
  COOKIE_POLICY_HEADER.lastUpdated,
  ...COOKIE_POLICY_ARTICLES.flatMap((a) => [
    a.title,
    ...a.blocks.flatMap(textOf),
  ]),
  COOKIE_POLICY_HEADER.end,
  COOKIE_POLICY_HEADER.endVersion,
].join('\n');

describe('cookie policy draft', () => {
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

  it('keeps key client statements verbatim', () => {
    expect(allText).toContain(
      'Based on the technical review of the public BridgeHive website conducted on 12 November 2026, Google Analytics, Google Tag Manager and Meta Pixel were not detected.',
    );
    expect(allText).toContain(
      'Selecting \u201cUnderstood\u201d acknowledges the notice and may store a preference preventing the notice from being displayed repeatedly.',
    );
    expect(allText).toContain(
      'BridgeHive uses technical infrastructure providers, including Vercel and Supabase.',
    );
    expect(allText).toContain(
      'The exact names, purposes and lifetimes of authentication cookies and browser storage technologies are subject to final technical verification.',
    );
  });

  it('keeps the supplied identity and date wording', () => {
    expect(COOKIE_POLICY_HEADER.lastUpdated).toBe(
      'Last Updated: 13 November 2026',
    );
    expect(COOKIE_POLICY_HEADER.version).toBe('Draft for Legal Review');
    expect(COOKIE_POLICY_HEADER.endVersion).toBe(
      'Draft for Legal Review \u2014 13 November 2026',
    );
    expect(allText).toContain('Website: https://bridgehive.app');
    expect(allText).toContain('Contact: info@bridgehive.app');
    expect(allText).toContain('BRIDGEHIVE MEDICAL RECRUITMENT LIMITED');
  });

  it('is blocked on hosted production until approved', () => {
    expect(COOKIE_POLICY_PUBLISH_APPROVED).toBe(false);
    expect(cookiePolicyIsPublishable()).toBe(false);
    expect(cookiePolicyIsBlockedHere({ VERCEL_ENV: 'production' })).toBe(true);
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

  it('is not listed in the sitemap route table, footer or navigation', () => {
    const root = path.join(__dirname, '..', '..');
    const routes = readFileSync(
      path.join(root, 'lib/marketing-i18n/routes.ts'),
      'utf8',
    );
    expect(routes).not.toMatch(/cookiePolicy\s*:/);
    const footer = readFileSync(
      path.join(root, 'components/marketing/MarketingFooter.tsx'),
      'utf8',
    );
    expect(footer).not.toContain('cookie-policy');
  });
});
