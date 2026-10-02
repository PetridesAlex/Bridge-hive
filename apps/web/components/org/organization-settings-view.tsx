'use client';

import {
  BadgeCheck,
  Building2,
  CreditCard,
  ImageIcon,
  Shield,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useId, useState } from 'react';

import {
  ORGANIZATION_TYPE_LABELS,
  ORG_STATUS_LABELS,
  orgPendingSubmitMessage,
  orgProfileCompleteness,
  orgRoleExplanation,
  orgSubmitCtaLabel,
  type OrganizationType,
  type OrgRole,
  type OrgStatus,
} from '@bridge-hive/domain';
import { OrganizationBrandingPanel } from '@/components/org/organization-branding-panel';
import { OrgMark } from '@/components/org/org-mark';
import { OrgProfileForm } from '@/components/org-profile-form';
import { SubmitOrganizationForReviewButton } from '@/components/org/submit-organization-for-review-button';
import { Button } from '@/components/ui/button';
import { roleLabel } from '@/lib/format';
import { cn } from '@/lib/utils';

const SECTIONS = [
  { id: 'profile', label: 'Profile', icon: Building2 },
  { id: 'branding', label: 'Branding', icon: ImageIcon },
  { id: 'members', label: 'Members & access', icon: Users },
  { id: 'billing', label: 'Billing contact', icon: CreditCard },
  { id: 'verification', label: 'Verification', icon: Shield },
] as const;

type SectionId = (typeof SECTIONS)[number]['id'];
type FieldState = 'Editable' | 'Read only' | 'Requires review';

export type SettingsOrgDetail = {
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
  registration_number?: string | null;
  timezone?: string | null;
  logo_path?: string | null;
  submitted_at?: string | null;
  reviewed_at?: string | null;
  status_reason?: string | null;
};

const STATE_STYLES: Record<FieldState, string> = {
  Editable: 'border-bh-teal/25 bg-bh-teal-soft text-bh-teal-strong',
  'Read only': 'border-bh-border bg-bh-subtle text-bh-text-secondary',
  'Requires review': 'border-bh-warning/25 bg-bh-warning-soft text-bh-warning',
};

function FieldMeta({
  label,
  value,
  help,
  state,
}: {
  label: string;
  value: string;
  help?: string;
  state: FieldState;
}) {
  return (
    <div className="rounded-xl border border-bh-border/80 bg-bh-subtle/40 p-4 transition-colors hover:border-bh-border-strong hover:bg-bh-subtle/70">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-bh-text-muted">
          {label}
        </p>
        <span
          className={cn(
            'inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
            STATE_STYLES[state],
          )}
        >
          {state}
        </span>
      </div>
      <p className="mt-2 text-sm font-semibold leading-6 text-bh-text">{value || '—'}</p>
      {help ? <p className="mt-1.5 text-xs leading-5 text-bh-text-muted">{help}</p> : null}
    </div>
  );
}

function Panel({
  title,
  description,
  children,
  action,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-bh-border bg-bh-surface shadow-[0_1px_2px_rgba(7,29,48,0.04)]">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-bh-border/70 bg-gradient-to-b from-bh-subtle/70 to-bh-surface px-5 py-4 sm:px-6">
        <div className="min-w-0">
          <h3 className="text-base font-semibold text-bh-text">{title}</h3>
          {description ? (
            <p className="mt-1 max-w-2xl text-sm text-bh-text-secondary">{description}</p>
          ) : null}
        </div>
        {action}
      </div>
      <div className="p-5 sm:p-6">{children}</div>
    </section>
  );
}

function statusTone(status: OrgStatus): string {
  switch (status) {
    case 'active':
      return 'border-bh-success/40 bg-bh-success text-white shadow-[0_4px_12px_rgba(25,135,84,0.28)]';
    case 'under_review':
      return 'border-bh-info/40 bg-bh-info text-white shadow-[0_4px_12px_rgba(23,105,170,0.28)]';
    case 'rejected':
    case 'suspended':
      return 'border-bh-warning/40 bg-bh-warning text-white shadow-[0_4px_12px_rgba(165,104,0,0.28)]';
    case 'closed':
      return 'border-bh-danger/40 bg-bh-danger text-white shadow-[0_4px_12px_rgba(180,35,24,0.28)]';
    default:
      return 'border-bh-border-strong bg-bh-subtle text-bh-text shadow-sm';
  }
}

