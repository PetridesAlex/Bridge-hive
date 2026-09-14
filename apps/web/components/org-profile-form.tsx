'use client';

import {
  formatOrgProfileIncompleteMessage,
  missingOrgProfileRequiredLabels,
  ORG_PROFILE_REQUIRED_FIELDS,
} from '@bridge-hive/domain';
import { useRouter } from 'next/navigation';
import { useActionState, useEffect, useRef, useState } from 'react';

import {
  submitOrganizationForReviewAction,
  updateOrganizationProfileAction,
  type ActionResult,
} from '@/app/actions/organization-onboarding';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const REQUIRED_FORM_NAMES = new Set(
  ORG_PROFILE_REQUIRED_FIELDS.map((field) => field.formName),
);

function RequiredMark() {
  return (
    <span className="ml-0.5 text-red-600" aria-hidden="true">
      *
    </span>
  );
}

function FieldLabel({
  htmlFor,
  children,
  required,
}: {
  htmlFor?: string;
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <span className="mb-1 block font-medium text-slate-700">
      <label htmlFor={htmlFor}>
        {children}
        {required ? <RequiredMark /> : null}
      </label>
    </span>
  );
}

export function OrgProfileForm({
  organizationId,
  initialData,
  canSubmitForReview,
  readOnly = false,
}: {
  organizationId: string;
  initialData: {
    legal_name: string;
    display_name: string;
    organization_type: string | null;
    address_line1: string | null;
    address_line2: string | null;
    city: string | null;
    postal_code: string | null;
    country_code: string;
    tax_vat_number: string | null;
    billing_email: string | null;
    primary_contact_name: string | null;
    primary_contact_email: string | null;
  };
  canSubmitForReview: boolean;
  readOnly?: boolean;
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [clientError, setClientError] = useState<string | null>(null);
  const [invalidFields, setInvalidFields] = useState<string[]>([]);
  const submittedRef = useRef(false);

  const [updateState, updateAction, isUpdating] = useActionState(
    updateOrganizationProfileAction,
    {} as ActionResult,
  );
  const [submitState, submitAction, isSubmitting] = useActionState(
    submitOrganizationForReviewAction,
    {} as ActionResult,
  );

  const busy = isUpdating || isSubmitting || submittedRef.current;

  useEffect(() => {
    if (updateState.success) {
      router.refresh();
    }
  }, [updateState.success, router]);

  useEffect(() => {
    if (submitState.success) {
      submittedRef.current = true;
      router.refresh();
    }
  }, [submitState.success, router]);

  function collectRequiredValues(form: HTMLFormElement) {
    const data = new FormData(form);
    return {
      legalName: String(data.get('legalName') ?? ''),
      displayName: String(data.get('displayName') ?? ''),
      primaryContactName: String(data.get('primaryContactName') ?? ''),
      primaryContactEmail: String(data.get('primaryContactEmail') ?? ''),
    };
  }

  function validateBeforeSubmit(event: React.MouseEvent<HTMLButtonElement>) {
    const form = formRef.current;
    if (!form) return;

    const values = collectRequiredValues(form);
    const missing = missingOrgProfileRequiredLabels(values);
    if (missing.length === 0) {
      setClientError(null);
      setInvalidFields([]);
      return;
    }

    event.preventDefault();
    setClientError(formatOrgProfileIncompleteMessage(missing));
    setInvalidFields(
      ORG_PROFILE_REQUIRED_FIELDS.filter((field) =>
        missing.includes(field.label),
      ).map((field) => field.formName),
    );

    const first = ORG_PROFILE_REQUIRED_FIELDS.find((field) =>
      missing.includes(field.label),
    );
    if (first) {
      const el = form.elements.namedItem(first.formName);
      if (el instanceof HTMLElement) {
        el.focus();
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }

  if (readOnly) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Organization profile</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
          {submitState.success ? (
            <div className="sm:col-span-2 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-900">
              Organization submitted for review.
            </div>
          ) : null}
          <div>
            <p className="text-slate-500">Legal name</p>
            <p className="font-medium">{initialData.legal_name}</p>
          </div>
          <div>
            <p className="text-slate-500">Display name</p>
            <p className="font-medium">{initialData.display_name}</p>
          </div>
          <div>
            <p className="text-slate-500">Organization type</p>
            <p className="font-medium">
              {initialData.organization_type?.replaceAll('_', ' ') ?? '—'}
            </p>
          </div>
          <div>
            <p className="text-slate-500">Contact name</p>
            <p className="font-medium">
              {initialData.primary_contact_name ?? '—'}
            </p>
          </div>
          <div>
            <p className="text-slate-500">Contact email</p>
            <p className="font-medium">
              {initialData.primary_contact_email ?? '—'}
            </p>
          </div>
          <div>
            <p className="text-slate-500">Billing email</p>
            <p className="font-medium">{initialData.billing_email ?? '—'}</p>
          </div>
          <div>
            <p className="text-slate-500">Address line 1</p>
            <p className="font-medium">{initialData.address_line1 ?? '—'}</p>
          </div>
          <div>
            <p className="text-slate-500">Address line 2</p>
            <p className="font-medium">{initialData.address_line2 ?? '—'}</p>
          </div>
          <div>
            <p className="text-slate-500">City</p>
            <p className="font-medium">{initialData.city ?? '—'}</p>
          </div>
          <div>
            <p className="text-slate-500">Postal code</p>
            <p className="font-medium">{initialData.postal_code ?? '—'}</p>
          </div>
          <div>
            <p className="text-slate-500">Country code</p>
            <p className="font-medium">{initialData.country_code}</p>
          </div>
          <div>
            <p className="text-slate-500">Tax/VAT number</p>
            <p className="font-medium">{initialData.tax_vat_number ?? '—'}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const inputClass = (name: string) =>
    [
      'w-full rounded-md border px-3 py-2',
      invalidFields.includes(name)
        ? 'border-red-500 ring-1 ring-red-500'
        : 'border-slate-300',
    ].join(' ');

  const serverError = updateState.error ?? submitState.error ?? null;
  const displayError = clientError ?? serverError;
  const safeError =
    displayError && displayError.includes('ORG_PROFILE_INCOMPLETE')
      ? formatOrgProfileIncompleteMessage()
      : displayError;

  return (
    <form ref={formRef} className="space-y-6">
      <input type="hidden" name="organizationId" value={organizationId} />
      <Card>
        <CardHeader>
          <CardTitle>Organization profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="text-sm">
              <FieldLabel htmlFor="legalName" required={REQUIRED_FORM_NAMES.has('legalName')}>
                Legal name
              </FieldLabel>
              <input
                id="legalName"
                type="text"
                name="legalName"
                defaultValue={initialData.legal_name}
                maxLength={200}
                required
                aria-required="true"
                className={inputClass('legalName')}
              />
            </div>
            <div className="text-sm">
              <FieldLabel
                htmlFor="displayName"
                required={REQUIRED_FORM_NAMES.has('displayName')}
              >
                Display name
              </FieldLabel>
              <input
                id="displayName"
                type="text"
                name="displayName"
                defaultValue={initialData.display_name}
                maxLength={200}
                required
                aria-required="true"
                className={inputClass('displayName')}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="text-sm">
              <FieldLabel htmlFor="organizationType">Organization type</FieldLabel>
              <select
                id="organizationType"
                name="organizationType"
                defaultValue={initialData.organization_type ?? ''}
                className={inputClass('organizationType')}
              >
                <option value="">Select type</option>
                <option value="hospital">Hospital</option>
                <option value="clinic">Clinic</option>
                <option value="nursing_home">Nursing home</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="text-sm">
              <FieldLabel
                htmlFor="primaryContactName"
                required={REQUIRED_FORM_NAMES.has('primaryContactName')}
              >
                Contact name
              </FieldLabel>
              <input
                id="primaryContactName"
                type="text"
                name="primaryContactName"
                defaultValue={initialData.primary_contact_name ?? ''}
                maxLength={120}
                required
                aria-required="true"
                className={inputClass('primaryContactName')}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="text-sm">
              <FieldLabel htmlFor="addressLine1">Address line 1</FieldLabel>
              <input
                id="addressLine1"
                type="text"
                name="addressLine1"
                defaultValue={initialData.address_line1 ?? ''}
                maxLength={200}
                className={inputClass('addressLine1')}
              />
            </div>
            <div className="text-sm">
              <FieldLabel htmlFor="addressLine2">Address line 2</FieldLabel>
              <input
                id="addressLine2"
                type="text"
                name="addressLine2"
                defaultValue={initialData.address_line2 ?? ''}
                maxLength={200}
                className={inputClass('addressLine2')}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="text-sm">
              <FieldLabel htmlFor="city">City</FieldLabel>
              <input
                id="city"
                type="text"
                name="city"
                defaultValue={initialData.city ?? ''}
                maxLength={120}
                className={inputClass('city')}
              />
            </div>
            <div className="text-sm">
              <FieldLabel htmlFor="postalCode">Postal code</FieldLabel>
              <input
                id="postalCode"
                type="text"
                name="postalCode"
                defaultValue={initialData.postal_code ?? ''}
                maxLength={32}
                className={inputClass('postalCode')}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="text-sm">
              <FieldLabel htmlFor="countryCode">Country code</FieldLabel>
              <input
                id="countryCode"
                type="text"
                name="countryCode"
                defaultValue={initialData.country_code}
                maxLength={2}
                className={inputClass('countryCode')}
              />
            </div>
            <div className="text-sm">
              <FieldLabel htmlFor="taxVat">Tax/VAT number</FieldLabel>
              <input
                id="taxVat"
                type="text"
                name="taxVat"
                defaultValue={initialData.tax_vat_number ?? ''}
                maxLength={64}
                className={inputClass('taxVat')}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="text-sm">
              <FieldLabel htmlFor="billingEmail">Billing email</FieldLabel>
              <input
                id="billingEmail"
                type="email"
                name="billingEmail"
                defaultValue={initialData.billing_email ?? ''}
                className={inputClass('billingEmail')}
              />
            </div>
            <div className="text-sm">
              <FieldLabel
                htmlFor="primaryContactEmail"
                required={REQUIRED_FORM_NAMES.has('primaryContactEmail')}
              >
                Contact email
              </FieldLabel>
              <input
                id="primaryContactEmail"
                type="email"
                name="primaryContactEmail"
                defaultValue={initialData.primary_contact_email ?? ''}
                required
                aria-required="true"
                className={inputClass('primaryContactEmail')}
              />
            </div>
          </div>

          {safeError ? (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-900">
              {safeError}
            </div>
          ) : null}
          {updateState.success && !submitState.success ? (
            <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-900">
              Profile updated successfully.
            </div>
          ) : null}
          {submitState.success ? (
            <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-900">
              Organization submitted for review.
            </div>
          ) : null}

          <div className="flex flex-wrap gap-3">
            <Button type="submit" formAction={updateAction} disabled={busy}>
              {isUpdating ? 'Saving...' : 'Save changes'}
            </Button>
            {canSubmitForReview ? (
              <Button
                type="submit"
                formAction={submitAction}
                disabled={busy}
                onClick={validateBeforeSubmit}
              >
                {isSubmitting ? 'Submitting...' : 'Submit for review'}
              </Button>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
