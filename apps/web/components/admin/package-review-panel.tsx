'use client';

import {
  Fragment,
  useActionState,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  eligiblePackageApproveCredentialIds,
  isTextCredentialType,
} from '@bridge-hive/domain';
import {
  ArrowRight,
  BadgeCheck,
  Check,
  CheckSquare,
  ClipboardCheck,
  FileText,
  Shield,
  Square,
} from 'lucide-react';

import {
  approveReviewedCredentialsAction,
  markCredentialsUnderReviewAction,
  reviewCredentialAction,
  submitCredentialReviewAction,
  type AdminActionResult,
} from '@/app/actions/admin';
import { OpenCredentialDocumentButton } from '@/components/admin/open-credential-document-button';
import { CredentialStatusBadge } from '@/components/admin/status-badges';
import { Button } from '@/components/ui/button';
import { credentialTypeLabel } from '@/lib/admin/labels';
import { formatDateTime } from '@/lib/format';
import { cn } from '@/lib/utils';

export type PackageReviewCredential = {
  id: string;
  credential_type: string;
  status: string;
  expires_at: string | null;
  verified_at: string | null;
  rejection_reason: string | null;
  created_at: string | null;
  hasFile: boolean;
  hasTextValue: boolean;
  textValue: string | null;
  isRequired: boolean;
};

const initial: AdminActionResult = {};

function PremiumActionButton({
  children,
  className,
  disabled,
  type = 'submit',
}: {
  children: ReactNode;
  className?: string;
  disabled?: boolean;
  type?: 'button' | 'submit';
}) {
  return (
    <button
      type={type}
      disabled={disabled}
      className={cn(
        'group/btn relative inline-flex h-9 items-center justify-center gap-1.5 overflow-hidden rounded-full bg-bh-sidebar px-3.5 text-xs font-semibold text-white shadow-[0_8px_16px_rgba(7,29,48,0.18)] transition duration-300',
        'hover:-translate-y-0.5 hover:bg-bh-sidebar-raised hover:shadow-[0_12px_22px_rgba(7,29,48,0.24)]',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bh-teal',
        'disabled:pointer-events-none disabled:opacity-50 disabled:hover:translate-y-0',
        'motion-reduce:transition-none motion-reduce:hover:translate-y-0',
        className,
      )}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 bh-btn-flow bg-[linear-gradient(110deg,transparent_20%,rgba(22,166,182,0.28)_45%,rgba(224,170,24,0.2)_55%,transparent_75%)] opacity-70"
      />
      <span
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-white/25 to-transparent bh-btn-shine"
      />
      <span className="relative z-10 inline-flex items-center gap-1.5">
        {children}
      </span>
    </button>
  );
}

function SelectCheck({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      onClick={onChange}
      className={cn(
        'group/check relative flex h-6 w-6 items-center justify-center rounded-md border transition duration-300',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bh-teal',
        'motion-reduce:transition-none',
        checked
          ? 'border-bh-teal bg-bh-teal text-white shadow-[0_0_0_3px_rgba(22,166,182,0.18),0_6px_14px_rgba(22,166,182,0.28)]'
          : 'border-bh-border-strong bg-white text-transparent shadow-sm hover:border-bh-teal hover:bg-bh-teal-soft/40',
      )}
    >
      <Check
        className={cn(
          'h-3.5 w-3.5 transition duration-300',
          checked ? 'scale-100 opacity-100' : 'scale-75 opacity-0',
        )}
        strokeWidth={3}
        aria-hidden
      />
    </button>
  );
}

