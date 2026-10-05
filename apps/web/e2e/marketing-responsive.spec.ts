import { expect, test, type Page } from '@playwright/test';

const MARKETING_ROUTES = [
  '/',
  '/organizations',
  '/professionals',
  '/how-it-works',
  '/about',
  '/contact',
] as const;

const WIDTHS = [320, 390, 430, 768, 1440] as const;

const DECORATIVE =
  /m-audience-atmosphere|m-audience-blob|m-.*-orb|m-flow-bg|m-flow-shell-media|m-hero-visual-wash|m-.*glow|m-.*sheen|m-footer-bg|m-contact-hero|m-org-mock-blob|m-faq-atmosphere|m-hiw-atmosphere/i;

async function documentOverflow(page: Page) {
  return page.evaluate(() => {
    const doc = document.documentElement;
    return {
      vw: doc.clientWidth,
      sw: doc.scrollWidth,
      overflow: doc.scrollWidth - doc.clientWidth,
    };
  });
}

async function contentOverflowOffenders(page: Page) {
  return page.evaluate((decorSource) => {
    const decor = new RegExp(decorSource, 'i');
    const vw = document.documentElement.clientWidth;
    const offenders: Array<{ tag: string; cls: string; text: string; right: number }> = [];
    const nodes = document.querySelectorAll(
      'a,button,p,h1,h2,h3,li,summary,[role="tab"],[role="button"],.m-btn,.m-hero-sub,.m-audience-card,.m-nav-btn',
    );
    for (const el of nodes) {
      const cls = (el.className || '').toString();
      if (decor.test(cls) || el.getAttribute('aria-hidden') === 'true') continue;
      const style = getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden') continue;
      const r = el.getBoundingClientRect();
      if (r.width < 2 || r.height < 2) continue;
      if (r.right > vw + 1.5) {
        offenders.push({
          tag: el.tagName.toLowerCase(),
          cls: cls.slice(0, 100),
          text: (el.textContent || '').trim().slice(0, 60),
          right: Math.round(r.right),
        });
      }
    }
    return offenders.slice(0, 20);
  }, DECORATIVE.source);
}

test.describe('marketing responsive layout', () => {
  for (const width of WIDTHS) {
    for (const route of MARKETING_ROUTES) {
      test(`${route} has no meaningful horizontal overflow at ${width}px`, async ({ page }) => {
        await page.setViewportSize({
          width,
          height: width <= 430 ? 844 : width === 768 ? 1024 : 900,
        });
        await page.goto(route, { waitUntil: 'networkidle' });
        const { overflow } = await documentOverflow(page);
        expect(overflow, `document scrollWidth overflow on ${route} @${width}`).toBeLessThanOrEqual(
          1,
        );
        const offenders = await contentOverflowOffenders(page);
        expect(offenders, JSON.stringify(offenders, null, 2)).toEqual([]);
      });
    }
  }

  test('mobile menu exposes all marketing routes and role CTAs', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/', { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: /menu/i }).click();
    const panel = page.locator('.m-mobile-panel');
    await expect(panel).toBeVisible();
    for (const label of [
      'Organizations',
      'Professionals',
      'How it works',
      'About',
      'Contact',
      'Worker app',
      'Organization sign in',
    ]) {
      await expect(panel.getByRole('link', { name: new RegExp(label, 'i') })).toBeVisible();
    }
    await page.keyboard.press('Escape');
    await expect(panel).toHaveCount(0);
  });

  test('audience mark does not overlap story heading on phone', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/', { waitUntil: 'networkidle' });
    await page.locator('.m-audience').scrollIntoViewIfNeeded();
    const result = await page.evaluate(() => {
      const mark = document.querySelector('.m-audience-card-mark');
      const h3 = document.querySelector('.m-audience-card--story h3');
      const head = document.querySelector('.m-audience-card-head');
      if (!mark || !h3 || !head) return { ok: false, reason: 'missing nodes' };
      const a = mark.getBoundingClientRect();
      const b = h3.getBoundingClientRect();
      const overlap = !(
        a.right < b.left ||
        a.left > b.right ||
        a.bottom < b.top ||
        a.top > b.bottom
      );
      return {
        ok: !overlap && getComputedStyle(mark).position === 'static',
        overlap,
        position: getComputedStyle(mark).position,
      };
    });
    expect(result.ok, JSON.stringify(result)).toBe(true);
  });

  test('home FAQ accordion toggles and audience tab switches', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/', { waitUntil: 'networkidle' });
    await page.locator('.m-faq, .m-faq-band').first().scrollIntoViewIfNeeded();
    const details = page.locator('.m-faq details, details.m-faq-item').first();
    if (await details.count()) {
      await details.locator('summary').click();
      await expect(details).toHaveAttribute('open', '');
    }
    await page.locator('.m-audience').scrollIntoViewIfNeeded();
    const proTab = page.getByRole('tab', { name: /professional/i });
    await proTab.click();
    await expect(proTab).toHaveAttribute('aria-selected', 'true');
  });
});
