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
  'app/(marketing)/layout.tsx',
  'components/marketing/Hero.tsx',
  'components/marketing/MarketingFooter.tsx',
  'components/marketing/MarketingNav.tsx',
  'components/marketing/blocks.tsx',
  'components/marketing/AudienceJourney.tsx',
  'components/marketing/HowItWorksClient.tsx',
  'components/marketing/ContactEmail.tsx',
  'components/marketing/WorkerJourneySection.tsx',
  'components/marketing/WorkerJourneyCard.tsx',
  'components/marketing/WorkerJourneyVisual.tsx',
  'components/marketing/worker-journey-data.ts',
  'app/robots.ts',
  'app/sitemap.ts',
] as const;

describe('marketing site contracts', () => {

  it('keeps audience card mark in a mobile reflow header and avoids 100vw overflow calcs', async () => {
    const audience = await readWeb('components/marketing/AudienceJourney.tsx');
    const css = await readWeb('app/(marketing)/marketing.css');
    expect(audience).toMatch(/m-audience-card-head/);
    expect(css).toMatch(/m-audience-card-head/);
    expect(css).toMatch(/Mobile responsive repair/);
    expect(css).not.toMatch(/calc\(100vw\s*-/);
    expect(css).not.toMatch(/html\s*,\s*body[^{]*\{[^}]*overflow-x:\s*hidden/);
  });

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

  it('middleware allows SEO discovery files without auth and keeps private portals protected', async () => {
    const src = await readWeb('middleware.ts');
    const publicPathsBlock = src.match(
      /const PUBLIC_PATHS = \[([\s\S]*?)\];/,
    )?.[1];
    expect(publicPathsBlock).toBeTruthy();
    const publicPaths = [...publicPathsBlock!.matchAll(/'([^']+)'/g)].map(
      (match) => match[1],
    );
    expect(publicPaths).toEqual(
      expect.arrayContaining(['/robots.txt', '/sitemap.xml']),
    );
    expect(publicPaths).not.toContain('/admin');
    expect(publicPaths).not.toContain('/dashboard');
    expect(publicPaths).not.toContain('/organisation');
    expect(publicPaths.some((pathName) => pathName.startsWith('/org/'))).toBe(
      false,
    );
  });

  it('homepage CTAs use org sign-in and worker continuation, not open signup', async () => {
    const src = await readWeb('app/(marketing)/page.tsx');
    const hero = await readWeb('components/marketing/Hero.tsx');
    const faq = await readWeb('components/marketing/HomeFaq.tsx');
    expect(hero).toMatch(/href="\/sign-in"/);
    expect(hero).toMatch(/href="\/auth\/worker\/login"/);
    expect(hero).toMatch(/\/contact#partnerships/);
    expect(hero).toMatch(/Prepare an inquiry|Send an inquiry/);
    expect(hero).toMatch(/Partnership inquiry|Explore for organizations/);
    expect(hero).toMatch(/Explore for professionals/);
    expect(hero).toMatch(/Illustrative/);
    expect(src).toMatch(/HomeFaq/);
    expect(faq).toMatch(/not a full\s+browser version of the app|not a full web/i);
    expect(faq).toMatch(/Clear answers before you/);
    expect(faq).toMatch(/prepare a partnership inquiry/);
    expect(hero).not.toMatch(/href="\/sign-up"/);
    expect(hero).not.toMatch(/Licensed clinical photography TBD/);
    expect(src).not.toMatch(/Organization Dashboard/);
    expect(src).not.toMatch(/Request access/);
  });

  it('nav and footer distinguish marketing organizations from the organization portal', async () => {
    const nav = await readWeb('components/marketing/MarketingNav.tsx');
    const footer = await readWeb('components/marketing/MarketingFooter.tsx');
    const navConfig = await readWeb('components/marketing/nav-config.ts');
    expect(nav).toMatch(/Organization sign in/);
    expect(nav).toMatch(/\/auth\/worker\/login/);
    expect(nav).not.toMatch(/\/sign-up/);
    expect(navConfig).toMatch(/href: '\/organizations'/);
    expect(navConfig).not.toMatch(/href: '\/organisation'/);
    expect(footer).not.toMatch(/\/sign-up/);
    expect(footer).toMatch(/\/admin\/sign-in/);
    expect(footer).not.toMatch(/Coming soon/);
    expect(footer).toMatch(/\/contact#partnerships/);
    expect(footer).toMatch(/\/contact#support/);
    expect(footer).toMatch(/\/organisation/);
    expect(footer).toMatch(/Organization portal/);
    expect(footer).toMatch(/MARKETING_NAV/);
    expect(navConfig).toMatch(/label: 'Organizations'/);
  });

  it('organisation portal aliases to dashboard and stays private', async () => {
    const page = await readWeb('app/organisation/page.tsx');
    const middleware = await readWeb('middleware.ts');
    const robots = await readWeb('app/robots.ts');
    const sitemap = await readWeb('app/sitemap.ts');
    const marketingPaths = await readWeb('components/marketing/nav-config.ts');
    expect(page).toMatch(/redirect\('\/dashboard'\)/);
    expect(page).toMatch(/index:\s*false/);
    expect(middleware).toContain("'/organizations'");
    expect(middleware).not.toContain("'/organisation'");
    expect(robots).toMatch(/\/organisation/);
    expect(robots).toMatch(/\/dashboard/);
    expect(sitemap).not.toMatch(/organisation/);
    expect(marketingPaths).not.toMatch(/\/organisation/);
    await expect(
      fs.access(path.join(webRoot, 'app/organisation/page.tsx')),
    ).resolves.toBeUndefined();
  });

  it('contact page routes partnerships and support to the correct public mailboxes', async () => {
    const src = await readWeb('app/(marketing)/contact/page.tsx');
    const email = await readWeb('components/marketing/ContactEmail.tsx');
    expect(src).toMatch(/id="partnerships"/);
    expect(src).toMatch(/id="support"/);
    expect(src).toMatch(/info@bridgehive\.app/);
    expect(src).toMatch(/support@bridgehive\.app/);
    expect(src).toMatch(/Partnership inquiry/);
    expect(src).toMatch(/Bridge Hive support/);
    expect(src).toMatch(/not a substitute\s+for organization sign-in/i);
    expect(src).toMatch(/Do not email identity documents, IBANs/);
    expect(src).not.toMatch(/will be published later/i);
    expect(src).not.toMatch(/TODO/);
    expect(src).not.toMatch(/Submission endpoint not configured/);
    expect(src).not.toMatch(/Coming soon/);
    expect(src).not.toMatch(/message sent|thank you for contacting/i);
    expect(src).not.toMatch(/<form/i);
    expect(src).toMatch(/href="\/sign-in"/);
    expect(src).toMatch(/href="\/auth\/worker\/login"/);
    expect(email).toMatch(/mailto:\$\{address\}/);
    expect(email).toMatch(/Copy address/);
  });

  it('professionals page distinguishes wage bank transfer from commission without published fee percentages', async () => {
    const src = await readWeb('app/(marketing)/professionals/page.tsx');
    const journey = await readWeb('components/marketing/worker-journey-data.ts');
    const section = await readWeb('components/marketing/WorkerJourneySection.tsx');
    const how = await readWeb('components/marketing/HowItWorksClient.tsx');
    const home = await readWeb('app/(marketing)/page.tsx');
    const css = await readWeb('app/(marketing)/marketing.css');
    expect(src).toMatch(/WorkerJourneySection/);
    expect(src).toMatch(/registered nurses/);
    expect(src).toMatch(/ward assistants/);
    expect(src).toMatch(/bank transfer/);
    expect(src).toMatch(/separate Bridge Hive commission invoice/i);
    expect(src).toMatch(/on its own schedule/i);
    expect(src).not.toMatch(/16%/);
    expect(src).not.toMatch(/10 calendar days/);
    expect(home).not.toMatch(/16%/);
    expect(home).not.toMatch(/10 calendar days/);
    expect(src).toMatch(/does not hold or disburse/);
    expect(src).toMatch(/does not use them to collect platform fees|not used to collect commission|does not collect commission/i);
    expect(journey).toMatch(/does not use them to collect platform fees/);
    expect(journey).toMatch(/Create your account/);
    expect(journey).toMatch(/Upload role-specific documents/);
    expect(journey).toMatch(/Submit bank details for wage payouts/);
    expect(journey).toMatch(/Platform admin review/);
    expect(journey).toMatch(/Browse and accept eligible shifts/);
    expect(journey).toMatch(/Timesheets, wages, and commission/);
    expect(section).toMatch(/How account setup/);
    expect(section).toMatch(/Illustrative journey|WorkerJourneyVisual/);
    expect(css).toMatch(/\.m-wj-band/);
    expect(css).toMatch(/prefers-reduced-motion:\s*reduce/);
    expect(src).not.toMatch(/bank details Bridge Hive needs for commission invoicing/i);
    expect(src).not.toMatch(/subject to legal/);
    expect(src).toMatch(/\/contact#support/);
    expect(how).not.toMatch(/payout details for Bridge Hive commission invoicing/i);
    expect(how).toMatch(/bank details for wage payouts/i);
  });

  it('scopes marketing fonts and styles to the marketing layout shell', async () => {
    const layout = await readWeb('app/(marketing)/layout.tsx');
    const css = await readWeb('app/(marketing)/marketing.css');
    const shell = await readWeb('components/marketing/MarketingShell.tsx');
    const signIn = await readWeb('app/sign-in/page.tsx');
    const adminSignIn = await readWeb('app/admin/sign-in/page.tsx');
    expect(layout).toMatch(/DM_Sans|dm_sans|DM Sans/i);
    expect(layout).toMatch(/--font-marketing/);
    expect(css).toMatch(/\.marketing\s*\{/);
    expect(shell).toMatch(/className="marketing/);
    expect(signIn).not.toMatch(/marketing\.css/);
    expect(signIn).not.toMatch(/--font-marketing/);
    expect(adminSignIn).not.toMatch(/marketing\.css/);
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

  it('public marketing surfaces never expose the super-admin mailbox', async () => {
    const forbidden = ['a', 'd', 'm', 'i', 'n', '@', 'b', 'r', 'i', 'd', 'g', 'e', 'h', 'i', 'v', 'e', '.', 'a', 'p', 'p'].join('');
    // Reconstruct without embedding the full address literally in this assertion string
    // beyond the joined parts above — tests absence of admin@bridgehive.app.
    expect(forbidden).toBe('admin@bridgehive.app');
    for (const file of MARKETING_SOURCE_GLOBS) {
      const src = await readWeb(file);
      expect(src).not.toContain(forbidden);
    }
    await expect(
      fs.access(path.join(webRoot, 'public/marketing/og-default.png')),
    ).resolves.toBeUndefined();
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
    expect(src).toMatch(/\/dashboard/);
    expect(src).toMatch(/\/organisation/);
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

  it('ships the official Bridge Hive mark in marketing brand and icon metadata', async () => {
    const brand = await readWeb('components/marketing/MarketingBrand.tsx');
    const layout = await readWeb('app/(marketing)/layout.tsx');
    const nav = await readWeb('components/marketing/MarketingNav.tsx');
    const footer = await readWeb('components/marketing/MarketingFooter.tsx');

    expect(brand).toMatch(/\/brand\/bridge-hive-logo-v2-512\.png/);
    expect(brand).toMatch(/next\/image/);
    expect(brand).toMatch(/Bridge Hive|m-brand-wordmark/);
    expect(brand).not.toMatch(/viewBox="0 0 32 32"/);
    expect(layout).toMatch(/\/brand\/bridge-hive-logo-v2-64\.png/);
    expect(layout).toMatch(/\/brand\/bridge-hive-logo-v2-180\.png/);
    expect(layout).toMatch(/\/brand\/bridge-hive-logo-v2-192\.png/);
    expect(nav).toMatch(/MarketingBrand/);
    expect(footer).toMatch(/MarketingBrand/);

    for (const file of [
      'public/brand/bridge-hive-logo-v2-512.webp',
      'public/brand/bridge-hive-logo-v2-512.png',
      'public/brand/bridge-hive-logo-v2-64.png',
      'public/brand/bridge-hive-logo-v2-180.png',
      'public/brand/bridge-hive-logo-v2-192.png',
      'public/brand/bridge-hive-logo-v2-1024.png',
      'app/favicon.ico',
      'app/icon.png',
    ]) {
      await expect(fs.access(path.join(webRoot, file))).resolves.toBeUndefined();
    }
  });
});
