/**
 * @jest-environment node
 */
describe('getAppPublicUrl', () => {
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
    const { getAppPublicUrl } = await import('@/lib/supabase/env');
    expect(getAppPublicUrl()).toBe('https://preview.example.com');
  });

  it('prefers VERCEL_BRANCH_URL over VERCEL_URL', async () => {
    delete process.env.APP_PUBLIC_URL;
    delete process.env.NEXT_PUBLIC_APP_URL;
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
    process.env.VERCEL_URL = 'bridge-hive-abc.vercel.app';
    const { getAppPublicUrl } = await import('@/lib/supabase/env');
    expect(getAppPublicUrl()).toBe('https://bridge-hive-abc.vercel.app');
  });

  it('falls back to localhost when neither app URL nor Vercel hosts are set', async () => {
    delete process.env.APP_PUBLIC_URL;
    delete process.env.NEXT_PUBLIC_APP_URL;
    delete process.env.VERCEL_BRANCH_URL;
    delete process.env.VERCEL_URL;
    const { getAppPublicUrl } = await import('@/lib/supabase/env');
    expect(getAppPublicUrl()).toBe('http://localhost:3000');
  });
});
