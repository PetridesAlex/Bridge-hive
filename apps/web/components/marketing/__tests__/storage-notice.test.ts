import fs from 'node:fs/promises';
import path from 'node:path';

import {
  __resetStorageNoticeMemoryForTests,
  clearRetiredMarketingSessionFlags,
  hasAcknowledgedStorageNotice,
  parseStorageNoticeAck,
  rememberStorageNoticeAck,
  STORAGE_NOTICE_KEY,
  STORAGE_NOTICE_VERSION,
} from '@/components/marketing/storage-notice';

const webRoot = process.cwd();
const read = (...parts: string[]) => fs.readFile(path.join(webRoot, ...parts), 'utf8');

describe('marketing storage notice', () => {
  const memoryStore: Record<string, string> = {};
  const sessionStore: Record<string, string> = {};
  let setItemThrows = false;

  beforeAll(() => {
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: {
        getItem: (key: string) => memoryStore[key] ?? null,
        setItem: (key: string, value: string) => {
          if (setItemThrows) throw new Error('blocked');
          memoryStore[key] = value;
        },
        removeItem: (key: string) => {
          delete memoryStore[key];
        },
      },
    });
    Object.defineProperty(globalThis, 'sessionStorage', {
      configurable: true,
      value: {
        getItem: (key: string) => sessionStore[key] ?? null,
        setItem: (key: string, value: string) => {
          sessionStore[key] = value;
        },
        removeItem: (key: string) => {
          delete sessionStore[key];
        },
      },
    });
  });

  beforeEach(() => {
    __resetStorageNoticeMemoryForTests();
    setItemThrows = false;
    Object.keys(memoryStore).forEach((key) => delete memoryStore[key]);
    Object.keys(sessionStore).forEach((key) => delete sessionStore[key]);
  });

  it('mounts only in the public marketing shell and reopens details from the footer', async () => {
    const shell = await read('components/marketing/MarketingShell.tsx');
    const footer = await read('components/marketing/MarketingFooter.tsx');
    const cookieBtn = await read('components/marketing/CookieSettingsButton.tsx');
    const adminLayout = await read('app/(app)/admin/(console)/layout.tsx');
    const orgLayout = await read('app/(app)/org/[slug]/layout.tsx');
    const workerLogin = await read('app/(app)/auth/worker/login/page.tsx');

    expect(shell).toMatch(/MarketingStorageNotice/);
    expect(shell).toMatch(/MarketingLogoIntro/);
    expect(shell).toMatch(/mayLoadOptionalTracking/);
    expect(footer).toMatch(/CookieSettingsButton/);
    expect(cookieBtn).toMatch(/Storage details/);
    expect(cookieBtn).toMatch(/aria-haspopup="dialog"/);
    expect(adminLayout).not.toMatch(/MarketingStorageNotice/);
    expect(orgLayout).not.toMatch(/MarketingStorageNotice/);
    expect(workerLogin).not.toMatch(/MarketingStorageNotice/);
  });

  it('is an informational notice in English and Greek, with no fake optional choices', async () => {
    const notice = await read('components/marketing/MarketingStorageNotice.tsx');
    const en = await read('lib/marketing-i18n/dictionaries/en.ts');
    const el = await read('lib/marketing-i18n/dictionaries/el.ts');
    const css = await read('app/marketing.css');
    const combined = notice + en + el;

    expect(en).toMatch(/Got it/);
    expect(en).toMatch(/What we store/);
    expect(en).toMatch(/bh:m-storage-notice/);
    expect(en).toMatch(/bh_org_remember/);
    expect(en).toMatch(/sb-hfnymqjrbppculcofaag-auth-token/);
    expect(en).toMatch(/does not load advertising or analytics tags/);
    expect(en).toMatch(/not permission for analytics/);
    expect(el).toMatch(/Κατάλαβα/);
    expect(el).toMatch(/Τι αποθηκεύουμε/);
    expect(el).toMatch(/bh:m-storage-notice/);
    expect(el).toMatch(/bh_org_remember/);
    expect(el).toMatch(/δεν φορτώνει διαφημιστικές ετικέτες ή ετικέτες ανάλυσης/);
    expect(notice).toMatch(/role="dialog"/);
    expect(notice).toMatch(/aria-labelledby/);
    expect(notice).toMatch(/data-m-intro/);
    expect(notice).toMatch(/storageNotice\.thisNoticeBody/);
    expect(combined).not.toMatch(/Accept all|Reject analytics|Reject optional|Accept optional/i);
    expect(combined).not.toMatch(/bh:m-intro|bh:m-recruit-promo/);

    expect(css).toMatch(/\.m-storage-notice/);
    expect(css).toMatch(/z-index:\s*10050/);
    expect(css).toMatch(/max-height:\s*calc\(100dvh/);
    expect(css).toMatch(/prefers-reduced-motion:\s*reduce/);
    expect(css).toMatch(/safe-area-inset-bottom/);
  });

  it('stores a versioned information acknowledgement and ignores the old ack string', () => {
    expect(hasAcknowledgedStorageNotice()).toBe(false);
    localStorage.setItem(STORAGE_NOTICE_KEY, 'ack');
    expect(hasAcknowledgedStorageNotice()).toBe(false);
    expect(parseStorageNoticeAck('ack')).toBeNull();
    expect(parseStorageNoticeAck('{')).toBeNull();
    expect(parseStorageNoticeAck(JSON.stringify({ v: 1, kind: 'information-ack', at: '2026-01-01T00:00:00.000Z' }))).toBeNull();
    expect(parseStorageNoticeAck(JSON.stringify({ v: STORAGE_NOTICE_VERSION, kind: 'analytics-ok', at: '2026-01-01T00:00:00.000Z' }))).toBeNull();

    const now = new Date('2026-11-12T12:00:00.000Z');
    rememberStorageNoticeAck(now);
    expect(hasAcknowledgedStorageNotice()).toBe(true);
    expect(parseStorageNoticeAck(localStorage.getItem(STORAGE_NOTICE_KEY))).toEqual({
      v: STORAGE_NOTICE_VERSION,
      kind: 'information-ack',
      at: '2026-11-12T12:00:00.000Z',
    });
  });

  it('stays usable when storage is blocked and clears retired session flags', () => {
    sessionStore['bh:m-intro'] = '1';
    sessionStore['bh:m-recruit-promo'] = '1';
    setItemThrows = true;
    expect(() => rememberStorageNoticeAck()).not.toThrow();
    expect(hasAcknowledgedStorageNotice()).toBe(true);
    expect(localStorage.getItem(STORAGE_NOTICE_KEY)).toBeNull();

    __resetStorageNoticeMemoryForTests();
    expect(hasAcknowledgedStorageNotice()).toBe(false);

    clearRetiredMarketingSessionFlags();
    expect(sessionStorage.getItem('bh:m-intro')).toBeNull();
    expect(sessionStorage.getItem('bh:m-recruit-promo')).toBeNull();
  });
});
