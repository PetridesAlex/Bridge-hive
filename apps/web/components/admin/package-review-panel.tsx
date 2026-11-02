'use client';

import { useActionState, useMemo, useState } from 'react';
import {
  eligiblePackageApproveCredentialIds,
} from '@bridge-hive/domain';
import { BadgeCheck, ClipboardCheck, Shield } from 'lucide-react';

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
  isRequired: boolean;
};

const initial: AdminActionResult = {};

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

  const actionError =
    approveState.error ||
    markState.error ||
    reviewState.error ||
    submitState.error;

  return (
    <div className="space-y-4">
      {actionError ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {actionError}
        </p>
      ) : null}

      {canReview ? (
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-bh-border bg-bh-subtle/50 p-3">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setSelected(eligibleIds)}
          >
            Select all eligible
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => setSelected([])}
          >
            Clear selection
          </Button>
          <form action={markAction}>
            <input type="hidden" name="workerId" value={workerId} />
            <input
              type="hidden"
              name="credentialIds"
              value={selected.join(',')}
            />
            <Button
              type="submit"
              size="sm"
              variant="secondary"
              disabled={markPending || selected.length === 0}
            >
              Mark selected under review
            </Button>
          </form>
        </div>
      ) : null}

      <ul className="space-y-3">
        {credentials.map((cred) => {
          const eligible = eligibleIds.includes(cred.id);
          return (
            <li
              key={cred.id}
              className="rounded-2xl border border-bh-border bg-bh-surface p-4 shadow-[0_4px_16px_rgba(7,29,48,0.04)]"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1">
                  {canReview && eligible ? (
                    <label className="mb-1 flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={selected.includes(cred.id)}
                        onChange={() => toggle(cred.id)}
                      />
                      Select for package approve
                    </label>
                  ) : null}
                  <p className="font-semibold text-bh-text">
                    {credentialTypeLabel(cred.credential_type)}
                  </p>
                  <p className="text-xs text-bh-text-muted">
                    {cred.isRequired ? 'Required' : 'Optional'}
                    {cred.created_at
                      ? ` · Submitted ${formatDateTime(cred.created_at)}`
                      : ''}
                    {cred.expires_at
                      ? ` · Expires ${formatDateTime(cred.expires_at)}`
                      : ''}
                  </p>
                  <div className="pt-1">
                    <CredentialStatusBadge status={cred.status} />
                  </div>
                  {cred.rejection_reason ? (
                    <p className="text-sm text-red-700">
                      Reason: {cred.rejection_reason}
                    </p>
                  ) : null}
                </div>
                <div className="flex flex-wrap gap-2">
                  {canViewDocuments && cred.hasFile ? (
                    <OpenCredentialDocumentButton credentialId={cred.id} />
                  ) : null}
                  {canReview && cred.status === 'pending' && cred.hasFile ? (
                    <form action={submitAction}>
                      <input
                        type="hidden"
                        name="credentialId"
                        value={cred.id}
                      />
                      <Button type="submit" size="sm" variant="secondary" disabled={submitPending}>
                        Under review
                      </Button>
                    </form>
                  ) : null}
                  {canReview &&
                  (cred.status === 'pending' || cred.status === 'under_review') &&
                  cred.hasFile ? (
                    <>
                      <form action={reviewAction}>
                        <input
                          type="hidden"
                          name="credentialId"
                          value={cred.id}
                        />
                        <input type="hidden" name="decision" value="approve" />
                        <Button type="submit" size="sm" disabled={reviewPending}>
                          Approve
                        </Button>
                      </form>
                      <Button
                        type="button"
                        size="sm"
                        variant="destructive"
                        onClick={() =>
                          setRejectId(rejectId === cred.id ? null : cred.id)
                        }
                      >
                        Reject
                      </Button>
                    </>
                  ) : null}
                </div>
              </div>
              {rejectId === cred.id ? (
                <form action={reviewAction} className="mt-3 space-y-2 border-t border-bh-border pt-3">
                  <input type="hidden" name="credentialId" value={cred.id} />
                  <input type="hidden" name="decision" value="reject" />
                  <label className="block text-sm">
                    <span className="mb-1 block text-bh-text-secondary">
                      Rejection reason (required)
                    </span>
                    <textarea
                      name="reason"
                      required
                      minLength={1}
                      maxLength={2000}
                      rows={3}
                      className="w-full rounded-xl border border-bh-border px-3 py-2"
                    />
                  </label>
                  <Button type="submit" size="sm" variant="destructive" disabled={reviewPending}>
                    Confirm rejection
                  </Button>
                </form>
              ) : null}
            </li>
          );
        })}
      </ul>

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
                    Only eligible pending or under-review documents with uploaded
                    files for this worker. This does not grant marketplace access.
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
              <label className="flex cursor-pointer items-start gap-3 text-sm text-bh-text">
                <input
                  type="checkbox"
                  checked={confirmReviewed}
                  onChange={(e) => setConfirmReviewed(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-bh-border text-bh-teal focus:ring-bh-teal/30"
                />
                <span className="leading-5">
                  <span className="font-semibold text-bh-text">
                    Review confirmation
                  </span>
                  <span className="mt-0.5 block text-bh-text-secondary">
                    I confirm that I reviewed the selected documents and that they
                    satisfy the applicable verification requirements.
                  </span>
                </span>
              </label>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-bh-border/70 pt-4">
              <p className="inline-flex items-center gap-1.5 text-xs text-bh-text-muted">
                <Shield className="h-3.5 w-3.5 text-bh-teal-strong" aria-hidden />
                Credential approval only · worker status unchanged
              </p>
              <Button
                type="submit"
                className="h-10 rounded-full bg-bh-sidebar px-5 shadow-[0_8px_18px_rgba(7,29,48,0.22)] hover:bg-bh-sidebar-raised"
                disabled={
                  approvePending || selected.length === 0 || !confirmReviewed
                }
              >
                Approve selected reviewed documents
              </Button>
            </div>
          </div>
        </form>
      ) : null}
    </div>
  );
}
