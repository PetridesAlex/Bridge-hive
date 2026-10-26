import { WORKER_RECOVERY_SESSION_COOKIE } from '@bridge-hive/domain';
import type { Metadata } from 'next';
import { cookies } from 'next/headers';

import { WorkerResetPasswordClient } from '@/app/(app)/auth/worker/reset-password/worker-reset-password-client';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Set a new password | Bridge Hive',
  robots: { index: false, follow: false },
  referrer: 'no-referrer',
};

/**
 * Worker password update after recovery OTP (via /auth/confirm next path).
 * GET never verifies OTP or updates auth state — only the POST server action does.
 * Does not route workers into organization activation.
 */
export default async function WorkerResetPasswordPage() {
  const store = await cookies();
  const recoveryMarker = store.get(WORKER_RECOVERY_SESSION_COOKIE)?.value;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const recoverySessionValid = recoveryMarker === '1' && Boolean(user);

  return (
    <WorkerResetPasswordClient recoverySessionValid={recoverySessionValid} />
  );
}
