import type { Metadata } from 'next';
import Link from 'next/link';

import {
  allowlistedActivationNext,
  isAuthConfirmEmailOtpType,
  isWorkerRecoveryNext,
  isWorkerSignupConfirmNext,
} from '@bridge-hive/domain';

import { BridgeHiveLogo } from '@/components/auth/BridgeHiveLogo';
import { ConfirmActivationForm } from '@/components/auth/confirm-activation-form';
import { Button } from '@/components/ui/button';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Continue secure link | Bridge Hive',
  robots: { index: false, follow: false },
  referrer: 'no-referrer',
};

/**
 * GET must never consume Auth OTPs.
 * Email scanners may hit this URL; only explicit POST verifies the link.
 */
export default async function AuthConfirmPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const tokenHash = first(params.token_hash);
  const typeRaw = first(params.type);
  const next = allowlistedActivationNext(first(params.next));
  const workerRecovery = isWorkerRecoveryNext(next);
  const workerSignup = isWorkerSignupConfirmNext(next) || typeRaw === 'signup';

  if (!tokenHash || !typeRaw || !isAuthConfirmEmailOtpType(typeRaw, next)) {
    return (
      <Shell>
        <h1 className="text-2xl font-semibold text-bh-text">
          This secure link is no longer valid
        </h1>
        <p className="mt-2 text-sm text-bh-text-secondary">
          It may have expired, already been used, or been replaced by a newer
          email. Request a new link from the Bridge Hive worker app or ask your
          administrator for a new activation email.
        </p>
        <div className="mt-6">
          <Button asChild variant="outline">
            <Link href="/sign-in">Back to sign in</Link>
          </Button>
        </div>
      </Shell>
    );
  }

  const title = workerSignup
    ? 'Confirm your worker email'
    : workerRecovery
      ? 'Continue password reset'
      : 'Continue activation';
  const body = workerSignup
    ? 'Confirm to verify your email once, then sign in to the worker app. This does not activate an organization account.'
    : workerRecovery
      ? 'Confirm to verify your reset link once, then set a new worker password. This does not activate an organization account.'
      : 'Confirm to securely continue setting up your organization administrator account. This step verifies your email link once.';
  const submitLabel = workerSignup
    ? 'Confirm email'
    : workerRecovery
      ? 'Continue password reset'
      : 'Continue activation';

  return (
    <Shell>
      <h1 className="text-2xl font-semibold tracking-tight text-bh-text">
        {title}
      </h1>
      <p className="mt-2 text-sm text-bh-text-secondary">{body}</p>
      <ConfirmActivationForm
        tokenHash={tokenHash}
        type={typeRaw}
        next={next}
        submitLabel={submitLabel}
      />
    </Shell>
  );
}

function first(
  value: string | string[] | undefined,
): string | null {
  if (typeof value === 'string') return value;
  if (Array.isArray(value) && typeof value[0] === 'string') return value[0];
  return null;
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-bh-subtle to-bh-surface px-4 py-12">
      <div className="w-full max-w-lg rounded-3xl border border-bh-border bg-bh-surface p-6 shadow-[0_8px_30px_rgba(7,29,48,0.06)] sm:p-8">
        <BridgeHiveLogo tone="light" markSize={32} />
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}
