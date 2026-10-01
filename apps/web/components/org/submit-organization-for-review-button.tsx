'use client';

import { useActionState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

import {
  submitOrganizationForReviewAction,
  type ActionResult,
} from '@/app/actions/organization-onboarding';
import { Button } from '@/components/ui/button';
import type { SettingsOrgDetail } from '@/components/org/organization-settings-view';

/**
 * Verification-tab primary CTA: submits the already-saved profile for review.
 * Does not approve the organization — only transitions via server RPC.
 */
export function SubmitOrganizationForReviewButton({
  organizationId,
  orgDetail,
  label = 'Submit for review',
}: {
  organizationId: string;
  orgDetail: SettingsOrgDetail;
  label?: string;
}) {
  const router = useRouter();
  const submittedRef = useRef(false);
  const [state, action, pending] = useActionState(
    submitOrganizationForReviewAction,
    {} as ActionResult,
  );

  useEffect(() => {
    if (state.success) {
      submittedRef.current = true;
      router.refresh();
    }
  }, [state.success, router]);

  const busy = pending || submittedRef.current;

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="organizationId" value={organizationId} />
      <input type="hidden" name="legalName" value={orgDetail.legal_name} />
      <input type="hidden" name="displayName" value={orgDetail.display_name} />
      <input
        type="hidden"
        name="organizationType"
        value={orgDetail.organization_type ?? ''}
      />
      <input
        type="hidden"
        name="addressLine1"
        value={orgDetail.address_line1 ?? ''}
      />
      <input
        type="hidden"
        name="addressLine2"
        value={orgDetail.address_line2 ?? ''}
      />
      <input type="hidden" name="city" value={orgDetail.city ?? ''} />
      <input
        type="hidden"
        name="postalCode"
        value={orgDetail.postal_code ?? ''}
      />
      <input type="hidden" name="countryCode" value={orgDetail.country_code} />
      <input
        type="hidden"
        name="taxVat"
        value={orgDetail.tax_vat_number ?? ''}
      />
      <input
        type="hidden"
        name="billingEmail"
        value={orgDetail.billing_email ?? ''}
      />
      <input
        type="hidden"
        name="primaryContactName"
        value={orgDetail.primary_contact_name ?? ''}
      />
      <input
        type="hidden"
        name="primaryContactEmail"
        value={orgDetail.primary_contact_email ?? ''}
      />

      {state.error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-900">
          {state.error}
        </div>
      ) : null}
      {state.success ? (
        <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-900">
          Organization submitted for review. Bridge Hive will notify you when a
          decision is made.
        </div>
      ) : null}

      <Button type="submit" disabled={busy} className="w-full sm:w-auto">
        {pending ? 'Submitting...' : label}
      </Button>
    </form>
  );
}
