import {
  BadgeCheck,
  Clock3,
  FileText,
  FolderOpen,
  Fingerprint,
  ShieldCheck,
} from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import {
  reviewCredentialAction,
  submitCredentialReviewAction,
} from '@/app/actions/admin';
import { AdminBackLink } from '@/components/admin/admin-back-link';
import { ConfirmDialog } from '@/components/admin/confirm-dialog';
import { CorrectExpiresAtForm } from '@/components/admin/correct-expires-at-form';
import { CredentialStatusBadge } from '@/components/admin/status-badges';
import { EmptyState } from '@/components/empty-state';
import { requirePlatformAdmin } from '@/lib/admin/auth';
import { credentialTypeLabel } from '@/lib/admin/labels';
import { formatDateTime } from '@/lib/format';
import { createClient } from '@/lib/supabase/server';
import { cn } from '@/lib/utils';
import {
  credentialRequiresKnownExpiry,
  isTextCredentialType,
  workerFolderLabel,
} from '@bridge-hive/domain';

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
      'id, worker_id, credential_type, status, expires_at, storage_path, text_value, has_text_value, verified_by, verified_at, rejection_reason, created_at, updated_at',
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
  const isText = isTextCredentialType(credential.credential_type);
  const workerName =
    profile?.full_name ?? `${credential.worker_id.slice(0, 8)}…`;
  const folderHref = `/admin/applications/${credential.worker_id}?from=${encodeURIComponent('/admin/credentials')}`;

  return (
    <div className="mx-auto max-w-5xl space-y-6 bh-fade-up">
      <div>
        <AdminBackLink href="/admin/credentials" label="Worker folders" />

        <header className="relative mt-4 overflow-hidden rounded-[1.35rem] border border-bh-border/90 bg-bh-surface shadow-[0_10px_40px_rgba(7,29,48,0.06)]">
          <div
            aria-hidden
            className="h-1.5 bg-gradient-to-r from-bh-sidebar via-bh-teal to-bh-honey"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(720px_240px_at_0%_0%,rgba(22,166,182,0.08),transparent_55%),radial-gradient(560px_220px_at_100%_0%,rgba(224,170,24,0.08),transparent_50%)]"
          />
          <div className="relative flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
            <div className="flex min-w-0 items-start gap-3.5">
              <span
                className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-bh-sidebar text-white shadow-[0_8px_18px_rgba(7,29,48,0.22)] ring-1 ring-black/5"
                aria-hidden
              >
                {isText ? (
                  <Fingerprint className="h-6 w-6" />
                ) : (
                  <FileText className="h-6 w-6" />
                )}
              </span>
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-bh-honey-strong">
                  Credential detail
                </p>
                <div className="mt-1.5 flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-bold tracking-tight text-bh-text sm:text-[1.85rem]">
                    {credentialTypeLabel(credential.credential_type)}
                  </h1>
                  <CredentialStatusBadge status={credential.status} />
                </div>
                <p className="mt-1.5 text-sm text-bh-text-secondary">
                  Worker:{' '}
                  <Link
                    href={`/admin/workers/${credential.worker_id}`}
                    className="font-semibold text-bh-teal-strong transition hover:underline"
                  >
                    {workerName}
                  </Link>
                </p>
              </div>
            </div>

            <Link
              href={folderHref}
              className="group relative inline-flex h-11 w-full shrink-0 items-center justify-center gap-2 overflow-hidden rounded-full bg-gradient-to-r from-bh-sidebar via-bh-teal to-bh-honey px-5 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(11,42,67,0.28)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_14px_28px_rgba(11,42,67,0.34)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bh-teal motion-reduce:transition-none motion-reduce:hover:translate-y-0 sm:w-auto"
            >
              <span
                aria-hidden
                className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/30 to-transparent transition duration-700 group-hover:translate-x-full"
              />
              <FolderOpen className="relative h-4 w-4" aria-hidden />
              <span className="relative">
                {workerFolderLabel('openWorkerFolder', 'en')}
              </span>
            </Link>
          </div>
        </header>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel
          kicker="Overview"
          title="Metadata"
          description="Server-authoritative credential status and timing."
          accent="teal"
          icon={Clock3}
        >
          <dl className="grid gap-px overflow-hidden rounded-xl border border-bh-border/80 bg-bh-border/80 sm:grid-cols-2">
            <MetaCell label="Status">
              <CredentialStatusBadge status={credential.status} />
            </MetaCell>
            <MetaCell label="Submitted">
              {formatDateTime(credential.created_at)}
            </MetaCell>
            <MetaCell label="Expires">
              {credential.expires_at
                ? formatDateTime(credential.expires_at)
                : '—'}
            </MetaCell>
            <MetaCell label="Verified at">
              {credential.verified_at
                ? formatDateTime(credential.verified_at)
                : '—'}
            </MetaCell>
          </dl>

          {credential.rejection_reason ? (
            <p className="mt-4 rounded-xl border border-bh-danger/30 bg-bh-danger-soft px-3.5 py-2.5 text-sm font-medium text-bh-danger">
              Rejection reason: {credential.rejection_reason}
            </p>
          ) : null}

          {ctx.capabilities.canReviewCredentials &&
          credentialRequiresKnownExpiry(credential.credential_type) ? (
            <div className="mt-4 rounded-xl border border-bh-border/80 bg-bh-subtle/50 p-3.5">
              <CorrectExpiresAtForm
                credentialId={credential.id}
                currentExpiresAt={credential.expires_at}
              />
            </div>
          ) : null}
        </Panel>

        <Panel
          kicker="Decision"
          title="Review actions"
          description={
            canAct
              ? 'Approve or reject this credential only. Opening this page does not change status.'
              : 'No review actions are available for the current status or your role.'
          }
          accent="navy"
          icon={ShieldCheck}
        >
          {canAct ? (
            <div className="overflow-hidden rounded-[1.15rem] border border-bh-border/90 bg-gradient-to-br from-bh-subtle/80 via-bh-surface to-bh-teal-soft/25 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-bh-border/70 px-4 py-4">
                <div className="min-w-0">
                  <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-bh-text-muted">
                    Credential gate
                  </p>
                  <p className="mt-1 text-sm font-semibold text-bh-text">
                    {credential.status === 'pending'
                      ? 'Ready to begin review'
                      : 'Under active review'}
                  </p>
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-bh-border bg-bh-subtle px-3 py-1.5 text-[11px] font-bold text-bh-text-secondary">
                  <Clock3 className="h-3.5 w-3.5" aria-hidden />
                  {credential.status === 'pending' ? 'Pending' : 'In progress'}
                </span>
              </div>

              <div className="flex flex-col gap-2.5 p-4 sm:flex-row sm:flex-wrap sm:items-center">
                {credential.status === 'pending' ? (
                  <ConfirmDialog
                    title="Begin credential review"
                    description="Moves this credential to under review."
                    confirmLabel="Begin review"
                    triggerLabel="Under review"
                    triggerVariant="outline"
                    triggerSize="default"
                    triggerClassName="h-11 rounded-full border-bh-border bg-bh-surface px-5 font-semibold text-bh-text shadow-sm transition hover:-translate-y-0.5 hover:border-bh-teal/40 hover:bg-bh-teal-soft/40 hover:text-bh-teal-strong"
                    hiddenFields={{ credentialId }}
                    action={submitCredentialReviewAction}
                  />
                ) : null}
                <ConfirmDialog
                  title="Approve credential"
                  description="Marks the credential as verified. Reviewer identity and timestamp are set by the server."
                  confirmLabel="Approve"
                  triggerLabel="Approve"
                  triggerSize="default"
                  triggerClassName="h-11 rounded-full bg-bh-sidebar px-5 font-semibold text-white shadow-[0_10px_24px_rgba(7,29,48,0.28)] transition hover:-translate-y-0.5 hover:bg-bh-sidebar-raised"
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
                  triggerSize="default"
                  triggerClassName="h-11 rounded-full px-5 font-semibold shadow-[0_8px_18px_rgba(180,35,24,0.18)] transition hover:-translate-y-0.5"
                  hiddenFields={{ credentialId, decision: 'reject' }}
                  action={reviewCredentialAction}
                />
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-bh-border bg-bh-subtle/50 px-4 py-5 text-sm text-bh-text-secondary">
              {ctx.capabilities.canReviewCredentials ? (
                <span className="inline-flex items-center gap-2 font-medium text-bh-text">
                  <BadgeCheck className="h-4 w-4 text-bh-success" aria-hidden />
                  No further action needed for this credential status.
                </span>
              ) : (
                'Your role can view metadata but cannot approve or reject credentials.'
              )}
            </div>
          )}
        </Panel>
      </div>

      <Panel
        kicker={isText ? 'Identification' : 'Document'}
        title={
          isText
            ? workerFolderLabel('identificationValue', 'en')
            : 'Secure document preview'
        }
        description={
          isText
            ? 'Text credential values are visible only to authorized platform reviewers. They are never shown in public profiles.'
            : 'Preview uses a short-lived signed URL. Storage paths are never shown.'
        }
        accent={isText ? 'honey' : 'teal'}
        icon={isText ? Fingerprint : FileText}
      >
        {!ctx.capabilities.canViewCredentialDocuments ? (
          <EmptyState
            title="Document access restricted"
            description="Only platform verifiers and super admins can open credential documents or text values."
          />
        ) : isText ? (
          credential.text_value?.trim() ? (
            <div className="overflow-hidden rounded-[1.15rem] border border-bh-border/90 bg-gradient-to-br from-bh-subtle/70 via-bh-surface to-bh-honey-soft/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
              <div className="border-b border-bh-border/70 px-4 py-3 sm:px-5">
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-bh-text-muted">
                  Saved text value
                </p>
              </div>
              <div className="px-4 py-5 sm:px-5">
                <p className="break-all font-mono text-lg font-semibold tracking-tight text-bh-text sm:text-xl">
                  {credential.text_value.trim()}
                </p>
                {credential.storage_path ? (
                  <p className="mt-3 text-xs leading-5 text-bh-text-muted">
                    A legacy uploaded document also remains on file for this
                    requirement.
                  </p>
                ) : null}
                {signedUrl ? (
                  <a
                    href={signedUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-3 inline-flex text-sm font-semibold text-bh-teal-strong transition hover:underline"
                  >
                    Open legacy document
                  </a>
                ) : null}
              </div>
            </div>
          ) : credential.storage_path ? (
            <EmptyState
              title="Legacy document only"
              description="A previous upload exists, but no text identification value has been saved yet."
            />
          ) : (
            <EmptyState
              title="No text value saved"
              description="The worker has not entered this identification value yet."
            />
          )
        ) : !credential.storage_path ? (
          <EmptyState
            title="No document uploaded"
            description="Credential metadata exists, but no private storage object is attached yet."
          />
        ) : documentError ? (
          <EmptyState title="Unable to open document" description={documentError} />
        ) : signedUrl ? (
          <div className="overflow-hidden rounded-[1.15rem] border border-bh-border/90 bg-bh-surface shadow-[0_8px_24px_rgba(7,29,48,0.06)]">
            <p className="border-b border-bh-border/70 bg-bh-subtle/60 px-4 py-2.5 text-xs font-medium text-bh-text-muted">
              Short-lived signed URL (60 seconds). Path is not shown.
            </p>
            {isImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={signedUrl}
                alt="Credential document"
                className="max-h-[70vh] w-full object-contain bg-bh-subtle/30"
              />
            ) : isPdf ? (
              <iframe
                title="Credential PDF"
                src={signedUrl}
                className="h-[70vh] w-full bg-bh-subtle/20"
              />
            ) : (
              <div className="p-6 text-sm">
                <a
                  href={signedUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="font-semibold text-bh-teal-strong hover:underline"
                >
                  Open document in a new tab
                </a>
              </div>
            )}
          </div>
        ) : null}
      </Panel>
    </div>
  );
}

