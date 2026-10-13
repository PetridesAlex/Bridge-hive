jest.mock('server-only', () => ({}));

import { sendResendEmail } from '../resend';

describe('sendResendEmail', () => {
  const originalFetch = global.fetch;
  const originalKey = process.env.RESEND_API_KEY;
  const originalFrom = process.env.RESEND_FROM_EMAIL;

  afterEach(() => {
    global.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.RESEND_API_KEY;
    else process.env.RESEND_API_KEY = originalKey;
    if (originalFrom === undefined) delete process.env.RESEND_FROM_EMAIL;
    else process.env.RESEND_FROM_EMAIL = originalFrom;
  });

  it('fails closed when env is missing', async () => {
    delete process.env.RESEND_API_KEY;
    delete process.env.RESEND_FROM_EMAIL;
    await expect(
      sendResendEmail({
        to: 'info@bridgehive.app',
        subject: 't',
        html: '<p>t</p>',
        text: 't',
      }),
    ).resolves.toMatchObject({ ok: false });
  });

  it('posts to Resend once and returns id on success', async () => {
    process.env.RESEND_API_KEY = 're_test_key';
    process.env.RESEND_FROM_EMAIL = 'Bridge Hive <noreply@bridgehive.app>';
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: 're_123' }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const result = await sendResendEmail({
      to: 'info@bridgehive.app',
      subject: 'New Bridge Hive recruitment application',
      html: '<p>ok</p>',
      text: 'ok',
    });

    expect(result).toEqual({ ok: true, id: 're_123' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('https://api.resend.com/emails');
    expect(init.method).toBe('POST');
    expect(init.headers.Authorization).toBe('Bearer re_test_key');
    const body = JSON.parse(init.body as string);
    expect(body.to).toEqual(['info@bridgehive.app']);
    expect(body.from).toBe('Bridge Hive <noreply@bridgehive.app>');
    expect(JSON.stringify(body)).not.toMatch(/service.?role|storage|cv\.pdf/i);
  });
});
