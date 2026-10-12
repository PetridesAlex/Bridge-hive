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
  OrganizationActivationShell,
  OrganizationActivationSignInFooter,
} from '@/components/auth/organization-activation-shell';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/server';
import { signOutForActivationMismatchAction } from '@/app/actions/organization-activation';

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
      <OrganizationActivationShell
        step="status"
        title="Activation link required"
        description="Open the secure Activate account link from your Bridge Hive email to continue."
        footer={<OrganizationActivationSignInFooter />}
      >
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button asChild className="min-h-11 flex-1">
            <Link href="/sign-in">Sign in</Link>
          </Button>
          <Button asChild variant="outline" className="min-h-11 flex-1">
            <Link href="/">Return to home</Link>
          </Button>
        </div>
      </OrganizationActivationShell>
    );
  }

  const { data, error } = await supabase.rpc(
    'get_organization_invitation_preview_by_id',
    { p_invitation_id: invitationId },
  );

  if (error) {
    const mismatch = error.message?.includes('EMAIL_MISMATCH');
    return (
      <OrganizationActivationShell
        step="status"
        title={mismatch ? 'Wrong email signed in' : 'Unable to activate'}
        description={friendlyInvitationError(error.message)}
        footer={
          mismatch ? undefined : <OrganizationActivationSignInFooter />
        }
      >
        {mismatch ? (
          <form action={signOutForActivationMismatchAction}>
            <Button type="submit" className="w-full min-h-11" size="lg">
              Sign out and continue with invited email
            </Button>
          </form>
        ) : (
          <Button asChild variant="outline" className="w-full min-h-11">
            <Link href="/">Return to home</Link>
          </Button>
        )}
      </OrganizationActivationShell>
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
      <OrganizationActivationShell
        step="status"
        title="Invitation unavailable"
        description={friendlyInvitationError(
          preview.status === 'expired'
            ? 'INVITATION_EXPIRED'
            : preview.status === 'revoked'
              ? 'INVITATION_REVOKED'
              : 'INVITATION_ALREADY_USED',
        )}
        footer={<OrganizationActivationSignInFooter />}
      >
        <Button asChild variant="outline" className="w-full min-h-11">
          <Link href="/sign-in">Back to sign in</Link>
        </Button>
      </OrganizationActivationShell>
    );
  }

  if (
    preview.organization_status === 'suspended' ||
    preview.organization_status === 'closed'
  ) {
    return (
      <OrganizationActivationShell
        step="status"
        title="Organization unavailable"
        description={friendlyInvitationError('ORG_NOT_ACCEPTING')}
        footer={<OrganizationActivationSignInFooter />}
      >
        <Button asChild variant="outline" className="w-full min-h-11">
          <Link href="/">Return to home</Link>
        </Button>
      </OrganizationActivationShell>
    );
  }

  return (
    <OrganizationActivationShell
      step="activate"
      title="Activate your organization account"
      description={
        <>
          Create your password to activate Organization Administrator access for{' '}
          <span className="font-semibold text-bh-text">
            {preview.display_name}
          </span>
          .
        </>
      }
    >
      <dl className="org-activation-summary">
        <div className="org-activation-summary-row">
          <dt>Organization</dt>
          <dd>{preview.display_name}</dd>
        </div>
        <div className="org-activation-summary-row">
          <dt>Role</dt>
          <dd>Organization Administrator</dd>
        </div>
        <div className="org-activation-summary-row">
          <dt>Email</dt>
          <dd>{maskEmail(preview.email_normalized)}</dd>
        </div>
      </dl>

      <ActivateOrganizationForm />
    </OrganizationActivationShell>
  );
}