export function OrganizationSettingsView({
  slug,
  organizationId,
  status,
  role,
  timezone,
  orgDetail,
  logoUrl,
  canEditProfile,
  canSubmitForReview,
  canManageBranding,
}: {
  slug: string;
  organizationId: string;
  status: OrgStatus;
  role: OrgRole;
  timezone: string;
  orgDetail: SettingsOrgDetail | null;
  logoUrl: string | null;
  canEditProfile: boolean;
  canSubmitForReview: boolean;
  canManageBranding: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab');
  const initial: SectionId =
    SECTIONS.some((s) => s.id === tabParam) ? (tabParam as SectionId) : 'profile';
  const [section, setSection] = useState<SectionId>(initial);
  const tabsId = useId();

  useEffect(() => {
    if (SECTIONS.some((s) => s.id === tabParam)) {
      setSection(tabParam as SectionId);
    }
  }, [tabParam]);

  function selectSection(id: SectionId) {
    setSection(id);
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', id);
    router.replace(`/org/${slug}/settings?${params.toString()}`, { scroll: false });
  }

  const displayName = orgDetail?.display_name ?? 'Organization';
  const completeness = orgProfileCompleteness({
    legalName: orgDetail?.legal_name,
    displayName: orgDetail?.display_name,
    primaryContactName: orgDetail?.primary_contact_name,
    primaryContactEmail: orgDetail?.primary_contact_email,
  });
  const profileComplete = completeness.complete === completeness.total;
  const pendingSubmitHint = orgPendingSubmitMessage({
    status,
    profileComplete,
  });
  const submitCta = orgSubmitCtaLabel({ status, profileComplete });

  const typeLabel = orgDetail?.organization_type
    ? ORGANIZATION_TYPE_LABELS[orgDetail.organization_type as OrganizationType] ??
      orgDetail.organization_type
    : 'Organization';

  const legalEditState: FieldState = canEditProfile
    ? 'Editable'
    : status === 'active'
      ? 'Requires review'
      : 'Read only';

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-2xl border border-bh-border bg-bh-surface shadow-[0_1px_2px_rgba(7,29,48,0.04)]">
        <div className="relative overflow-hidden bg-gradient-to-br from-bh-teal-soft/70 via-bh-surface to-bh-honey-soft/45 px-5 py-6 sm:px-6 sm:py-7">
          <div
            className="pointer-events-none absolute -right-8 -top-10 h-36 w-36 rounded-full bg-bh-teal/20 blur-3xl"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute -bottom-12 left-20 h-28 w-28 rounded-full bg-bh-honey/25 blur-3xl"
            aria-hidden
          />
          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-4">
              <OrgMark
                displayName={displayName}
                logoUrl={logoUrl}
                size="lg"
                className="h-[80px] w-[80px] rounded-2xl text-2xl shadow-[0_8px_24px_rgba(7,29,48,0.12)] ring-2 ring-white/90"
              />
              <div className="min-w-0 space-y-2.5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-bh-teal-strong">
                  Organization settings
                </p>
                <h2 className="truncate text-xl font-bold tracking-tight text-bh-text sm:text-2xl">
                  {displayName}
                </h2>
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-bh-sidebar/15 bg-bh-sidebar px-3 py-1.5 text-xs font-bold tracking-wide text-bh-sidebar-text shadow-[0_4px_12px_rgba(7,29,48,0.18)]">
                    <Building2 className="h-3.5 w-3.5 text-bh-honey" aria-hidden />
                    {typeLabel}
                  </span>
                  <span
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold tracking-wide shadow-sm',
                      statusTone(status),
                    )}
                  >
                    <BadgeCheck className="h-3.5 w-3.5" aria-hidden />
                    {ORG_STATUS_LABELS[status]}
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-bh-teal/30 bg-bh-teal-soft px-3 py-1.5 text-xs font-bold tracking-wide text-bh-teal-strong shadow-sm">
                    <Shield className="h-3.5 w-3.5" aria-hidden />
                    {roleLabel(role)}
                  </span>
                </div>
              </div>
            </div>
            {canManageBranding || canEditProfile ? (
              <Button
                type="button"
                variant="outline"
                className="relative border-bh-border bg-bh-surface/95 shadow-sm"
                onClick={() => selectSection(canEditProfile ? 'profile' : 'branding')}
              >
                Edit profile
              </Button>
            ) : null}
          </div>
        </div>

        <div className="border-t border-bh-border px-5 py-4 sm:px-6">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-bh-text">Profile completeness</p>
              <p className="mt-0.5 text-sm text-bh-text-secondary">
                {completeness.complete} of {completeness.total} required details complete
              </p>
            </div>
            <p className="text-xs text-bh-text-muted">
              Completeness is not approval — you must submit for Bridge Hive
              review before activation.
            </p>
          </div>
          <div
            className="mt-3 h-2.5 overflow-hidden rounded-full bg-bh-subtle"
            role="progressbar"
            aria-valuenow={completeness.percent}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Profile completeness"
          >
            <div
              className="h-full rounded-full bg-gradient-to-r from-bh-teal to-bh-teal-strong transition-[width] duration-300 motion-reduce:transition-none"
              style={{ width: `${completeness.percent}%` }}
            />
          </div>
          {completeness.nextMissingLabel ? (
            <p className="mt-2 text-sm text-bh-text-secondary">
              Next:{' '}
              <button
                type="button"
                className="font-medium text-bh-teal-strong hover:underline"
                onClick={() => selectSection('profile')}
              >
                Add {completeness.nextMissingLabel}
              </button>
            </p>
          ) : canSubmitForReview && profileComplete ? (
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-bh-honey/40 bg-bh-honey-soft/50 px-3 py-2.5">
              <p className="text-sm text-bh-text">
                Profile complete — submit for review to request Bridge Hive
                approval.
              </p>
              <Button type="button" size="sm" onClick={() => selectSection('verification')}>
                {submitCta}
              </Button>
            </div>
          ) : null}
        </div>
      </section>

      <div
        role="tablist"
        aria-label="Settings sections"
        className="flex gap-1 overflow-x-auto rounded-2xl border border-bh-border bg-bh-subtle/60 p-1.5"
      >
        {SECTIONS.map((s) => {
          const selected = section === s.id;
          const Icon = s.icon;
          return (
            <button
              key={s.id}
              type="button"
              role="tab"
              id={`${tabsId}-${s.id}`}
              aria-selected={selected}
              aria-controls={`${tabsId}-panel-${s.id}`}
              className={cn(
                'relative flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all',
                selected
                  ? 'bg-bh-surface text-bh-text shadow-[0_1px_3px_rgba(7,29,48,0.08)] ring-1 ring-bh-border'
                  : 'text-bh-text-secondary hover:bg-bh-surface/70 hover:text-bh-text',
              )}
              onClick={() => selectSection(s.id)}
            >
              <Icon
                className={cn(
                  'h-4 w-4 shrink-0',
                  selected ? 'text-bh-teal-strong' : 'text-bh-text-muted',
                )}
                aria-hidden
              />
              {s.label}
            </button>
          );
        })}
      </div>

      <div
        role="tabpanel"
        id={`${tabsId}-panel-${section}`}
        aria-labelledby={`${tabsId}-${section}`}
        className="space-y-4"
      >
        {section === 'profile' ? (
          <div className="space-y-4">
            {orgDetail && canEditProfile ? (
              <OrgProfileForm
                organizationId={organizationId}
                initialData={{
                  legal_name: orgDetail.legal_name,
                  display_name: orgDetail.display_name,
                  organization_type: orgDetail.organization_type,
                  address_line1: orgDetail.address_line1,
                  address_line2: orgDetail.address_line2,
                  city: orgDetail.city,
                  postal_code: orgDetail.postal_code,
                  country_code: orgDetail.country_code,
                  tax_vat_number: orgDetail.tax_vat_number,
                  billing_email: orgDetail.billing_email,
                  primary_contact_name: orgDetail.primary_contact_name,
                  primary_contact_email: orgDetail.primary_contact_email,
                }}
                canSubmitForReview={canSubmitForReview}
                readOnly={false}
              />
            ) : orgDetail ? (
              <>
                <Panel
                  title="Identity"
                  description="Display name is the friendly workspace name. Legal name is the registered entity."
                  action={
                    canManageBranding ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => selectSection('branding')}
                      >
                        Manage branding
                      </Button>
                    ) : null
                  }
                >
                  <div className="grid gap-3 sm:grid-cols-2">
                    <FieldMeta
                      label="Display name"
                      value={orgDetail.display_name}
                      help="Shown in the sidebar, dashboard, and switcher. Does not change your URL slug."
                      state={canManageBranding ? 'Editable' : 'Read only'}
                    />
                    <FieldMeta
                      label="Legal name"
                      value={orgDetail.legal_name}
                      help="Registered entity name used for verification and billing identity."
                      state={legalEditState}
                    />
                    <FieldMeta
                      label="Organization type"
                      value={typeLabel}
                      state={legalEditState}
                    />
                    <FieldMeta
                      label="Registration / company number"
                      value={orgDetail.registration_number ?? '—'}
                      state={legalEditState}
                    />
                    <FieldMeta
                      label="Tax / VAT number"
                      value={orgDetail.tax_vat_number ? 'On file' : '—'}
                      help="Tax details stay private and are not shown in lists or notifications."
                      state={legalEditState}
                    />
                    <FieldMeta
                      label="Timezone"
                      value={orgDetail.timezone ?? timezone}
                      state="Read only"
                    />
                  </div>
                </Panel>

                <Panel
                  title="Contact & address"
                  description="Primary contacts for operational correspondence."
                >
                  <div className="grid gap-3 sm:grid-cols-2">
                    <FieldMeta
                      label="Primary contact name"
                      value={orgDetail.primary_contact_name ?? '—'}
                      state={legalEditState}
                    />
                    <FieldMeta
                      label="Contact email"
                      value={orgDetail.primary_contact_email ?? '—'}
                      state={legalEditState}
                    />
                    <div className="sm:col-span-2">
                      <FieldMeta
                        label="Registered address"
                        value={[
                          orgDetail.address_line1,
                          orgDetail.address_line2,
                          orgDetail.city,
                          orgDetail.postal_code,
                          orgDetail.country_code,
                        ]
                          .filter(Boolean)
                          .join(', ')}
                        state={legalEditState}
                      />
                    </div>
                  </div>
                </Panel>
              </>
            ) : (
              <p className="text-sm text-bh-text-secondary">Profile details are unavailable.</p>
            )}
          </div>
        ) : null}

        {section === 'branding' ? (
          <OrganizationBrandingPanel
            slug={slug}
            organizationId={organizationId}
            displayName={displayName}
            logoPath={orgDetail?.logo_path ?? null}
            logoUrl={logoUrl}
            canManage={canManageBranding}
          />
        ) : null}

        {section === 'members' ? (
          <Panel
            title="Members & access"
            description="Your current role and what each organization role can do."
          >
            <div className="rounded-xl border border-bh-teal/20 bg-bh-teal-soft/40 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-bh-teal-strong">
                Your role
              </p>
              <p className="mt-1 text-lg font-semibold text-bh-text">{roleLabel(role)}</p>
              <p className="mt-1 text-sm text-bh-text-secondary">
                {orgRoleExplanation(role)}
              </p>
            </div>
            <ul className="mt-4 grid gap-3 sm:grid-cols-3">
              {[
                {
                  title: 'Organization Admin',
                  body: 'Profile, branding, locations, shifts, timesheets, and payment visibility.',
                },
                {
                  title: 'Scheduler',
                  body: 'Locations, shifts, assignments, and timesheet review.',
                },
                {
                  title: 'Billing',
                  body: 'Operational visibility and approved gross worker payment obligations.',
                },
              ].map((item) => (
                <li
                  key={item.title}
                  className="rounded-xl border border-bh-border bg-bh-subtle/40 p-4"
                >
                  <p className="text-sm font-semibold text-bh-text">{item.title}</p>
                  <p className="mt-1.5 text-xs leading-5 text-bh-text-secondary">{item.body}</p>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-xs text-bh-text-muted">
              Roles are assigned by Bridge Hive. Platform-admin privileges cannot be granted
              here. Member invitation management is not available in this workspace yet.
            </p>
          </Panel>
        ) : null}

        {section === 'billing' ? (
          <Panel
            title="Billing contact"
            description="Finance correspondence only — this does not automatically grant login access."
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <FieldMeta
                label="Billing email"
                value={orgDetail?.billing_email ?? '—'}
                help="Used for invoices and finance messages. Login still requires an accepted membership."
                state={canEditProfile ? 'Editable' : 'Read only'}
              />
              <FieldMeta
                label="Primary contact email"
                value={orgDetail?.primary_contact_email ?? '—'}
                help="Operational contact; may differ from billing email."
                state={canEditProfile ? 'Editable' : 'Read only'}
              />
            </div>
          </Panel>
        ) : null}

        {section === 'verification' ? (
          <Panel
            title="Verification"
            description="Organization users cannot approve or activate themselves. Bridge Hive reviews submissions."
          >
            {pendingSubmitHint ? (
              <div className="mb-4 rounded-xl border border-bh-honey/40 bg-bh-honey-soft/40 p-4 text-sm text-bh-text">
                {pendingSubmitHint}
              </div>
            ) : null}
            {status === 'under_review' ? (
              <div className="mb-4 rounded-xl border border-bh-info/30 bg-bh-info/10 p-4 text-sm text-bh-text">
                Your organization is under review. Profile fields are read-only
                until Bridge Hive decides. Completing a profile earlier did not
                approve the organization.
              </div>
            ) : null}
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-bh-border/80 bg-bh-subtle/40 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-bh-text-muted">
                  Current status
                </p>
                <span
                  className={cn(
                    'mt-2 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-sm font-semibold',
                    statusTone(status),
                  )}
                >
                  <BadgeCheck className="h-3.5 w-3.5" aria-hidden />
                  {ORG_STATUS_LABELS[status]}
                </span>
              </div>
              <FieldMeta label="Timezone" value={timezone} state="Read only" />
              {orgDetail?.submitted_at ? (
                <FieldMeta
                  label="Submitted"
                  value={new Date(orgDetail.submitted_at).toLocaleString('en-GB')}
                  state="Read only"
                />
              ) : null}
              {orgDetail?.reviewed_at ? (
                <FieldMeta
                  label="Reviewed"
                  value={new Date(orgDetail.reviewed_at).toLocaleString('en-GB')}
                  state="Read only"
                />
              ) : null}
              {status === 'rejected' && orgDetail?.status_reason ? (
                <div className="sm:col-span-2">
                  <FieldMeta
                    label="Rejection reason"
                    value={orgDetail.status_reason}
                    state="Requires review"
                  />
                </div>
              ) : null}
            </div>
            {canSubmitForReview && orgDetail && profileComplete ? (
              <div className="mt-4 space-y-2">
                <SubmitOrganizationForReviewButton
                  organizationId={organizationId}
                  orgDetail={orgDetail}
                  label={submitCta}
                />
                <p className="text-xs text-bh-text-muted">
                  Need to edit details first?{' '}
                  <button
                    type="button"
                    className="font-medium text-bh-teal-strong hover:underline"
                    onClick={() => selectSection('profile')}
                  >
                    Open profile
                  </button>
                </p>
              </div>
            ) : canSubmitForReview ? (
              <div className="mt-4">
                <Button asChild>
                  <Link href={`/org/${slug}/settings?tab=profile`}>
                    Update profile before submitting
                  </Link>
                </Button>
              </div>
            ) : null}
          </Panel>
        ) : null}
      </div>
    </div>
  );
}
