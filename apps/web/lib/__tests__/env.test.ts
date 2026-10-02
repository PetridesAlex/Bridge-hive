/**
 * @jest-environment node
 */
describe('getAppPublicUrl / resolveAppPublicUrl', () => {
  const original = { ...process.env };

  afterEach(() => {
    process.env = { ...original };
    jest.resetModules();
  });

  it('prefers APP_PUBLIC_URL over Vercel hosts', async () => {
    process.env.APP_PUBLIC_URL = 'https://preview.example.com/path';
    process.env.VERCEL_BRANCH_URL = 'branch.vercel.app';
    process.env.VERCEL_URL = 'deploy.vercel.app';
    delete process.env.NEXT_PUBLIC_APP_URL;
    delete process.env.VERCEL;
    const { getAppPublicUrl } = await import('@/lib/supabase/env');
    expect(getAppPublicUrl()).toBe('https://preview.example.com');
  });

  it('prefers VERCEL_BRANCH_URL over VERCEL_URL', async () => {
    delete process.env.APP_PUBLIC_URL;
    delete process.env.NEXT_PUBLIC_APP_URL;
    delete process.env.VERCEL;
    process.env.VERCEL_BRANCH_URL = 'bridge-hive-git-phase-7-professional-ui-lynnz-projects.vercel.app';
    process.env.VERCEL_URL = 'bridge-hive-abc.vercel.app';
    const { getAppPublicUrl } = await import('@/lib/supabase/env');
    expect(getAppPublicUrl()).toBe(
      'https://bridge-hive-git-phase-7-professional-ui-lynnz-projects.vercel.app',
    );
  });

  it('uses https://VERCEL_URL when branch URL is unset', async () => {
    delete process.env.APP_PUBLIC_URL;
    delete process.env.NEXT_PUBLIC_APP_URL;
    delete process.env.VERCEL_BRANCH_URL;
    delete process.env.VERCEL;
    process.env.VERCEL_URL = 'bridge-hive-abc.vercel.app';
    const { getAppPublicUrl } = await import('@/lib/supabase/env');
    expect(getAppPublicUrl()).toBe('https://bridge-hive-abc.vercel.app');
  });

  it('falls back to localhost when neither app URL nor Vercel hosts are set', async () => {
    delete process.env.APP_PUBLIC_URL;
    delete process.env.NEXT_PUBLIC_APP_URL;
    delete process.env.VERCEL_BRANCH_URL;
    delete process.env.VERCEL_URL;
    delete process.env.VERCEL;
    const { getAppPublicUrl } = await import('@/lib/supabase/env');
    expect(getAppPublicUrl()).toBe('http://localhost:3000');
  });

  it('skips loopback APP_PUBLIC_URL on Vercel and uses VERCEL_BRANCH_URL before request Host', async () => {
    process.env.VERCEL = '1';
    process.env.APP_PUBLIC_URL = 'http://localhost:3000';
    delete process.env.NEXT_PUBLIC_APP_URL;
    process.env.VERCEL_BRANCH_URL =
      'bridge-hive-git-phase-7-professional-ui-lynnz-projects.vercel.app';
    process.env.VERCEL_URL = 'bridge-hive-abc.vercel.app';
    const { resolveAppPublicUrl } = await import('@/lib/supabase/env');
    const resolved = resolveAppPublicUrl({
      requestHost: 'bridge-hive-abc.vercel.app',
      requestProto: 'https',
    });
    expect(resolved.origin).toBe(
      'https://bridge-hive-git-phase-7-professional-ui-lynnz-projects.vercel.app',
    );
    expect(resolved.source).toBe('VERCEL_BRANCH_URL');
  });

  it('uses request Host on Vercel when APP_PUBLIC_URL is loopback and branch URL unset', async () => {
    process.env.VERCEL = '1';
    process.env.APP_PUBLIC_URL = 'http://localhost:3000';
    delete process.env.NEXT_PUBLIC_APP_URL;
    delete process.env.VERCEL_BRANCH_URL;
    delete process.env.VERCEL_URL;
    const { resolveAppPublicUrl } = await import('@/lib/supabase/env');
    const resolved = resolveAppPublicUrl({
      requestHost: 'bridge-hive-git-phase-7-professional-ui-lynnz-projects.vercel.app',
      requestProto: 'https',
    });
    expect(resolved.origin).toBe(
      'https://bridge-hive-git-phase-7-professional-ui-lynnz-projects.vercel.app',
    );
    expect(resolved.source).toBe('request_host');
  });

  it('throws on Vercel when only loopback is available', async () => {
    process.env.VERCEL = '1';
    process.env.APP_PUBLIC_URL = 'http://localhost:3000';
    delete process.env.NEXT_PUBLIC_APP_URL;
    delete process.env.VERCEL_BRANCH_URL;
    delete process.env.VERCEL_URL;
    const { resolveAppPublicUrl } = await import('@/lib/supabase/env');
    expect(() => resolveAppPublicUrl()).toThrow(/APP_PUBLIC_URL is missing or loopback/);
  });

  it('ignores non-vercel request hosts', async () => {
    delete process.env.APP_PUBLIC_URL;
    delete process.env.NEXT_PUBLIC_APP_URL;
    delete process.env.VERCEL;
    process.env.VERCEL_BRANCH_URL = 'bridge-hive-git-phase-7-professional-ui-lynnz-projects.vercel.app';
    const { resolveAppPublicUrl } = await import('@/lib/supabase/env');
    const resolved = resolveAppPublicUrl({
      requestHost: 'evil.example',
      requestProto: 'https',
    });
    expect(resolved.source).toBe('VERCEL_BRANCH_URL');
  });
});
