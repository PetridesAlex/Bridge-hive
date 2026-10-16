import fs from 'node:fs/promises';
import path from 'node:path';

import {
  LEGAL_DRAFT_BANNER,
  LEGAL_PUBLICATION_STATUS,
  LEGAL_SECTION_PLACEHOLDER,
  legalPagesAreIndexable,
  showLegalDraftBanner,
} from '@/content/legal/publication';
import { privacyPolicyContent } from '@/content/legal/privacy-policy';
import { termsOfServiceContent } from '@/content/legal/terms-of-service';

const webRoot = process.cwd();

async function readWeb(...parts: string[]) {
  return fs.readFile(path.join(webRoot, ...parts), 'utf8');
}

const PRIVACY_SECTION_IDS = [
  'controller',
  'scope',
  'information-collected',
  'purposes',
  'worker-credentials',
  'recruitment-documents',
  'organization-data',
  'bank-transfer-details',
  'operational-data',
  'stripe-and-commission-invoices',
  'cookies-and-sessions',
  'processors',
  'international-transfers',
  'retention',
  'data-subject-rights',
  'security',
  'changes',
  'contact',
  'effective-date',
] as const;

const TERMS_SECTION_IDS = [
  'service-overview',
  'organization-accounts',
  'worker-accounts',
  'shift-postings',
  'timesheets',
  'wage-payment',
  'commission-invoice',
  'worker-commission',
  'payment-term',
  'overdue-restrictions',
  'recruitment',
  'acceptable-use',
  'privacy',
  'disclaimers',
  'suspension',
  'liability',
  'governing-law',
  'contact',
  'effective-date',
] as const;

const FORBIDDEN_LEGAL_CLAIM =
  /approved legal policy|binding (?:privacy|terms)|this (?:policy|agreement) is effective|legally binding/i;

