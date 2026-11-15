import { readFileSync } from 'node:fs';
import path from 'node:path';

import { switchLocaleHref } from '@/lib/marketing-i18n/routes';
import {
  POLICY_ARTICLES,
  POLICY_HEADER,
  PRIVACY_POLICY_PUBLISH_APPROVED,
  PRIVACY_POLICY_TAX_ID,
  TAX_ID_PLACEHOLDER,
  privacyPolicyIsBlockedHere,
  privacyPolicyIsPublishable,
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

  it('keeps the supplied identity and version wording', () => {
    expect(POLICY_HEADER.version).toBe('Version: 1.0 \u2014 Draft for Legal Review');
    expect(POLICY_HEADER.lastUpdated).toBe('Last Updated: 13 November 2026');
    expect(allText).toContain('Company Registration Number: HE 498387');
    expect(allText).toContain(
      '237 Archbishop Makarios III Avenue, DIANA HOUSE, 5th Floor, Office 518, 3105 Limassol, Cyprus',
    );
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

  it('shows a marked Tax ID placeholder and never invents a value', () => {
    expect(PRIVACY_POLICY_TAX_ID).toBeNull();
    expect(taxIdLine()).toBe(`Tax ID: ${TAX_ID_PLACEHOLDER}`);
    expect(TAX_ID_PLACEHOLDER).toContain('PLACEHOLDER');
    const withTaxId = POLICY_ARTICLES.flatMap((a) => a.blocks).filter(
      (b) => typeof b !== 'string' && b.kind === 'lines' && b.withTaxId,
    );
    expect(withTaxId).toHaveLength(2);
  });

  it('is published and available on hosted production while the Tax ID stays a placeholder', () => {
    expect(PRIVACY_POLICY_PUBLISH_APPROVED).toBe(true);
    expect(privacyPolicyIsPublishable()).toBe(true);
    expect(privacyPolicyIsBlockedHere({ VERCEL_ENV: 'production' })).toBe(false);
    expect(privacyPolicyIsBlockedHere({ VERCEL_ENV: 'preview' })).toBe(false);
    expect(privacyPolicyIsBlockedHere({})).toBe(false);
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
});
