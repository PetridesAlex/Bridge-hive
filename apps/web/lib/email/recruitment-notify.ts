import 'server-only';

import {
  recruitmentRoleLabel,
  type WorkerRole,
} from '@bridge-hive/domain';

import { getAppPublicUrl } from '@/lib/supabase/env';

import { sendResendEmail } from './resend';

/** Public ops inbox — not a secret; kept server-side only. */
export const RECRUITMENT_NOTIFY_TO = 'info@bridgehive.app';

export const RECRUITMENT_NOTIFY_SUBJECT =
  'New Bridge Hive recruitment application';

export type RecruitmentNotifyInput = {
  candidateId: string;
  role: WorkerRole;
  submittedAt: Date;
};

/**
 * Minimal admin alert after a successful recruitment commit.
 * Must not include name, email, phone, documents, storage URLs, or credentials.
 */
export function buildRecruitmentNotifyPayload(input: RecruitmentNotifyInput): {
  to: string;
  subject: string;
  html: string;
  text: string;
  reviewPath: string;
} {
  const origin = getAppPublicUrl();
  const reviewPath = `/admin/recruitment/${input.candidateId}`;
  const reviewUrl = `${origin}${reviewPath}`;
  const roleLabel = recruitmentRoleLabel(input.role);
  const timestamp = input.submittedAt.toISOString();

  const text = [
    'A candidate submitted a Bridge Hive recruitment profile.',
    `Role: ${roleLabel}`,
    `Submitted at: ${timestamp}`,
    `Review in the platform admin console: ${reviewUrl}`,
  ].join('\n');

  const html = [
    '<p>A candidate submitted a Bridge Hive recruitment profile.</p>',
    `<p><strong>Role:</strong> ${escapeHtml(roleLabel)}</p>`,
    `<p><strong>Submitted at:</strong> ${escapeHtml(timestamp)}</p>`,
    `<p><a href="${escapeHtml(reviewUrl)}">Open admin review</a></p>`,
  ].join('');

  return {
    to: RECRUITMENT_NOTIFY_TO,
    subject: RECRUITMENT_NOTIFY_SUBJECT,
    html,
    text,
    reviewPath,
  };
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

/**
 * Best-effort notify. Call only after DB + documents commit.
 * Failures are logged safely; callers must not fail the submission.
 */
export async function sendRecruitmentSubmissionNotify(
  input: RecruitmentNotifyInput,
): Promise<{ sent: boolean }> {
  const payload = buildRecruitmentNotifyPayload(input);
  const result = await sendResendEmail({
    to: payload.to,
    subject: payload.subject,
    html: payload.html,
    text: payload.text,
  });

  if (!result.ok) {
    console.warn(
      '[recruitment-notify] best-effort email failed:',
      result.error,
    );
    return { sent: false };
  }

  return { sent: true };
}
