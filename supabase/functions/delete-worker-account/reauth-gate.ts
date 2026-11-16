export const REAUTH_MAX_AGE_SEC = 600;

export type GateUser = { id: string; is_anonymous?: boolean };

export type DeletionGateInput = {
  method: string;
  hasServiceConfig: boolean;
  authorization: string | null;
  body: unknown;
  user: GateUser | null;
  userLookupFailed: boolean;
  nowSec: number;
};

export type DeletionGateResult =
  | { proceed: false; status: number; body: Record<string, unknown> }
  | { proceed: true; accessToken: string; clientRequestId: string; userId: string };

function decodeJwtPayload(accessToken: string): Record<string, unknown> | null {
  const part = accessToken.split('.')[1];
  if (!part) return null;
  try {
    const padded = part.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(part.length / 4) * 4, '=');
    const parsed = JSON.parse(atob(padded));
    if (!parsed || typeof parsed !== 'object') return null;
    return parsed as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function reauthIsRecent(accessToken: string, nowSec: number): boolean {
  const payload = decodeJwtPayload(accessToken);
  const amr = payload?.amr;
  if (!Array.isArray(amr)) return false;
  let latest: number | null = null;
  for (const entry of amr) {
    if (!entry || typeof entry !== 'object') continue;
    const method = String((entry as { method?: unknown }).method ?? '');
    if (!/^(password|oauth|otp)/.test(method)) continue;
    const raw = Number((entry as { timestamp?: unknown }).timestamp);
    if (!Number.isFinite(raw)) continue;
    const seconds = raw > 1e12 ? Math.floor(raw / 1000) : Math.floor(raw);
    if (latest === null || seconds > latest) latest = seconds;
  }
  if (latest === null) return false;
  const age = nowSec - latest;
  return age >= -60 && age <= REAUTH_MAX_AGE_SEC;
}

function isUuid(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value,
    )
  );
}

export function gateDeletionRequest(input: DeletionGateInput): DeletionGateResult {
  if (input.method !== 'POST') {
    return { proceed: false, status: 405, body: { error: 'method_not_allowed' } };
  }
  if (!input.hasServiceConfig) {
    return {
      proceed: false,
      status: 503,
      body: { error: 'misconfigured', message: 'Deletion is temporarily unavailable.' },
    };
  }
  if (!input.authorization) {
    return { proceed: false, status: 401, body: { error: 'unauthorized' } };
  }
  const body =
    input.body && typeof input.body === 'object'
      ? (input.body as Record<string, unknown>)
      : {};
  if ('user_id' in body || 'uuid' in body || 'email' in body || 'worker_id' in body) {
    return { proceed: false, status: 400, body: { error: 'invalid_request' } };
  }
  if (!isUuid(body.client_request_id)) {
    return { proceed: false, status: 400, body: { error: 'request_id_required' } };
  }
  if (input.userLookupFailed || !input.user) {
    return { proceed: false, status: 401, body: { error: 'unauthorized' } };
  }
  if (input.user.is_anonymous) {
    return { proceed: false, status: 403, body: { error: 'anonymous_forbidden' } };
  }
  const accessToken = input.authorization.replace(/^Bearer\s+/i, '').trim();
  if (!reauthIsRecent(accessToken, input.nowSec)) {
    return {
      proceed: false,
      status: 401,
      body: {
        error: 'reauth_required',
        message:
          'A password or Google sign-in from the last 10 minutes is required. An older session cannot delete the account.',
      },
    };
  }
  return {
    proceed: true,
    accessToken,
    clientRequestId: body.client_request_id,
    userId: input.user.id,
  };
}
