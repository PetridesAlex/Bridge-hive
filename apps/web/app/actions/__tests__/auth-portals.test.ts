import fs from 'node:fs/promises';
import path from 'node:path';

import { safeAppPath } from '@bridge-hive/domain';

import { safeAdminNext, safeOrgNext } from '@/lib/auth-redirect';

const webRoot = process.cwd();

async function readWeb(...parts: string[]) {
  return fs.readFile(path.join(webRoot, ...parts), 'utf8');
}

describe('premium auth portals', () => {
  it('org sign-in uses AuthShell, invitation-only copy, and partnership CTA', async () => {
    const page = await readWeb('app/sign-in/page.tsx');
    const form = await readWeb('app/sign-in/sign-in-form.tsx');
    const shell = await readWeb('components/auth/AuthShell.tsx');

    expect(page).toMatch(/Organization sign in/);
    expect(page).toMatch(/Organization portal/);
    expect(page).toMatch(/AuthShell/);
    expect(page).toMatch(/variant="organization"/);
    expect(page).toMatch(/safeOrgNext/);
    expect(page).toMatch(/invitation|provisioned/i);
    expect(page).toMatch(/href="\/"/);
    expect(page).toMatch(/\/contact#partnerships/);
    expect(page).toMatch(/support@bridgehive\.app/);
    expect(page).not.toMatch(/href="\/sign-up"/);
    expect(page).not.toMatch(/DevOps/);
    expect(page).not.toMatch(/Microsoft/);
    expect(page).not.toMatch(/Continue with Google|Continue with Apple|GitHub/);
    expect(form).toMatch(/signInAction/);
    expect(form).toMatch(/role="alert"/);
    expect(form).toMatch(/AuthPasswordField/);
    expect(form).toMatch(/autoComplete="email"/);
    expect(form).toMatch(/aria-invalid/);
    expect(form).not.toMatch(/href="\/sign-up"/);
    expect(form).not.toMatch(/Continue with Google/);
    expect(shell).toMatch(/AuthHeroPanel/);
    expect(shell).toMatch(/AuthFooterLink/);
    expect(shell).not.toMatch(/AuthSignInDynamics/);
    expect(shell).not.toMatch(/AuthPlatformActivity/);
  });

  it('admin sign-in uses restricted copy, org portal link, and never exposes admin mailbox', async () => {
    const page = await readWeb('app/admin/sign-in/page.tsx');
    const form = await readWeb('app/admin/sign-in/admin-sign-in-form.tsx');
    const shell = await readWeb('components/auth/AuthShell.tsx');
    const action = await readWeb('app/actions/admin.ts');

    expect(page).toMatch(/Platform admin sign in/);
    expect(page).toMatch(/Admin console/);
    expect(page).toMatch(/AuthShell/);
    expect(page).toMatch(/variant="admin"/);
    expect(page).toMatch(/safeAdminNext/);
    expect(page).toMatch(/href="\/sign-in"/);
    expect(page).toMatch(/support@bridgehive\.app/);
    expect(page).toMatch(/not an organization account invitation/i);
    expect(page).not.toMatch(/admin@bridgehive\.app/);
    expect(shell).not.toMatch(/admin@bridgehive\.app/);
    expect(page).not.toMatch(/DevOps/);
    expect(page).not.toMatch(/href="\/sign-up"/);
    expect(page).not.toMatch(/Microsoft/);
    expect(form).not.toMatch(/Microsoft/);
    expect(form).not.toMatch(/Forgot password/);
    expect(form).toMatch(/signInPlatformAdminAction/);
    expect(form).toMatch(/role="alert"/);
    expect(form).not.toMatch(/admin@bridgehive\.app/);
    expect(action).toMatch(
      /This account is not authorized for platform administration/,
    );
    expect(action).toMatch(/safeAdminNext/);
    expect(action).toMatch(/signOut\(\)/);
  });

  it('auth shell and portal CSS stay scoped to auth components', async () => {
    const shell = await readWeb('components/auth/AuthShell.tsx');
    const css = await readWeb('components/auth/auth-portal.css');
    const hero = await readWeb('components/auth/AuthHeroPanel.tsx');
    const orgDash = await readWeb('app/dashboard/layout.tsx').catch(() => '');
    const adminLayout = await readWeb('app/admin/layout.tsx').catch(() => '');

    expect(shell).toMatch(/auth-portal\.css/);
    expect(shell).toMatch(/AuthHeroPanel variant=\{variant\}/);
    expect(css).toMatch(/\.auth-portal/);
    expect(css).toMatch(/auth-portal-card|auth-hero/);
    expect(css).toMatch(/data-variant='admin'/);
    expect(css).toMatch(/minmax\(0, 2fr\)/);
    expect(hero).toMatch(/\/auth\/org-hero-photo\.webp/);
    expect(hero).toMatch(/\/auth\/admin-hero-photo\.webp/);
    expect(hero).not.toMatch(/healthcare-hero\.webp/);
    expect(hero).not.toMatch(/auth-hero-content--sr/);
    expect(hero).not.toMatch(/Pay workers/);
    expect(hero).toMatch(/BridgeHiveLogo/);
    expect(hero).toMatch(/care teams/);
    expect(hero).toMatch(/Verified professionals/);
    const logo = await readWeb('components/auth/BridgeHiveLogo.tsx');
    expect(logo).toMatch(/bridge-hive-logo-v2-192\.png/);
    expect(logo).toMatch(/next\/image/);
    expect(logo).not.toMatch(/viewBox="0 0 32 32"/);
    expect(hero).not.toMatch(/AuthPlatformActivity/);
    expect(orgDash).not.toMatch(/auth-portal\.css/);
    expect(adminLayout).not.toMatch(/auth-portal\.css/);
  });

  it('ships photo-only login crops without using the reference screenshot', async () => {
    await expect(
      fs.access(path.join(webRoot, 'public/auth/org-hero-photo.webp')),
    ).resolves.toBeUndefined();
    await expect(
      fs.access(path.join(webRoot, 'public/auth/org-hero-photo.jpg')),
    ).resolves.toBeUndefined();
    await expect(
      fs.access(path.join(webRoot, 'public/auth/admin-hero-photo.webp')),
    ).resolves.toBeUndefined();
    await expect(
      fs.access(path.join(webRoot, 'public/auth/admin-hero-photo.jpg')),
    ).resolves.toBeUndefined();

    const hero = await readWeb('components/auth/AuthHeroPanel.tsx');
    expect(hero).not.toMatch(/screenshot|image\.jpg|reference/i);
  });

  it('keeps organization activity analytics on the dashboard', async () => {
    const dash = await readWeb('app/org/[slug]/dashboard/page.tsx');
    const panel = await readWeb('components/org/organization-activity-panel.tsx');
    const domain = await fs.readFile(
      path.join(webRoot, '../../packages/domain/src/org-dashboard.ts'),
      'utf8',
    );
    expect(dash).toMatch(/OrganizationActivityPanel/);
    expect(dash).toMatch(/buildOrgActivitySeries/);
    expect(panel).toMatch(/7d|30d|90d|rangeDays/);
    expect(domain).toMatch(/buildOrgActivitySeries/);
    expect(dash).not.toMatch(/timesheetSeries|locationSeries/);
  });

  it('safeOrgNext and safeAdminNext reject open redirects', () => {
    expect(safeAppPath('//evil.com', '/dashboard')).toBe('/dashboard');
    expect(safeAppPath('https://evil.com', '/dashboard')).toBe('/dashboard');
    expect(safeAppPath('/dashboard', '/x')).toBe('/dashboard');
    expect(safeAppPath('/admin/applications', '/x')).toBe('/admin/applications');

    expect(safeOrgNext('//evil.com')).toBe('/dashboard');
    expect(safeOrgNext('https://evil.com')).toBe('/dashboard');
    expect(safeOrgNext('\\evil')).toBe('/dashboard');
    expect(safeOrgNext('/dashboard')).toBe('/dashboard');
    expect(safeOrgNext('/organization-invitations/accept?token=abc')).toBe(
      '/organization-invitations/accept?token=abc',
    );

    expect(safeAdminNext('//evil.com')).toBe('/admin');
    expect(safeAdminNext('/dashboard')).toBe('/admin');
    expect(safeAdminNext('/administrator')).toBe('/admin');
    expect(safeAdminNext('/admin')).toBe('/admin');
    expect(safeAdminNext('/admin/applications')).toBe('/admin/applications');
    expect(safeAdminNext('/admin/workers?tab=1')).toBe('/admin/workers?tab=1');
  });

  it('org sign-in action and middleware use safeOrgNext', async () => {
    const auth = await readWeb('app/actions/auth.ts');
    const middleware = await readWeb('middleware.ts');

    expect(auth).toMatch(/safeOrgNext/);
    expect(auth).not.toMatch(/startsWith\('\/'\)/);
    expect(middleware).toMatch(/safeOrgNext/);
    expect(middleware).toMatch(/applySafeNext/);
  });

  it('marketing CTAs still point at org and admin sign-in portals', async () => {
    const hero = await readWeb('components/marketing/Hero.tsx');
    const footer = await readWeb('components/marketing/MarketingFooter.tsx');
    const home = await readWeb('app/(marketing)/page.tsx');

    expect(hero).toMatch(/href="\/sign-in"/);
    expect(footer).toMatch(/\/admin\/sign-in/);
    expect(home + hero).toMatch(/\/sign-in/);
  });
});
