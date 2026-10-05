import fs from 'node:fs/promises';
import path from 'node:path';

import {
  __resetStorageNoticeMemoryForTests,
  hasAcknowledgedStorageNotice,
  rememberStorageNoticeAck,
  STORAGE_NOTICE_ACK,
  STORAGE_NOTICE_KEY,
} from '@/components/marketing/storage-notice';

const webRoot = process.cwd();
const read = (...parts: string[]) => fs.readFile(path.join(webRoot, ...parts), 'utf8');

describe('marketing storage notice', () => {
  const memoryStore: Record<string, string> = {};

  beforeAll(() => {
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: {
        getItem: (key: string) => memoryStore[key] ?? null,
        setItem: (key: string, value: string) => {
          memoryStore[key] = value;
        },
        removeItem: (key: string) => {
          delete memoryStore[key];
        },
      },
    });
  });

  beforeEach(() => {
    __resetStorageNoticeMemoryForTests();
    Object.keys(memoryStore).forEach((key) => delete memoryStore[key]);
  });

  it('mounts only in the public marketing shell and exposes Cookie settings in the footer', async () => {
    const shell = await read('components/marketing/MarketingShell.tsx');
    const footer = await read('components/marketing/MarketingFooter.tsx');
    const cookieBtn = await read('components/marketing/CookieSettingsButton.tsx');
    const adminLayout = await read('app/admin/(console)/layout.tsx');
    const orgLayout = await read('app/org/[slug]/layout.tsx');
    const workerLogin = await read('app/auth/worker/login/page.tsx');

    expect(shell).toMatch(/MarketingStorageNotice/);
    expect(shell).toMatch(/MarketingLogoIntro/);
    expect(footer).toMatch(/CookieSettingsButton/);
    expect(cookieBtn).toMatch(/Cookie settings/);
    expect(adminLayout).not.toMatch(/MarketingStorageNotice/);
    expect(orgLayout).not.toMatch(/MarketingStorageNotice/);
    expect(workerLogin).not.toMatch(/MarketingStorageNotice/);
  });

  it('is an informational notice with Got it and real storage copy — no fake accept/reject', async () => {
    const notice = await read('components/marketing/MarketingStorageNotice.tsx');
    const css = await read('app/(marketing)/marketing.css');

    expect(notice).toMatch(/Got it/);
    expect(notice).toMatch(/What we store/);
    expect(notice).toMatch(/bh:m-intro/);
    expect(notice).toMatch(/bh:m-storage-notice/);
    expect(notice).toMatch(/Supabase/);
    expect(notice).toMatch(/do not use advertising or\s+optional analytics/i);
    expect(notice).toMatch(/role="dialog"/);
    expect(notice).toMatch(/aria-labelledby/);
    expect(notice).toMatch(/data-m-intro/);
    expect(notice).not.toMatch(/Accept all|Reject analytics|Reject optional|Accept optional/i);

    expect(css).toMatch(/\.m-storage-notice/);
    expect(css).toMatch(/z-index:\s*10050/);
    expect(css).toMatch(/prefers-reduced-motion:\s*reduce/);
    expect(css).toMatch(/safe-area-inset-bottom/);
  });

  it('persists acknowledgment in localStorage with an in-memory fail-safe', () => {
    expect(hasAcknowledgedStorageNotice()).toBe(false);
    rememberStorageNoticeAck();
    expect(hasAcknowledgedStorageNotice()).toBe(true);
    expect(localStorage.getItem(STORAGE_NOTICE_KEY)).toBe(STORAGE_NOTICE_ACK);
  });
});
