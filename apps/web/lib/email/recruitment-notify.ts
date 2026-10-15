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
  role: WorkerRole | null;
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
  const roleLabel = input.role ? recruitmentRoleLabel(input.role) : 'Not provided';
  const submittedDisplay = formatSubmittedAt(input.submittedAt);
  const submittedIso = input.submittedAt.toISOString();
  const logoUrl = `${origin}/brand/bridge-hive-logo-v2-180.png`;

  const text = [
    'Bridge Hive — Recruitment',
    '',
    'A candidate submitted a Bridge Hive recruitment profile.',
    '',
    `Role: ${roleLabel}`,
    `Submitted: ${submittedDisplay} (${submittedIso})`,
    '',
    `Open admin review: ${reviewUrl}`,
    '',
    'This alert does not include candidate personal details. Sign in as a platform admin to review the full profile.',
  ].join('\n');

  const html = buildPremiumHtml({
    origin,
    logoUrl,
    roleLabel,
    submittedDisplay,
    reviewUrl,
  });

  return {
    to: RECRUITMENT_NOTIFY_TO,
    subject: RECRUITMENT_NOTIFY_SUBJECT,
    html,
    text,
    reviewPath,
  };
}

function formatSubmittedAt(date: Date): string {
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'UTC',
    timeZoneName: 'short',
  }).format(date);
}

function buildPremiumHtml(input: {
  origin: string;
  logoUrl: string;
  roleLabel: string;
  submittedDisplay: string;
  reviewUrl: string;
}): string {
  const { origin, logoUrl, roleLabel, submittedDisplay, reviewUrl } = input;
  const safeOrigin = escapeHtml(origin);
  const safeLogo = escapeHtml(logoUrl);
  const safeRole = escapeHtml(roleLabel);
  const safeSubmitted = escapeHtml(submittedDisplay);
  const safeReview = escapeHtml(reviewUrl);

  // Table + inline styles for broad email-client support.
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<meta name="color-scheme" content="light" />
<meta name="supported-color-schemes" content="light" />
<title>New Bridge Hive recruitment application</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f7f9;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;mso-hide:all;">
    New recruitment application ready for platform admin review.
  </div>
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#f4f7f9;border-collapse:collapse;">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:560px;border-collapse:collapse;">
          <tr>
            <td style="padding:0 0 18px 0;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
                <tr>
                  <td style="vertical-align:middle;padding-right:12px;">
                    <img src="${safeLogo}" width="40" height="40" alt="Bridge Hive" style="display:block;border:0;border-radius:10px;width:40px;height:40px;" />
                  </td>
                  <td style="vertical-align:middle;">
                    <div style="font-family:Georgia,'Times New Roman',serif;font-size:20px;line-height:1.2;color:#071d30;letter-spacing:-0.02em;">Bridge Hive</div>
                    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:11px;line-height:1.4;color:#7d8a92;letter-spacing:0.16em;text-transform:uppercase;font-weight:600;padding-top:2px;">Recruitment</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="background-color:#ffffff;border:1px solid #dce5e9;border-radius:18px;overflow:hidden;box-shadow:0 10px 40px rgba(7,29,48,0.06);">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;">
                <tr>
                  <td style="height:4px;line-height:4px;font-size:0;background-color:#071d30;">&nbsp;</td>
                  <td style="height:4px;line-height:4px;font-size:0;background-color:#16a6b6;">&nbsp;</td>
                  <td style="height:4px;line-height:4px;font-size:0;background-color:#e0aa18;">&nbsp;</td>
                </tr>
              </table>
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;">
                <tr>
                  <td style="padding:28px 28px 8px 28px;">
                    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:11px;line-height:1.4;color:#087f8c;letter-spacing:0.16em;text-transform:uppercase;font-weight:700;">New submission</div>
                    <div style="font-family:Georgia,'Times New Roman',serif;font-size:26px;line-height:1.25;color:#102331;letter-spacing:-0.02em;padding-top:8px;">A candidate is ready for review</div>
                    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.55;color:#5f6f79;padding-top:12px;">
                      A Bridge Hive recruitment profile was submitted. Open the admin console to review the full application.
                    </div>
                  </td>
                </tr>
                <tr>
                  <td style="padding:16px 28px 8px 28px;">
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;background-color:#edf3f5;border:1px solid #dce5e9;border-radius:14px;">
                      <tr>
                        <td style="padding:16px 18px;border-bottom:1px solid #dce5e9;">
                          <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:11px;line-height:1.4;color:#7d8a92;letter-spacing:0.14em;text-transform:uppercase;font-weight:700;">Role</div>
                          <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:16px;line-height:1.4;color:#102331;font-weight:600;padding-top:6px;">${safeRole}</div>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:16px 18px;">
                          <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:11px;line-height:1.4;color:#7d8a92;letter-spacing:0.14em;text-transform:uppercase;font-weight:700;">Submitted</div>
                          <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:16px;line-height:1.4;color:#102331;font-weight:600;padding-top:6px;">${safeSubmitted}</div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding:22px 28px 10px 28px;" align="left">
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
                      <tr>
                        <td align="center" bgcolor="#071d30" style="border-radius:999px;background-color:#071d30;">
                          <a href="${safeReview}" style="display:inline-block;padding:14px 22px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:14px;line-height:1;font-weight:600;color:#ffffff;text-decoration:none;border-radius:999px;">
                            Open admin review
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding:8px 28px 28px 28px;">
                    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:12px;line-height:1.5;color:#7d8a92;">
                      Personal details are withheld from this email. Sign in as a platform admin to continue.
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 8px 0 8px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:12px;line-height:1.5;color:#7d8a92;text-align:center;">
              Bridge Hive · Healthcare staffing platform<br />
              <a href="${safeOrigin}" style="color:#087f8c;text-decoration:none;">bridgehive.app</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
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
