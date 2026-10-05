import fs from 'node:fs/promises';
import path from 'node:path';

const webRoot = process.cwd();

async function read(...parts: string[]) {
  return fs.readFile(path.join(webRoot, ...parts), 'utf8');
}

describe('professionals payments visual', () => {
  it('ships a three-stage explainer with official mark and truthful commission copy', async () => {
    const section = await read('components/marketing/ProfessionalsPaymentsSection.tsx');
    const page = await read('app/(marketing)/professionals/page.tsx');
    const css = await read('app/(marketing)/marketing.css');

    expect(page).toMatch(/ProfessionalsPaymentsSection/);
    expect(page).not.toMatch(/FeatureRow/);
    expect(section).toMatch(/Work is approved/);
    expect(section).toMatch(/Organizations pay workers directly/);
    expect(section).toMatch(/Separate platform commission/);
    expect(section).toMatch(/Paid separately by the worker/);
    expect(section).toMatch(/Shift completed/);
    expect(section).toMatch(/Timesheet reviewed/);
    expect(section).toMatch(/Work approved/);
    expect(section).toMatch(/BRIDGE_HIVE_MARK_SRC/);
    expect(section).toMatch(/bridge-hive-logo-v2|BRIDGE_HIVE_MARK_SRC/);
    expect(section).not.toMatch(/Paid by the organization via bank transfer/);
    expect(section).not.toMatch(/16%/);
    expect(section).not.toMatch(/Apple Pay/);
    expect(css).toMatch(/\.m-pay-band/);
    expect(css).toMatch(/\.m-pay-connector/);
    expect(css).toMatch(/prefers-reduced-motion:\s*reduce/);
  });
});
