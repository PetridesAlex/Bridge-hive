import type { Metadata } from 'next';

import { WorkerAppContinuePanel } from '@/components/auth/worker-app-continue';
import {
  SecureAuthShell,
  secureAuthBodyClass,
  secureAuthTitleClass,
} from '@/components/auth/secure-auth-shell';
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
    <SecureAuthShell
      kicker={emailConfirmed ? 'Worker email' : 'Worker app'}
      caption="Bridge Hive worker"
      wide
    >
      <h1 className={secureAuthTitleClass}>
        {emailConfirmed ? 'Email confirmed' : 'Continue in the worker app'}
      </h1>
      <p className={secureAuthBodyClass}>
        {emailConfirmed
          ? 'Your email address is verified. Account verification is a separate step inside the worker app.'
          : 'This page helps you continue after email confirmation. Sign in from the Bridge Hive worker app on your phone.'}
      </p>
      <div className="mt-7">
        <WorkerAppContinuePanel variant={variant} />
      </div>
    </SecureAuthShell>
  );
}
