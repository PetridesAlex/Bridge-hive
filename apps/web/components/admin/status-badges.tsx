import { Badge } from '@/components/ui/badge';
import {
  accountStatusLabel,
  credentialStatusLabel,
  onboardingStatusLabel,
  verificationStatusLabel,
} from '@/lib/admin/labels';

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

export function AccountStatusBadge({ status }: { status: string }) {
  return (
    <Badge variant={ACCOUNT_VARIANT[status] ?? 'muted'}>
      {accountStatusLabel(status)}
    </Badge>
  );
}

export function VerificationStatusBadge({ status }: { status: string }) {
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
