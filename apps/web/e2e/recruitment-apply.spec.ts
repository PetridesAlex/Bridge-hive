import { expect, test } from '@playwright/test';
import path from 'node:path';

const FRONT = '/tmp/bh-recruitment-docs/id-front.png';
const BACK = '/tmp/bh-recruitment-docs/id-back.png';
const EMPLOYMENT = '/tmp/bh-recruitment-docs/id-front.png';

test.describe('recruitment apply submission', () => {
  test('submits a talent profile through the public multi-step form', async ({
    page,
  }) => {
    const stamp = Date.now();
    const email = `e2e.recruitment.${stamp}@bridgehive.test`;

    await page.goto('/recruitment/apply');
    await expect(
      page.getByRole('heading', { name: /Join the Bridge Hive talent network/i }),
    ).toBeVisible();

    await page.getByLabel('Full name').fill('E2E Recruitment Candidate');
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Phone').fill('+35799123456');
    await page.getByLabel('Current location').fill('Limassol');
    await page.getByRole('radio', { name: 'Cyprus' }).click();
    await page
      .getByLabel('Preferred Cyprus location (optional)')
      .fill('Nicosia');
    await page.getByRole('button', { name: 'Continue' }).click();

    await expect(
      page.getByRole('heading', { name: 'Employment preferences' }),
    ).toBeVisible();
    await page.getByLabel('Professional role').selectOption('ward_assistant');
    await page
      .getByLabel('Preferred healthcare environments')
      .fill('Hospital wards');
    await page.getByLabel('Areas of interest').fill('General support');
    await page.getByRole('button', { name: 'Continue' }).click();

    await expect(
      page.getByRole('heading', { name: 'CV and documents' }),
    ).toBeVisible();

    const fileInputs = page.locator('input[type="file"]');
    // Ward assistant checklist: identity front/back + employment certificate (+ optional cv omitted)
    await expect(fileInputs.first()).toBeVisible();
    await fileInputs.nth(0).setInputFiles(FRONT);
    await fileInputs.nth(1).setInputFiles(BACK);
    await fileInputs.nth(2).setInputFiles(EMPLOYMENT);
    await expect(page.getByText(/Selected: id-front\.png/i).first()).toBeVisible();
    await page.getByRole('button', { name: 'Continue' }).click();

    await expect(
      page.getByRole('heading', { name: 'Consent and review' }),
    ).toBeVisible();
    const review = page.locator('dl');
    await expect(review.getByText('Ward Assistant', { exact: true })).toBeVisible();
    await expect(review.getByText('Limassol', { exact: true })).toBeVisible();
    await page.getByRole('checkbox').check();
    await page.getByRole('button', { name: 'Submit talent profile' }).click();

    await expect(page.getByText('Application received')).toBeVisible({
      timeout: 45_000,
    });
    await expect(
      page.getByRole('heading', {
        name: 'Your Bridge Hive talent profile has been received.',
      }),
    ).toBeVisible();
    await expect(
      page.getByText('Bridge Hive will review your profile', { exact: false }),
    ).toBeVisible();

    expect(path.isAbsolute(FRONT)).toBe(true);
  });
});
