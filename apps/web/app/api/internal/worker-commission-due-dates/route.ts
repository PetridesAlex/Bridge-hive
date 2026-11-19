import { timingSafeEqual } from 'node:crypto';

import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

import { workerCommissionDueDatesCronRefusalReason } from '@/lib/push/env';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Prepared scheduler entry for process_worker_commission_due_dates.
 * Not registered in vercel.json until Prompt 2 production activation.
 * Requires WORKER_PUSH_DISPATCH_SECRET or CRON_SECRET (same as worker-push).
 *
 * Preview isolation: Vercel Preview never calls the billing processor,
 * even if WORKER_COMMISSION_DUE_DATES_CRON=1 or secrets leak into Preview.
 * Authenticated staging verification uses Bridge-Hive-Test RPC directly.
 */
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

function serviceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('supabase_env');
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function handle(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const refusal = workerCommissionDueDatesCronRefusalReason();
  if (refusal) {
    return NextResponse.json({
      enabled: false,
      reason: refusal,
    });
  }

  try {
    const supabase = serviceClient();
    const { data, error } = await supabase.rpc('process_worker_commission_due_dates');
    if (error) {
      return NextResponse.json({ error: 'rpc_failed' }, { status: 500 });
    }
    return NextResponse.json({ enabled: true, result: data });
  } catch {
    return NextResponse.json({ error: 'unavailable' }, { status: 500 });
  }
}

export async function GET(request: Request) {
  return handle(request);
}

export async function POST(request: Request) {
  return handle(request);
}
