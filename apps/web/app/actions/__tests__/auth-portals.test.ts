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
    expect(page).toMatch(/AuthShell/);
    expect(page).toMatch(/variant="organization"/);
    expect(page).toMatch(/safeOrgNext/);
    expect(page).toMatch(/invitation only|provisioned/i);
    expect(page).toMatch(/href="\/"/);
    expect(page).toMatch(/\/contact#partnerships/);
    expect(shell).toMatch(/support@bridgehive\.app/);
    expect(page).not.toMatch(/href="\/sign-up"/);
    expect(page).not.toMatch(/DevOps/);
    expect(form).toMatch(/signInAction/);
    expect(form).toMatch(/role="alert"/);
    expect(form).toMatch(/AuthPasswordField/);
    expect(form).toMatch(/autoComplete="email"/);
  });

  it('admin sign-in uses restricted copy, org portal link, and never exposes admin mailbox', async () => {
    const page = await readWeb('app/admin/sign-in/page.tsx');
    const form = await readWeb('app/admin/sign-in/admin-sign-in-form.tsx');
    const shell = await readWeb('components/auth/AuthShell.tsx');
    const action = await readWeb('app/actions/admin.ts');

    expect(page).toMatch(/Platform admin sign in/);
    expect(page).toMatch(/AuthShell/);
    expect(page).toMatch(/variant="admin"/);
    expect(page).toMatch(/safeAdminNext/);
    expect(page).toMatch(/href="\/sign-in"/);
    expect(shell).toMatch(/support@bridgehive\.app/);
    expect(page).not.toMatch(/admin@bridgehive\.app/);
    expect(shell).not.toMatch(/admin@bridgehive\.app/);
    expect(page).not.toMatch(/DevOps/);
    expect(page).not.toMatch(/href="\/sign-up"/);
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
    const orgDash = await readWeb('app/dashboard/layout.tsx').catch(() => '');
    const adminLayout = await readWeb('app/admin/layout.tsx').catch(() => '');

    expect(shell).toMatch(/auth-portal\.css/);
    expect(css).toMatch(/\.auth-portal/);
    expect(css).toMatch(/--bh-teal|--bh-canvas/);
    expect(orgDash).not.toMatch(/auth-portal\.css/);
    expect(adminLayout).not.toMatch(/auth-portal\.css/);
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
