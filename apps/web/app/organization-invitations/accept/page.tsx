import Link from 'next/link';

import { AcceptInvitationForm } from '@/components/accept-invitation-form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getAuthBundle } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';

export default async function AcceptInvitationPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const params = await searchParams;
  const token = params.token ?? '';
  const bundle = await getAuthBundle();

  let previewOrgName: string | null = null;
  if (!bundle && token) {
    const supabase = await createClient();
    const { data } = await supabase.rpc('get_organization_invitation_preview', {
      p_raw_token: token,
    });
    if (data && typeof data === 'object' && 'organization_display_name' in data) {
      previewOrgName = String(
        (data as { organization_display_name: string }).organization_display_name,
      );
    }
  }

  if (!bundle) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-4 px-6 py-12">
        <Card>
          <CardHeader>
            <CardTitle>Organization invitation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {previewOrgName ? (
              <p className="text-sm text-slate-600">
                You have been invited to join <strong>{previewOrgName}</strong>.
              </p>
            ) : (
              <p className="text-sm text-slate-600">
                You have been invited to join an organization.
              </p>
            )}
            <p className="text-sm text-slate-600">
              Sign in or create an account to accept this invitation.
            </p>
            <div className="flex flex-col gap-2">
              <Link
                href={`/sign-in?next=${encodeURIComponent(`/organization-invitations/accept?token=${token}`)}`}
                className="rounded-md bg-slate-900 px-4 py-2 text-center text-sm font-medium text-white"
              >
                Sign in
              </Link>
              <Link
                href={`/sign-up?next=${encodeURIComponent(`/organization-invitations/accept?token=${token}`)}`}
                className="rounded-md border border-slate-300 px-4 py-2 text-center text-sm font-medium text-slate-900"
              >
                Create account
              </Link>
            </div>
          </CardContent>
        </Card>
      </main>
    );
  }

  if (!token) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-4 px-6 py-12">
        <Card>
          <CardHeader>
            <CardTitle>Missing invitation token</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-600">
              The invitation link is incomplete. Check the link in your email and try
              again.
            </p>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-4 px-6 py-12">
      <Card>
        <CardHeader>
          <CardTitle>Accept invitation</CardTitle>
        </CardHeader>
        <CardContent>
          <AcceptInvitationForm token={token} />
        </CardContent>
      </Card>
    </main>
  );
}
