import fs from 'node:fs/promises';
import path from 'node:path';

import {
  WORKER_JOURNEY_STEP_COUNT,
  WORKER_JOURNEY_STEPS,
} from '@/components/marketing/worker-journey-data';

const webRoot = process.cwd();

async function readWeb(...parts: string[]) {
  return fs.readFile(path.join(webRoot, ...parts), 'utf8');
}

describe('worker journey section', () => {
  it('keeps six ordered steps with stable ids and short labels', () => {
    expect(WORKER_JOURNEY_STEP_COUNT).toBe(6);
    expect(WORKER_JOURNEY_STEPS.map((step) => step.id)).toEqual([
      'create-account',
      'upload-documents',
      'bank-details',
      'admin-review',
      'browse-shifts',
      'timesheets-commission',
    ]);
    expect(WORKER_JOURNEY_STEPS.map((step) => step.shortLabel)).toEqual([
      'Create account',
      'Documents',
      'Bank details',
      'Admin review',
      'Browse shifts',
      'Timesheets & wages',
    ]);
    expect(WORKER_JOURNEY_STEPS[0].label).toBe('Create your account');
    expect(WORKER_JOURNEY_STEPS[5].label).toBe('Timesheets, wages, and commission');
  });

  it('preserves verification and payment honesty in step copy', () => {
    const bodies = WORKER_JOURNEY_STEPS.map((step) => step.body).join('\n');
    expect(bodies).toMatch(/confirm your email address/i);
    expect(bodies).toMatch(/administrator reviews/i);
    expect(bodies).toMatch(/bank transfer/i);
    expect(bodies).toMatch(/does not use them to collect platform fees/i);
    expect(bodies).toMatch(/platform commission/i);
    expect(bodies).not.toMatch(/automatically verified/i);
    expect(bodies).not.toMatch(/16%/);
  });

  it('wires interactive nodes and reduced-motion static path in sources', async () => {
    const visual = await readWeb('components/marketing/WorkerJourneyVisual.tsx');
    const section = await readWeb('components/marketing/WorkerJourneySection.tsx');
    const card = await readWeb('components/marketing/WorkerJourneyCard.tsx');
    const css = await readWeb('app/(marketing)/marketing.css');

    expect(visual).toMatch(/bridge-hive-logo-v2-192\.png/);
    expect(visual).toMatch(/Illustrative journey/);
    expect(visual).toMatch(/getPointAtLength|getTotalLength/);
    expect(visual).toMatch(/prefers-reduced-motion|reduceMotion/);
    expect(section).toMatch(/IntersectionObserver/);
    expect(section).toMatch(/activeStep/);
    expect(card).toMatch(/aria-label=\{`Step \$\{index \+ 1\}/);
    expect(visual).toMatch(/aria-label=\{`Step \$\{index \+ 1\}/);
    expect(css).toMatch(/\.m-wj-path/);
    expect(css).toMatch(/\.m-wj-particle/);
    expect(css).toMatch(/prefers-reduced-motion:\s*reduce/);
    expect(css).toMatch(/\.m-wj-visual-mobile/);
  });

  it('ships the official v2 mark used by the journey diagram', async () => {
    await expect(
      fs.access(path.join(webRoot, 'public/brand/bridge-hive-logo-v2-192.png')),
    ).resolves.toBeUndefined();
  });
});
