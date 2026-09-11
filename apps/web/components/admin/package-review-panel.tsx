'use client';

import { useActionState, useMemo, useState } from 'react';
import {
  eligiblePackageApproveCredentialIds,
} from '@bridge-hive/domain';

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
        <div className="flex flex-wrap items-center gap-2 rounded-md border border-slate-200 bg-slate-50 p-3">
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
              className="rounded-lg border border-slate-200 bg-white p-4"
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
                  <p className="font-medium text-slate-900">
                    {credentialTypeLabel(cred.credential_type)}
                  </p>
                  <p className="text-xs text-slate-500">
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
                <form action={reviewAction} className="mt-3 space-y-2 border-t border-slate-100 pt-3">
                  <input type="hidden" name="credentialId" value={cred.id} />
                  <input type="hidden" name="decision" value="reject" />
                  <label className="block text-sm">
                    <span className="mb-1 block text-slate-600">
                      Rejection reason (required)
                    </span>
                    <textarea
                      name="reason"
                      required
                      minLength={1}
                      maxLength={2000}
                      rows={3}
                      className="w-full rounded-md border border-slate-300 px-3 py-2"
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
          className="space-y-3 rounded-lg border border-amber-200 bg-amber-50 p-4"
        >
          <input type="hidden" name="workerId" value={workerId} />
          <input type="hidden" name="credentialIds" value={selected.join(',')} />
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
          <p className="text-sm font-medium text-slate-900">
            Approve selected reviewed documents
          </p>
          <p className="text-xs text-slate-600">
            Only eligible pending or under-review documents with uploaded files
            for this worker. Does not approve the worker for marketplace access.
          </p>
          <label className="flex items-start gap-2 text-sm text-slate-800">
            <input
              type="checkbox"
              checked={confirmReviewed}
              onChange={(e) => setConfirmReviewed(e.target.checked)}
              className="mt-1"
            />
            <span>
              I confirm that I reviewed the selected documents and that they
              satisfy the applicable verification requirements.
            </span>
          </label>
          <Button
            type="submit"
            disabled={
              approvePending || selected.length === 0 || !confirmReviewed
            }
          >
            Approve selected reviewed documents
          </Button>
        </form>
      ) : null}
    </div>
  );
}
