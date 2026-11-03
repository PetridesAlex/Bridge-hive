import { ArrowLeft, Building2, Mail, UserRoundCheck } from 'lucide-react';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import {
  ORG_INVITATION_COOKIE,
  friendlyInvitationError,
  maskEmail,
} from '@bridge-hive/domain';

import { ActivateOrganizationForm } from '@/components/activate-organization-form';
import {
  SecureAuthShell,
  secureAuthBodyClass,
  secureAuthPrimaryClass,
  secureAuthSecondaryClass,
  secureAuthTitleClass,
} from '@/components/auth/secure-auth-shell';
import { createClient } from '@/lib/supabase/server';
import { signOutForActivationMismatchAction } from '@/app/actions/organization-activation';

const CAPTION = 'Organization activation';

export default async function ActivateOrganizationAccountPage() {
  const store = await cookies();
  const invitationId = store.get(ORG_INVITATION_COOKIE)?.value ?? null;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/sign-in?next=/activate-organization-account');
  }

  if (!invitationId) {
    return (
      <SecureAuthShell kicker="Activation link required" caption={CAPTION}>
        <h1 className={secureAuthTitleClass}>Activation link required</h1>
        <p className={secureAuthBodyClass}>
          Open the secure Activate account link from your Bridge Hive email to
          continue.
        </p>
        <div className="mt-8 grid gap-2.5 sm:grid-cols-2">
          <Link href="/sign-in" className={secureAuthPrimaryClass}>
            <span className="relative">Sign in</span>
          </Link>
          <Link href="/" className={secureAuthSecondaryClass}>
            Return to home
          </Link>
        </div>
      </SecureAuthShell>
    );
  }

  const { data, error } = await supabase.rpc(
    'get_organization_invitation_preview_by_id',
    { p_invitation_id: invitationId },
  );

  if (error) {
    const mismatch = error.message?.includes('EMAIL_MISMATCH');
    return (
      <SecureAuthShell
        tone="danger"
        kicker={mismatch ? 'Account mismatch' : 'Activation issue'}
        caption={CAPTION}
      >
        <h1 className={secureAuthTitleClass}>
          {mismatch ? 'Wrong email signed in' : 'Unable to activate'}
        </h1>
        <p className={secureAuthBodyClass}>
          {friendlyInvitationError(error.message)}
        </p>
        {mismatch ? (
          <form action={signOutForActivationMismatchAction} className="mt-8">
            <button type="submit" className={secureAuthPrimaryClass}>
              <span className="relative">
                Sign out and continue with invited email
              </span>
            </button>
          </form>
        ) : (
          <BackHome />
        )}
      </SecureAuthShell>
    );
  }

  const preview = data as {
    display_name: string;
    role: string;
    email_normalized: string;
    email_hint: string;
    status: string;
    organization_status: string;
    slug: string;
  };

  if (preview.status !== 'open') {
    return (
      <SecureAuthShell tone="danger" kicker="Invitation" caption={CAPTION}>
        <h1 className={secureAuthTitleClass}>Invitation unavailable</h1>
        <p className={secureAuthBodyClass}>
          {friendlyInvitationError(
            preview.status === 'expired'
              ? 'INVITATION_EXPIRED'
              : preview.status === 'revoked'
                ? 'INVITATION_REVOKED'
                : 'INVITATION_ALREADY_USED',
          )}
        </p>
        <BackHome />
      </SecureAuthShell>
    );
  }

  if (
    preview.organization_status === 'suspended' ||
    preview.organization_status === 'closed'
  ) {
    return (
      <SecureAuthShell tone="danger" kicker="Organization" caption={CAPTION}>
        <h1 className={secureAuthTitleClass}>Organization unavailable</h1>
        <p className={secureAuthBodyClass}>
          {friendlyInvitationError('ORG_NOT_ACCEPTING')}
        </p>
        <BackHome />
      </SecureAuthShell>
    );
  }

  const details = [
    { icon: Building2, label: 'Organization', value: preview.display_name },
    { icon: UserRoundCheck, label: 'Role', value: 'Organization Administrator' },
    { icon: Mail, label: 'Email', value: maskEmail(preview.email_normalized) },
  ];

  return (
    <SecureAuthShell kicker="Organization activation" caption={CAPTION} wide>
      <h1 className={secureAuthTitleClass}>Activate your organization account</h1>
      <p className={secureAuthBodyClass}>
        Create your password to activate Organization Administrator access for{' '}
        <span className="font-semibold text-bh-text">{preview.display_name}</span>.
      </p>

      <dl className="mt-6 overflow-hidden rounded-2xl border border-bh-border/80 bg-gradient-to-br from-bh-subtle/70 via-bh-surface to-bh-surface">
        {details.map(({ icon: Icon, label, value }) => (
          <div
            key={label}
            className="flex items-center gap-3 border-b border-bh-border/70 px-4 py-3 last:border-0"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-bh-teal-strong shadow-sm ring-1 ring-bh-border/80">
              <Icon className="h-4 w-4" aria-hidden />
            </span>
            <dt className="text-[11px] font-bold uppercase tracking-[0.12em] text-bh-text-muted">
              {label}
            </dt>
            <dd className="ml-auto min-w-0 truncate text-right text-sm font-semibold text-bh-text">
              {value}
            </dd>
          </div>
        ))}
      </dl>

      <div className="mt-7">
        <ActivateOrganizationForm />
      </div>
    </SecureAuthShell>
  );
}

function BackHome() {
  return (
    <Link href="/" className={`mt-8 ${secureAuthSecondaryClass}`}>
      <ArrowLeft
        className="h-4 w-4 transition group-hover:-translate-x-0.5"
        aria-hidden
      />
      Return to home
    </Link>
  );
}
