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
  OrganizationActivationShell,
  OrganizationActivationSignInFooter,
} from '@/components/auth/organization-activation-shell';
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
  const isOrgActivation = !workerSignup && !workerRecovery;

  if (!tokenHash || !typeRaw || !isAuthConfirmEmailOtpType(typeRaw, next)) {
    return (
      <OrganizationActivationShell
        step="status"
        title="This secure link is no longer valid"
        description="It may have expired, already been used, or been replaced by a newer email. Request a new link from the Bridge Hive worker app or ask your administrator for a new activation email."
        showOrgChrome={false}
        footer={<OrganizationActivationSignInFooter />}
      >
        <Button asChild variant="outline" className="w-full min-h-11">
          <Link href="/sign-in">Back to sign in</Link>
        </Button>
      </OrganizationActivationShell>
    );
  }

  const title = workerSignup
    ? 'Confirm your worker email'
    : workerRecovery
      ? 'Continue password reset'
      : 'Continue your organization activation';
  const body = workerSignup
    ? 'Confirm to verify your email once, then sign in to the worker app. This does not activate an organization account.'
    : workerRecovery
      ? 'Confirm to verify your reset link once, then set a new worker password. This does not activate an organization account.'
      : 'Your invitation link is ready. Continue to securely verify this email once and finish organization administrator setup.';
  const submitLabel = workerSignup
    ? 'Confirm email'
    : workerRecovery
      ? 'Continue password reset'
      : 'Continue activation';

  return (
    <OrganizationActivationShell
      step={isOrgActivation ? 'confirm' : 'status'}
      title={title}
      description={body}
      showOrgChrome={isOrgActivation}
      footer={
        isOrgActivation ? <OrganizationActivationSignInFooter /> : undefined
      }
    >
      <ConfirmActivationForm
        tokenHash={tokenHash}
        type={typeRaw}
        next={next}
        submitLabel={submitLabel}
      />
    </OrganizationActivationShell>
  );
}

function first(
  value: string | string[] | undefined,
): string | null {
  if (typeof value === 'string') return value;
  if (Array.isArray(value) && typeof value[0] === 'string') return value[0];
  return null;
}