describe('legal pages foundation', () => {
  it('treats draft publication as non-indexable with a visible banner', () => {
    expect(LEGAL_PUBLICATION_STATUS).toBe('draft');
    expect(showLegalDraftBanner()).toBe(true);
    expect(legalPagesAreIndexable()).toBe(false);
    expect(showLegalDraftBanner('approved')).toBe(false);
    expect(legalPagesAreIndexable('approved')).toBe(true);
    expect(LEGAL_DRAFT_BANNER).toBe(
      'Draft legal-page layout — legal wording is awaiting owner/counsel approval and is not yet published.',
    );
    expect(LEGAL_SECTION_PLACEHOLDER).toMatch(/reserved for counsel-approved wording/);
    expect(LEGAL_SECTION_PLACEHOLDER).not.toMatch(FORBIDDEN_LEGAL_CLAIM);
  });

  it('middleware allowlists /privacy and /terms without weakening protected portals', async () => {
    const src = await readWeb('middleware.ts');
    const publicPathsBlock = src.match(
      /const PUBLIC_PATHS = \[([\s\S]*?)\];/,
    )?.[1];
    expect(publicPathsBlock).toBeTruthy();
    const publicPaths = [...publicPathsBlock!.matchAll(/'([^']+)'/g)].map(
      (match) => match[1],
    );

    expect(publicPaths).toEqual(
      expect.arrayContaining(['/privacy', '/terms']),
    );
    expect(publicPaths).not.toContain('/admin');
    expect(publicPaths).not.toContain('/dashboard');
    expect(publicPaths).not.toContain('/organisation');
    expect(publicPaths.some((pathName) => pathName.startsWith('/org/'))).toBe(
      false,
    );
    expect(publicPaths).not.toContain('/auth');
    expect(src).toMatch(/pathname\.startsWith\('\/admin'\)/);
    expect(src).toContain("'/sign-in'");
  });

  it('ships public marketing pages for /privacy and /terms', async () => {
    for (const file of [
      'app/(marketing)/privacy/page.tsx',
      'app/(marketing)/terms/page.tsx',
      'components/marketing/LegalDocument.tsx',
      'components/marketing/LegalDocumentContents.tsx',
      'content/legal/privacy-policy.ts',
      'content/legal/terms-of-service.ts',
      'content/legal/publication.ts',
    ]) {
      await expect(fs.access(path.join(webRoot, file))).resolves.toBeUndefined();
    }

    const privacy = await readWeb('app/(marketing)/privacy/page.tsx');
    const terms = await readWeb('app/(marketing)/terms/page.tsx');
    const document = await readWeb('components/marketing/LegalDocument.tsx');

    expect(privacy).toMatch(/LegalDocument/);
    expect(terms).toMatch(/LegalDocument/);
    expect(privacy).not.toMatch(/dashboard|admin\/\(console\)|OrgShell/i);
    expect(terms).not.toMatch(/dashboard|admin\/\(console\)|OrgShell/i);
    expect(document).toMatch(/LEGAL_DRAFT_BANNER/);
    expect(document).toMatch(/showLegalDraftBanner/);
    expect(document).toMatch(/LEGAL_SECTION_PLACEHOLDER/);
    const publication = await readWeb('content/legal/publication.ts');
    expect(publication).toContain(LEGAL_DRAFT_BANNER);
  });

  it('sets required absolute titles, canonicals, and draft noindex metadata', async () => {
    const privacy = await readWeb('app/(marketing)/privacy/page.tsx');
    const terms = await readWeb('app/(marketing)/terms/page.tsx');

    expect(privacy).toMatch(
      /absolute:\s*'Privacy Policy \| BridgeHive Medical Recruitment Limited'/,
    );
    expect(privacy).toMatch(
      /canonical:\s*'https:\/\/bridgehive\.app\/privacy'/,
    );
    expect(terms).toMatch(
      /absolute:\s*'Terms of Service \| BridgeHive Medical Recruitment Limited'/,
    );
    expect(terms).toMatch(/canonical:\s*'https:\/\/bridgehive\.app\/terms'/);
    expect(privacy).toMatch(/legalPagesAreIndexable/);
    expect(terms).toMatch(/legalPagesAreIndexable/);
    expect(privacy).toMatch(/index:\s*false/);
    expect(terms).toMatch(/index:\s*false/);
  });

  it('footer links Privacy and Terms to public routes and keeps Cookie settings as a button', async () => {
    const footer = await readWeb('components/marketing/MarketingFooter.tsx');
    expect(footer).toMatch(/href="\/privacy"/);
    expect(footer).toMatch(/href="\/terms"/);
    expect(footer).toMatch(/>Privacy</);
    expect(footer).toMatch(/>Terms</);
    expect(footer).toMatch(/CookieSettingsButton/);
    expect(footer).not.toMatch(/href="\/cookie/);
    expect(footer).not.toMatch(/Privacy & terms/);
  });

  it('keeps draft pages out of the production sitemap', async () => {
    const sitemap = await readWeb('app/sitemap.ts');
    const navConfig = await readWeb('components/marketing/nav-config.ts');
    expect(sitemap).toMatch(/PUBLIC_MARKETING_PATHS/);
    expect(sitemap).not.toMatch(/\/privacy/);
    expect(sitemap).not.toMatch(/\/terms/);
    expect(navConfig).not.toMatch(/\/privacy/);
    expect(navConfig).not.toMatch(/\/terms/);
  });

  it('exposes empty structured section slots ready for counsel wording', () => {
    expect(privacyPolicyContent.sections.map((s) => s.id)).toEqual([
      ...PRIVACY_SECTION_IDS,
    ]);
    expect(termsOfServiceContent.sections.map((s) => s.id)).toEqual([
      ...TERMS_SECTION_IDS,
    ]);
    expect(privacyPolicyContent.lastUpdated).toBeNull();
    expect(privacyPolicyContent.effectiveDate).toBeNull();
    expect(privacyPolicyContent.version).toBeNull();
    expect(termsOfServiceContent.lastUpdated).toBeNull();
    expect(termsOfServiceContent.effectiveDate).toBeNull();
    expect(termsOfServiceContent.version).toBeNull();

    for (const section of [
      ...privacyPolicyContent.sections,
      ...termsOfServiceContent.sections,
    ]) {
      expect(section.paragraphs).toEqual([]);
      expect(section.heading.length).toBeGreaterThan(0);
    }
  });

  it('does not ship invented legal claims, fee figures, secrets, or personal data', async () => {
    const sources = await Promise.all([
      readWeb('content/legal/privacy-policy.ts'),
      readWeb('content/legal/terms-of-service.ts'),
      readWeb('content/legal/publication.ts'),
      readWeb('components/marketing/LegalDocument.tsx'),
      readWeb('app/(marketing)/privacy/page.tsx'),
      readWeb('app/(marketing)/terms/page.tsx'),
    ]);

    for (const src of sources) {
      expect(src).not.toMatch(FORBIDDEN_LEGAL_CLAIM);
      expect(src).not.toMatch(/17%/);
      expect(src).not.toMatch(/10 calendar days/i);
      expect(src).not.toMatch(/sk_live_|sk_test_|whsec_/);
      expect(src).not.toMatch(/\bIBAN\b|\b[A-Z]{2}\d{2}[A-Z0-9]{10,}\b/);
      expect(src).not.toMatch(/\bHE\d{5,}\b/);
      expect(src).not.toMatch(/Company registration number|Registered office:/i);
      expect(src).not.toMatch(/data protection officer|\bDPO\b/i);
      expect(src).not.toMatch(/laws of (?:England|Cyprus|the Republic)/i);
      expect(src).not.toMatch(
        /curriculum vitae|passport scan|practising licence photo/i,
      );
    }

    const termsHeadings = termsOfServiceContent.sections.map((s) => s.heading);
    expect(termsHeadings).toContain('Worker commission');
    expect(termsHeadings).toContain('Payment term');
    expect(termsHeadings.join(' ')).not.toMatch(/17%/);
    expect(termsHeadings.join(' ')).not.toMatch(/10 calendar days/i);
  });
});
