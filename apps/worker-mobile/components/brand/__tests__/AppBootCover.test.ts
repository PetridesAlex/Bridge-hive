import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '../../..');

function read(rel: string) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

describe('AppBootCover contracts', () => {
  it('uses navy boot background, splash-matched mark size, and 5s workspace minimum', () => {
    const src = read('components/brand/AppBootCover.tsx');
    const mark = read('components/brand/BridgeHiveMark.tsx');
    const prep = read('lib/workspace-preparation.ts');
    expect(src).toMatch(/APP_BOOT_BG\s*=\s*'#071A2F'/);
    expect(src).toMatch(/APP_BOOT_MARK_SIZE\s*=\s*220/);
    expect(src).toMatch(/APP_BOOT_BREATH_MS\s*=\s*3600/);
    expect(src).toMatch(/BootAtmosphere/);
    expect(src).toMatch(/variant="boot"/);
    expect(mark).toMatch(/splash-icon\.png/);
    expect(mark).toMatch(/variant\?\s*:\s*'app'\s*\|\s*'boot'/);
    expect(prep).toMatch(/WORKSPACE_PREPARATION_MINIMUM_MS\s*=\s*5000/);
    expect(src).toMatch(/t\('boot\.preparing'\)/);
    expect(src).toMatch(/t\('boot\.preparingSub'\)/);
    expect(src).toMatch(/useTranslation/);
    expect(src).not.toMatch(/APP_BOOT_BG\s*=\s*'#FFFFFF'/);
    expect(src).not.toMatch(/75%/);
    expect(src).toMatch(/reducedMotion/);
    expect(src).toMatch(/PreparationProgress/);
  });

  it('keeps native splash navy-only (no square logo) and hides after JS cover is ready', () => {
    const appJson = read('app.json');
    const layout = read('app/_layout.tsx');
    expect(appJson).toMatch(/"icon":\s*"\.\/assets\/images\/icon\.png"/);
    expect(appJson).toMatch(/"backgroundColor":\s*"#071A2F"/);
    expect(appJson).not.toMatch(/"image":\s*"\.\/assets\/images\/icon\.png"/);
    expect(appJson).not.toMatch(/"imageWidth":\s*220/);
    expect(appJson).toMatch(/empty-splash-logo\.xml/);
    expect(appJson).toMatch(/withNavyOnlySplash/);
    expect(appJson).toMatch(/expo-localization/);
    expect(appJson).toMatch(/"supportsRTL":\s*false/);
    expect(appJson).not.toMatch(/"backgroundColor":\s*"#FFFFFF"/);
    expect(layout).toMatch(/AppBootCover/);
    expect(layout).toMatch(/SplashScreen\.hideAsync/);
    expect(layout).toMatch(/APP_BOOT_BG/);
    expect(layout).toMatch(/LocaleProvider/);
  });

  it('routes first launch through Welcome then login after dismiss', () => {
    const index = read('app/index.tsx');
    const welcome = read('app/welcome.tsx');
    expect(index).toMatch(/hasCompletedOnboarding/);
    expect(index).toMatch(/\/welcome/);
    expect(index).toMatch(/\/auth\/worker\/login/);
    expect(index).toMatch(/homeRoute/);
    expect(index).toMatch(/workspacePreparationMinMs/);
    expect(index).toMatch(/markWorkspacePreparationConsumed/);
    expect(index).toMatch(/bootstrapError/);
    expect(index).toMatch(/retryBootstrap/);
    expect(welcome).toMatch(/markOnboardingSeen/);
    expect(welcome).toMatch(/welcome\.getStarted|t\('welcome\.getStarted'\)/);
    expect(welcome).toMatch(/welcome\.alreadyHaveAccount|t\('welcome\.alreadyHaveAccount'\)/);
    expect(welcome).toMatch(/\/auth\/worker/);
    expect(welcome).toMatch(/accessibilityRole="header"/);
    expect(welcome).toMatch(/LanguageToggle/);
    expect(welcome).toMatch(/welcome\.trustRoles|t\('welcome\.trustRoles'\)/);
    expect(welcome).toMatch(/welcome\.trustCredentials|t\('welcome\.trustCredentials'\)/);
    expect(welcome).toMatch(/welcome\.trustPayments|t\('welcome\.trustPayments'\)/);
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
    expect(register).toMatch(/auth\.passwordMin|t\('auth\.passwordMin/);
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
    expect(landing).toMatch(/auth\.howContinue|t\('auth\.howContinue'\)/);
    expect(landing).toMatch(/auth\.createAccount|t\('auth\.createAccount'\)/);
    expect(landing).toMatch(/maxWidth:\s*280/);
    expect(landing).toMatch(/\/welcome\?revisit=1/);
    expect(read('app/welcome.tsx')).toMatch(/revisit/);
    expect(login).toMatch(/GoogleSignInButton/);
    expect(login).toMatch(/peekPendingShiftRoute/);
    expect(google).toMatch(/signInWithGoogle/);
    expect(google).toMatch(/compact/);
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
