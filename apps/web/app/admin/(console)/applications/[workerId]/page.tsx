import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { ConfirmDialog } from '@/components/admin/confirm-dialog';
import { OpenPayoutProofButton } from '@/components/admin/open-payout-proof-button';
import { PackageReviewPanel } from '@/components/admin/package-review-panel';
import {
  AccountStatusBadge,
  OnboardingStatusBadge,
  VerificationStatusBadge,
} from '@/components/admin/status-badges';
import {
  reactivateWorkerAction,
  reviewPayoutAccountAction,
  setWorkerVerificationAction,
  suspendWorkerAction,
} from '@/app/actions/admin';
import { EmptyState } from '@/components/empty-state';
import { requirePlatformAdmin } from '@/lib/admin/auth';
import {
  buildAdminWorkerChecklist,
  isReadyForFinalVerification,
  payoutAccountStatusLabel,
} from '@/lib/admin/document-status';
import { applicationStatusLabel, credentialTypeLabel } from '@/lib/admin/labels';
import { formatDateTime, roleLabel } from '@/lib/format';
import { createClient } from '@/lib/supabase/server';
import {
  credentialRequirementsForRole,
  payoutSummaryLabel,
} from '@bridge-hive/domain';
import type { WorkerRole } from '@bridge-hive/domain';

