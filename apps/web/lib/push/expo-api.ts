import {
  assertSafeShiftPushData,
  buildAssignmentCancelledNotification,
  buildShiftCancelledNotification,
  buildShiftPublishedBatchNotification,
  buildShiftPublishedNotification,
  normalizePushLocale,
  type WorkerPushData,
} from '@bridge-hive/domain';

export const EXPO_PUSH_SEND_URL = 'https://exp.host/--/api/v2/push/send';
export const EXPO_PUSH_RECEIPTS_URL = 'https://exp.host/--/api/v2/push/getReceipts';
export const NEW_SHIFTS_CHANNEL_ID = 'new-shifts';

export type ClaimedPushDelivery = {
  deliveryId: string;
  expoPushToken: string;
  preferredLocale?: string | null;
  eventType?: string | null;
  payload?: Record<string, unknown> | null;
  shiftId?: string | null;
  batchId?: string | null;
  assignmentId?: string | null;
  openPositions: number;
  status: string;
  startsAt?: string | null;
  endsAt?: string | null;
  timeZone?: string | null;
  place?: string | null;
  requiredRole?: string | null;
  rateMinor?: number | null;
  currency?: string | null;
  organizationName?: string | null;
};

export type ExpoPushMessage = {
  to: string;
  title: string;
  body: string;
  sound: 'default';
  priority: 'high';
  channelId: typeof NEW_SHIFTS_CHANNEL_ID;
  data: WorkerPushData;
};

export type PushSendOutcome = {
  deliveryId: string;
  outcome: 'sent' | 'invalid' | 'retry' | 'failed';
  ticketId?: string;
  error?: string;
};

export type PushReceiptOutcome = {
  deliveryId: string;
  receiptStatus: 'ok' | 'error' | 'pending';
  receiptError?: string;
};

const EXPO_TOKEN_RE = /^Expo(nent)?PushToken\[[^\s\]]{16,180}\]$/;

export function parseClaimedPushDeliveries(value: unknown): ClaimedPushDelivery[] {
  if (!Array.isArray(value)) return [];
  return value.filter((row): row is ClaimedPushDelivery => {
    if (!row || typeof row !== 'object') return false;
    const candidate = row as Partial<ClaimedPushDelivery>;
    return (
      typeof candidate.deliveryId === 'string' &&
      typeof candidate.expoPushToken === 'string' &&
      typeof candidate.openPositions === 'number'
    );
  });
}

export function buildExpoPushMessage(row: ClaimedPushDelivery): ExpoPushMessage | null {
  if (!EXPO_TOKEN_RE.test(row.expoPushToken)) return null;
  const locale = normalizePushLocale(row.preferredLocale);
  const eventType = row.eventType ?? 'shift_published';

  let message: { title: string; body: string; data: WorkerPushData } | null = null;

  if (eventType === 'shift_published_batch') {
    const batchId = row.batchId ?? (typeof row.payload?.batchId === 'string' ? row.payload.batchId : null);
    if (!batchId) return null;
    message = buildShiftPublishedBatchNotification({
      batchId,
      shiftCount: row.openPositions,
      locale,
    });
  } else if (eventType === 'shift_cancelled') {
    if (!row.shiftId) return null;
    message = buildShiftCancelledNotification({
      shiftId: row.shiftId,
      organizationName: row.organizationName,
      locale,
    });
  } else if (eventType === 'assignment_cancelled') {
    if (!row.shiftId || !row.assignmentId) return null;
    message = buildAssignmentCancelledNotification({
      shiftId: row.shiftId,
      assignmentId: row.assignmentId,
      organizationName: row.organizationName,
      locale,
    });
  } else {
    if (
      !row.shiftId ||
      !row.startsAt ||
      !row.endsAt ||
      !row.timeZone ||
      !row.place ||
      !row.requiredRole ||
      typeof row.rateMinor !== 'number'
    ) {
      return null;
    }
    message = buildShiftPublishedNotification({
      shiftId: row.shiftId,
      requiredRole: row.requiredRole,
      startsAt: row.startsAt,
      endsAt: row.endsAt,
      timeZone: row.timeZone,
      place: row.place,
      openPositions: row.openPositions,
      rateMinor: row.rateMinor,
      currency: row.currency ?? 'EUR',
      status: row.status,
      locale,
    });
  }

  if (!message) return null;
  const data = assertSafeShiftPushData(message.data as unknown as Record<string, unknown>);
  return {
    to: row.expoPushToken,
    title: message.title,
    body: message.body,
    sound: 'default',
    priority: 'high',
    channelId: NEW_SHIFTS_CHANNEL_ID,
    data,
  };
}

