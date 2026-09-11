import Link from 'next/link';
import { notFound } from 'next/navigation';

import { ConfirmDialog } from '@/components/admin/confirm-dialog';
import { OpenPayoutProofButton } from '@/components/admin/open-payout-proof-button';
import {
  AccountStatusBadge,
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
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { requirePlatformAdmin } from '@/lib/admin/auth';
import {
  buildAdminWorkerChecklist,
  getWorkerPackageLabel,
  isReadyForFinalVerification,
  payoutAccountStatusLabel,
} from '@/lib/admin/document-status';
import { auditActionLabel, credentialTypeLabel } from '@/lib/admin/labels';
import { formatDateTime, roleLabel } from '@/lib/format';
import { createClient } from '@/lib/supabase/server';
import type { WorkerRole } from '@bridge-hive/domain';

export default async function AdminWorkerDetailPage({
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
        description="Your role cannot view worker details."
      />
    );
  }

  const supabase = await createClient();

  const { data: worker } = await supabase
    .from('worker_profiles')
    .select(
      'user_id, worker_role, bio, onboarding_status, verification_status, created_at, updated_at, profile:profiles!worker_profiles_user_id_fkey(full_name, phone, account_status, created_at)',
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
    { data: assignments },
    { data: audits },
    payoutResult,
  ] = await Promise.all([
      supabase
        .from('credentials')
        .select(
          'id, credential_type, status, expires_at, verified_at, rejection_reason, storage_path, storage_paths',
        )
        .eq('worker_id', workerId)
        .order('created_at', { ascending: false }),
      supabase
        .from('shift_assignments')
        .select('id, status, accepted_at, shift_id')
        .eq('worker_id', workerId)
        .in('status', ['accepted', 'checked_in'])
        .order('accepted_at', { ascending: false })
        .limit(20),
      supabase
        .from('audit_events')
        .select('id, action, entity_type, entity_id, created_at, before, after')
        .or(`entity_id.eq.${workerId},actor_user_id.eq.${workerId}`)
        .order('created_at', { ascending: false })
        .limit(20),
      canViewPayoutBank
        ? supabase
            .from('payout_accounts')
            .select(
              'id, status, masked_iban, account_holder_name, proof_storage_path, proof_mime_type, rejection_reason, verified_at, created_at, updated_at',
            )
            .eq('worker_id', workerId)
            .maybeSingle()
        : supabase.rpc('get_worker_payout_status', { p_worker_id: workerId }),
    ]);

  const payoutRaw = payoutResult.data;
  const payoutAccount: PayoutDetail | null = canViewPayoutBank
    ? ((payoutRaw as PayoutDetail | null) ?? null)
    : Array.isArray(payoutRaw)
      ? ((payoutRaw[0] as PayoutDetail | undefined) ?? null)
      : ((payoutRaw as PayoutDetail | null) ?? null);
  const shiftIds = (assignments ?? []).map((row) => row.shift_id);
  const { data: shifts } = shiftIds.length
    ? await supabase
        .from('shifts')
        .select('id, starts_at, ends_at, title, organization_id, location_id')
        .in('id', shiftIds)
        .gt('starts_at', new Date().toISOString())
        .order('starts_at', { ascending: true })
        .limit(5)
    : { data: [] as {
        id: string;
        starts_at: string;
        ends_at: string;
        title: string | null;
        organization_id: string;
        location_id: string;
      }[] };

  const orgIds = Array.from(new Set((shifts ?? []).map((s) => s.organization_id)));
  const locationIds = Array.from(new Set((shifts ?? []).map((s) => s.location_id)));

  const [{ data: orgs }, { data: locations }] = await Promise.all([
    orgIds.length
      ? supabase.from('organizations').select('id, display_name').in('id', orgIds)
      : Promise.resolve({ data: [] as { id: string; display_name: string }[] }),
    locationIds.length
      ? supabase.from('locations').select('id, name').in('id', locationIds)
      : Promise.resolve({ data: [] as { id: string; name: string }[] }),
  ]);

  const orgMap = new Map((orgs ?? []).map((o) => [o.id, o.display_name]));
  const locationMap = new Map((locations ?? []).map((l) => [l.id, l.name]));
  const assignmentByShift = new Map(
    (assignments ?? []).map((a) => [a.shift_id, a]),
  );

  const futureAssignments = (shifts ?? []).map((shift) => ({
    id: assignmentByShift.get(shift.id)?.id ?? shift.id,
    status: assignmentByShift.get(shift.id)?.status ?? 'accepted',
    starts_at: shift.starts_at,
    orgName: orgMap.get(shift.organization_id) ?? 'Organization',
    locationName: locationMap.get(shift.location_id) ?? 'Location',
  }));

  const checklist = buildAdminWorkerChecklist({
    role: worker.worker_role as WorkerRole | null,
    credentials: credentials ?? [],
  });
  const payoutSatisfied = payoutAccount?.status === 'verified';
  const packageLabel = getWorkerPackageLabel({
    verificationStatus: worker.verification_status,
    accountStatus: profile?.account_status,
    role: worker.worker_role as WorkerRole | null,
    credentials: credentials ?? [],
    payoutSatisfied,
    payoutStatus: payoutAccount?.status,
  });
  const canFinalVerify = isReadyForFinalVerification({
    role: worker.worker_role as WorkerRole | null,
    verificationStatus: worker.verification_status,
    credentials: credentials ?? [],
    payoutSatisfied,
  });
  const payoutLabel = payoutAccountStatusLabel(payoutAccount?.status);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm text-slate-500">
            <Link href="/admin/workers" className="hover:underline">
              Workers
            </Link>{' '}
            / detail ·{' '}
            <Link
              href={`/admin/applications/${workerId}`}
              className="hover:underline"
            >
              Verification application
            </Link>
          </p>
          <h2 className="mt-1 text-2xl font-semibold text-slate-900">
            {profile?.full_name ?? 'Unnamed worker'}
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            {profile?.phone ?? 'No phone'} · {workerId.slice(0, 8)}…
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {ctx.capabilities.canSuspendAccounts &&
          profile?.account_status === 'active' ? (
            <ConfirmDialog
              title="Suspend worker account"
              description={
                futureAssignments.length > 0
                  ? `This worker has ${futureAssignments.length} upcoming assignment(s). Suspension blocks new claims but does not cancel existing assignments.`
                  : 'Suspended workers cannot claim shifts. Existing assignments are preserved.'
              }
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
              description="Reactivation restores account status to active. Verification status is unchanged."
              confirmLabel="Reactivate"
              requireReason
              triggerLabel="Reactivate"
              triggerVariant="default"
              hiddenFields={{ workerId }}
              action={reactivateWorkerAction}
            />
          ) : null}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              <span className="text-slate-500">Role:</span>{' '}
              {worker.worker_role ? roleLabel(worker.worker_role) : '—'}
            </p>
            <p className="flex items-center gap-2">
              <span className="text-slate-500">Account:</span>
              <AccountStatusBadge status={profile?.account_status ?? 'active'} />
            </p>
            <p className="flex items-center gap-2">
              <span className="text-slate-500">Onboarding:</span>
              <OnboardingStatusBadge status={worker.onboarding_status} />
            </p>
            <p className="flex items-center gap-2">
              <span className="text-slate-500">Verification:</span>
              <VerificationStatusBadge status={worker.verification_status} />
            </p>
            <p>
              <span className="text-slate-500">Documents:</span> {packageLabel}
            </p>
            <p>
              <span className="text-slate-500">Payout account:</span>{' '}
              {payoutLabel}
              {ctx.capabilities.canViewPayoutProof && payoutAccount?.masked_iban
                ? ` · ${payoutAccount.masked_iban}`
                : ''}
            </p>
            {worker.bio ? (
              <p>
                <span className="text-slate-500">Bio:</span> {worker.bio}
              </p>
            ) : null}
          </CardContent>
        </Card>

        {ctx.capabilities.canVerifyWorkers ? (
          <Card>
            <CardHeader>
              <CardTitle>Verification actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {!canFinalVerify ? (
                <p className="text-sm text-slate-600">
                  Final approval is disabled until every required document is
                  verified and the payout account is approved for platform use.
                </p>
              ) : null}
              <div className="flex flex-wrap gap-2">
                <ConfirmDialog
                  title="Approve worker for marketplace access"
                  description="Requires all role-specific credentials to be verified and non-expired, plus a payout account approved for platform use. You cannot approve your own worker profile."
                  confirmLabel="Approve worker"
                  triggerLabel="Verify"
                  disabled={!canFinalVerify}
                  hiddenFields={{ workerId, status: 'verified' }}
                  action={setWorkerVerificationAction}
                />
                <ConfirmDialog
                  title="Reject worker verification"
                  description="Rejection is recorded in the audit trail and does not delete the worker profile."
                  confirmLabel="Reject"
                  requireReason
                  destructive
                  triggerLabel="Reject"
                  triggerVariant="destructive"
                  hiddenFields={{ workerId, status: 'rejected' }}
                  action={setWorkerVerificationAction}
                />
                <ConfirmDialog
                  title="Mark under review"
                  description="Moves the worker into active review."
                  confirmLabel="Set under review"
                  triggerLabel="Under review"
                  triggerVariant="outline"
                  hiddenFields={{ workerId, status: 'under_review' }}
                  action={setWorkerVerificationAction}
                />
              </div>
            </CardContent>
          </Card>
        ) : null}
      </div>

      {ctx.capabilities.canApprovePayoutAccounts ||
      ctx.capabilities.canViewPayoutProof ? (
        <Card>
          <CardHeader>
            <CardTitle>Payout account</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p>
              <span className="text-slate-500">Status:</span> {payoutLabel}
            </p>
            {payoutAccount ? (
              <>
                {ctx.capabilities.canViewPayoutProof ? (
                  <>
                    <p>
                      <span className="text-slate-500">Masked account:</span>{' '}
                      {payoutAccount.masked_iban}
                    </p>
                    <p>
                      <span className="text-slate-500">Account holder:</span>{' '}
                      {payoutAccount.account_holder_name ?? '—'}
                    </p>
                  </>
                ) : null}
                <p>
                  <span className="text-slate-500">Proof document:</span>{' '}
                  {payoutAccount.proof_storage_path || payoutAccount.has_proof
                    ? 'Uploaded'
                    : 'Missing'}
                </p>
                <p>
                  <span className="text-slate-500">Submitted:</span>{' '}
                  {payoutAccount.created_at
                    ? formatDateTime(payoutAccount.created_at)
                    : '—'}
                </p>
                <p>
                  <span className="text-slate-500">Reviewed:</span>{' '}
                  {payoutAccount.verified_at
                    ? formatDateTime(payoutAccount.verified_at)
                    : '—'}
                </p>
                {payoutAccount.rejection_reason ? (
                  <p>
                    <span className="text-slate-500">Rejection reason:</span>{' '}
                    {payoutAccount.rejection_reason}
                  </p>
                ) : null}
                <p className="text-slate-600">
                  Internal administrative approval for platform use. This is not bank
                  ownership verification. Production transfers remain blocked until a
                  secure IBAN vault exists.
                </p>
                {ctx.capabilities.canViewPayoutProof &&
                payoutAccount.proof_storage_path ? (
                  <OpenPayoutProofButton payoutAccountId={payoutAccount.id} />
                ) : null}
                {ctx.capabilities.canApprovePayoutAccounts &&
                payoutAccount.status === 'pending' ? (
                  <div className="flex flex-wrap gap-2">
                    <ConfirmDialog
                      title="Approve payout account for platform use"
                      description="Marks this payout account as approved for platform use so final worker approval can proceed."
                      confirmLabel="Approve for platform use"
                      requireReason
                      triggerLabel="Approve payout account for platform use"
                      hiddenFields={{
                        payoutAccountId: payoutAccount.id,
                        decision: 'approve',
                      }}
                      action={reviewPayoutAccountAction}
                    />
                    <ConfirmDialog
                      title="Reject payout account"
                      description="The worker can resubmit a corrected payout account after rejection."
                      confirmLabel="Reject payout account"
                      requireReason
                      destructive
                      triggerLabel="Reject payout account"
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
              <p className="text-slate-600">Worker has not submitted a payout account.</p>
            )}
          </CardContent>
        </Card>
      ) : null}

      <section className="space-y-3">
        <h3 className="text-lg font-medium text-slate-900">
          Role checklist
        </h3>
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Requirement</th>
                <th className="px-4 py-3">Required</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3"> </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {checklist.map((item) => (
                <tr key={item.credentialType}>
                  <td className="px-4 py-3">
                    {credentialTypeLabel(item.credentialType)}
                    {item.rejectionReason ? (
                      <p className="mt-1 text-xs text-rose-600">
                        {item.rejectionReason}
                      </p>
                    ) : null}
                  </td>
                  <td className="px-4 py-3">
                    {item.isRequired ? 'Required' : 'Optional'}
                  </td>
                  <td className="px-4 py-3 capitalize">
                    {item.status.replaceAll('_', ' ')}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {item.credentialId &&
                    ctx.capabilities.canViewCredentialMetadata ? (
                      <Link
                        href={`/admin/credentials/${item.credentialId}`}
                        className="font-medium text-amber-700 hover:underline"
                      >
                        Open
                      </Link>
                    ) : (
                      '—'
                    )}
                  </td>
                </tr>
              ))}
              <tr>
                <td className="px-4 py-3">Payout account (IBAN workflow)</td>
                <td className="px-4 py-3">Required</td>
                <td className="px-4 py-3">{payoutLabel}</td>
                <td className="px-4 py-3 text-right">—</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-lg font-medium text-slate-900">Credentials</h3>
        {!credentials?.length ? (
          <EmptyState title="No credentials" description="This worker has not submitted credentials yet." />
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Expires</th>
                  <th className="px-4 py-3"> </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {credentials.map((cred) => (
                  <tr key={cred.id}>
                    <td className="px-4 py-3">
                      {credentialTypeLabel(cred.credential_type)}
                    </td>
                    <td className="px-4 py-3">
                      <CredentialStatusBadge status={cred.status} />
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {cred.expires_at ? formatDateTime(cred.expires_at) : '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {ctx.capabilities.canViewCredentialMetadata ? (
                        <Link
                          href={`/admin/credentials/${cred.id}`}
                          className="font-medium text-amber-700 hover:underline"
                        >
                          Open
                        </Link>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h3 className="text-lg font-medium text-slate-900">Upcoming assignments</h3>
        {futureAssignments.length === 0 ? (
          <EmptyState
            title="No upcoming assignments"
            description="Future accepted assignments will appear here."
          />
        ) : (
          <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
            {futureAssignments.map((row) => (
              <li key={row.id} className="px-4 py-3 text-sm">
                <p className="font-medium text-slate-900">
                  {row.orgName} · {row.locationName}
                </p>
                <p className="text-slate-600">
                  {formatDateTime(row.starts_at)} · {row.status}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <h3 className="text-lg font-medium text-slate-900">Relevant audit history</h3>
        {!audits?.length ? (
          <EmptyState title="No audit events" />
        ) : (
          <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
            {audits.map((event) => (
              <li key={event.id} className="flex flex-wrap justify-between gap-2 px-4 py-3 text-sm">
                <div>
                  <p className="font-medium text-slate-900">
                    {auditActionLabel(event.action)}
                  </p>
                  <p className="text-xs text-slate-500">{event.entity_type}</p>
                </div>
                <p className="text-xs text-slate-500">
                  {formatDateTime(event.created_at)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
