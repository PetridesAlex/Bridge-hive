import Link from 'next/link';

import { WORKER_APP_LOGIN_DEEP_LINK } from '@bridge-hive/domain';

import { Button } from '@/components/ui/button';

export type WorkerAppContinueVariant =
  | 'signup-confirmed'
  | 'password-updated'
  | 'neutral';

/**
 * Post-email web continuation for workers. Never embeds OTPs or session tokens in URLs.
 */
export function WorkerAppContinuePanel({
  variant,
}: {
  variant: WorkerAppContinueVariant;
}) {
  const title =
    variant === 'signup-confirmed'
      ? 'Your worker email is confirmed'
      : variant === 'password-updated'
        ? 'Your password was updated'
        : 'Sign in with the Bridge Hive worker app';

  const body =
    variant === 'signup-confirmed'
      ? 'You can now sign in on your phone to continue Account Setup and submit verification documents. This page is for workers — not organization administrators.'
      : variant === 'password-updated'
        ? 'Sign in on your phone with your new password to continue in the worker app.'
        : 'Organization administrators sign in on the web dashboard. Workers use the Bridge Hive mobile app. Open the app on your device to sign in or finish Account Setup.';

  return (
    <div className="space-y-4">
      <p className="text-sm font-medium text-emerald-700">{title}</p>
      <p className="text-sm text-bh-text-secondary">{body}</p>
      <div className="flex flex-col gap-2">
        <Button asChild className="w-full">
          <a href={WORKER_APP_LOGIN_DEEP_LINK}>Open Bridge Hive worker app</a>
        </Button>
        <p className="text-xs text-bh-text-secondary">
          If the app does not open, return to this page on your phone and use Open Bridge Hive
          worker app again, or ask your organization admin for the current worker-app install
          instructions. Then sign in with the same email you used to register.
        </p>
        <Button asChild variant="outline" className="w-full">
          <Link href="/">Back to Bridge Hive home</Link>
        </Button>
      </div>
    </div>
  );
}