export function outcomeFromExpoTicket(deliveryId: string, ticket: unknown): PushSendOutcome {
  if (!ticket || typeof ticket !== 'object') {
    return { deliveryId, outcome: 'retry', error: 'expo_unreachable' };
  }
  const row = ticket as { status?: string; id?: string; details?: { error?: string } };
  if (row.status === 'ok' && typeof row.id === 'string' && row.id.length > 0) {
    return { deliveryId, outcome: 'sent', ticketId: row.id };
  }
  const code = row.details?.error;
  if (code === 'DeviceNotRegistered') {
    return { deliveryId, outcome: 'invalid', error: 'DeviceNotRegistered' };
  }
  if (code === 'MessageRateExceeded') {
    return { deliveryId, outcome: 'retry', error: 'MessageRateExceeded' };
  }
  if (code === 'MessageTooBig' || code === 'InvalidCredentials' || code === 'MismatchSenderId') {
    return { deliveryId, outcome: 'failed', error: code };
  }
  return { deliveryId, outcome: 'retry', error: 'expo_ticket_error' };
}

export function outcomesForTransportFailure(deliveryIds: string[]): PushSendOutcome[] {
  return deliveryIds.map((deliveryId) => ({
    deliveryId,
    outcome: 'retry',
    error: 'expo_unreachable',
  }));
}

export function receiptFromExpo(
  deliveryId: string,
  receipt: unknown,
): PushReceiptOutcome {
  // Missing ticket in the Expo response is usually lag, not a hard failure.
  if (receipt == null) {
    return { deliveryId, receiptStatus: 'pending', receiptError: 'receipt_not_ready' };
  }
  if (typeof receipt !== 'object') {
    return { deliveryId, receiptStatus: 'pending', receiptError: 'expo_unreachable' };
  }
  const row = receipt as { status?: string; details?: { error?: string } };
  if (row.status === 'ok') {
    return { deliveryId, receiptStatus: 'ok' };
  }
  if (!row.status) {
    return { deliveryId, receiptStatus: 'pending', receiptError: 'expo_receipt_missing' };
  }
  const code = row.details?.error;
  if (code === 'DeviceNotRegistered' || code === 'MessageRateExceeded') {
    return { deliveryId, receiptStatus: 'error', receiptError: code };
  }
  return { deliveryId, receiptStatus: 'error', receiptError: 'expo_receipt_error' };
}

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

export async function postExpoPush(
  messages: ExpoPushMessage[],
  options: { fetchImpl?: FetchLike; accessToken?: string | null } = {},
): Promise<unknown[]> {
  if (messages.length === 0) return [];
  const fetchImpl = options.fetchImpl ?? fetch;
  const headers: Record<string, string> = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  };
  if (options.accessToken) {
    headers.Authorization = `Bearer ${options.accessToken}`;
  }

  const response = await fetchImpl(EXPO_PUSH_SEND_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify(messages),
  });

  if (response.status === 429 || response.status >= 500) {
    throw new Error(`expo_http_${response.status}`);
  }
  if (!response.ok) {
    throw new Error('expo_http_error');
  }

  const payload = (await response.json()) as { data?: unknown };
  if (!Array.isArray(payload.data) || payload.data.length !== messages.length) {
    throw new Error('expo_ticket_shape');
  }
  return payload.data;
}

export async function postExpoReceipts(
  ticketIds: string[],
  options: { fetchImpl?: FetchLike; accessToken?: string | null } = {},
): Promise<Record<string, unknown>> {
  if (ticketIds.length === 0) return {};
  const fetchImpl = options.fetchImpl ?? fetch;
  const headers: Record<string, string> = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  };
  if (options.accessToken) {
    headers.Authorization = `Bearer ${options.accessToken}`;
  }
  const response = await fetchImpl(EXPO_PUSH_RECEIPTS_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify({ ids: ticketIds }),
  });
  if (!response.ok) {
    throw new Error(`expo_http_${response.status}`);
  }
  const payload = (await response.json()) as { data?: Record<string, unknown> };
  return payload.data ?? {};
}
