import 'server-only';

export type ResendEmailPayload = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

export type ResendSendResult =
  | { ok: true; id: string | null }
  | { ok: false; error: string };

function getResendConfig(): { apiKey: string; from: string } | { error: string } {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.RESEND_FROM_EMAIL?.trim();
  if (!apiKey) {
    return { error: 'RESEND_API_KEY is not configured' };
  }
  if (!from) {
    return { error: 'RESEND_FROM_EMAIL is not configured' };
  }
  return { apiKey, from };
}

/**
 * Thin Resend HTTP client for transactional server mail.
 * Uses the same Resend account/domain as Auth SMTP. Never log the API key.
 */
export async function sendResendEmail(
  payload: ResendEmailPayload,
): Promise<ResendSendResult> {
  const config = getResendConfig();
  if ('error' in config) {
    return { ok: false, error: config.error };
  }

  let response: Response;
  try {
    response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: config.from,
        to: [payload.to],
        subject: payload.subject,
        html: payload.html,
        text: payload.text,
      }),
    });
  } catch {
    return { ok: false, error: 'Resend request failed' };
  }

  if (!response.ok) {
    return {
      ok: false,
      error: `Resend responded with HTTP ${response.status}`,
    };
  }

  try {
    const body = (await response.json()) as { id?: unknown };
    const id = typeof body.id === 'string' ? body.id : null;
    return { ok: true, id };
  } catch {
    return { ok: true, id: null };
  }
}