export default async function VerificationApplicationWorkspacePage({
  params,
}: {
  params: Promise<{ workerId: string }>;
}) {
  const { workerId } = await params;
  const ctx = await requirePlatformAdmin();
  if (!ctx.capabilities.canViewWorkers) {
    return (
      <EmptyState
        title="Permission denied"
        description="Your role cannot view verification applications."
      />
    );
  }

  const supabase = await createClient();

  const { data: worker } = await supabase
    .from('worker_profiles')
    .select(
      'user_id, worker_role, bio, onboarding_status, verification_status, created_at, updated_at, profile:profiles!worker_profiles_user_id_fkey(full_name, phone, account_status, created_at, updated_at)',
    )
    .eq('user_id', workerId)
    .maybeSingle();

  if (!worker) {
    notFound();
  }

  const profile = Array.isArray(worker.profile) ? worker.profile[0] : worker.profile;
  const canViewPayoutBank = ctx.capabilities.canViewPayoutProof;

  type PayoutDetail = {
    id: string;
    status: string;
    masked_iban?: string | null;
    account_holder_name?: string | null;
    proof_storage_path?: string | null;
    has_proof?: boolean | null;
    rejection_reason?: string | null;
    verified_at?: string | null;
    created_at?: string | null;
    updated_at?: string | null;
  };

  const [
    { data: credentials },
    payoutResult,
    { data: appStatus },
    { data: lastActivity },
  ] = await Promise.all([
    supabase
      .from('credentials')
      .select(
        'id, credential_type, status, expires_at, verified_at, rejection_reason, storage_path, storage_paths, created_at, updated_at',
      )
      .eq('worker_id', workerId)
      .order('created_at', { ascending: false }),
    canViewPayoutBank
      ? supabase
          .from('payout_accounts')
          .select(
            'id, status, masked_iban, account_holder_name, proof_storage_path, proof_mime_type, rejection_reason, verified_at, created_at, updated_at',
          )
          .eq('worker_id', workerId)
          .maybeSingle()
      : supabase.rpc('get_worker_payout_status', { p_worker_id: workerId }),
    supabase.rpc('worker_verification_application_status', {
      p_worker_id: workerId,
    }),
    supabase.rpc('worker_application_last_activity', {
      p_worker_id: workerId,
    }),
  ]);

  const payoutRaw = payoutResult.data;
  const payoutAccount: PayoutDetail | null = canViewPayoutBank
    ? ((payoutRaw as PayoutDetail | null) ?? null)
    : Array.isArray(payoutRaw)
      ? ((payoutRaw[0] as PayoutDetail | undefined) ?? null)
      : ((payoutRaw as PayoutDetail | null) ?? null);

  const role = worker.worker_role as WorkerRole | null;
  const requirements = credentialRequirementsForRole(role);
  const checklist = buildAdminWorkerChecklist({
    role,
    credentials: credentials ?? [],
  });
  const payoutSatisfied = payoutAccount?.status === 'verified';
  const canFinalVerify = isReadyForFinalVerification({
    role,
    verificationStatus: worker.verification_status,
    credentials: credentials ?? [],
    payoutSatisfied,
  });

  const requiredTypes = new Set(requirements.filter((r) => r.isRequired).map((r) => r.credentialType));
  const credRows = (credentials ?? []).map((c) => {
    const hasFile =
      Boolean(c.storage_path) ||
      (Array.isArray(c.storage_paths) && c.storage_paths.length > 0);
    return {
      id: c.id,
      credential_type: c.credential_type,
      status: c.status,
      expires_at: c.expires_at,
      verified_at: c.verified_at,
      rejection_reason: c.rejection_reason,
      created_at: c.created_at,
      hasFile,
      isRequired: requiredTypes.has(c.credential_type as never),
    };
  });

  const requiredTotal = requirements.filter((r) => r.isRequired).length;
  const approved = credRows.filter(
    (c) => c.isRequired && c.status === 'verified',
  ).length;
  const rejected = credRows.filter(
    (c) => c.isRequired && c.status === 'rejected',
  ).length;
  const awaiting = credRows.filter(
    (c) =>
      c.isRequired &&
      c.hasFile &&
      (c.status === 'pending' || c.status === 'under_review'),
  ).length;
  const optionalCount = requirements.filter((r) => !r.isRequired).length;
  const applicationStatus =
    typeof appStatus === 'string'
      ? appStatus
      : Array.isArray(appStatus)
        ? String(appStatus[0] ?? '')
        : String(appStatus ?? '');
  const expectedLastActivity =
    typeof lastActivity === 'string'
      ? lastActivity
      : Array.isArray(lastActivity)
        ? (lastActivity[0] as string | null)
        : (lastActivity as string | null);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <Link
          href="/admin/applications"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-bh-text-secondary transition hover:text-bh-text"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Verification applications
        </Link>
        <header className="mt-4 overflow-hidden rounded-2xl border border-bh-border bg-bh-surface shadow-[0_8px_28px_rgba(7,29,48,0.06)]">
          <div
            aria-hidden
            className="h-1 bg-gradient-to-r from-bh-sidebar via-bh-honey to-bh-sidebar"
          />
          <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div className="flex min-w-0 items-center gap-3.5">
            <span
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-bh-sidebar text-base font-semibold tracking-wide text-white"
              aria-hidden
            >
              {workerMark(profile?.full_name ?? 'Worker')}
            </span>
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-bh-honey-strong">
                Workspace
              </p>
              <h2 className="mt-1 text-2xl font-semibold tracking-tight text-bh-text">
                {profile?.full_name ?? 'Worker'}
              </h2>
              <p className="mt-1 text-sm text-bh-text-secondary">
                {role ? roleLabel(role) : 'Role not set'} · Ref{' '}
                {workerId.replaceAll('-', '').slice(0, 8)}
              </p>
              <p className="mt-0.5 text-sm text-bh-text-muted">
                {[profile?.phone].filter(Boolean).join(' · ') || 'No phone on file'}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href={`/admin/workers/${workerId}`}
              className="inline-flex h-10 items-center rounded-full border border-bh-border px-4 text-sm font-medium text-bh-text"
            >
              Worker directory
            </Link>
            {ctx.capabilities.canSuspendAccounts &&
            profile?.account_status === 'active' ? (
              <ConfirmDialog
                title="Suspend worker account"
                description="Suspended workers cannot claim shifts."
                confirmLabel="Suspend account"
                requireReason
                destructive
                triggerLabel="Suspend"
                triggerVariant="destructive"
                hiddenFields={{ workerId }}
                action={suspendWorkerAction}
              />
            ) : null}
            {ctx.capabilities.canSuspendAccounts &&
            profile?.account_status === 'suspended' ? (
              <ConfirmDialog
                title="Reactivate worker account"
                description="Reactivation restores account status to active."
                confirmLabel="Reactivate"
                requireReason
                triggerLabel="Reactivate"
                hiddenFields={{ workerId }}
                action={reactivateWorkerAction}
              />
            ) : null}
          </div>
        </div>
      </header>
      </div>

      <Panel kicker="Status" title="Application header">
        <dl className="grid gap-px overflow-hidden rounded-xl border border-bh-border bg-bh-border sm:grid-cols-2">
          <StatusCell label="Account">
            <AccountStatusBadge status={profile?.account_status ?? 'active'} />
          </StatusCell>
          <StatusCell label="Onboarding">
            <OnboardingStatusBadge status={worker.onboarding_status} />
          </StatusCell>
          <StatusCell label="Final verification">
            <VerificationStatusBadge status={worker.verification_status} />
          </StatusCell>
          <StatusCell label="Application status">
            <span className="text-sm font-medium text-bh-text">
              {applicationStatusLabel(applicationStatus)}
            </span>
          </StatusCell>
          <StatusCell label="Payout account">
            <span className="text-sm font-medium text-bh-text">
              {payoutSummaryLabel(payoutAccount?.status as never)}
            </span>
          </StatusCell>
          <StatusCell label="Last activity">
            <span className="text-sm font-medium text-bh-text">
              {expectedLastActivity ? formatDateTime(expectedLastActivity) : '—'}
            </span>
          </StatusCell>
        </dl>
      </Panel>

      <Panel kicker="Progress" title="Review progress">
        <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-bh-border bg-bh-border sm:grid-cols-3">
          <Metric label="Required documents" value={requiredTotal} />
          <Metric label="Approved" value={approved} />
          <Metric label="Rejected" value={rejected} />
          <Metric label="Awaiting review" value={awaiting} />
          <Metric label="Optional documents" value={optionalCount} />
          <div className="bg-bh-surface px-4 py-4">
            <dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-bh-text-muted">
              Payout
            </dt>
            <dd className="mt-1 text-sm font-semibold text-bh-text">
              {payoutAccountStatusLabel(payoutAccount?.status)}
            </dd>
          </div>
        </dl>
      </Panel>

      <Panel kicker="Checklist" title="Role-specific checklist">
        <ul className="overflow-hidden rounded-xl border border-bh-border">
          {checklist.map((item) => (
            <li
              key={item.credentialType}
              className="flex items-center justify-between gap-3 border-b border-bh-border px-4 py-3 last:border-b-0"
            >
              <span className="text-sm font-medium text-bh-text">
                {credentialTypeLabel(item.credentialType)}
                {item.isRequired ? '' : ' — optional'}
              </span>
              <span className="rounded-full bg-bh-subtle px-2.5 py-1 text-[11px] font-semibold capitalize text-bh-text">
                {String(item.status).replaceAll('_', ' ')}
              </span>
            </li>
          ))}
          <li className="flex items-center justify-between gap-3 bg-bh-subtle/50 px-4 py-3">
            <span className="text-sm font-medium text-bh-text">
              Payout account — separate administrative review
            </span>
            <span className="rounded-full bg-bh-honey-soft px-2.5 py-1 text-[11px] font-semibold text-bh-text">
              {payoutSummaryLabel(payoutAccount?.status as never)}
            </span>
          </li>
        </ul>
      </Panel>

      <Panel kicker="Documents" title="Document review">
          {credRows.length === 0 ? (
            <p className="text-sm text-slate-500">No credentials uploaded yet.</p>
          ) : (
            <PackageReviewPanel
              workerId={workerId}
              credentials={credRows}
              expectedLastActivity={expectedLastActivity}
              canReview={ctx.capabilities.canReviewCredentials}
              canViewDocuments={ctx.capabilities.canViewCredentialDocuments}
            />
          )}
      </Panel>

      <Panel kicker="Payout" title="Payout account">
        <div className="space-y-4 text-sm">
          <dl className="grid gap-px overflow-hidden rounded-xl border border-bh-border bg-bh-border sm:grid-cols-3">
            <StatusCell label="Status">
              <span className="text-sm font-medium text-bh-text">
                {payoutSummaryLabel(payoutAccount?.status as never)}
              </span>
            </StatusCell>
            <StatusCell label="Holder">
              <span className="text-sm font-medium text-bh-text">
                {canViewPayoutBank ? payoutAccount?.account_holder_name || '—' : 'Restricted'}
              </span>
            </StatusCell>
            <StatusCell label="Masked IBAN">
              <span className="font-mono text-sm font-medium text-bh-text">
                {canViewPayoutBank ? payoutAccount?.masked_iban || '—' : 'Restricted'}
              </span>
            </StatusCell>
          </dl>
          {canViewPayoutBank && payoutAccount ? (
            <>
              {payoutAccount.rejection_reason ? (
                <p className="rounded-xl border border-bh-danger/30 bg-bh-danger-soft px-3 py-2 text-sm text-bh-danger">
                  Reason: {payoutAccount.rejection_reason}
                </p>
              ) : null}
              {payoutAccount.proof_storage_path ? (
                <OpenPayoutProofButton payoutAccountId={payoutAccount.id} />
              ) : null}
              {ctx.capabilities.canApprovePayoutAccounts &&
              payoutAccount.status === 'pending' ? (
                <div className="flex flex-wrap gap-2">
                  <ConfirmDialog
                    title="Approve payout account"
                    description="Administrative approval for platform use only. Does not verify bank ownership or approve the worker."
                    confirmLabel="Approve payout"
                    requireReason
                    reasonLabel="Approval note"
                    triggerLabel="Approve payout"
                    hiddenFields={{
                      payoutAccountId: payoutAccount.id,
                      decision: 'approve',
                    }}
                    action={reviewPayoutAccountAction}
                  />
                  <ConfirmDialog
                    title="Reject payout account"
                    description="The worker can correct and resubmit. Unrelated credentials stay unchanged."
                    confirmLabel="Reject payout"
                    requireReason
                    destructive
                    triggerLabel="Reject payout"
                    triggerVariant="destructive"
                    hiddenFields={{
                      payoutAccountId: payoutAccount.id,
                      decision: 'reject',
                    }}
                    action={reviewPayoutAccountAction}
                  />
                </div>
              ) : null}
            </>
          ) : (
            <p className="rounded-xl border border-dashed border-bh-border px-4 py-3 text-sm text-bh-text-secondary">
              Banking details and proof are visible only to platform super admins
              in Phase 4.
            </p>
          )}
        </div>
      </Panel>

      {ctx.capabilities.canVerifyWorkers ? (
        <Panel kicker="Decision" title="Final worker approval">
          <div className="space-y-3 text-sm">
            <p className="leading-6 text-bh-text-secondary">
              Marketplace access requires approved required documents, an approved
              payout account, and this separate server action (
              <code className="text-xs">set_worker_verification</code>
              ). UI buttons cannot bypass those gates.
            </p>
            {worker.verification_status === 'submitted' ||
            worker.verification_status === 'under_review' ? (
              <p className="text-bh-text-secondary">
                Worker package status:{' '}
                <span className="font-medium capitalize text-bh-text">
                  {String(worker.verification_status).replaceAll('_', ' ')}
                </span>
                . Review credentials and payout below, then approve only when
                the checklist is green.
              </p>
            ) : null}
            {canFinalVerify ? (
              <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 font-medium text-emerald-800">
                Ready for final approval
              </p>
            ) : (
              <p className="rounded-xl border border-bh-border bg-bh-subtle/60 px-3 py-2 text-bh-text-secondary">
                Not ready — complete document and payout approvals first.
              </p>
            )}
            <ConfirmDialog
              title="Approve worker for marketplace access"
              description="The database will recompute every requirement. This does not change individual credential history."
              confirmLabel="Approve for marketplace"
              triggerLabel="Approve worker for marketplace access"
              disabled={!canFinalVerify}
              hiddenFields={{ workerId, status: 'verified' }}
              action={setWorkerVerificationAction}
            />
            <ConfirmDialog
              title="Mark under review"
              description="Sets worker verification status to under review without approving marketplace access."
              confirmLabel="Mark under review"
              triggerLabel="Mark application under review"
              triggerVariant="secondary"
              hiddenFields={{ workerId, status: 'under_review' }}
              action={setWorkerVerificationAction}
            />
            <ConfirmDialog
              title="Reject worker verification"
              description="Requires a reason. Does not delete credentials or the account."
              confirmLabel="Reject verification"
              requireReason
              destructive
              triggerLabel="Reject verification"
              triggerVariant="destructive"
              hiddenFields={{ workerId, status: 'rejected' }}
              action={setWorkerVerificationAction}
            />
          </div>
        </Panel>
      ) : null}
    </div>
  );
}

function workerMark(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase();
  }
  return name.trim().slice(0, 2).toUpperCase() || '·';
}

function Panel({
  kicker,
  title,
  children,
}: {
  kicker: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-bh-border bg-bh-surface shadow-[0_8px_28px_rgba(7,29,48,0.05)]">
      <div className="border-b border-bh-border px-5 py-4">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-bh-honey-strong">
          {kicker}
        </p>
        <h3 className="mt-1 text-base font-semibold tracking-tight text-bh-text">{title}</h3>
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

function StatusCell({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-bh-surface px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-bh-text-muted">
        {label}
      </p>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-bh-surface px-4 py-4">
      <dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-bh-text-muted">
        {label}
      </dt>
      <dd className="mt-1 text-2xl font-semibold tabular-nums text-bh-text">{value}</dd>
    </div>
  );
}
