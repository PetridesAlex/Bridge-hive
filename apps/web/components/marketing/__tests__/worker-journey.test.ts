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

  it('uses an open directional path without completion ticks or a closed orbit', async () => {
    const visual = await readWeb('components/marketing/WorkerJourneyVisual.tsx');
    const section = await readWeb('components/marketing/WorkerJourneySection.tsx');
    const card = await readWeb('components/marketing/WorkerJourneyCard.tsx');
    const css = await readWeb('app/(marketing)/marketing.css');

    expect(visual).toMatch(/BRIDGE_HIVE_MARK_SRC/);
    expect(visual).toMatch(/from '@\/components\/brand\/BridgeHiveMark'/);
    expect(visual).toMatch(/Illustrative journey/);
    const brand = await readWeb('components/marketing/MarketingBrand.tsx');
    expect(brand).toMatch(/bridge-hive-logo-v2-512\.png/);
    expect(brand).not.toMatch(/bridge-hive-logo-512\.webp/);
    const mark = await readWeb('components/brand/BridgeHiveMark.tsx');
    expect(mark).toMatch(/bridge-hive-logo-v2-192\.png/);
    expect(visual).toMatch(/Open directional journey|open six-step/i);
    expect(visual).toMatch(/getPointAtLength|getTotalLength/);
    expect(visual).toMatch(/prefers-reduced-motion|reduceMotion/);
    expect(visual).not.toMatch(/ringPoint|RING_R|aspect-ratio:\s*1/);
    expect(visual).not.toMatch(/m-wj-node-check|✓/);
    expect(visual).not.toMatch(/A \$\{RING_R\} \$\{RING_R\} 0 0 1 \$\{NODE_POINTS\[0\]/);
    expect(section).toMatch(/IntersectionObserver/);
    expect(section).toMatch(/activeStep/);
    expect(card).toMatch(/aria-label=\{`Step \$\{index \+ 1\}/);
    expect(visual).toMatch(/aria-label=\{`Step \$\{index \+ 1\}/);
    expect(css).toMatch(/\.m-wj-path/);
    expect(css).toMatch(/\.m-wj-particle/);
    expect(css).toMatch(/scroll-margin-top:\s*calc\(var\(--m-header-h/);
    expect(css).toMatch(/prefers-reduced-motion:\s*reduce/);
    expect(css).toMatch(/\.m-wj-visual-mobile/);
    const desktopBlock = css.match(/\.m-wj-visual-desktop\s*\{([\s\S]*?)\n\}/);
    expect(desktopBlock?.[1]).toMatch(/aspect-ratio:\s*760\s*\/\s*520/);
    expect(desktopBlock?.[1]).toMatch(/min-height:\s*0/);
    const svgBlock = css.match(/\.m-wj-svg\s*\{([\s\S]*?)\n\}/);
    expect(svgBlock?.[1]).toMatch(/position:\s*absolute/);
    expect(svgBlock?.[1]).toMatch(/inset:\s*0/);
    expect(svgBlock?.[1]).toMatch(/height:\s*100%/);
    expect(css).toMatch(/animation:\s*m-wj-node-enter/);
    expect(css).toMatch(/@keyframes m-wj-node-enter[\s\S]*?transform:\s*translate\(-50%,\s*-50%\) scale\(1\)/);
    expect(css).toMatch(/\.m-wj-node:not\(\.m-wj-node--mobile\)\s*\{\s*transform:\s*translate\(-50%,\s*-50%\)\s*!important/);
    expect(css).not.toMatch(/\.m-wj-node-check/);
    expect(visual).toMatch(/VIEW_W\s*=\s*760/);
    expect(visual).toMatch(/no closed loop/i);
  });

  it('ships the official v2 mark used by the journey diagram', async () => {
    await expect(
      fs.access(path.join(webRoot, 'public/brand/bridge-hive-logo-v2-192.png')),
    ).resolves.toBeUndefined();
  });
});
