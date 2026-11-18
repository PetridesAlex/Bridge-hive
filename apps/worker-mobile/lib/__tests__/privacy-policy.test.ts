import { readFileSync } from 'node:fs';
import path from 'node:path';

import {
  POLICY_ARTICLES,
  POLICY_HEADER,
  PRIVACY_POLICY_LAST_UPDATED,
  PRIVACY_POLICY_TAX_ID,
  PRIVACY_POLICY_VERSION_LABEL,
  TAX_ID_PLACEHOLDER,
  assertFinalPrivacyPolicyContent,
  privacyPolicyIsFinal,
  taxIdLine,
} from '@bridge-hive/legal-content';
import { isWorkerAccountSetupRouteAllowed } from '@bridge-hive/domain';

const root = path.join(__dirname, '../..');

function source(relativePath: string): string {
  return readFileSync(path.join(root, relativePath), 'utf8');
}

describe('mobile privacy policy placement', () => {
  it('places Privacy Policy after Support and before Delete account', () => {
    const profile = source('app/(tabs)/profile/index.tsx');
    const supportIdx = profile.indexOf("label={t('profile.support')}");
    const privacyIdx = profile.indexOf("label={t('profile.privacyPolicy')}");
    const deleteIdx = profile.indexOf("label={t('profile.deleteAccount')}");
    expect(supportIdx).toBeGreaterThan(-1);
    expect(privacyIdx).toBeGreaterThan(supportIdx);
    expect(deleteIdx).toBeGreaterThan(privacyIdx);
    expect(profile).toContain("icon=\"shield-outline\"");
    expect(profile).toContain("router.push('/privacy-policy')");
  });

  it('links from login, register, and support', () => {
    expect(source('app/auth/worker/login.tsx')).toContain("router.push('/privacy-policy')");
    expect(source('app/auth/worker/register.tsx')).toContain("router.push('/privacy-policy')");
    expect(source('app/(tabs)/profile/support.tsx')).toContain("router.push('/privacy-policy')");
  });

  it('allowlists the public root route during Account Setup', () => {
    expect(isWorkerAccountSetupRouteAllowed('/privacy-policy')).toBe(true);
  });

  it('registers the root Stack screen', () => {
    const layout = source('app/_layout.tsx');
    expect(layout).toContain('name="privacy-policy"');
  });
});

describe('mobile privacy policy screen behavior', () => {
  it('renders shared legal content without consent or mutation hooks', () => {
    const screen = source('app/privacy-policy.tsx');
    const document = source('components/legal/PrivacyPolicyDocument.tsx');
    expect(screen).toContain('PrivacyPolicyDocument');
    expect(screen).toContain('backFallback');
    expect(document).toContain('@bridge-hive/legal-content');
    expect(document).toContain('POLICY_ARTICLES');
    expect(document).toContain('privacyPolicyOnlineUrl');
    expect(document).toContain("taxIdLine('en')");
    expect(document).toContain('statusFinal');
    expect(document).not.toContain('draftChip');
    expect(document).not.toContain('markConversation');
    expect(document).not.toContain('mark-read');
    expect(document).not.toContain('consent');
    expect(screen).not.toContain('supabase');
    expect(document).not.toContain('supabase');
  });

  it('ships EN/EL chrome keys and Greek disclaimer with Final status', () => {
    const en = source('i18n/translations/en.ts');
    const el = source('i18n/translations/el.ts');
    for (const src of [en, el]) {
      expect(src).toContain('privacyPolicy:');
      expect(src).toContain('onThisPage:');
      expect(src).toContain('legalDocument:');
      expect(src).toContain('tocSubtitle:');
      expect(src).toContain('dataController:');
      expect(src).toContain('viewOnline:');
      expect(src).toContain('offlineNote:');
      expect(src).toContain('greekNote:');
      expect(src).toContain('statusFinal:');
      expect(src).not.toContain('draftChip:');
      expect(src).toContain('linkFailed:');
      expect(src).toContain('backToTop:');
      expect(src).toContain('privacyPolicySubtitle:');
      expect(src).toContain('privacyPolicyLink:');
    }
    expect(en).toContain("statusFinal: 'Final'");
    expect(el).toContain("statusFinal: 'Οριστική'");
    expect(en).toContain('Tax Identification Number (TIN)');
    expect(el).toContain('Αριθμός Φορολογικής Ταυτότητας (ΑΦΤ)');
    expect(en).toContain(
      'Το κείμενο της Πολιτικής Απορρήτου παρατίθεται στα αγγλικά',
    );
    expect(el).toContain(
      'Το κείμενο της Πολιτικής Απορρήτου παρατίθεται στα αγγλικά',
    );
  });
});

describe('shared legal content parity', () => {
  it('exposes the final Version 1.0 corpus with company TIN', () => {
    expect(PRIVACY_POLICY_VERSION_LABEL).toBe('Version: 1.0');
    expect(PRIVACY_POLICY_LAST_UPDATED).toBe('Last Updated: 18 November 2026');
    expect(POLICY_HEADER.endVersion).toBe('Version 1.0 \u2014 18 November 2026');
    expect(PRIVACY_POLICY_TAX_ID).toBe('60418646N');
    expect(taxIdLine('en')).toContain('60418646N');
    expect(taxIdLine('en')).not.toContain('PLACEHOLDER');
    expect(PRIVACY_POLICY_VERSION_LABEL).not.toMatch(/draft/i);
    expect(POLICY_HEADER.endVersion).not.toMatch(/draft/i);
    expect(privacyPolicyIsFinal()).toBe(true);
    expect(() => assertFinalPrivacyPolicyContent()).not.toThrow();
    expect(TAX_ID_PLACEHOLDER).toContain('PLACEHOLDER');
    expect(POLICY_ARTICLES).toHaveLength(25);
    expect(POLICY_ARTICLES[0].id).toBe('article-1');
    expect(POLICY_ARTICLES[21].title).toContain('Account Deletion');
  });

  it('keeps the web privacy module as a thin shared-package re-export', () => {
    const webContent = source('../../apps/web/lib/privacy-policy/content.ts');
    expect(webContent).toContain('@bridge-hive/legal-content');
    expect(webContent).toContain('POLICY_ARTICLES');
    expect(webContent).toContain('PRIVACY_POLICY_VERSION_LABEL');
    expect(webContent).toContain('taxIdLine');
    expect(webContent).toContain('assertFinalPrivacyPolicyContent');
    expect(webContent).not.toMatch(/Article 1/);
  });
});
