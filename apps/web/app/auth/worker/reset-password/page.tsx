'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client';

/**
 * Worker password update after recovery OTP (via /auth/confirm next path).
 * Does not route workers into organization activation.
 */
export default function WorkerResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(undefined);
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setPending(true);
    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setPending(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    setDone(true);
  };

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
          Choose a new password for your worker account, then continue in the Bridge Hive
          worker app.
        </p>

        {done ? (
          <div className="mt-8 space-y-4">
            <p className="text-sm font-medium text-emerald-700">Your password was updated.</p>
            <Button asChild className="w-full">
              <Link href="/sign-in">Back to sign in</Link>
            </Button>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="mt-8 flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="password" className="text-sm font-medium text-bh-text">
                New password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="new-password"
                required
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
                type="password"
                autoComplete="new-password"
                required
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="rounded-md border border-bh-border px-3 py-2 text-sm outline-none focus:border-bh-navy focus:ring-2 focus:ring-bh-subtle"
              />
            </div>
            {error ? <p className="text-sm text-red-700">{error}</p> : null}
            <Button type="submit" className="w-full" disabled={pending}>
              {pending ? 'Updating…' : 'Update password'}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => router.push('/sign-in')}
            >
              Cancel
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
