'use client';

import Link from 'next/link';
import { useActionState, useMemo, useState } from 'react';

import { createOrganizationWithAdminInviteAction } from '@/app/actions/admin-organizations';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import {
  ORGANIZATION_TYPES,
  ORGANIZATION_TYPE_LABELS,
  slugifyOrganizationName,
  type OrganizationType,
} from '@bridge-hive/domain';

type Step = 1 | 2 | 3;

export function CreateOrganizationForm() {
  const [step, setStep] = useState<Step>(1);
  const [state, formAction, isPending] = useActionState(
    createOrganizationWithAdminInviteAction,
    {},
  );
  const requestKey = useMemo(
    () =>
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `req-${Date.now()}`,
    [],
  );

  const [legalName, setLegalName] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [organizationType, setOrganizationType] =
    useState<OrganizationType>('hospital');
  const [billingEmail, setBillingEmail] = useState('');
  const [timezone, setTimezone] = useState('Europe/Nicosia');
  const [adminFullName, setAdminFullName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');

  if (state.success && state.data) {
    const data = state.data as {
      organization_id: string;
      delivery_status?: string;
      raw_token?: string;
      local_dev_link_only?: boolean;
    };
    const invitationUrl =
      data.local_dev_link_only && data.raw_token
        ? `${typeof window !== 'undefined' ? window.location.origin : ''}/organization-invitations/accept?token=${data.raw_token}`
        : null;

    return (
      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="rounded-lg border border-green-200 bg-green-50 p-4">
            <p className="font-medium text-green-900">
              {data.delivery_status === 'sent'
                ? 'Organization created and activation email sent'
                : 'Organization created'}
            </p>
            <p className="mt-1 text-sm text-green-700">
              {data.delivery_status === 'failed'
                ? 'Activation email delivery failed. Open the organization page to retry.'
                : 'The hospital administrator will receive a secure link to create their password.'}
            </p>
            {state.error ? (
              <p className="mt-2 text-sm text-amber-800">{state.error}</p>
            ) : null}
          </div>

          {invitationUrl ? (
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Local development invitation link (shown once)
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={invitationUrl}
                  readOnly
                  className="flex-1 rounded-md border border-slate-300 bg-slate-50 px-3 py-2 font-mono text-sm"
                />
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => navigator.clipboard.writeText(invitationUrl)}
                >
                  Copy
                </Button>
              </div>
            </div>
          ) : null}

          <Button asChild>
            <Link href={`/admin/organizations/${data.organization_id}`}>
              Open organization
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="requestKey" value={requestKey} />
      <input type="hidden" name="slug" value={slugifyOrganizationName(displayName || legalName)} />
      <input type="hidden" name="countryCode" value="CY" />

      <ol className="flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-wide">
        {([1, 2, 3] as const).map((n) => (
          <li
            key={n}
            className={`rounded-full border px-3 py-1 ${
              step === n
                ? 'border-bh-honey bg-bh-honey-soft text-bh-text'
                : 'border-bh-border text-bh-text-muted'
            }`}
          >
            {n === 1 ? 'Organization' : n === 2 ? 'Administrator' : 'Review'}
          </li>
        ))}
      </ol>

      <Card>
        <CardContent className="space-y-4 pt-6">
          {state.error && !state.success ? (
            <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
              {state.error}
            </p>
          ) : null}

          {step === 1 ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="legalName">Legal organization name</Label>
                <Input
                  id="legalName"
                  name="legalName"
                  required
                  value={legalName}
                  onChange={(e) => setLegalName(e.target.value)}
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="displayName">Display name</Label>
                <Input
                  id="displayName"
                  name="displayName"
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="organizationType">Organization type</Label>
                <Select
                  id="organizationType"
                  name="organizationType"
                  value={organizationType}
                  onChange={(e) =>
                    setOrganizationType(e.target.value as OrganizationType)
                  }
                >
                  {ORGANIZATION_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {ORGANIZATION_TYPE_LABELS[t]}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="timezone">Timezone</Label>
                <Input
                  id="timezone"
                  name="timezone"
                  required
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="billingEmail">Billing email</Label>
                <Input
                  id="billingEmail"
                  name="billingEmail"
                  type="email"
                  value={billingEmail}
                  onChange={(e) => setBillingEmail(e.target.value)}
                />
              </div>
            </div>
          ) : null}

          {step === 2 ? (
            <div className="grid gap-4">
              <p className="rounded-xl border border-bh-border bg-bh-subtle/50 px-3 py-2 text-sm text-bh-text-secondary">
                This person will receive a secure link to create their password and
                activate access.
              </p>
              <div className="space-y-2">
                <Label htmlFor="adminFullName">Administrator full name</Label>
                <Input
                  id="adminFullName"
                  name="adminFullName"
                  value={adminFullName}
                  onChange={(e) => setAdminFullName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="adminEmail">Organization Admin email</Label>
                <Input
                  id="adminEmail"
                  name="adminEmail"
                  type="email"
                  required
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                />
              </div>
              <input type="hidden" name="role" value="org_admin" />
              <p className="text-xs text-bh-text-muted">
                Role is fixed to Organization Administrator.
              </p>
              {/* Persist step 1 fields */}
              <input type="hidden" name="legalName" value={legalName} />
              <input type="hidden" name="displayName" value={displayName} />
              <input type="hidden" name="organizationType" value={organizationType} />
              <input type="hidden" name="timezone" value={timezone} />
              <input type="hidden" name="billingEmail" value={billingEmail} />
            </div>
          ) : null}

          {step === 3 ? (
            <div className="space-y-3 text-sm">
              <ReviewRow label="Legal name" value={legalName} />
              <ReviewRow label="Display name" value={displayName} />
              <ReviewRow
                label="Type"
                value={ORGANIZATION_TYPE_LABELS[organizationType]}
              />
              <ReviewRow label="Billing email" value={billingEmail || '—'} />
              <ReviewRow label="Timezone" value={timezone} />
              <ReviewRow label="Administrator" value={adminFullName || '—'} />
              <ReviewRow label="Administrator email" value={adminEmail} />
              <input type="hidden" name="legalName" value={legalName} />
              <input type="hidden" name="displayName" value={displayName} />
              <input type="hidden" name="organizationType" value={organizationType} />
              <input type="hidden" name="timezone" value={timezone} />
              <input type="hidden" name="billingEmail" value={billingEmail} />
              <input type="hidden" name="adminFullName" value={adminFullName} />
              <input type="hidden" name="adminEmail" value={adminEmail} />
            </div>
          ) : null}

          <div className="flex flex-wrap justify-between gap-2 pt-2">
            {step > 1 ? (
              <Button
                type="button"
                variant="ghost"
                onClick={() => setStep((s) => (s === 1 ? 1 : ((s - 1) as Step)))}
                disabled={isPending}
              >
                Back
              </Button>
            ) : (
              <span />
            )}
            {step < 3 ? (
              <Button
                type="button"
                variant="honey"
                onClick={() => {
                  if (step === 1 && (!legalName.trim() || !displayName.trim())) return;
                  if (step === 2 && !adminEmail.trim()) return;
                  setStep((s) => (s === 3 ? 3 : ((s + 1) as Step)));
                }}
              >
                Continue
              </Button>
            ) : (
              <Button type="submit" variant="honey" disabled={isPending}>
                {isPending
                  ? 'Creating…'
                  : 'Create organization and send activation'}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </form>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-bh-border/60 py-2">
      <span className="text-bh-text-muted">{label}</span>
      <span className="font-medium text-bh-text">{value}</span>
    </div>
  );
}