export function PackageReviewPanel({
  workerId,
  credentials,
  expectedLastActivity,
  canReview,
  canViewDocuments,
}: {
  workerId: string;
  credentials: PackageReviewCredential[];
  expectedLastActivity: string | null;
  canReview: boolean;
  canViewDocuments: boolean;
}) {
  const eligibleIds = useMemo(
    () =>
      eligiblePackageApproveCredentialIds(
        credentials.map((c) => ({
          id: c.id,
          status: c.status,
          hasFile: c.hasFile,
          hasTextValue: c.hasTextValue,
        })),
      ),
    [credentials],
  );
  const [selected, setSelected] = useState<string[]>([]);
  const [confirmReviewed, setConfirmReviewed] = useState(false);
  const [rejectId, setRejectId] = useState<string | null>(null);

  const [approveState, approveAction, approvePending] = useActionState(
    approveReviewedCredentialsAction,
    initial,
  );
  const [markState, markAction, markPending] = useActionState(
    markCredentialsUnderReviewAction,
    initial,
  );
  const [reviewState, reviewAction, reviewPending] = useActionState(
    reviewCredentialAction,
    initial,
  );
  const [submitState, submitAction, submitPending] = useActionState(
    submitCredentialReviewAction,
    initial,
  );

  const toggle = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const allEligibleSelected =
    eligibleIds.length > 0 &&
    eligibleIds.every((id) => selected.includes(id));

  const actionError =
    approveState.error ||
    markState.error ||
    reviewState.error ||
    submitState.error;

  return (
    <div className="space-y-4">
      {actionError ? (
        <p className="rounded-xl border border-bh-danger/30 bg-bh-danger-soft px-3.5 py-2.5 text-sm font-medium text-bh-danger">
          {actionError}
        </p>
      ) : null}

      {canReview ? (
        <div className="relative overflow-hidden rounded-2xl border border-bh-border/80 bg-gradient-to-r from-bh-subtle/70 via-bh-surface to-bh-teal-soft/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
          <div
            aria-hidden
            className="absolute inset-y-0 left-0 w-[3px] bg-gradient-to-b from-bh-sidebar via-bh-teal to-bh-honey"
          />
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 pl-5">
            <div className="flex min-w-0 flex-wrap items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-full border border-bh-border/80 bg-white text-bh-sidebar shadow-sm">
                {selected.length > 0 ? (
                  <CheckSquare className="h-3.5 w-3.5" aria-hidden />
                ) : (
                  <Square className="h-3.5 w-3.5" aria-hidden />
                )}
              </span>
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-bh-text-muted">
                  Bulk review
                </p>
                <p className="text-sm font-semibold tracking-tight text-bh-text">
                  {selected.length} selected
                  <span className="font-medium text-bh-text-muted">
                    {' '}
                    · {eligibleIds.length} eligible
                  </span>
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  setSelected(allEligibleSelected ? [] : eligibleIds)
                }
                disabled={eligibleIds.length === 0}
                className="inline-flex h-9 items-center rounded-full border border-bh-border/80 bg-white px-3.5 text-xs font-semibold text-bh-text shadow-sm transition duration-300 hover:-translate-y-0.5 hover:border-bh-teal/40 hover:bg-bh-teal-soft/40 hover:text-bh-teal-strong disabled:pointer-events-none disabled:opacity-50 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
              >
                {allEligibleSelected ? 'Clear selection' : 'Select all eligible'}
              </button>
              {selected.length > 0 && !allEligibleSelected ? (
                <button
                  type="button"
                  onClick={() => setSelected([])}
                  className="inline-flex h-9 items-center rounded-full px-3 text-xs font-semibold text-bh-text-muted transition hover:bg-bh-subtle hover:text-bh-text"
                >
                  Clear
                </button>
              ) : null}
              <form action={markAction}>
                <input type="hidden" name="workerId" value={workerId} />
                <input
                  type="hidden"
                  name="credentialIds"
                  value={selected.join(',')}
                />
                <PremiumActionButton
                  disabled={markPending || selected.length === 0}
                >
                  {markPending ? 'Marking…' : 'Mark under review'}
                  <ArrowRight className="h-3.5 w-3.5 transition duration-300 group-hover/btn:translate-x-0.5" />
                </PremiumActionButton>
              </form>
            </div>
          </div>
        </div>
      ) : null}

      <div className="overflow-hidden rounded-[1.15rem] border border-bh-border/80 bg-bh-surface shadow-[0_8px_28px_rgba(7,29,48,0.04)]">
        <div
          aria-hidden
          className="h-1 bg-gradient-to-r from-bh-sidebar via-bh-teal to-bh-honey"
        />
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-bh-border/70 bg-gradient-to-b from-bh-subtle/70 to-bh-surface px-4 py-3 sm:px-5">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-full border border-bh-border/80 bg-white text-bh-sidebar shadow-sm">
              <FileText className="h-3.5 w-3.5" aria-hidden />
            </span>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-bh-honey-strong">
                Credential table
              </p>
              <p className="text-sm text-bh-text-secondary">
                Structured review queue · signed document links only
              </p>
            </div>
          </div>
          <span className="text-[11px] font-semibold text-bh-text-muted">
            {credentials.length} item{credentials.length === 1 ? '' : 's'}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] text-left text-sm">
            <thead>
              <tr className="border-b border-bh-border/80 bg-bh-subtle/55 text-[10px] uppercase tracking-[0.14em] text-bh-text-muted">
                {canReview ? (
                  <th className="w-12 px-4 py-3 font-semibold sm:px-5">
                    <span className="sr-only">Select</span>
                  </th>
                ) : null}
                <th className="px-3 py-3 font-semibold">Credential</th>
                <th className="px-3 py-3 font-semibold">Status</th>
                <th className="px-3 py-3 font-semibold">Evidence</th>
                <th className="px-4 py-3 text-right font-semibold sm:px-5">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {credentials.map((cred, index) => {
                const eligible = eligibleIds.includes(cred.id);
                const isText = isTextCredentialType(cred.credential_type);
                const canAct =
                  canReview &&
                  (cred.status === 'pending' ||
                    cred.status === 'under_review') &&
                  (cred.hasFile || cred.hasTextValue);
                const canMarkPending =
                  canReview &&
                  cred.status === 'pending' &&
                  (cred.hasFile || cred.hasTextValue);
                const isSelected = selected.includes(cred.id);
                const needsAttention =
                  cred.status === 'pending' || cred.status === 'under_review';

                return (
                  <Fragment key={cred.id}>
                    <tr
                      className={cn(
                        'group/row border-b border-bh-border/60 transition duration-300 last:border-0 hover:bg-bh-teal-soft/20 motion-reduce:transition-none',
                        needsAttention && 'bg-bh-honey-soft/15',
                        isSelected && 'bg-bh-teal-soft/35 hover:bg-bh-teal-soft/40',
                        index === 0 && 'border-t-0',
                      )}
                    >
                      {canReview ? (
                        <td className="px-4 py-4 align-middle sm:px-5">
                          {eligible ? (
                            <SelectCheck
                              checked={isSelected}
                              onChange={() => toggle(cred.id)}
                              label={`Select ${credentialTypeLabel(cred.credential_type)} for package approve`}
                            />
                          ) : (
                            <span
                              className="flex h-6 w-6 items-center justify-center rounded-md border border-dashed border-bh-border/70 bg-bh-subtle/40"
                              title="Not eligible for package approve"
                              aria-hidden
                            />
                          )}
                        </td>
                      ) : null}

                      <td className="px-3 py-4 align-middle">
                        <div className="min-w-0 space-y-1.5">
                          <p className="text-[15px] font-semibold tracking-tight text-bh-text transition-colors group-hover/row:text-bh-teal-strong">
                            {credentialTypeLabel(cred.credential_type)}
                          </p>
                          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-bh-text-muted">
                            <span
                              className={cn(
                                'inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em]',
                                cred.isRequired
                                  ? 'bg-bh-sidebar/8 text-bh-sidebar'
                                  : 'bg-bh-subtle text-bh-text-muted',
                              )}
                            >
                              {cred.isRequired ? 'Required' : 'Optional'}
                            </span>
                            {cred.created_at ? (
                              <span>
                                Submitted {formatDateTime(cred.created_at)}
                              </span>
                            ) : null}
                            {cred.expires_at ? (
                              <span>
                                Expires {formatDateTime(cred.expires_at)}
                              </span>
                            ) : null}
                          </p>
                          {cred.rejection_reason ? (
                            <p className="text-xs font-medium text-bh-danger">
                              Reason: {cred.rejection_reason}
                            </p>
                          ) : null}
                        </div>
                      </td>

                      <td className="px-3 py-4 align-middle">
                        <CredentialStatusBadge status={cred.status} />
                      </td>

                      <td className="px-3 py-4 align-middle">
                        {isText ? (
                          <div className="max-w-[18rem]">
                            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-bh-text-muted">
                              Text field
                            </p>
                            {canViewDocuments && cred.textValue ? (
                              <p className="mt-1.5 break-all rounded-xl border border-bh-border/70 bg-gradient-to-b from-bh-subtle/80 to-white px-3 py-2 font-mono text-[13px] font-semibold leading-5 tracking-wide text-bh-text shadow-[inset_0_1px_0_rgba(255,255,255,0.85)]">
                                {cred.textValue}
                              </p>
                            ) : canViewDocuments &&
                              cred.hasFile &&
                              !cred.hasTextValue ? (
                              <div className="mt-1.5 space-y-2">
                                <p className="text-xs text-bh-text-secondary">
                                  Legacy document on file
                                </p>
                                <OpenCredentialDocumentButton
                                  credentialId={cred.id}
                                />
                              </div>
                            ) : canViewDocuments ? (
                              <p className="mt-1.5 text-xs text-bh-text-secondary">
                                No text value saved yet
                              </p>
                            ) : (
                              <p className="mt-1.5 text-xs text-bh-text-secondary">
                                Restricted for your role
                              </p>
                            )}
                          </div>
                        ) : canViewDocuments && cred.hasFile ? (
                          <OpenCredentialDocumentButton
                            credentialId={cred.id}
                          />
                        ) : (
                          <p className="text-xs text-bh-text-muted">
                            {canViewDocuments
                              ? 'No file uploaded'
                              : 'Restricted'}
                          </p>
                        )}
                      </td>

                      <td className="px-4 py-4 text-right align-middle sm:px-5">
                        <div className="inline-flex flex-wrap items-center justify-end gap-2">
                          {canMarkPending ? (
                            <form action={submitAction}>
                              <input
                                type="hidden"
                                name="credentialId"
                                value={cred.id}
                              />
                              <button
                                type="submit"
                                disabled={submitPending}
                                className="inline-flex h-9 items-center rounded-full border border-bh-border/80 bg-white px-3.5 text-xs font-semibold text-bh-text shadow-sm transition duration-300 hover:-translate-y-0.5 hover:border-bh-teal/40 hover:bg-bh-teal-soft/35 hover:text-bh-teal-strong disabled:pointer-events-none disabled:opacity-50 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
                              >
                                {submitPending ? 'Saving…' : 'Under review'}
                              </button>
                            </form>
                          ) : null}
                          {canAct ? (
                            <>
                              <form action={reviewAction}>
                                <input
                                  type="hidden"
                                  name="credentialId"
                                  value={cred.id}
                                />
                                <input
                                  type="hidden"
                                  name="decision"
                                  value="approve"
                                />
                                <PremiumActionButton disabled={reviewPending}>
                                  {reviewPending ? 'Saving…' : 'Approve'}
                                  <Check className="h-3.5 w-3.5" aria-hidden />
                                </PremiumActionButton>
                              </form>
                              <button
                                type="button"
                                onClick={() =>
                                  setRejectId(
                                    rejectId === cred.id ? null : cred.id,
                                  )
                                }
                                className={cn(
                                  'inline-flex h-9 items-center rounded-full px-3.5 text-xs font-semibold transition duration-300 motion-reduce:transition-none',
                                  rejectId === cred.id
                                    ? 'border border-bh-border bg-white text-bh-text shadow-sm hover:bg-bh-subtle'
                                    : 'bg-bh-danger text-white shadow-[0_8px_16px_rgba(180,35,24,0.22)] hover:-translate-y-0.5 hover:bg-bh-danger/90 motion-reduce:hover:translate-y-0',
                                )}
                              >
                                {rejectId === cred.id ? 'Cancel' : 'Reject'}
                              </button>
                            </>
                          ) : (
                            <span className="text-[11px] font-medium text-bh-text-muted">
                              —
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                    {rejectId === cred.id ? (
                      <tr className="border-b border-bh-border/60 bg-bh-danger-soft/30">
                        <td
                          colSpan={canReview ? 5 : 4}
                          className="px-4 py-4 sm:px-5"
                        >
                          <form
                            action={reviewAction}
                            className="space-y-3 rounded-2xl border border-bh-danger/25 bg-bh-surface px-4 py-3.5 shadow-sm"
                          >
                            <input
                              type="hidden"
                              name="credentialId"
                              value={cred.id}
                            />
                            <input
                              type="hidden"
                              name="decision"
                              value="reject"
                            />
                            <div>
                              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-bh-danger">
                                Rejection
                              </p>
                              <p className="mt-0.5 text-sm font-semibold text-bh-text">
                                Confirm rejection for{' '}
                                {credentialTypeLabel(cred.credential_type)}
                              </p>
                            </div>
                            <label className="block text-sm">
                              <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.12em] text-bh-text-muted">
                                Reason (required)
                              </span>
                              <textarea
                                name="reason"
                                required
                                minLength={1}
                                maxLength={2000}
                                rows={3}
                                className="w-full rounded-xl border border-bh-border/80 bg-white px-3.5 py-2.5 text-sm text-bh-text outline-none transition focus:border-bh-danger focus:ring-2 focus:ring-bh-danger/20"
                                placeholder="Explain what needs to be corrected…"
                              />
                            </label>
                            <Button
                              type="submit"
                              size="sm"
                              variant="destructive"
                              disabled={reviewPending}
                              className="h-9 rounded-full px-4"
                            >
                              Confirm rejection
                            </Button>
                          </form>
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {canReview ? (
        <form
          action={approveAction}
          className="relative overflow-hidden rounded-[1.25rem] border border-bh-border/90 bg-bh-surface shadow-[0_10px_36px_rgba(7,29,48,0.08)]"
        >
          <div
            aria-hidden
            className="h-1.5 bg-gradient-to-r from-bh-sidebar via-bh-teal to-bh-honey"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(640px_220px_at_0%_0%,rgba(7,29,48,0.06),transparent_55%),radial-gradient(520px_200px_at_100%_0%,rgba(22,166,182,0.10),transparent_50%)]"
          />

          <div className="relative space-y-4 p-4 sm:p-5">
            <input type="hidden" name="workerId" value={workerId} />
            <input
              type="hidden"
              name="credentialIds"
              value={selected.join(',')}
            />
            <input
              type="hidden"
              name="confirmReviewed"
              value={confirmReviewed ? 'true' : 'false'}
            />
            {expectedLastActivity ? (
              <input
                type="hidden"
                name="expectedLastActivity"
                value={expectedLastActivity}
              />
            ) : null}

            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex min-w-0 items-start gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-bh-sidebar text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]">
                  <ClipboardCheck className="h-5 w-5" aria-hidden />
                </span>
                <div className="min-w-0">
                  <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-bh-teal-strong">
                    Package decision
                  </p>
                  <p className="mt-1 text-base font-semibold tracking-tight text-bh-text">
                    Approve selected reviewed documents
                  </p>
                  <p className="mt-1 max-w-xl text-xs leading-5 text-bh-text-secondary">
                    Only eligible pending or under-review items with a saved
                    file or text value for this worker. This does not grant
                    marketplace access.
                  </p>
                </div>
              </div>
              <span
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-bold',
                  selected.length > 0
                    ? 'bg-bh-teal-soft text-bh-teal-strong ring-1 ring-bh-teal/25'
                    : 'bg-bh-subtle text-bh-text-muted ring-1 ring-bh-border',
                )}
              >
                <BadgeCheck className="h-3.5 w-3.5" aria-hidden />
                {selected.length} selected
              </span>
            </div>

            <div className="rounded-2xl border border-bh-border/80 bg-bh-subtle/60 px-3.5 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.65)]">
              <div className="flex items-start gap-3 text-sm text-bh-text">
                <div className="pt-0.5">
                  <SelectCheck
                    checked={confirmReviewed}
                    onChange={() => setConfirmReviewed((v) => !v)}
                    label="Confirm reviewed selected items"
                  />
                </div>
                <div className="leading-5">
                  <p className="font-semibold text-bh-text">
                    Review confirmation
                  </p>
                  <p className="mt-0.5 text-bh-text-secondary">
                    I confirm that I reviewed the selected items and that they
                    satisfy the applicable verification requirements.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-bh-border/70 pt-4">
              <p className="inline-flex items-center gap-1.5 text-xs text-bh-text-muted">
                <Shield className="h-3.5 w-3.5 text-bh-teal-strong" aria-hidden />
                Credential approval only · worker status unchanged
              </p>
              <PremiumActionButton
                className="!h-10 !px-5 !text-sm"
                disabled={
                  approvePending || selected.length === 0 || !confirmReviewed
                }
              >
                {approvePending
                  ? 'Approving…'
                  : 'Approve selected reviewed documents'}
                <ArrowRight className="h-3.5 w-3.5 transition duration-300 group-hover/btn:translate-x-0.5" />
              </PremiumActionButton>
            </div>
          </div>
        </form>
      ) : null}
    </div>
  );
}
