import { BadgeCheck, CheckCircle2 } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import {
  accountStatusLabel,
  applicationStatusLabel,
  credentialStatusLabel,
  onboardingStatusLabel,
  verificationStatusLabel,
} from '@/lib/admin/labels';
import { cn } from '@/lib/utils';

const ACCOUNT_VARIANT: Record<
  string,
  'default' | 'success' | 'warning' | 'danger' | 'muted'
> = {
  active: 'success',
  suspended: 'danger',
  deleted: 'muted',
};

const VERIFICATION_VARIANT: Record<
  string,
  'default' | 'success' | 'warning' | 'danger' | 'muted'
> = {
  draft: 'muted',
  submitted: 'warning',
  under_review: 'warning',
  verified: 'success',
  rejected: 'danger',
  suspended: 'danger',
  expired: 'muted',
};

const CREDENTIAL_VARIANT: Record<
  string,
  'default' | 'success' | 'warning' | 'danger' | 'muted'
> = {
  pending: 'warning',
  under_review: 'warning',
  verified: 'success',
  rejected: 'danger',
  expired: 'muted',
  suspended: 'danger',
};

const ONBOARDING_VARIANT: Record<
  string,
  'default' | 'success' | 'warning' | 'danger' | 'muted'
> = {
  not_started: 'muted',
  in_progress: 'warning',
  completed: 'success',
};

const APPLICATION_TONE: Record<
  string,
  'success' | 'warning' | 'danger' | 'muted' | 'info'
> = {
  account_created: 'muted',
  awaiting_documents: 'muted',
  partially_uploaded: 'warning',
  ready_to_submit: 'info',
  submitted: 'warning',
  ready_for_review: 'warning',
  under_review: 'warning',
  corrections_required: 'danger',
  documents_approved_payout_required: 'info',
  payout_approval_pending: 'warning',
  ready_for_final_approval: 'info',
  approved_marketplace: 'success',
  suspended: 'danger',
};

export function AccountStatusBadge({ status }: { status: string }) {
  return (
    <Badge variant={ACCOUNT_VARIANT[status] ?? 'muted'}>
      {accountStatusLabel(status)}
    </Badge>
  );
}

export function VerificationStatusBadge({ status }: { status: string }) {
  if (status === 'verified') {
    return (
      <span
        className="inline-flex items-center gap-1.5 rounded-full border border-emerald-700/40 bg-emerald-700 px-2.5 py-1 text-[11px] font-semibold tracking-[0.02em] text-white shadow-[0_1px_0_rgba(255,255,255,0.14)_inset,0_0_0_3px_rgba(15,107,69,0.16)]"
        title="Worker passed full verification"
      >
        <BadgeCheck className="h-3.5 w-3.5 shrink-0" aria-hidden />
        {verificationStatusLabel(status)}
      </span>
    );
  }

  return (
    <Badge variant={VERIFICATION_VARIANT[status] ?? 'muted'}>
      {verificationStatusLabel(status)}
    </Badge>
  );
}

export function CredentialStatusBadge({ status }: { status: string }) {
  return (
    <Badge variant={CREDENTIAL_VARIANT[status] ?? 'muted'}>
      {credentialStatusLabel(status)}
    </Badge>
  );
}

export function OnboardingStatusBadge({ status }: { status: string }) {
  return (
    <Badge variant={ONBOARDING_VARIANT[status] ?? 'muted'}>
      {onboardingStatusLabel(status)}
    </Badge>
  );
}

/** Queue / workspace badge — marketplace-approved gets a premium green mark. */
export function ApplicationStatusBadge({
  status,
  className,
}: {
  status: string;
  className?: string;
}) {
  const label = applicationStatusLabel(status);
  const tone = APPLICATION_TONE[status] ?? 'muted';

  if (status === 'approved_marketplace') {
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1.5 rounded-full border border-emerald-700/40 bg-emerald-700 px-2.5 py-1 text-[11px] font-semibold tracking-[0.02em] text-white shadow-[0_1px_0_rgba(255,255,255,0.14)_inset]',
          className,
        )}
        title="Fully verified — marketplace access approved"
      >
        <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={2.25} aria-hidden />
        {label}
      </span>
    );
  }

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold tracking-[0.02em]',
        tone === 'warning' &&
          'border-amber-700/40 bg-[#C47A00] text-white shadow-[0_1px_0_rgba(255,255,255,0.16)_inset]',
        tone === 'danger' &&
          'border-red-800/35 bg-[#B42318] text-white shadow-[0_1px_0_rgba(255,255,255,0.12)_inset]',
        tone === 'info' &&
          'border-sky-800/30 bg-[#0C5EAE] text-white shadow-[0_1px_0_rgba(255,255,255,0.14)_inset]',
        tone === 'muted' && 'border-[#0B2A43]/12 bg-[#0B2A43]/08 text-[#0B2A43]',
        tone === 'success' &&
          'border-emerald-700/35 bg-emerald-700 text-white shadow-[0_1px_0_rgba(255,255,255,0.14)_inset]',
        className,
      )}
    >
      {label}
    </span>
  );
}
