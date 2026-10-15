import { timingSafeEqual } from 'node:crypto';

import { NextResponse } from 'next/server';

import {
  checkWorkerPushReceipts,
  dispatchWorkerPushNotifications,
} from '@/lib/push/dispatch';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function authorized(request: Request): boolean {
  const secret = process.env.WORKER_PUSH_DISPATCH_SECRET;
  if (!secret || secret.length < 16) return false;
  const header = request.headers.get('authorization') ?? '';
  const expected = `Bearer ${secret}`;
  const actual = Buffer.from(header);
  const wanted = Buffer.from(expected);
  if (actual.length !== wanted.length) return false;
  return timingSafeEqual(actual, wanted);
}

/**
 * Trusted retry/receipt entry. Publish actions also dispatch in-process.
 * This route never returns tokens, tickets, or shift private fields.
 */
export async function POST(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let task = 'dispatch';
  try {
    const body = (await request.json()) as { task?: unknown };
    if (body.task === 'receipts') task = 'receipts';
  } catch {
    task = 'dispatch';
  }

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
