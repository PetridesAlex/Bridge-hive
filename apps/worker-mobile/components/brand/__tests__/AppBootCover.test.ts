import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '../../..');

function read(rel: string) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

describe('AppBootCover contracts', () => {
  it('uses navy boot background, splash-matched mark size, and short minimum duration', () => {
    const src = read('components/brand/AppBootCover.tsx');
    expect(src).toMatch(/APP_BOOT_BG\s*=\s*'#071A2F'/);
    expect(src).toMatch(/APP_BOOT_MARK_SIZE\s*=\s*220/);
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
    expect(appJson).toMatch(/"imageWidth":\s*220/);
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
    expect(index).toMatch(/homeRoute/);
    expect(welcome).toMatch(/markOnboardingSeen/);
    expect(welcome).toMatch(/Get started/);
    expect(welcome).toMatch(/I already have an account/);
    expect(welcome).toMatch(/\/auth\/worker/);
    expect(welcome).toMatch(/accessibilityRole="header"/);
    expect(welcome).toMatch(/Verified professional roles/);
    expect(welcome).toMatch(/Credentials checked before shifts/);
    expect(welcome).toMatch(/Shifts and payment records together/);
  });

  it('keeps recovery and restricted routes registered', () => {
    const layout = read('app/_layout.tsx');
    expect(layout).toMatch(/auth\/worker\/reset-password/);
    expect(layout).toMatch(/auth\/worker\/restricted/);
    expect(layout).toMatch(/auth\/worker\/pending/);
    expect(layout).toMatch(/auth\/worker\/rejected/);
    expect(layout).toMatch(/auth\/callback/);
    expect(layout).toMatch(/auth\/worker\/forgot-password/);
  });
});

describe('Auth journey source contracts', () => {
  it('keeps register password rule at 6 characters and shared role options', () => {
    const register = read('app/auth/worker/register.tsx');
    const roles = read('constants/workerRoleOptions.ts');
    expect(register).toMatch(/password\.length\s*<\s*6/);
    expect(register).toMatch(/at least 6 characters/);
    expect(register).toMatch(/signUpWorker/);
    expect(register).toMatch(/setPendingConfirmEmail/);
    expect(register).toMatch(/\/auth\/worker\/check-email/);
    expect(register).toMatch(/\/auth\/worker\/pending/);
    expect(register).toMatch(/AuthField/);
    expect(register).toMatch(/canGoBack/);
    expect(roles).toMatch(/registered_nurse/);
    expect(roles).toMatch(/ward_assistant/);
    expect(roles).toMatch(/physiotherapist/);
  });

  it('keeps Google sign-in on auth landing and login', () => {
    const landing = read('app/auth/worker/index.tsx');
    const login = read('app/auth/worker/login.tsx');
    const google = read('components/auth/GoogleSignInButton.tsx');
    expect(landing).toMatch(/GoogleSignInButton/);
    expect(landing).toMatch(/How would you like to continue/);
    expect(login).toMatch(/GoogleSignInButton/);
    expect(login).toMatch(/peekPendingShiftRoute/);
    expect(google).toMatch(/signInWithGoogle/);
  });

  it('uses a safe back fallback in AuthShell', () => {
    const shell = read('components/auth/AuthShell.tsx');
    expect(shell).toMatch(/canGoBack/);
    expect(shell).toMatch(/\/auth\/worker/);
    expect(shell).toMatch(/navyBand|LinearGradient/);
  });

  it('keeps HiveFlowBackground free of web asset coupling', () => {
    const bg = read('components/brand/HiveFlowBackground.tsx');
    expect(bg).not.toMatch(/apps\/web/);
    expect(bg).not.toMatch(/flow-bg\.jpg/);
    expect(bg).toMatch(/LinearGradient/);
  });
});
