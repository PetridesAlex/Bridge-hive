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
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
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
    <div className="space-y-6">
      <div>
        <p className="text-sm text-slate-500">
          <Link href="/admin/applications" className="hover:underline">
            Verification applications
          </Link>{' '}
          / workspace
        </p>
        <div className="mt-1 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-2xl font-semibold text-slate-900">
              {profile?.full_name ?? 'Worker'}
            </h2>
            <p className="text-sm text-slate-600">
              {role ? roleLabel(role) : 'Role not set'} · Ref{' '}
              {workerId.replaceAll('-', '').slice(0, 8)}
            </p>
            <p className="text-sm text-slate-500">
              {[profile?.phone].filter(Boolean).join(' · ') || 'No phone on file'}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href={`/admin/workers/${workerId}`}
              className="rounded-md border border-slate-300 px-3 py-1.5 text-sm"
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
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Application header</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm sm:grid-cols-2">
          <p className="flex items-center gap-2">
            <span className="text-slate-500">Account:</span>
            <AccountStatusBadge status={profile?.account_status ?? 'active'} />
          </p>
          <p className="flex items-center gap-2">
            <span className="text-slate-500">Onboarding:</span>
            <OnboardingStatusBadge status={worker.onboarding_status} />
          </p>
          <p className="flex items-center gap-2">
            <span className="text-slate-500">Final verification:</span>
            <VerificationStatusBadge status={worker.verification_status} />
          </p>
          <p>
            <span className="text-slate-500">Application status:</span>{' '}
            {applicationStatusLabel(applicationStatus)}
          </p>
          <p>
            <span className="text-slate-500">Payout account:</span>{' '}
            {payoutSummaryLabel(payoutAccount?.status as never)}
          </p>
          <p>
            <span className="text-slate-500">Last activity:</span>{' '}
            {expectedLastActivity
              ? formatDateTime(expectedLastActivity)
              : '—'}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Review progress</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm sm:grid-cols-3">
          <p>Required documents: {requiredTotal}</p>
          <p>Approved: {approved}</p>
          <p>Rejected: {rejected}</p>
          <p>Awaiting review: {awaiting}</p>
          <p>Optional documents: {optionalCount}</p>
          <p>Payout: {payoutAccountStatusLabel(payoutAccount?.status)}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Role-specific checklist</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm">
            {checklist.map((item) => (
              <li key={item.credentialType} className="flex justify-between gap-2">
                <span>
                  {credentialTypeLabel(item.credentialType)}
                  {item.isRequired ? '' : ' — optional'}
                </span>
                <span className="text-slate-500">
                  {String(item.status).replaceAll('_', ' ')}
                </span>
              </li>
            ))}
            <li className="flex justify-between gap-2 border-t border-slate-100 pt-2">
              <span>Payout account — separate administrative review</span>
              <span className="text-slate-500">
                {payoutSummaryLabel(payoutAccount?.status as never)}
              </span>
            </li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Document review</CardTitle>
        </CardHeader>
        <CardContent>
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
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Payout account</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p>
            Status:{' '}
            <span className="font-medium">
              {payoutSummaryLabel(payoutAccount?.status as never)}
            </span>
          </p>
          {canViewPayoutBank && payoutAccount ? (
            <>
              {payoutAccount.account_holder_name ? (
                <p>Holder: {payoutAccount.account_holder_name}</p>
              ) : null}
              {payoutAccount.masked_iban ? (
                <p>Masked IBAN: {payoutAccount.masked_iban}</p>
              ) : null}
              {payoutAccount.rejection_reason ? (
                <p className="text-red-700">
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
            <p className="text-slate-500">
              Banking details and proof are visible only to platform super admins
              in Phase 4.
            </p>
          )}
        </CardContent>
      </Card>

      {ctx.capabilities.canVerifyWorkers ? (
        <Card>
          <CardHeader>
            <CardTitle>Final worker approval</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p>
              Marketplace access requires approved required documents, an approved
              payout account, and this separate action.
            </p>
            {canFinalVerify ? (
              <p className="font-medium text-emerald-700">
                Ready for final approval
              </p>
            ) : (
              <p className="text-slate-500">
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
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
