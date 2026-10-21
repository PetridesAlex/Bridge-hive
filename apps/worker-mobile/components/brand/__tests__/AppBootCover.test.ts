import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '../../..');

function read(rel: string) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

describe('AppBootCover contracts', () => {
  it('uses navy boot background and short minimum duration', () => {
    const src = read('components/brand/AppBootCover.tsx');
    expect(src).toMatch(/APP_BOOT_BG\s*=\s*'#071A2F'/);
    expect(src).toMatch(/APP_BOOT_MIN_MS\s*=\s*800/);
    expect(src).toMatch(/Preparing your workspace/);
    expect(src).not.toMatch(/APP_BOOT_BG\s*=\s*'#FFFFFF'/);
    expect(src).not.toMatch(/APP_BOOT_MIN_MS\s*=\s*3800/);
    expect(src).toMatch(/reducedMotion/);
  });

  it('keeps native splash navy and hides after JS cover is ready', () => {
    const appJson = read('app.json');
    const layout = read('app/_layout.tsx');
    expect(appJson).toMatch(/"backgroundColor":\s*"#071A2F"/);
    expect(appJson).not.toMatch(/"backgroundColor":\s*"#FFFFFF"/);
    expect(layout).toMatch(/AppBootCover/);
    expect(layout).toMatch(/SplashScreen\.hideAsync/);
    expect(layout).toMatch(/APP_BOOT_BG/);
  });

  it('routes first launch through Welcome then login after dismiss', () => {
    const index = read('app/index.tsx');
    const welcome = read('app/welcome.tsx');
    expect(index).toMatch(/hasCompletedOnboarding/);
    expect(index).toMatch(/\/welcome/);
    expect(index).toMatch(/\/auth\/worker\/login/);
    expect(welcome).toMatch(/markOnboardingSeen/);
    expect(welcome).toMatch(/Get started/);
    expect(welcome).toMatch(/I already have an account/);
    expect(welcome).toMatch(/\/auth\/worker/);
  });

  it('keeps recovery and restricted routes registered', () => {
    const layout = read('app/_layout.tsx');
    expect(layout).toMatch(/auth\/worker\/reset-password/);
    expect(layout).toMatch(/auth\/worker\/restricted/);
    expect(layout).toMatch(/auth\/worker\/pending/);
    expect(layout).toMatch(/auth\/callback/);
  });
});
