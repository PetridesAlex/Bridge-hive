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
        className="inline-flex items-center gap-1.5 rounded-full border border-bh-success/30 bg-bh-success-soft px-2.5 py-1 text-[11px] font-semibold text-bh-success shadow-[0_0_0_3px_rgba(25,135,84,0.10)]"
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
          'inline-flex items-center gap-1.5 rounded-full border border-bh-success/25 bg-bh-success-soft/80 px-2.5 py-1 text-[11px] font-semibold tracking-tight text-bh-success',
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
        'inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold',
        tone === 'warning' && 'bg-bh-honey-soft text-bh-warning',
        tone === 'danger' && 'bg-bh-danger-soft text-bh-danger',
        tone === 'info' && 'bg-bh-info-soft text-bh-info',
        tone === 'muted' && 'bg-bh-subtle text-bh-text-secondary',
        tone === 'success' && 'bg-bh-success-soft text-bh-success',
        className,
      )}
    >
      {label}
    </span>
  );
}
