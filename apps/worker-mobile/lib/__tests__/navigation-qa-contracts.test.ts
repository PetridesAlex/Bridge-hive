import fs from 'node:fs';
import path from 'node:path';

const root = path.join(__dirname, '../..');

function source(relative: string) {
  return fs.readFileSync(path.join(root, relative), 'utf8');
}

describe('navigation QA contracts', () => {
  it('tabs layout waits for auth hydrate before unsigned redirect', () => {
    const tabs = source('app/(tabs)/_layout.tsx');
    expect(tabs).toMatch(/if\s*\(\s*loading\s*\)/);
    expect(tabs).toMatch(/if\s*\(\s*!session\s*\)/);
    // Unsigned redirect must not run while loading is still true.
    const loadingIdx = tabs.indexOf('if (loading)');
    const unsignedIdx = tabs.indexOf('if (!session)');
    expect(loadingIdx).toBeGreaterThanOrEqual(0);
    expect(unsignedIdx).toBeGreaterThan(loadingIdx);
  });

  it('messages screens already gate unsigned redirect on !authLoading', () => {
    expect(source('app/messages/index.tsx')).toContain('!authLoading && !session');
    expect(source('app/messages/[id].tsx')).toContain('!authLoading && !session');
  });

  it('earnings summary a11y label follows load error hint', () => {
    const payments = source('app/(tabs)/payments.tsx');
    expect(payments).toContain('payoutError ? t(\'payments.loadEarningsError\')');
  });

  it('sandbox standing chip is labeled as not live', () => {
    const profile = source('app/(tabs)/profile/index.tsx');
    expect(profile).toContain('sandboxStandingLabel');
    expect(profile).toContain('isSandboxPaymentsBuild()');
    const en = source('i18n/translations/en.ts');
    expect(en).toContain("sandboxStandingLabel: 'Sandbox · not live standing'");
  });

  it('legacy account and support routes redirect', () => {
    expect(source('app/(tabs)/profile/account.tsx')).toContain(
      'href="/profile/personal-information"',
    );
    expect(source('app/(tabs)/support.tsx')).toContain('href="/profile/support"');
  });

  it('invoice list back is profile-only; detail always has back', () => {
    const list = source('app/(tabs)/invoices/index.tsx');
    expect(list).toContain('showBack={fromAccount}');
    const detail = source('app/(tabs)/invoices/[id].tsx');
    expect(detail).toContain('navigateBack(listHref)');
  });

  it('batch push filter=new is honored on the shifts list', () => {
    const shifts = source('app/(tabs)/shifts/index.tsx');
    expect(shifts).toContain("filterRaw === 'new'");
    expect(shifts).toContain('newFilterTitle');
  });

  it('pending push hydrate restores message and invoice routes', () => {
    const pending = source('lib/push/pending-shift.ts');
    expect(pending).toContain('isRestorablePendingPushRoute');
    expect(pending).not.toMatch(/stored\.startsWith\('\/shifts\/'\)/);
  });
});
