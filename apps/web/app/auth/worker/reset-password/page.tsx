'use client';

import {
  WORKER_RECOVERY_PASSWORD_MIN_LENGTH,
} from '@bridge-hive/domain';
import { useRouter } from 'next/navigation';
import { useActionState, useEffect, useState } from 'react';

import {
  updateWorkerRecoveryPasswordAction,
  type UpdateWorkerRecoveryPasswordState,
} from '@/app/auth/worker/reset-password/actions';
import { WorkerAppContinuePanel } from '@/components/auth/worker-app-continue';
import { Button } from '@/components/ui/button';

const initial: UpdateWorkerRecoveryPasswordState = {};

/**
 * Worker password update after recovery OTP (via /auth/confirm next path).
 * GET never verifies OTP or updates auth state — only the POST server action does.
 * Does not route workers into organization activation.
 */
export default function WorkerResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [state, formAction, pending] = useActionState(
    updateWorkerRecoveryPasswordAction,
    initial,
  );

  useEffect(() => {
    if (state.done) {
      setPassword('');
      setConfirm('');
    }
  }, [state.done]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-bh-subtle to-bh-surface px-4 py-12">
      <div className="w-full max-w-lg rounded-3xl border border-bh-border bg-bh-surface p-6 shadow-[0_8px_30px_rgba(7,29,48,0.06)] sm:p-8">
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-bh-honey-strong">
          Bridge Hive
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-bh-text">
          Set a new password
        </h1>
        <p className="mt-2 text-sm text-bh-text-secondary">
          Choose a new password for your worker account (at least{' '}
          {WORKER_RECOVERY_PASSWORD_MIN_LENGTH} characters, with a letter and a
          number), then continue in the Bridge Hive worker app.
        </p>

        {state.done ? (
          <div className="mt-8">
            <WorkerAppContinuePanel variant="password-updated" />
          </div>
        ) : (
          <form action={formAction} className="mt-8 flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="password" className="text-sm font-medium text-bh-text">
                New password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                minLength={WORKER_RECOVERY_PASSWORD_MIN_LENGTH}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="rounded-md border border-bh-border px-3 py-2 text-sm outline-none focus:border-bh-navy focus:ring-2 focus:ring-bh-subtle"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="confirm" className="text-sm font-medium text-bh-text">
                Confirm password
              </label>
              <input
                id="confirm"
                name="confirm"
                type="password"
                autoComplete="new-password"
                required
                minLength={WORKER_RECOVERY_PASSWORD_MIN_LENGTH}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="rounded-md border border-bh-border px-3 py-2 text-sm outline-none focus:border-bh-navy focus:ring-2 focus:ring-bh-subtle"
              />
            </div>
            {state.error ? (
              <p className="text-sm text-red-700" role="alert">
                {state.error}
              </p>
            ) : null}
            <Button type="submit" className="w-full" disabled={pending}>
              {pending ? 'Updating…' : 'Update password'}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => router.push('/')}
            >
              Back to home
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
