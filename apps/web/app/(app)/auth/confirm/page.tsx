import { ArrowLeft, Check } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';

import {
  allowlistedActivationNext,
  isAuthConfirmEmailOtpType,
  isWorkerRecoveryNext,
  isWorkerSignupConfirmNext,
} from '@bridge-hive/domain';

import { ConfirmActivationForm } from '@/components/auth/confirm-activation-form';
import {
  SecureAuthShell as Shell,
  secureAuthBodyClass,
  secureAuthSecondaryClass,
  secureAuthTitleClass,
} from '@/components/auth/secure-auth-shell';

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
      <Shell tone="danger" kicker="Secure link">
        <h1 className={secureAuthTitleClass}>
          This secure link is no longer valid
        </h1>
        <p className={secureAuthBodyClass}>
          It may have expired, already been used, or been replaced by a newer
          email. Request a new link from the Bridge Hive worker app or ask your
          administrator for a new activation email.
        </p>
        <Link
          href="/sign-in"
          className={`mt-8 ${secureAuthSecondaryClass}`}
        >
          <ArrowLeft
            className="h-4 w-4 transition group-hover:-translate-x-0.5"
            aria-hidden
          />
          Back to sign in
        </Link>
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

  const kicker = workerSignup
    ? 'Email confirmation'
    : workerRecovery
      ? 'Password reset'
      : 'Organization activation';

  return (
    <Shell kicker={kicker}>
      <h1 className={secureAuthTitleClass}>
        {title}
      </h1>
      <p className={secureAuthBodyClass}>{body}</p>

      <ul className="mt-6 space-y-2.5">
        {[
          'Single-use secure link',
          'Verified once — never on page load',
          'Expires automatically if unused',
        ].map((item) => (
          <li
            key={item}
            className="flex items-center gap-2.5 text-[13px] font-medium text-bh-text-secondary"
          >
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-bh-teal-soft text-bh-teal-strong ring-1 ring-bh-teal/25">
              <Check className="h-3 w-3" strokeWidth={3} aria-hidden />
            </span>
            {item}
          </li>
        ))}
      </ul>

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
