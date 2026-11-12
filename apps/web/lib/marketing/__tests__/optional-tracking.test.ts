import fs from 'node:fs/promises';
import path from 'node:path';

import {
  mayLoadOptionalTracking,
  optionalTrackingDecision,
} from '@/lib/marketing/optional-tracking';

const webRoot = process.cwd();

/**
 * Harmless local stand-in for a future tag loader.
 * It is defined only in this test. It must not ship as a runtime script.
 */
function loadTestFixture(category: 'analytics' | 'advertising') {
  if (!mayLoadOptionalTracking(category)) {
    return { loaded: false as const };
  }
  return { loaded: true as const, marker: 'test-fixture-not-a-provider' };
}

describe('optional tracking gate', () => {
  it('denies analytics and advertising while no provider is configured', () => {
    expect(optionalTrackingDecision()).toEqual({
      analytics: false,
      advertising: false,
      configVersion: 1,
    });
    expect(mayLoadOptionalTracking('analytics')).toBe(false);
    expect(mayLoadOptionalTracking('advertising')).toBe(false);
    expect(loadTestFixture('analytics')).toEqual({ loaded: false });
    expect(loadTestFixture('advertising')).toEqual({ loaded: false });
  });

  it('does not reference live marketing providers in the public web app', async () => {
    const root = path.join(webRoot);
    const files = await listSourceFiles(root);
    const offenders: string[] = [];
    const pattern =
      /googletagmanager|google-analytics|gtag\(|fbq\(|facebook\.net|fbevents|@vercel\/analytics|@vercel\/speed-insights|va\.vercel-scripts/i;
    for (const file of files) {
      const text = await fs.readFile(file, 'utf8');
      if (pattern.test(text)) offenders.push(path.relative(root, file));
    }
    expect(offenders).toEqual([]);
  });
});

async function listSourceFiles(dir: string): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name === '.next' || entry.name === 'coverage') {
      continue;
    }
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listSourceFiles(full)));
    } else if (/\.(ts|tsx|js|jsx)$/.test(entry.name) && !full.includes(`${path.sep}__tests__${path.sep}`)) {
      files.push(full);
    }
  }
  return files;
}
