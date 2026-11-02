import { timingSafeEqual } from 'node:crypto';

import { NextResponse } from 'next/server';

import {
  checkWorkerPushReceipts,
  dispatchWorkerPushNotifications,
} from '@/lib/push/dispatch';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function authorized(request: Request): boolean {
  const secrets = [
    process.env.WORKER_PUSH_DISPATCH_SECRET,
    process.env.CRON_SECRET,
  ].filter((value): value is string => typeof value === 'string' && value.length >= 16);

  if (secrets.length === 0) return false;

  const header = request.headers.get('authorization') ?? '';
  const actual = Buffer.from(header);

  for (const secret of secrets) {
    const expected = Buffer.from(`Bearer ${secret}`);
    if (actual.length === expected.length && timingSafeEqual(actual, expected)) {
      return true;
    }
  }
  return false;
}

function taskFromRequest(request: Request, bodyTask?: unknown): 'dispatch' | 'receipts' {
  const url = new URL(request.url);
  const queryTask = url.searchParams.get('task');
  if (queryTask === 'receipts' || bodyTask === 'receipts') return 'receipts';
  return 'dispatch';
}

async function handle(request: Request, bodyTask?: unknown) {
  if (!authorized(request)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const task = taskFromRequest(request, bodyTask);

  if (task === 'receipts') {
    try {
      const result = await checkWorkerPushReceipts();
      return NextResponse.json({ checked: result.checked });
    } catch {
      return NextResponse.json({ checked: 0 });
    }
  }

  try {
    const result = await dispatchWorkerPushNotifications();
    return NextResponse.json({ claimed: result.claimed, sent: result.sent });
  } catch {
    return NextResponse.json({ claimed: 0, sent: 0 });
  }
}

/**
 * Trusted retry/receipt entry. Publish actions also dispatch in-process.
 * Vercel cron uses GET with ?task=; manual/ops may POST JSON { task }.
 * This route never returns tokens, tickets, or shift private fields.
 *
 * Required secrets: WORKER_PUSH_DISPATCH_SECRET (or CRON_SECRET for Vercel cron).
 * Optional: EXPO_ACCESS_TOKEN. APNs/FCM credentials come from EAS (ops checklist).
 */
export async function GET(request: Request) {
  return handle(request);
}

export async function POST(request: Request) {
  let bodyTask: unknown;
  try {
    const body = (await request.json()) as { task?: unknown };
    bodyTask = body.task;
  } catch {
    bodyTask = undefined;
  }
  return handle(request, bodyTask);
}
