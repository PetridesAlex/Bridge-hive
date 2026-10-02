import fs from 'node:fs/promises';
import path from 'node:path';

import { PUBLIC_MARKETING_PATHS } from '@/components/marketing/nav-config';

const webRoot = process.cwd();

async function readWeb(...parts: string[]) {
  return fs.readFile(path.join(webRoot, ...parts), 'utf8');
}

const MARKETING_SOURCE_GLOBS = [
  'app/(marketing)/page.tsx',
  'app/(marketing)/organizations/page.tsx',
  'app/(marketing)/professionals/page.tsx',
  'app/(marketing)/how-it-works/page.tsx',
  'app/(marketing)/about/page.tsx',
  'app/(marketing)/contact/page.tsx',
  'components/marketing/Hero.tsx',
  'components/marketing/MarketingFooter.tsx',
  'components/marketing/MarketingNav.tsx',
  'components/marketing/blocks.tsx',
] as const;

describe('marketing site contracts', () => {
  it('exposes the expected public marketing paths', () => {
    expect([...PUBLIC_MARKETING_PATHS]).toEqual([
      '/',
      '/organizations',
      '/professionals',
      '/how-it-works',
      '/about',
      '/contact',
    ]);
  });

  it('middleware allowlists marketing routes as public', async () => {
    const src = await readWeb('middleware.ts');
    for (const pathName of [
      '/organizations',
      '/professionals',
      '/how-it-works',
      '/about',
      '/contact',
    ]) {
      expect(src).toContain(`'${pathName}'`);
    }
  });

  it('homepage CTAs use org sign-in and worker continuation, not open signup', async () => {
    const src = await readWeb('app/(marketing)/page.tsx');
    const hero = await readWeb('components/marketing/Hero.tsx');
    expect(hero).toMatch(/href="\/sign-in"/);
    expect(hero).toMatch(/href="\/auth\/worker\/login"/);
    expect(hero).toMatch(/Prepare an inquiry|Send an inquiry/);
    expect(hero).toMatch(/not a full web app/i);
    expect(hero).not.toMatch(/href="\/sign-up"/);
    expect(hero).not.toMatch(/Licensed clinical photography TBD/);
    expect(src).not.toMatch(/Organization Dashboard/);
    expect(src).not.toMatch(/Request access/);
  });

  it('nav and footer do not advertise invitation-only signup as open registration', async () => {
    const nav = await readWeb('components/marketing/MarketingNav.tsx');
    const footer = await readWeb('components/marketing/MarketingFooter.tsx');
    expect(nav).toMatch(/Organization sign in/);
    expect(nav).toMatch(/\/auth\/worker\/login/);
    expect(nav).not.toMatch(/\/sign-up/);
    expect(footer).not.toMatch(/\/sign-up/);
    expect(footer).toMatch(/\/admin\/sign-in/);
    expect(footer).not.toMatch(/Coming soon/);
    expect(footer).toMatch(/\/contact/);
  });

  it('contact page is an honest partnership inquiry surface without fake submit UX', async () => {
    const src = await readWeb('app/(marketing)/contact/page.tsx');
    expect(src).toMatch(/Partnership inquiry/);
    expect(src).toMatch(/not a substitute for organization sign-in/i);
    expect(src).toMatch(/Organization name/);
    expect(src).not.toMatch(/TODO/);
    expect(src).not.toMatch(/Submission endpoint not configured/);
    expect(src).not.toMatch(/Coming soon/);
    expect(src).not.toMatch(/message sent|thank you for contacting/i);
    expect(src).not.toMatch(/<form/i);
    expect(src).toMatch(/href="\/sign-in"/);
    expect(src).toMatch(/href="\/auth\/worker\/login"/);
  });

  it('professionals page distinguishes wage bank transfer from commission invoicing', async () => {
    const src = await readWeb('app/(marketing)/professionals/page.tsx');
    const how = await readWeb('app/(marketing)/how-it-works/page.tsx');
    expect(src).toMatch(/registered nurses/);
    expect(src).toMatch(/ward assistants/);
    expect(src).toMatch(/bank transfer/);
    expect(src).toMatch(/16%/);
    expect(src).toMatch(/10 calendar days/);
    expect(src).toMatch(/does not hold or disburse/);
    expect(src).toMatch(/does not use them to collect platform fees|not used to collect commission/i);
    expect(src).not.toMatch(/bank details Bridge Hive needs for commission invoicing/i);
    expect(src).not.toMatch(/subject to legal/);
    expect(how).not.toMatch(/payout details for Bridge Hive commission invoicing/i);
    expect(how).toMatch(/bank details for wage payouts/i);
  });

  it('marketing sources omit public scaffolding phrases', async () => {
    for (const file of MARKETING_SOURCE_GLOBS) {
      const src = await readWeb(file);
      expect(src).not.toMatch(/Coming soon/);
      expect(src).not.toMatch(/\bTODO\b/);
      expect(src).not.toMatch(/\bTBD\b/);
      expect(src).not.toMatch(/Submission endpoint not configured/);
      expect(src).not.toMatch(/Licensed clinical photography/);
    }
  });

  it('marketing metadata is not organization-dashboard copy', async () => {
    const layout = await readWeb('app/(marketing)/layout.tsx');
    const home = await readWeb('app/(marketing)/page.tsx');
    expect(layout).not.toMatch(/Organization dashboard/);
    expect(home).not.toMatch(/Organization dashboard/);
    expect(layout).toMatch(/canonical/);
  });

  it('sitemap lists only public marketing URLs', async () => {
    const src = await readWeb('app/sitemap.ts');
    expect(src).toMatch(/PUBLIC_MARKETING_PATHS/);
    expect(src).not.toMatch(/\/admin/);
    expect(src).not.toMatch(/\/org\//);
    expect(src).not.toMatch(/\/auth\//);
    expect(src).not.toMatch(/activate-organization/);
  });

  it('robots disallows private product surfaces', async () => {
    const src = await readWeb('app/robots.ts');
    expect(src).toMatch(/\/admin/);
    expect(src).toMatch(/\/org\//);
    expect(src).toMatch(/\/auth\//);
    expect(src).toMatch(/sitemap\.xml/);
  });

  it('marketing page files exist for each public route', async () => {
    const files = [
      'app/(marketing)/page.tsx',
      'app/(marketing)/organizations/page.tsx',
      'app/(marketing)/professionals/page.tsx',
      'app/(marketing)/how-it-works/page.tsx',
      'app/(marketing)/about/page.tsx',
      'app/(marketing)/contact/page.tsx',
    ];
    for (const file of files) {
      await expect(fs.access(path.join(webRoot, file))).resolves.toBeUndefined();
    }
  });
});
