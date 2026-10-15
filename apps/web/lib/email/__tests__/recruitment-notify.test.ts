jest.mock('server-only', () => ({}));

const sendResendEmailMock = jest.fn();

jest.mock('../resend', () => ({
  sendResendEmail: (...args: unknown[]) => sendResendEmailMock(...args),
}));

jest.mock('@/lib/supabase/env', () => ({
  getAppPublicUrl: () => 'https://bridgehive.app',
}));

import fs from 'node:fs/promises';
import path from 'node:path';

import {
  RECRUITMENT_NOTIFY_SUBJECT,
  RECRUITMENT_NOTIFY_TO,
  buildRecruitmentNotifyPayload,
  sendRecruitmentSubmissionNotify,
} from '../recruitment-notify';

describe('recruitment notify payload', () => {
  const candidateId = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';

  it('includes only role, timestamp, and protected admin link', () => {
    const submittedAt = new Date('2026-10-12T12:00:00.000Z');
    const payload = buildRecruitmentNotifyPayload({
      candidateId,
      role: 'registered_nurse',
      submittedAt,
    });

    expect(payload.to).toBe(RECRUITMENT_NOTIFY_TO);
    expect(payload.to).toBe('info@bridgehive.app');
    expect(payload.subject).toBe(RECRUITMENT_NOTIFY_SUBJECT);
    expect(payload.reviewPath).toBe(`/admin/recruitment/${candidateId}`);
    expect(payload.text).toMatch(/Registered Nurse|registered nurse/i);
    expect(payload.text).toContain('2026-10-12T12:00:00.000Z');
    expect(payload.text).toContain(
      `https://bridgehive.app/admin/recruitment/${candidateId}`,
    );
    expect(payload.html).toContain(
      `https://bridgehive.app/admin/recruitment/${candidateId}`,
    );
    expect(payload.html).toContain('Open admin review');
    expect(payload.html).toContain('A candidate is ready for review');
    expect(payload.html).toContain('/brand/bridge-hive-logo-v2-180.png');
    expect(payload.html).toMatch(/background-color:#071d30/);
    expect(payload.html).toMatch(/background-color:#16a6b6/);

    const combined = `${payload.subject}\n${payload.text}\n${payload.html}`;
    expect(combined).not.toMatch(/alex\.example|@test\.local|\+357|cv\.pdf|storage|password|token|service.?role|recruitment-documents/i);
    expect(combined).not.toMatch(/full.?name|phone|document/i);
  });

  it('still alerts the admin inbox when the applicant has no role', () => {
    const payload = buildRecruitmentNotifyPayload({
      candidateId,
      role: null,
      submittedAt: new Date('2026-10-15T00:00:00.000Z'),
    });

    expect(payload.to).toBe('info@bridgehive.app');
    expect(payload.reviewPath).toBe(`/admin/recruitment/${candidateId}`);
    expect(payload.text).toMatch(/Role: Not provided/);
    expect(payload.text).toContain(
      `https://bridgehive.app/admin/recruitment/${candidateId}`,
    );
    expect(payload.html).toContain('Open admin review');
  });

  it('sends once through Resend on success and zero when Resend fails', async () => {
    sendResendEmailMock.mockResolvedValueOnce({ ok: true, id: 're_test' });
    await expect(
      sendRecruitmentSubmissionNotify({
        candidateId,
        role: 'ward_assistant',
        submittedAt: new Date('2026-10-12T13:00:00.000Z'),
      }),
    ).resolves.toEqual({ sent: true });
    expect(sendResendEmailMock).toHaveBeenCalledTimes(1);
    const mailed = sendResendEmailMock.mock.calls[0]![0] as {
      to: string;
      subject: string;
      html: string;
      text: string;
    };
    expect(mailed.to).toBe('info@bridgehive.app');
    expect(mailed.subject).toBe(RECRUITMENT_NOTIFY_SUBJECT);
    expect(mailed.text).not.toMatch(/@test\.local|\+357|cv\.pdf|storage_path/i);

    sendResendEmailMock.mockReset();
    sendResendEmailMock.mockResolvedValueOnce({
      ok: false,
      error: 'Resend responded with HTTP 500',
    });
    await expect(
      sendRecruitmentSubmissionNotify({
        candidateId,
        role: 'physiotherapist',
        submittedAt: new Date('2026-10-12T14:00:00.000Z'),
      }),
    ).resolves.toEqual({ sent: false });
    expect(sendResendEmailMock).toHaveBeenCalledTimes(1);
  });

  it('admin candidate detail stays capability gated', async () => {
    const webRoot = path.resolve(__dirname, '../../..');
    const detail = await fs.readFile(
      path.join(
        webRoot,
        'app/admin/(console)/recruitment/[candidateId]/page.tsx',
      ),
      'utf8',
    );
    expect(detail).toMatch(/canReviewRecruitment/);
    expect(detail).toMatch(/requirePlatformAdmin/);
  });
});
