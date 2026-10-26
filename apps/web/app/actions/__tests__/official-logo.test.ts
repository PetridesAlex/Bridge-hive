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
    const layout =
      (await readWeb('app/(marketing)/layout.tsx')) +
      (await readWeb('lib/marketing-i18n/metadata.ts'));

    expect(brand).toMatch(/bridge-hive-logo-v2-512\.png/);
    expect(logo).toMatch(/bridge-hive-logo-v2-192\.png/);
    expect(mark).toMatch(/bridge-hive-logo-v2-192\.png/);
    expect(admin).toMatch(/BridgeHiveMark/);
    expect(admin).not.toMatch(/>\s*BH\s*</);
    expect(org).toMatch(/BridgeHiveMark/);
    expect(layout).toMatch(/og-default\.png/);
    expect(layout).not.toMatch(/bridge-hive-logo-v2-64\.png/);
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

  it('retains the full blue tile at its top-left, left, and bottom edges', async () => {
    const sharp = (await import('sharp')).default;
    const file = path.join(webRoot, 'public/brand/bridge-hive-logo-v2-1024.png');
    const { data, info } = await sharp(file)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    expect(info.width).toBe(1024);
    expect(info.height).toBe(1024);

    // These are inside the original navy tile, but were erased by the halo-only export.
    for (const [x, y] of [[222, 112], [145, 178], [79, 267], [189, 936], [499, 947]]) {
      const i = (info.width * y + x) * 4;
      expect(data[i + 3]).toBeGreaterThan(240);
      expect(data[i + 2]).toBeGreaterThan((data[i] ?? 0) + 12);
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

  it('serves a padded transparent official mark as the website favicon', async () => {
    const sharp = (await import('sharp')).default;
    const ico = await fs.readFile(path.join(webRoot, 'app/favicon.ico'));
    expect(ico.readUInt16LE(0)).toBe(0);
    expect(ico.readUInt16LE(2)).toBe(1);
    const count = ico.readUInt16LE(4);
    expect(count).toBe(4);
    const frames: Buffer[] = [];
    const sizes: number[] = [];
    for (let i = 0; i < count; i += 1) {
      const entry = 6 + i * 16;
      sizes.push(ico.readUInt8(entry));
      const pngSize = ico.readUInt32LE(entry + 8);
      const offset = ico.readUInt32LE(entry + 12);
      expect(ico.subarray(offset, offset + 8).toString('hex')).toBe(
        '89504e470d0a1a0a',
      );
      expect(pngSize).toBeGreaterThan(0);
      frames.push(ico.subarray(offset, offset + pngSize));
    }
    expect(sizes).toEqual([16, 32, 48, 64]);

    const images: Array<{ data: Buffer; info: { width: number; height: number } }> = [];
    for (const frame of frames) {
      const { data, info } = await sharp(frame)
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });
      images.push({ data, info });
    }
    for (const file of ['app/icon.png', 'app/apple-icon.png'] as const) {
      const { data, info } = await sharp(path.join(webRoot, file))
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });
      images.push({ data, info });
    }
    expect(images.map((image) => image.info.width)).toEqual([
      16, 32, 48, 64, 512, 180,
    ]);

    for (const { data, info } of images) {
      const { width: w, height: h } = info;
      let minX = w;
      let minY = h;
      let maxX = -1;
      let maxY = -1;
      let whiteEdge = 0;
      let navy = 0;
      let honey = 0;
      for (let y = 0; y < h; y += 1) {
        for (let x = 0; x < w; x += 1) {
          const i = (w * y + x) * 4;
          const r = data[i] ?? 0;
          const g = data[i + 1] ?? 0;
          const b = data[i + 2] ?? 0;
          const a = data[i + 3] ?? 0;
          if (a > 16) {
            minX = Math.min(minX, x);
            minY = Math.min(minY, y);
            maxX = Math.max(maxX, x);
            maxY = Math.max(maxY, y);
          }
          const onEdge = x < 2 || y < 2 || x >= w - 2 || y >= h - 2;
          if (onEdge && a > 20 && r > 200 && g > 200 && b > 200) whiteEdge += 1;
          if (a > 220 && b > r + 30 && b > 80 && r < 80) navy += 1;
          if (a > 220 && r > 200 && g > 120 && b < 80) honey += 1;
        }
      }
      expect(whiteEdge).toBe(0);
      expect(navy).toBeGreaterThan(Math.floor(w * h * 0.05));
      expect(honey).toBeGreaterThan(0);
      expect(minX).toBeGreaterThanOrEqual(Math.floor(w * 0.12));
      expect(minY).toBeGreaterThanOrEqual(Math.floor(h * 0.12));
      expect(w - 1 - maxX).toBeGreaterThanOrEqual(Math.floor(w * 0.12));
      expect(h - 1 - maxY).toBeGreaterThanOrEqual(Math.floor(h * 0.12));
      for (const [x, y] of [
        [0, 0],
        [w - 1, 0],
        [0, h - 1],
        [w - 1, h - 1],
      ]) {
        expect(data[(w * y + x) * 4 + 3]).toBe(0);
      }
    }
  });
});
