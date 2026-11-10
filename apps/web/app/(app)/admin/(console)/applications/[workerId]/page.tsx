import {
  BadgeCheck,
  CircleAlert,
  CircleDashed,
  Clock3,
  FileWarning,
  ShieldCheck,
  Wallet,
} from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { AdminBackLink } from '@/components/admin/admin-back-link';
import { ConfirmDialog } from '@/components/admin/confirm-dialog';
import { OpenPayoutProofButton } from '@/components/admin/open-payout-proof-button';
import { PackageReviewPanel } from '@/components/admin/package-review-panel';
import {
  AccountStatusBadge,
  ApplicationStatusBadge,
  CredentialStatusBadge,
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
import { credentialTypeLabel } from '@/lib/admin/labels';
import { formatDateTime, roleLabel } from '@/lib/format';
import { createClient } from '@/lib/supabase/server';
import { cn } from '@/lib/utils';
import {
  credentialRequirementsForRole,
  isTextCredentialType,
  payoutSummaryLabel,
  workerFolderLabel,
  type DocumentChecklistItemStatus,
} from '@bridge-hive/domain';
import type { WorkerRole } from '@bridge-hive/domain';
import { auditActionLabel, safeAuditMetadata } from '@/lib/admin/labels';

export default async function VerificationApplicationWorkspacePage({
  params,
  searchParams,
}: {
  params: Promise<{ workerId: string }>;
  searchParams: Promise<{ from?: string }>;
}) {
  const { workerId } = await params;
  const { from } = await searchParams;
  const ctx = await requirePlatformAdmin();
  if (!ctx.capabilities.canViewWorkers) {
    return (
      <EmptyState
        title="Permission denied"
        description="Your role cannot view verification applications."
      />
    );
  }

  const backHref =
    from === '/admin/credentials' ? '/admin/credentials' : '/admin/applications';
  const backLabel =
    from === '/admin/credentials'
      ? workerFolderLabel('backToWorkerFolders', 'en')
      : 'Verification applications';

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
        'id, credential_type, status, expires_at, verified_at, rejection_reason, storage_path, storage_paths, text_value, has_text_value, created_at, updated_at',
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

  const credentialIds = (credentials ?? []).map((c) => c.id);
  const auditEntityIds = [workerId, ...credentialIds];
  const auditResult = ctx.capabilities.canViewAudit
    ? await supabase
        .from('audit_events')
        .select('id, action, entity_type, entity_id, created_at, before, after')
        .in('entity_id', auditEntityIds)
        .order('created_at', { ascending: false })
        .limit(40)
    : { data: [] as Array<{
        id: string;
        action: string;
        entity_type: string;
        entity_id: string | null;
        created_at: string;
        before: unknown;
        after: unknown;
      }> };

  const credentialIdSet = new Set(credentialIds);
  const reviewActions = new Set([
    'submit_credential',
    'submit_credential_for_review',
    'verify_credential_approve',
    'verify_credential_reject',
    'verify_payout_account_approve',
    'verify_payout_account_reject',
    'set_worker_verification',
    'submit_payout_account',
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
    const hasTextValue = Boolean(c.has_text_value ?? c.text_value?.trim());
    // Support roles may receive rows via broader queries in some paths; never
    // surface raw text unless document capability is granted.
    const textValue = ctx.capabilities.canViewCredentialDocuments
      ? (c.text_value?.trim() || null)
      : null;
    return {
      id: c.id,
      credential_type: c.credential_type,
      status: c.status,
      expires_at: c.expires_at,
      verified_at: c.verified_at,
      rejection_reason: c.rejection_reason,
      created_at: c.created_at,
      hasFile,
      hasTextValue,
      textValue,
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
      (c.hasFile || c.hasTextValue) &&
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

  const textCredRows = credRows.filter((c) =>
    isTextCredentialType(c.credential_type),
  );
  const fileCredRows = credRows.filter(
    (c) => !isTextCredentialType(c.credential_type),
  );
  const missingRequired = checklist.filter(
    (item) =>
      item.isRequired &&
      (item.status === 'not_uploaded' || item.status === 'draft'),
  );
  const rejectedRequired = checklist.filter(
    (item) => item.isRequired && item.status === 'rejected',
  );
  const expiredRequired = checklist.filter(
    (item) => item.isRequired && item.status === 'expired',
  );
  const approveSummary = [
    `Worker: ${profile?.full_name ?? workerId.slice(0, 8)} (${role ? roleLabel(role) : 'role unset'}).`,
    `Requirements: ${approved} of ${requiredTotal} approved; ${awaiting} awaiting; ${rejected} rejected.`,
    `Payout: ${payoutSummaryLabel(payoutAccount?.status as never)}.`,
    missingRequired.length
      ? `Missing/incomplete: ${missingRequired.map((m) => credentialTypeLabel(m.credentialType)).join(', ')}.`
      : 'No missing required credentials.',
    rejectedRequired.length
      ? `Rejected: ${rejectedRequired.map((m) => credentialTypeLabel(m.credentialType)).join(', ')}.`
      : null,
    expiredRequired.length
      ? `Expired: ${expiredRequired.map((m) => credentialTypeLabel(m.credentialType)).join(', ')}.`
      : null,
    'Effect: unlocks marketplace workspace only if every server-side gate still passes.',
  ]
    .filter(Boolean)
    .join(' ');

  const auditEvents = (auditResult.data ?? [])
    .filter((event) => {
      if (!reviewActions.has(event.action)) return false;
      if (event.entity_id === workerId) return true;
      return Boolean(event.entity_id && credentialIdSet.has(event.entity_id));
    })
    .slice(0, 25)
    .map((event) => ({
      id: event.id,
      action: event.action,
      createdAt: event.created_at,
      meta: safeAuditMetadata(event.after) ?? safeAuditMetadata(event.before),
    }));

  const refreshedAt = new Date().toISOString();

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <AdminBackLink href={backHref} label={backLabel} />
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
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <h2 className="text-2xl font-semibold tracking-tight text-bh-text">
                  {profile?.full_name ?? 'Worker'}
                </h2>
                <ApplicationStatusBadge status={applicationStatus} />
              </div>
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
            <ApplicationStatusBadge status={applicationStatus} />
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
        <p className="mt-3 text-xs text-bh-text-muted">
          Last refreshed {formatDateTime(refreshedAt)}
        </p>
      </Panel>

      <Panel
        kicker="Checklist"
        title="Role-specific checklist"
        description="What this role must complete before marketplace approval. Use Document review below to open files and take decisions."
        accent="teal"
      >
        <ChecklistBoard
          items={checklist}
          requiredVerified={approved}
          requiredTotal={requiredTotal}
          awaiting={awaiting}
          rejected={rejected}
          payoutLabel={payoutSummaryLabel(payoutAccount?.status as never)}
          payoutOk={payoutAccount?.status === 'verified'}
        />
      </Panel>

      {textCredRows.length > 0 ? (
        <Panel
          kicker="Identification"
          title={workerFolderLabel('identificationValue', 'en')}
          description="Tax identification and social insurance are text credentials. Values are visible only to authorized platform reviewers."
          accent="teal"
        >
          <div className="space-y-3">
            {textCredRows.map((cred) => (
              <div
                key={cred.id}
                className="rounded-2xl border border-bh-border/80 bg-bh-subtle/40 px-4 py-3.5"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-bh-text">
                      {credentialTypeLabel(cred.credential_type)}
                    </p>
                    <p className="mt-0.5 text-xs text-bh-text-muted">
                      Updated{' '}
                      {cred.created_at ? formatDateTime(cred.created_at) : '—'}
                    </p>
                  </div>
                  <CredentialStatusInline status={cred.status} />
                </div>
                {ctx.capabilities.canViewCredentialDocuments ? (
                  cred.textValue ? (
                    <p className="mt-3 break-all rounded-xl border border-bh-border/70 bg-bh-surface px-3 py-2.5 font-mono text-sm text-bh-text">
                      {cred.textValue}
                    </p>
                  ) : (
                    <p className="mt-3 text-sm text-bh-text-secondary">
                      No text value saved yet.
                    </p>
                  )
                ) : (
                  <p className="mt-3 text-sm text-bh-text-secondary">
                    Text value restricted for your role.
                  </p>
                )}
                {cred.rejection_reason ? (
                  <p className="mt-2 text-sm text-bh-danger">
                    Reason: {cred.rejection_reason}
                  </p>
                ) : null}
                <div className="mt-3">
                  <Link
                    href={`/admin/credentials/${cred.id}`}
                    className="text-sm font-semibold text-bh-teal-strong hover:underline"
                  >
                    Open credential detail
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      ) : null}

      <Panel
        kicker="Documents"
        title={workerFolderLabel('documentsAndCredentials', 'en')}
        description="Uploaded files for this worker. Open documents with short-lived signed URLs only."
      >
          {fileCredRows.length === 0 && textCredRows.length === 0 ? (
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

      <Panel
        kicker="Payout"
        title="Payout account"
        description="Bank details for platform payouts. Approval confirms platform use only."
        accent="honey"
        icon={Wallet}
      >
        <div className="space-y-4 text-sm">
          <div className="grid gap-3 sm:grid-cols-3">
            <PayoutTile label="Status" tone={payoutTone(payoutAccount?.status)}>
              <span className="inline-flex items-center gap-1.5">
                {payoutAccount?.status === 'verified' ? (
                  <BadgeCheck className="h-4 w-4 shrink-0" aria-hidden />
                ) : payoutAccount?.status === 'pending' ? (
                  <Clock3 className="h-4 w-4 shrink-0" aria-hidden />
                ) : payoutAccount?.status ? (
                  <CircleAlert className="h-4 w-4 shrink-0" aria-hidden />
                ) : (
                  <CircleDashed className="h-4 w-4 shrink-0" aria-hidden />
                )}
                {payoutSummaryLabel(payoutAccount?.status as never)}
              </span>
            </PayoutTile>
            <PayoutTile label="Holder">
              {canViewPayoutBank
                ? payoutAccount?.account_holder_name || '—'
                : 'Restricted'}
            </PayoutTile>
            <PayoutTile label="Masked IBAN" mono>
              {canViewPayoutBank ? payoutAccount?.masked_iban || '—' : 'Restricted'}
            </PayoutTile>
          </div>
          {canViewPayoutBank && payoutAccount ? (
            <>
              {payoutAccount.rejection_reason ? (
                <p className="rounded-xl border border-bh-danger/30 bg-bh-danger-soft px-3.5 py-2.5 text-sm font-medium text-bh-danger">
                  Reason: {payoutAccount.rejection_reason}
                </p>
              ) : null}
              {payoutAccount.proof_storage_path ? (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-bh-border/80 bg-gradient-to-r from-bh-subtle/70 via-bh-surface to-bh-surface px-4 py-3.5">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-bh-honey-soft text-bh-honey-strong ring-1 ring-bh-honey/30">
                      <ShieldCheck className="h-4 w-4" aria-hidden />
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold tracking-tight text-bh-text">
                        Proof of account
                      </p>
                      <p className="text-xs text-bh-text-muted">
                        Opens a short-lived secure link in a new tab
                      </p>
                    </div>
                  </div>
                  <OpenPayoutProofButton payoutAccountId={payoutAccount.id} />
                </div>
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
        <Panel
          kicker="Decision"
          title="Final worker approval"
          description="Marketplace access is a separate gate after documents and payout are approved. These actions cannot bypass server checks."
          accent="navy"
        >
          <div className="overflow-hidden rounded-[1.15rem] border border-bh-border/90 bg-gradient-to-br from-bh-subtle/80 via-bh-surface to-bh-teal-soft/25 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-bh-border/70 px-4 py-4 sm:px-5">
              <div className="flex min-w-0 items-start gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-bh-sidebar text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]">
                  <ShieldCheck className="h-5 w-5" aria-hidden />
                </span>
                <div className="min-w-0">
                  <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-bh-text-muted">
                    Marketplace gate
                  </p>
                  <p className="mt-1 text-sm font-semibold text-bh-text">
                    Final verification decision
                  </p>
                  <p className="mt-1 max-w-xl text-xs leading-5 text-bh-text-secondary">
                    Requires approved required documents, an approved payout
                    account, and{' '}
                    <code className="rounded bg-bh-subtle px-1 py-0.5 text-[11px] text-bh-text">
                      set_worker_verification
                    </code>
                    . Buttons cannot skip those gates.
                  </p>
                </div>
              </div>
              {canFinalVerify ? (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-bh-success/30 bg-bh-success-soft px-3 py-1.5 text-[11px] font-bold text-bh-success shadow-[0_0_0_3px_rgba(25,135,84,0.1)]">
                  <BadgeCheck className="h-3.5 w-3.5" aria-hidden />
                  Ready for final approval
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-bh-border bg-bh-subtle px-3 py-1.5 text-[11px] font-bold text-bh-text-secondary">
                  <Clock3 className="h-3.5 w-3.5" aria-hidden />
                  Not ready yet
                </span>
              )}
            </div>

            <div className="space-y-4 px-4 py-4 sm:px-5">
              {worker.verification_status === 'submitted' ||
              worker.verification_status === 'under_review' ? (
                <p className="rounded-xl border border-bh-border/80 bg-bh-surface/80 px-3.5 py-2.5 text-sm text-bh-text-secondary">
                  Worker package status:{' '}
                  <span className="font-semibold capitalize text-bh-text">
                    {String(worker.verification_status).replaceAll('_', ' ')}
                  </span>
                  . Finish document and payout review, then approve only when
                  the checklist is complete.
                </p>
              ) : null}

              {!canFinalVerify ? (
                <p className="rounded-xl border border-dashed border-bh-border bg-bh-subtle/50 px-3.5 py-2.5 text-sm text-bh-text-secondary">
                  Not ready — complete document and payout approvals first.
                </p>
              ) : null}

              <div className="flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:items-center">
                <ConfirmDialog
                  title={workerFolderLabel('approveWorker', 'en')}
                  description={approveSummary}
                  confirmLabel="Approve for marketplace"
                  triggerLabel={workerFolderLabel('approveWorker', 'en')}
                  triggerSize="default"
                  triggerClassName="h-11 rounded-full bg-bh-sidebar px-5 font-semibold text-white shadow-[0_10px_24px_rgba(7,29,48,0.28)] transition hover:-translate-y-0.5 hover:bg-bh-sidebar-raised disabled:translate-y-0 disabled:shadow-none"
                  disabled={!canFinalVerify}
                  hiddenFields={{ workerId, status: 'verified' }}
                  action={setWorkerVerificationAction}
                />
                <ConfirmDialog
                  title="Mark under review"
                  description="Sets worker verification status to under review without approving marketplace access."
                  confirmLabel="Mark under review"
                  triggerLabel="Mark under review"
                  triggerVariant="outline"
                  triggerSize="default"
                  triggerClassName="h-11 rounded-full border-bh-border bg-bh-surface px-5 font-semibold text-bh-text shadow-sm transition hover:-translate-y-0.5 hover:border-bh-teal/40 hover:bg-bh-teal-soft/40 hover:text-bh-teal-strong"
                  hiddenFields={{ workerId, status: 'under_review' }}
                  action={setWorkerVerificationAction}
                />
                <ConfirmDialog
                  title={workerFolderLabel('requestCorrection', 'en')}
                  description="Requires a reason. Does not delete credentials or the account. Worker returns to correction flow."
                  confirmLabel="Reject verification"
                  requireReason
                  destructive
                  triggerLabel={workerFolderLabel('requestCorrection', 'en')}
                  triggerVariant="destructive"
                  triggerSize="default"
                  triggerClassName="h-11 rounded-full px-5 font-semibold shadow-[0_8px_18px_rgba(180,35,24,0.18)] transition hover:-translate-y-0.5"
                  hiddenFields={{ workerId, status: 'rejected' }}
                  action={setWorkerVerificationAction}
                />
              </div>
            </div>
          </div>
        </Panel>
      ) : null}

      {ctx.capabilities.canViewAudit ? (
        <Panel
          kicker="Audit"
          title={workerFolderLabel('reviewTimeline', 'en')}
          description="Existing audit events for this worker. Sensitive values are never shown."
        >
          {auditEvents.length === 0 ? (
            <p className="text-sm text-bh-text-secondary">No audit events yet.</p>
          ) : (
            <ol className="space-y-3">
              {auditEvents.map((event) => (
                <li
                  key={event.id}
                  className="rounded-xl border border-bh-border/80 bg-bh-subtle/40 px-3.5 py-3"
                >
                  <p className="text-sm font-semibold text-bh-text">
                    {auditActionLabel(event.action)}
                  </p>
                  <p className="mt-0.5 text-xs text-bh-text-muted">
                    {formatDateTime(event.createdAt)}
                  </p>
                  {event.meta ? (
                    <p className="mt-1 text-xs text-bh-text-secondary">
                      {Object.entries(event.meta)
                        .slice(0, 4)
                        .map(([k, v]) => `${k}: ${String(v)}`)
                        .join(' · ')}
                    </p>
                  ) : null}
                </li>
              ))}
            </ol>
          )}
        </Panel>
      ) : null}
    </div>
  );
}

function CredentialStatusInline({ status }: { status: string }) {
  return <CredentialStatusBadge status={status} />;
}

function workerMark(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase();
  }
  return name.trim().slice(0, 2).toUpperCase() || '·';
}

type PayoutTone = 'success' | 'warning' | 'danger' | 'muted';

function payoutTone(status: string | null | undefined): PayoutTone {
  if (status === 'verified') return 'success';
  if (status === 'pending') return 'warning';
  if (status === 'rejected' || status === 'failed' || status === 'suspended') {
    return 'danger';
  }
  return 'muted';
}

function PayoutTile({
  label,
  tone,
  mono,
  children,
}: {
  label: string;
  tone?: PayoutTone;
  mono?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        'group relative overflow-hidden rounded-2xl border px-4 py-3.5 transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_10px_24px_rgba(7,29,48,0.07)] motion-reduce:transition-none motion-reduce:hover:translate-y-0',
        tone === 'success' &&
          'border-bh-success/30 bg-gradient-to-br from-bh-success-soft to-bh-surface',
        tone === 'warning' &&
          'border-bh-honey/35 bg-gradient-to-br from-bh-honey-soft to-bh-surface',
        tone === 'danger' &&
          'border-bh-danger/30 bg-gradient-to-br from-bh-danger-soft to-bh-surface',
        (!tone || tone === 'muted') &&
          'border-bh-border/80 bg-gradient-to-br from-bh-subtle/70 to-bh-surface',
      )}
    >
      <span
        aria-hidden
        className={cn(
          'absolute inset-y-3 left-0 w-1 rounded-full',
          tone === 'success' && 'bg-bh-success',
          tone === 'warning' && 'bg-bh-honey',
          tone === 'danger' && 'bg-bh-danger',
          (!tone || tone === 'muted') && 'bg-bh-sidebar/25',
        )}
      />
      <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-bh-text-muted">
        {label}
      </p>
      <div
        className={cn(
          'mt-1.5 break-words text-sm font-semibold tracking-tight',
          mono && 'font-mono tracking-[0.06em]',
          tone === 'success' && 'text-bh-success',
          tone === 'warning' && 'text-bh-honey-strong',
          tone === 'danger' && 'text-bh-danger',
          (!tone || tone === 'muted') && 'text-bh-text',
        )}
      >
        {children}
      </div>
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
    <section className="overflow-hidden rounded-[1.25rem] border border-bh-border/90 bg-bh-surface shadow-[0_8px_28px_rgba(7,29,48,0.05)]">
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

function ChecklistBoard({
  items,
  requiredVerified,
  requiredTotal,
  awaiting,
  rejected,
  payoutLabel,
  payoutOk,
}: {
  items: Array<{
    credentialType: string;
    isRequired: boolean;
    status: DocumentChecklistItemStatus;
  }>;
  requiredVerified: number;
  requiredTotal: number;
  awaiting: number;
  rejected: number;
  payoutLabel: string;
  payoutOk: boolean;
}) {
  const progress =
    requiredTotal > 0
      ? Math.round((requiredVerified / requiredTotal) * 100)
      : 0;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-bh-border/80 bg-gradient-to-br from-bh-subtle/90 via-bh-surface to-bh-teal-soft/30 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-bh-text-muted">
              Required progress
            </p>
            <p className="mt-1 text-2xl font-bold tracking-tight text-bh-text">
              {requiredVerified}
              <span className="text-base font-semibold text-bh-text-muted">
                {' '}
                / {requiredTotal}
              </span>
            </p>
            <p className="mt-1 text-xs text-bh-text-secondary">
              Required documents verified for this role
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <MiniStat
              label="Awaiting"
              value={awaiting}
              tone={awaiting > 0 ? 'warning' : 'muted'}
            />
            <MiniStat
              label="Rejected"
              value={rejected}
              tone={rejected > 0 ? 'danger' : 'muted'}
            />
            <MiniStat
              label="Complete"
              value={`${progress}%`}
              tone={progress === 100 ? 'success' : 'info'}
            />
          </div>
        </div>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-bh-border/60">
          <div
            className={cn(
              'h-full rounded-full transition-[width] duration-500',
              progress === 100
                ? 'bg-gradient-to-r from-bh-success to-[#146c43]'
                : 'bg-gradient-to-r from-bh-teal to-bh-teal-strong',
            )}
            style={{ width: `${Math.min(100, progress)}%` }}
          />
        </div>
      </div>

      <ul className="space-y-2.5">
        {items.map((item) => {
          const visual = checklistVisual(item.status);
          return (
            <li
              key={item.credentialType}
              className={cn(
                'flex items-start justify-between gap-3 rounded-2xl border px-3.5 py-3 shadow-[0_1px_2px_rgba(7,29,48,0.03)]',
                visual.row,
              )}
            >
              <div className="flex min-w-0 items-start gap-3">
                <span
                  className={cn(
                    'mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ring-1',
                    visual.iconWrap,
                  )}
                >
                  <visual.Icon className="h-4 w-4" aria-hidden />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-bh-text">
                    {credentialTypeLabel(item.credentialType)}
                  </p>
                  <p className="mt-0.5 text-xs text-bh-text-secondary">
                    {item.isRequired ? 'Required for this role' : 'Optional'}
                    {visual.hint ? ` · ${visual.hint}` : ''}
                  </p>
                </div>
              </div>
              <span
                className={cn(
                  'shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold',
                  visual.badge,
                )}
              >
                {visual.label}
              </span>
            </li>
          );
        })}
      </ul>

      <div
        className={cn(
          'flex items-start justify-between gap-3 rounded-2xl border px-3.5 py-3.5',
          payoutOk
            ? 'border-bh-success/30 bg-bh-success-soft/50'
            : 'border-bh-honey/35 bg-bh-honey-soft/60',
        )}
      >
        <div className="flex min-w-0 items-start gap-3">
          <span
            className={cn(
              'mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ring-1',
              payoutOk
                ? 'bg-bh-success-soft text-bh-success ring-bh-success/25'
                : 'bg-bh-honey-soft text-bh-honey-strong ring-bh-honey/30',
            )}
          >
            <Wallet className="h-4 w-4" aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-bh-text">Payout account</p>
            <p className="mt-0.5 text-xs text-bh-text-secondary">
              Separate administrative review — bank proof is not a credential
              document
            </p>
          </div>
        </div>
        <span
          className={cn(
            'shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold',
            payoutOk
              ? 'bg-bh-success text-white'
              : 'bg-bh-honey-soft text-bh-warning',
          )}
        >
          {payoutLabel}
        </span>
      </div>
    </div>
  );
}

function MiniStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number | string;
  tone: 'success' | 'warning' | 'danger' | 'info' | 'muted';
}) {
  return (
    <div
      className={cn(
        'rounded-xl px-3 py-2 text-center',
        tone === 'success' && 'bg-bh-success-soft text-bh-success',
        tone === 'warning' && 'bg-bh-honey-soft text-bh-warning',
        tone === 'danger' && 'bg-bh-danger-soft text-bh-danger',
        tone === 'info' && 'bg-bh-info-soft text-bh-info',
        tone === 'muted' && 'bg-bh-subtle text-bh-text-secondary',
      )}
    >
      <p className="text-[10px] font-bold uppercase tracking-[0.12em] opacity-80">
        {label}
      </p>
      <p className="mt-0.5 text-sm font-bold tabular-nums">{value}</p>
    </div>
  );
}

function checklistVisual(status: DocumentChecklistItemStatus): {
  label: string;
  hint: string;
  Icon: typeof BadgeCheck;
  row: string;
  badge: string;
  iconWrap: string;
} {
  switch (status) {
    case 'verified':
      return {
        label: 'Verified',
        hint: 'Approved — no action needed',
        Icon: BadgeCheck,
        row: 'border-bh-success/25 bg-gradient-to-r from-bh-success-soft/70 to-bh-surface',
        badge: 'bg-bh-success text-white shadow-[0_0_0_3px_rgba(25,135,84,0.12)]',
        iconWrap: 'bg-bh-success-soft text-bh-success ring-bh-success/25',
      };
    case 'under_review':
    case 'submitted':
      return {
        label: status === 'under_review' ? 'Under review' : 'Submitted',
        hint: 'Ready for admin decision in Document review',
        Icon: Clock3,
        row: 'border-bh-honey/30 bg-gradient-to-r from-bh-honey-soft/70 to-bh-surface',
        badge: 'bg-bh-honey-soft text-bh-warning',
        iconWrap: 'bg-bh-honey-soft text-bh-honey-strong ring-bh-honey/30',
      };
    case 'rejected':
      return {
        label: 'Rejected',
        hint: 'Worker must correct and resubmit',
        Icon: CircleAlert,
        row: 'border-bh-danger/25 bg-gradient-to-r from-bh-danger-soft/70 to-bh-surface',
        badge: 'bg-bh-danger-soft text-bh-danger',
        iconWrap: 'bg-bh-danger-soft text-bh-danger ring-bh-danger/25',
      };
    case 'expired':
    case 'suspended':
      return {
        label: status === 'expired' ? 'Expired' : 'Suspended',
        hint: 'Needs attention before approval',
        Icon: FileWarning,
        row: 'border-bh-danger/20 bg-bh-danger-soft/40',
        badge: 'bg-bh-danger-soft text-bh-danger',
        iconWrap: 'bg-bh-danger-soft text-bh-danger ring-bh-danger/20',
      };
    case 'draft':
      return {
        label: 'Draft',
        hint: 'Uploaded but not submitted for review',
        Icon: CircleDashed,
        row: 'border-bh-border bg-bh-subtle/50',
        badge: 'bg-bh-subtle text-bh-text-secondary',
        iconWrap: 'bg-bh-subtle text-bh-text-muted ring-bh-border',
      };
    default:
      return {
        label: 'Not uploaded',
        hint: 'Missing from the package',
        Icon: CircleDashed,
        row: 'border-dashed border-bh-border bg-bh-subtle/30',
        badge: 'bg-bh-subtle text-bh-text-muted',
        iconWrap: 'bg-bh-subtle text-bh-text-muted ring-bh-border',
      };
  }
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
