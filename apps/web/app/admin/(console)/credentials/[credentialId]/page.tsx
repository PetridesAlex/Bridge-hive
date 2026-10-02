import Link from 'next/link';
import { notFound } from 'next/navigation';

import {
  reviewCredentialAction,
  submitCredentialReviewAction,
} from '@/app/actions/admin';
import { ConfirmDialog } from '@/components/admin/confirm-dialog';
import { CredentialStatusBadge } from '@/components/admin/status-badges';
import { EmptyState } from '@/components/empty-state';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { requirePlatformAdmin } from '@/lib/admin/auth';
import { credentialTypeLabel } from '@/lib/admin/labels';
import { formatDateTime } from '@/lib/format';
import { createClient } from '@/lib/supabase/server';

export default async function AdminCredentialDetailPage({
  params,
}: {
  params: Promise<{ credentialId: string }>;
}) {
  const { credentialId } = await params;
  const ctx = await requirePlatformAdmin();

  if (!ctx.capabilities.canViewCredentialMetadata) {
    return (
      <EmptyState
        title="Permission denied"
        description="Your role cannot view credential details."
      />
    );
  }

  const supabase = await createClient();
  const { data: credential } = await supabase
    .from('credentials')
    .select(
      'id, worker_id, credential_type, status, expires_at, storage_path, verified_by, verified_at, rejection_reason, created_at, updated_at',
    )
    .eq('id', credentialId)
    .maybeSingle();

  if (!credential) {
    notFound();
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, full_name')
    .eq('id', credential.worker_id)
    .maybeSingle();

  let signedUrl: string | null = null;
  let documentError: string | null = null;

  if (
    ctx.capabilities.canViewCredentialDocuments &&
    credential.storage_path
  ) {
    const { data, error } = await supabase.storage
      .from('credentials')
      .createSignedUrl(credential.storage_path, 60);
    if (error) {
      documentError = 'Document could not be opened for review.';
    } else {
      signedUrl = data.signedUrl;
    }
  }

  const canAct =
    ctx.capabilities.canReviewCredentials &&
    (credential.status === 'pending' || credential.status === 'under_review');

  const isImage =
    credential.storage_path?.match(/\.(png|jpe?g|webp)$/i) != null;
  const isPdf = credential.storage_path?.match(/\.pdf$/i) != null;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-slate-500">
          <Link href="/admin/credentials" className="hover:underline">
            Credentials
          </Link>{' '}
          / detail
        </p>
        <h2 className="mt-1 text-2xl font-semibold text-slate-900">
          {credentialTypeLabel(credential.credential_type)}
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          Worker:{' '}
          <Link
            href={`/admin/workers/${credential.worker_id}`}
            className="font-medium text-amber-700 hover:underline"
          >
            {profile?.full_name ?? credential.worker_id.slice(0, 8) + '…'}
          </Link>
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Metadata</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p className="flex items-center gap-2">
              <span className="text-slate-500">Status:</span>
              <CredentialStatusBadge status={credential.status} />
            </p>
            <p>
              <span className="text-slate-500">Submitted:</span>{' '}
              {formatDateTime(credential.created_at)}
            </p>
            <p>
              <span className="text-slate-500">Expires:</span>{' '}
              {credential.expires_at ? formatDateTime(credential.expires_at) : '—'}
            </p>
            <p>
              <span className="text-slate-500">Verified at:</span>{' '}
              {credential.verified_at ? formatDateTime(credential.verified_at) : '—'}
            </p>
            {credential.rejection_reason ? (
              <p>
                <span className="text-slate-500">Rejection reason:</span>{' '}
                {credential.rejection_reason}
              </p>
            ) : null}
          </CardContent>
        </Card>

        {canAct ? (
          <Card>
            <CardHeader>
              <CardTitle>Review actions</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {credential.status === 'pending' ? (
                <ConfirmDialog
                  title="Begin credential review"
                  description="Moves this credential to under review."
                  confirmLabel="Begin review"
                  triggerLabel="Under review"
                  triggerVariant="outline"
                  hiddenFields={{ credentialId }}
                  action={submitCredentialReviewAction}
                />
              ) : null}
              <ConfirmDialog
                title="Approve credential"
                description="Marks the credential as verified. Reviewer identity and timestamp are set by the server."
                confirmLabel="Approve"
                triggerLabel="Approve"
                hiddenFields={{ credentialId, decision: 'approve' }}
                action={reviewCredentialAction}
              />
              <ConfirmDialog
                title="Reject credential"
                description="Rejection keeps the credential record and document for audit history."
                confirmLabel="Reject"
                requireReason
                reasonLabel="Rejection reason"
                destructive
                triggerLabel="Reject"
                triggerVariant="destructive"
                hiddenFields={{ credentialId, decision: 'reject' }}
                action={reviewCredentialAction}
              />
            </CardContent>
          </Card>
        ) : null}
      </div>

      <section className="space-y-3">
        <h3 className="text-lg font-medium text-slate-900">Document</h3>
        {!ctx.capabilities.canViewCredentialDocuments ? (
          <EmptyState
            title="Document access restricted"
            description="Only platform verifiers and super admins can open credential documents."
          />
        ) : !credential.storage_path ? (
          <EmptyState
            title="No document uploaded"
            description="Credential metadata exists, but no private storage object is attached yet."
          />
        ) : documentError ? (
          <EmptyState title="Unable to open document" description={documentError} />
        ) : signedUrl ? (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <p className="border-b border-slate-100 px-4 py-2 text-xs text-slate-500">
              Short-lived signed URL (60 seconds). Path is not shown.
            </p>
            {isImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={signedUrl}
                alt="Credential document"
                className="max-h-[70vh] w-full object-contain"
              />
            ) : isPdf ? (
              <iframe
                title="Credential PDF"
                src={signedUrl}
                className="h-[70vh] w-full"
              />
            ) : (
              <div className="p-6 text-sm">
                <a
                  href={signedUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium text-amber-700 hover:underline"
                >
                  Open document in a new tab
                </a>
              </div>
            )}
          </div>
        ) : null}
      </section>
    </div>
  );
}