function Panel({
  kicker,
  title,
  description,
  accent,
  icon: Icon,
  children,
}: {
  kicker: string;
  title: string;
  description?: string;
  accent?: 'teal' | 'navy' | 'honey';
  icon?: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-[1.25rem] border border-bh-border/90 bg-bh-surface shadow-[0_8px_28px_rgba(7,29,48,0.05)] transition duration-300 hover:shadow-[0_12px_32px_rgba(7,29,48,0.08)] motion-reduce:transition-none">
      {accent ? (
        <div
          aria-hidden
          className={cn(
            'h-1 bg-gradient-to-r',
            accent === 'teal' &&
              'from-bh-teal via-bh-teal-strong to-bh-sidebar',
            accent === 'navy' &&
              'from-bh-sidebar via-bh-sidebar-raised to-bh-teal',
            accent === 'honey' &&
              'from-bh-honey via-bh-honey-strong to-bh-sidebar',
          )}
        />
      ) : null}
      <div className="flex items-start gap-3 border-b border-bh-border/80 bg-gradient-to-b from-bh-subtle/80 to-bh-surface px-5 py-4">
        {Icon ? (
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-bh-sidebar text-bh-honey shadow-[0_6px_14px_rgba(7,29,48,0.2)]">
            <Icon className="h-4 w-4" />
          </span>
        ) : null}
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-bh-honey-strong">
            {kicker}
          </p>
          <h3 className="mt-1 text-base font-semibold tracking-tight text-bh-text">
            {title}
          </h3>
          {description ? (
            <p className="mt-1 max-w-2xl text-sm leading-5 text-bh-text-secondary">
              {description}
            </p>
          ) : null}
        </div>
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

function MetaCell({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-bh-surface px-4 py-3.5">
      <dt className="text-[11px] font-bold uppercase tracking-[0.12em] text-bh-text-muted">
        {label}
      </dt>
      <dd className="mt-1.5 text-sm font-semibold text-bh-text">{children}</dd>
    </div>
  );
}
