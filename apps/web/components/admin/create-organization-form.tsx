'use client';

import { ArrowRight, Building2, Check, Mail } from 'lucide-react';
import Link from 'next/link';
import { useActionState, useMemo, useState } from 'react';

import { createOrganizationWithAdminInviteAction } from '@/app/actions/admin-organizations';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import {
  ORGANIZATION_TYPES,
  ORGANIZATION_TYPE_LABELS,
  slugifyOrganizationName,
  type OrganizationType,
} from '@bridge-hive/domain';

type Step = 1 | 2 | 3;

const STEPS: Array<{ n: Step; label: string; hint: string }> = [
  { n: 1, label: 'Organization', hint: 'Name and type' },
  { n: 2, label: 'Administrator', hint: 'Who receives access' },
  { n: 3, label: 'Review', hint: 'Confirm and send' },
];

const fieldClass =
  'h-11 rounded-xl border-bh-border bg-white px-3.5 shadow-sm focus-visible:border-bh-sidebar focus-visible:ring-bh-honey/40';

export function CreateOrganizationForm() {
  const [step, setStep] = useState<Step>(1);
  const [stepError, setStepError] = useState<string | null>(null);
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

  function goTo(next: Step) {
    setStepError(null);
    setStep(next);
  }

  function continueStep() {
    if (step === 1 && (!legalName.trim() || !displayName.trim())) {
      setStepError('Enter the legal name and display name to continue.');
      return;
    }
    if (step === 2 && !adminEmail.trim()) {
      setStepError('Enter the administrator email to continue.');
      return;
    }
    goTo((step + 1) as Step);
  }

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
    const sent = data.delivery_status === 'sent';
    const failed = data.delivery_status === 'failed';

    return (
      <section className="bh-fade-up overflow-hidden rounded-2xl border border-bh-border bg-bh-surface shadow-[0_8px_28px_rgba(7,29,48,0.06)]">
        <div className="border-b border-white/10 bg-bh-sidebar px-6 py-5 text-white">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-bh-honey">
            {sent ? 'Activation sent' : 'Organization created'}
          </p>
          <h3 className="mt-1 text-lg font-semibold tracking-tight">
            {sent
              ? 'The administrator can set a password from the email'
              : 'The organization is in pending status'}
          </h3>
        </div>
        <div className="space-y-4 p-6">
          <p className="text-sm leading-6 text-bh-text-secondary">
            {failed
              ? 'Activation email delivery failed. Open the organization page to retry.'
              : 'The hospital administrator will receive a secure link to create their password.'}
          </p>
          {state.error ? (
            <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              {state.error}
            </p>
          ) : null}

          {invitationUrl ? (
            <div>
              <label className="mb-1.5 block text-sm font-medium text-bh-text">
                Local development invitation link (shown once)
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={invitationUrl}
                  readOnly
                  className="h-11 flex-1 rounded-xl border border-bh-border bg-bh-subtle/60 px-3 font-mono text-sm text-bh-text"
                />
                <Button
                  type="button"
                  variant="secondary"
                  className="h-11 rounded-xl"
                  onClick={() => navigator.clipboard.writeText(invitationUrl)}
                >
                  Copy
                </Button>
              </div>
            </div>
          ) : null}

          <Button asChild className="h-11 rounded-full px-5">
            <Link href={`/admin/organizations/${data.organization_id}`}>
              Open organization
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </Button>
        </div>
      </section>
    );
  }

  const stepMeta = STEPS[step - 1];

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="requestKey" value={requestKey} />
      <input type="hidden" name="slug" value={slugifyOrganizationName(displayName || legalName)} />
      <input type="hidden" name="countryCode" value="CY" />

      <ol className="grid grid-cols-3 gap-2 sm:gap-3" aria-label="Create organization steps">
        {STEPS.map((item) => {
          const done = item.n < step;
          const current = item.n === step;
          return (
            <li key={item.n}>
              <button
                type="button"
                disabled={item.n > step}
                onClick={() => {
                  if (item.n < step) goTo(item.n);
                }}
                aria-current={current ? 'step' : undefined}
                className={cn(
                  'flex w-full items-center gap-2.5 rounded-2xl border px-3 py-2.5 text-left transition',
                  current &&
                    'border-bh-sidebar bg-bh-sidebar text-white shadow-[0_10px_24px_rgba(7,29,48,0.22)]',
                  done &&
                    'border-bh-border bg-white text-bh-text hover:border-bh-sidebar/30',
                  !current &&
                    !done &&
                    'cursor-default border-bh-border bg-bh-subtle/50 text-bh-text-muted',
                )}
              >
                <span
                  className={cn(
                    'flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-sm font-bold',
                    current && 'bg-bh-honey text-bh-sidebar',
                    done && 'bg-bh-sidebar text-white',
                    !current && !done && 'bg-white text-bh-text-muted ring-1 ring-bh-border',
                  )}
                >
                  {done ? <Check className="h-4 w-4" aria-hidden /> : item.n}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold">{item.label}</span>
                  <span
                    className={cn(
                      'hidden truncate text-[11px] sm:block',
                      current ? 'text-white/70' : 'text-bh-text-muted',
                    )}
                  >
                    {item.hint}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>

      <section className="overflow-hidden rounded-2xl border border-bh-border bg-bh-surface shadow-[0_8px_28px_rgba(7,29,48,0.06)]">
        <div className="flex items-start justify-between gap-4 border-b border-bh-border px-5 py-4 sm:px-6">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-bh-honey-strong">
              Step {step} of 3
            </p>
            <h3 className="mt-1 text-lg font-semibold tracking-tight text-bh-text">
              {stepMeta.label}
            </h3>
            <p className="mt-1 text-sm text-bh-text-secondary">
              {step === 1
                ? 'The legal name is the registered organization. The display name is what operators see.'
                : step === 2
                  ? 'This person will receive a secure link to create their password and activate access.'
                  : 'Confirm the details. Creating the organization sends the activation immediately.'}
            </p>
          </div>
          <span className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-bh-honey text-bh-sidebar sm:flex">
            {step === 2 ? (
              <Mail className="h-5 w-5" aria-hidden />
            ) : step === 3 ? (
              <Check className="h-5 w-5" aria-hidden />
            ) : (
              <Building2 className="h-5 w-5" aria-hidden />
            )}
          </span>
        </div>

        <div key={step} className="bh-fade-up space-y-4 p-5 sm:p-6">
          {state.error && !state.success ? (
            <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
              {state.error}
            </p>
          ) : null}
          {stepError ? (
            <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
              {stepError}
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
                  className={fieldClass}
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
                  className={fieldClass}
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
                  className={fieldClass}
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
                  className={fieldClass}
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
                  className={fieldClass}
                />
              </div>
            </div>
          ) : null}

          {step === 2 ? (
            <div className="grid gap-4">
              <div className="space-y-2">
                <Label htmlFor="adminFullName">Administrator full name</Label>
                <Input
                  id="adminFullName"
                  name="adminFullName"
                  value={adminFullName}
                  onChange={(e) => setAdminFullName(e.target.value)}
                  className={fieldClass}
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
                  className={fieldClass}
                />
              </div>
              <input type="hidden" name="role" value="org_admin" />
              <p className="rounded-xl border border-bh-border bg-bh-subtle/60 px-3.5 py-2.5 text-xs text-bh-text-secondary">
                Role is fixed to Organization Administrator.
              </p>
              <input type="hidden" name="legalName" value={legalName} />
              <input type="hidden" name="displayName" value={displayName} />
              <input type="hidden" name="organizationType" value={organizationType} />
              <input type="hidden" name="timezone" value={timezone} />
              <input type="hidden" name="billingEmail" value={billingEmail} />
            </div>
          ) : null}

          {step === 3 ? (
            <div className="space-y-5 text-sm">
              <ReviewGroup
                title="Organization"
                rows={[
                  ['Legal name', legalName],
                  ['Display name', displayName],
                  ['Type', ORGANIZATION_TYPE_LABELS[organizationType]],
                  ['Billing email', billingEmail || '—'],
                  ['Timezone', timezone],
                ]}
              />
              <ReviewGroup
                title="Administrator"
                rows={[
                  ['Name', adminFullName || '—'],
                  ['Email', adminEmail],
                  ['Role', 'Organization Administrator'],
                ]}
              />
              <input type="hidden" name="legalName" value={legalName} />
              <input type="hidden" name="displayName" value={displayName} />
              <input type="hidden" name="organizationType" value={organizationType} />
              <input type="hidden" name="timezone" value={timezone} />
              <input type="hidden" name="billingEmail" value={billingEmail} />
              <input type="hidden" name="adminFullName" value={adminFullName} />
              <input type="hidden" name="adminEmail" value={adminEmail} />
              <input type="hidden" name="role" value="org_admin" />
            </div>
          ) : null}

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-bh-border pt-4">
            {step > 1 ? (
              <Button
                type="button"
                variant="outline"
                className="h-11 rounded-full px-5"
                onClick={() => goTo((step - 1) as Step)}
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
                className="h-11 rounded-full px-5"
                onClick={continueStep}
              >
                Continue
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Button>
            ) : (
              <Button
                type="submit"
                variant="honey"
                className="h-11 rounded-full px-5 font-semibold"
                disabled={isPending}
              >
                {isPending
                  ? 'Creating…'
                  : 'Create organization and send activation'}
              </Button>
            )}
          </div>
        </div>
      </section>
    </form>
  );
}

function ReviewGroup({
  title,
  rows,
}: {
  title: string;
  rows: Array<[string, string]>;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-bh-border">
      <p className="border-b border-bh-border bg-bh-subtle/70 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.14em] text-bh-text-muted">
        {title}
      </p>
      <dl>
        {rows.map(([label, value]) => (
          <div
            key={label}
            className="flex items-baseline justify-between gap-4 border-b border-bh-border/70 px-4 py-2.5 last:border-b-0"
          >
            <dt className="text-bh-text-muted">{label}</dt>
            <dd className="text-right font-medium text-bh-text">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
