import { promises as fs } from 'fs';
import path from 'path';

const webRoot = path.join(__dirname, '../../..');
const repoRoot = path.join(webRoot, '../..');

async function readWeb(rel: string) {
  return fs.readFile(path.join(webRoot, rel), 'utf8');
}

describe('official Bridge Hive logo v2', () => {
  it('keeps an untouched source master and versioned public derivatives', async () => {
    for (const file of [
      'brand/source/bridge-hive-logo-blue-background.png',
      'brand/SOURCE.md',
      'apps/web/public/brand/bridge-hive-logo-v2-64.png',
      'apps/web/public/brand/bridge-hive-logo-v2-180.png',
      'apps/web/public/brand/bridge-hive-logo-v2-192.png',
      'apps/web/public/brand/bridge-hive-logo-v2-512.webp',
      'apps/web/public/brand/bridge-hive-logo-v2-1024.png',
      'apps/worker-mobile/assets/images/brand-mark.png',
      'apps/worker-mobile/assets/images/icon.png',
      'apps/worker-mobile/assets/images/splash-icon.png',
      'apps/worker-mobile/assets/images/android-icon-foreground.png',
      'apps/worker-mobile/assets/images/android-icon-background.png',
      'apps/worker-mobile/assets/images/android-icon-monochrome.png',
    ]) {
      await expect(fs.access(path.join(repoRoot, file))).resolves.toBeUndefined();
    }
  });

  it('wires the v2 mark into marketing, auth, admin, and org chrome', async () => {
    const brand = await readWeb('components/marketing/MarketingBrand.tsx');
    const logo = await readWeb('components/auth/BridgeHiveLogo.tsx');
    const mark = await readWeb('components/brand/BridgeHiveMark.tsx');
    const admin = await readWeb('components/admin/admin-sidebar.tsx');
    const org = await readWeb('components/org/organization-sidebar.tsx');
    const layout = await readWeb('app/(marketing)/layout.tsx');

    expect(brand).toMatch(/bridge-hive-logo-v2-512\.png/);
    expect(logo).toMatch(/bridge-hive-logo-v2-192\.png/);
    expect(mark).toMatch(/bridge-hive-logo-v2-192\.png/);
    expect(admin).toMatch(/BridgeHiveMark/);
    expect(admin).not.toMatch(/>\s*BH\s*</);
    expect(org).toMatch(/BridgeHiveMark/);
    expect(layout).toMatch(/bridge-hive-logo-v2-64\.png/);
    expect(layout).toMatch(/og-default\.png/);
  });

  it('does not leave superseded public brand filenames referenced', async () => {
    const sources = [
      'components/marketing/MarketingBrand.tsx',
      'components/auth/BridgeHiveLogo.tsx',
      'components/brand/BridgeHiveMark.tsx',
      'app/(marketing)/layout.tsx',
    ];
    for (const file of sources) {
      const src = await readWeb(file);
      expect(src).not.toMatch(/bridge-hive-logo-(?:64|180|192|512|original)\./);
    }
  });

  it('keeps marketing header marks free of outer light presentation halo', async () => {
    const sharp = (await import('sharp')).default;
    const file = path.join(webRoot, 'public/brand/bridge-hive-logo-v2-512.png');
    const { data, info } = await sharp(file)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    const { width, height } = info;

    let whiteB = 0;
    let outerLight = 0;
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const i = (width * y + x) * 4;
        const r = data[i] ?? 0;
        const g = data[i + 1] ?? 0;
        const b = data[i + 2] ?? 0;
        const a = data[i + 3] ?? 0;
        if (a > 240 && r > 230 && g > 230 && b > 230) {
          if (
            y > height * 0.22 &&
            y < height * 0.78 &&
            x > width * 0.22 &&
            x < width * 0.78
          ) {
            whiteB += 1;
          }
        }
        const onOuterBand =
          x < 4 || y < 4 || x >= width - 4 || y >= height - 4;
        if (onOuterBand && a > 20 && r > 200 && g > 200 && b > 200) {
          outerLight += 1;
        }
      }
    }

    expect(whiteB).toBeGreaterThan(1000);
    expect(outerLight).toBe(0);
  });
});
