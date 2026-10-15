import 'server-only';

import { sanitizePushLogFields } from '@bridge-hive/domain';

import { createServiceRoleClient } from '@/lib/supabase/admin';

import {
  buildExpoPushMessage,
  outcomeFromExpoTicket,
  outcomesForTransportFailure,
  parseClaimedPushDeliveries,
  postExpoPush,
  postExpoReceipts,
  receiptFromExpo,
  type PushReceiptOutcome,
  type PushSendOutcome,
} from './expo-api';

const BATCH_LIMIT = 100;

function logPush(event: string, fields: Record<string, unknown>) {
  const safe = sanitizePushLogFields(fields);
  console.info(JSON.stringify({ scope: 'worker_push', event, ...safe }));
}

async function applySendResults(outcomes: PushSendOutcome[]): Promise<void> {
  if (outcomes.length === 0) return;
  const admin = createServiceRoleClient();
  const { error } = await admin.rpc(
    'apply_worker_push_send_results' as never,
    { p_results: outcomes } as never,
  );
  if (error) {
    throw new Error('push_result_write_failed');
  }
}

export async function dispatchWorkerPushNotifications(): Promise<{ claimed: number; sent: number }> {
  const admin = createServiceRoleClient();
  const { data, error } = await admin.rpc(
    'claim_worker_push_deliveries' as never,
    { p_limit: BATCH_LIMIT } as never,
  );
  if (error) {
    throw new Error('push_claim_failed');
  }

  const rows = parseClaimedPushDeliveries(data);
  const messages = [];
  const outcomes: PushSendOutcome[] = [];

  for (const row of rows) {
    const message = buildExpoPushMessage(row);
    if (!message) {
      outcomes.push({
        deliveryId: row.deliveryId,
        outcome: 'invalid',
        error: 'shift_unavailable',
      });
      continue;
    }
    messages.push({ row, message });
  }

  if (messages.length > 0) {
    try {
      const tickets = await postExpoPush(
        messages.map((item) => item.message),
        { accessToken: process.env.EXPO_ACCESS_TOKEN },
      );
      messages.forEach((item, index) => {
        outcomes.push(outcomeFromExpoTicket(item.row.deliveryId, tickets[index]));
      });
    } catch {
      outcomes.push(
        ...outcomesForTransportFailure(messages.map((item) => item.row.deliveryId)),
      );
    }
  }

  await applySendResults(outcomes);
  const sent = outcomes.filter((outcome) => outcome.outcome === 'sent').length;
  logPush('dispatch', { claimed: rows.length, sent, results: outcomes.length });
  return { claimed: rows.length, sent };
}

export async function checkWorkerPushReceipts(): Promise<{ checked: number }> {
  const admin = createServiceRoleClient();
  const { data, error } = await admin.rpc(
    'list_worker_push_receipt_candidates' as never,
    { p_limit: BATCH_LIMIT } as never,
  );
  if (error) {
    throw new Error('push_receipt_list_failed');
  }

  const listed: unknown = data;
  const candidates = Array.isArray(listed)
    ? listed.filter(
        (row): row is { deliveryId: string; ticketId: string } =>
          !!row &&
          typeof row === 'object' &&
          typeof (row as { deliveryId?: unknown }).deliveryId === 'string' &&
          typeof (row as { ticketId?: unknown }).ticketId === 'string',
      )
    : [];

  if (candidates.length === 0) {
    return { checked: 0 };
  }

  let receipts: Record<string, unknown> = {};
  try {
    receipts = await postExpoReceipts(
      candidates.map((candidate) => candidate.ticketId),
      { accessToken: process.env.EXPO_ACCESS_TOKEN },
    );
  } catch {
    logPush('receipts_unreachable', { candidates: candidates.length });
    return { checked: 0 };
  }

  const results: PushReceiptOutcome[] = candidates.map((candidate) =>
    receiptFromExpo(candidate.deliveryId, receipts[candidate.ticketId]),
  );

  const { error: applyError } = await admin.rpc(
    'apply_worker_push_receipts' as never,
    { p_results: results } as never,
  );
  if (applyError) {
    throw new Error('push_receipt_write_failed');
  }

  logPush('receipts', { checked: results.length });
  return { checked: results.length };
}
