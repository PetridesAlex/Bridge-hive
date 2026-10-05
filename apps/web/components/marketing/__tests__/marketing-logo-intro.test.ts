import fs from 'node:fs/promises';
import path from 'node:path';

const webRoot = process.cwd();
const read = (...parts: string[]) => fs.readFile(path.join(webRoot, ...parts), 'utf8');

describe('marketing logo intro', () => {
  it('renders only the official mark within the public marketing shell', async () => {
    const shell = await read('components/marketing/MarketingShell.tsx');
    const intro = await read('components/marketing/MarketingLogoIntro.tsx');
    const mark = await read('components/brand/BridgeHiveMark.tsx');
    const layout = await read('app/(marketing)/layout.tsx');

    expect(layout).toMatch(/MarketingShell/);
    expect(shell).toMatch(/MarketingLogoIntro/);
    expect(intro).toMatch(/BRIDGE_HIVE_MARK_SRC/);
    expect(intro).toMatch(/aria-hidden="true"/);
    expect(intro).not.toMatch(/setTimeout|localStorage|loading percentage|Build\. better\. future/);
    expect(mark).toMatch(/bridge-hive-logo-v2-192\.png/);
    await expect(fs.access(path.join(webRoot, 'public/brand/bridge-hive-logo-v2-192.png'))).resolves.toBeUndefined();
  });

  it('reveals server-rendered content without JS and bypasses motion for accessibility', async () => {
    const css = await read('app/(marketing)/marketing.css');
    expect(css).toMatch(/\.marketing \.m-intro\s*\{[^}]*position:\s*fixed/);
    expect(css).toMatch(/m-intro-reveal 1\.2s/);
    expect(css).toMatch(/100%\s*\{\s*transform: translateY\(-105%\); visibility: hidden/);
    expect(css).toMatch(/\.marketing:focus-within \.m-intro/);
    expect(css).toMatch(/prefers-reduced-motion: reduce/);
    expect(css).toMatch(/\.marketing \.m-intro\s*\{\s*display: none; animation: none;/);
  });
});
