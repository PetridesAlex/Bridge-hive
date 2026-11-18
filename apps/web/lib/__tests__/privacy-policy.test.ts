import { readFileSync } from 'node:fs';
import path from 'node:path';

import { switchLocaleHref } from '@/lib/marketing-i18n/routes';
import {
  POLICY_ARTICLES,
  POLICY_HEADER,
  PRIVACY_POLICY_PUBLISH_APPROVED,
  PRIVACY_POLICY_TAX_ID,
  TAX_ID_PLACEHOLDER,
  assertFinalPrivacyPolicyContent,
  privacyPolicyIsBlockedHere,
  privacyPolicyIsFinal,
  privacyPolicyIsPublishable,
  taxIdLabel,
  taxIdLine,
  type PolicyBlock,
} from '@/lib/privacy-policy/content';

function textOf(block: PolicyBlock): string[] {
  if (typeof block === 'string') return [block];
  if (block.kind === 'h3') return [block.text];
  if (block.kind === 'lines') return block.lines;
  return block.items;
}

const allText = [
  POLICY_HEADER.company,
  POLICY_HEADER.title,
  POLICY_HEADER.subtitle,
  ...POLICY_HEADER.linesBeforeTaxId,
  ...POLICY_HEADER.linesAfterTaxId,
  POLICY_HEADER.version,
  POLICY_HEADER.lastUpdated,
  ...POLICY_ARTICLES.flatMap((a) => [a.title, ...a.blocks.flatMap(textOf)]),
  POLICY_HEADER.end,
  POLICY_HEADER.endVersion,
  taxIdLine('en'),
].join('\n');

describe('privacy policy', () => {
  it('has the 25 supplied articles in order with the supplied titles', () => {
    expect(POLICY_ARTICLES).toHaveLength(25);
    POLICY_ARTICLES.forEach((article, index) => {
      expect(article.title.startsWith(`Article ${index + 1} \u2014 `)).toBe(true);
    });
    expect(POLICY_ARTICLES[21].title).toBe(
      'Article 22 \u2014 Account Deletion, Backup Retention and Erasure of Personal Data',
    );
  });

  it('contains no chat-export artefacts', () => {
    expect(allText).not.toMatch(/Stylianos/i);
    expect(allText).not.toMatch(/\[\d{2}\/\d{2}\/\d{4}/);
    expect(allText).not.toContain('\u2E3B');
  });

  it('keeps final Version 1.0 identity and revision date', () => {
    expect(POLICY_HEADER.version).toBe('Version: 1.0');
    expect(POLICY_HEADER.lastUpdated).toBe('Last Updated: 18 November 2026');
    expect(POLICY_HEADER.endVersion).toBe('Version 1.0 \u2014 18 November 2026');
    expect(allText).toContain('Company Registration Number: HE 498387');
    expect(allText).toContain(
      '237 Archbishop Makarios III Avenue, DIANA HOUSE, 5th Floor, Office 518, 3105 Limassol, Cyprus',
    );
    expect(POLICY_HEADER.version).not.toMatch(/draft/i);
    expect(POLICY_HEADER.endVersion).not.toMatch(/draft/i);
  });

  it('keeps the supplied backup, deletion and restore statements verbatim', () => {
    expect(allText).toContain(
      'Under the reported service configuration, daily database backups are available for a rolling period of seven (7) days.',
    );
    expect(allText).toContain(
      'The technical implementation and testing of this procedure have not yet been completed. Accordingly, BridgeHive does not represent that prevention of reintroduction of deleted data following backup restoration has been fully implemented.',
    );
    expect(allText).toContain(
      'Restoring an earlier backup may reintroduce information that was previously deleted.',
    );
  });

  it('ships the company TIN and never renders the tax placeholder', () => {
    expect(PRIVACY_POLICY_TAX_ID).toBe('60418646N');
    expect(taxIdLine('en')).toBe(
      'Tax Identification Number (TIN): 60418646N',
    );
    expect(taxIdLine('el')).toBe(
      'Αριθμός Φορολογικής Ταυτότητας (ΑΦΤ): 60418646N',
    );
    expect(taxIdLabel('en')).toContain('TIN');
    expect(taxIdLabel('el')).toContain('ΑΦΤ');
    expect(allText).not.toContain(TAX_ID_PLACEHOLDER);
    expect(allText).not.toContain('PLACEHOLDER');
    const withTaxId = POLICY_ARTICLES.flatMap((a) => a.blocks).filter(
      (b) => typeof b !== 'string' && b.kind === 'lines' && b.withTaxId,
    );
    expect(withTaxId).toHaveLength(2);
  });

  it('is final and publishable without production block', () => {
    expect(privacyPolicyIsFinal()).toBe(true);
    expect(() => assertFinalPrivacyPolicyContent()).not.toThrow();
    expect(PRIVACY_POLICY_PUBLISH_APPROVED).toBe(true);
    expect(privacyPolicyIsPublishable()).toBe(true);
    expect(privacyPolicyIsBlockedHere({ VERCEL_ENV: 'production' })).toBe(false);
    expect(privacyPolicyIsBlockedHere({ VERCEL_ENV: 'preview' })).toBe(false);
    expect(privacyPolicyIsBlockedHere({})).toBe(false);
  });

  it('does not pass draft Tax ID banners from the privacy page', () => {
    const page = readFileSync(
      path.join(__dirname, '..', '..', 'components/marketing/pages/PrivacyPolicyPage.tsx'),
      'utf8',
    );
    expect(page).not.toContain('draftBannerEn');
    expect(page).not.toContain('DRAFT_BANNER');
    expect(page).not.toContain('TAX_ID_PLACEHOLDER');
    expect(page).toContain('taxIdLabel');
  });

  it('keeps the language switch on the policy page', () => {
    expect(switchLocaleHref('/privacy-policy', '', 'el')).toBe('/el/privacy-policy');
    expect(switchLocaleHref('/el/privacy-policy', '', 'en')).toBe('/privacy-policy');
  });

  it('is listed in the sitemap route table and footer', () => {
    const root = path.join(__dirname, '..', '..');
    const routes = readFileSync(path.join(root, 'lib/marketing-i18n/routes.ts'), 'utf8');
    expect(routes).toMatch(/privacyPolicy\s*:/);
    const footer = readFileSync(
      path.join(root, 'components/marketing/MarketingFooter.tsx'),
      'utf8',
    );
    expect(footer).toContain('privacy-policy');
  });

  it('keeps Article 14 aligned with the final Cookie Policy inventory', () => {
    const article14 = POLICY_ARTICLES.find((a) => a.id === 'article-14');
    expect(article14).toBeDefined();
    const text = article14!.blocks.flatMap(textOf).join('\n');
    expect(text).toContain('Cookie Policy');
    expect(text).toContain('Understood');
    expect(text).toContain('do not claim to cover every native mobile');
    expect(text).not.toMatch(/subject to completion of the technical inventory/i);
    expect(text).toContain('Google Analytics, Google Tag Manager and Meta Pixel were not detected');
  });
});
