import type { Metadata } from 'next';

import { BridgeHiveLogo } from '@/components/auth/BridgeHiveLogo';
import { WorkerAppContinuePanel } from '@/components/auth/worker-app-continue';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Worker sign in | Bridge Hive',
  robots: { index: false, follow: false },
  referrer: 'no-referrer',
};

/**
 * Web continuation after worker signup email confirmation (`next=/auth/worker/login`).
 * GET only — never consumes OTPs. Shows confirmed copy only when session proves it.
 */
export default async function WorkerLoginContinuationPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const emailConfirmed =
    !!user?.email_confirmed_at &&
    typeof user.email_confirmed_at === 'string' &&
    user.email_confirmed_at.length > 0;

  const variant = emailConfirmed ? 'signup-confirmed' : 'neutral';

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-bh-subtle to-bh-surface px-4 py-12">
      <div className="w-full max-w-lg rounded-3xl border border-bh-border bg-bh-surface p-6 shadow-[0_8px_30px_rgba(7,29,48,0.06)] sm:p-8">
        <BridgeHiveLogo tone="light" markSize={32} />
        <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-bh-honey-strong">
          Worker
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-bh-text">
          {emailConfirmed ? 'Email confirmed' : 'Continue in the worker app'}
        </h1>
        <p className="mt-2 text-sm text-bh-text-secondary">
          {emailConfirmed
            ? 'Your email address is verified. Account verification is a separate step inside the worker app.'
            : 'This page helps you continue after email confirmation. Sign in from the Bridge Hive worker app on your phone.'}
        </p>
        <div className="mt-8">
          <WorkerAppContinuePanel variant={variant} />
        </div>
      </div>
    </div>
  );
}
