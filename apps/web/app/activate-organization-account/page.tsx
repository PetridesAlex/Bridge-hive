import { cookies } from 'next/headers';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import {
  ORG_INVITATION_COOKIE,
  friendlyInvitationError,
  maskEmail,
} from '@bridge-hive/domain';

import { ActivateOrganizationForm } from '@/components/activate-organization-form';
import { BridgeHiveLogo } from '@/components/auth/BridgeHiveLogo';
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
      <Shell>
        <h1 className="text-2xl font-semibold text-bh-text">Activation link required</h1>
        <p className="mt-2 text-sm text-bh-text-secondary">
          Open the secure Activate account link from your Bridge Hive email to continue.
        </p>
        <div className="mt-6 flex gap-2">
          <Button asChild>
            <Link href="/sign-in">Sign in</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/">Return to home</Link>
          </Button>
        </div>
      </Shell>
    );
  }

  const { data, error } = await supabase.rpc(
    'get_organization_invitation_preview_by_id',
    { p_invitation_id: invitationId },
  );

  if (error) {
    const mismatch = error.message?.includes('EMAIL_MISMATCH');
    return (
      <Shell>
        <h1 className="text-2xl font-semibold text-bh-text">
          {mismatch ? 'Wrong email signed in' : 'Unable to activate'}
        </h1>
        <p className="mt-2 text-sm text-bh-text-secondary">
          {friendlyInvitationError(error.message)}
        </p>
        {mismatch ? (
          <form action={signOutForActivationMismatchAction} className="mt-6">
            <Button type="submit" variant="honey">
              Sign out and continue with invited email
            </Button>
          </form>
        ) : (
          <div className="mt-6">
            <Button asChild variant="outline">
              <Link href="/">Return to home</Link>
            </Button>
          </div>
        )}
      </Shell>
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
      <Shell>
        <h1 className="text-2xl font-semibold text-bh-text">Invitation unavailable</h1>
        <p className="mt-2 text-sm text-bh-text-secondary">
          {friendlyInvitationError(
            preview.status === 'expired'
              ? 'INVITATION_EXPIRED'
              : preview.status === 'revoked'
                ? 'INVITATION_REVOKED'
                : 'INVITATION_ALREADY_USED',
          )}
        </p>
      </Shell>
    );
  }

  if (
    preview.organization_status === 'suspended' ||
    preview.organization_status === 'closed'
  ) {
    return (
      <Shell>
        <h1 className="text-2xl font-semibold text-bh-text">Organization unavailable</h1>
        <p className="mt-2 text-sm text-bh-text-secondary">
          {friendlyInvitationError('ORG_NOT_ACCEPTING')}
        </p>
      </Shell>
    );
  }

  return (
    <Shell>
      <h1 className="text-2xl font-semibold tracking-tight text-bh-text">
        Activate your organization account
      </h1>
      <p className="mt-2 text-sm text-bh-text-secondary">
        Create your password to activate Organization Administrator access for{' '}
        <span className="font-medium text-bh-text">{preview.display_name}</span>.
      </p>

      <dl className="mt-6 grid gap-3 rounded-2xl border border-bh-border bg-bh-subtle/40 p-4 text-sm">
        <div className="flex justify-between gap-4">
          <dt className="text-bh-text-muted">Organization</dt>
          <dd className="font-medium text-bh-text">{preview.display_name}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-bh-text-muted">Role</dt>
          <dd className="font-medium text-bh-text">Organization Administrator</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-bh-text-muted">Email</dt>
          <dd className="font-medium text-bh-text">
            {maskEmail(preview.email_normalized)}
          </dd>
        </div>
      </dl>

      <div className="mt-6">
        <ActivateOrganizationForm />
      </div>
    </Shell>
  );
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
