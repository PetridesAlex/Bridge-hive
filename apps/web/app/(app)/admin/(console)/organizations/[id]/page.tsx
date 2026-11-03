import {
  Activity,
  Briefcase,
  Building2,
  CalendarCheck,
  CalendarDays,
  CircleAlert,
  ClipboardList,
  History,
  KeyRound,
  LayoutGrid,
  Mail,
  MapPin,
  Send,
  ShieldCheck,
  Users,
  type LucideIcon,
} from 'lucide-react';

import { AdminBackLink } from '@/components/admin/admin-back-link';
import {
  CheckActivationRedirectButton,
  ReplaceAdminInviteForm,
  ResendActivationButton,
} from '@/components/admin/activation-controls';
import { OrganizationActionsForm } from '@/components/admin/organization-actions-form';
import { OrganizationInvitationForm } from '@/components/admin/organization-invitation-form';
import { RecruitmentAccessForm } from '@/components/admin/recruitment-access-form';
import { EmptyState } from '@/components/empty-state';
import { Badge } from '@/components/ui/badge';
import { requirePlatformAdmin } from '@/lib/admin/auth';
import { formatDateTime, roleLabel } from '@/lib/format';
import { createClient } from '@/lib/supabase/server';
import { cn } from '@/lib/utils';
import {
  ORGANIZATION_TYPE_LABELS,
  administratorAccessLabel,
  organizationLifecycleLabel,
  organizationProfileLabel,
  type OrganizationType,
} from '@bridge-hive/domain';

export default async function OrganizationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const ctx = await requirePlatformAdmin('platform_super_admin');
  if (!ctx.capabilities.canManageOrganizations) {
    return (
      <EmptyState
        title="Permission denied"
        description="Your role cannot manage organizations."
      />
    );
  }

  const { id } = await params;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('get_admin_organization_detail', {
    p_organization_id: id,
  });

  if (error || !data) {
    return (
      <EmptyState
        title="Organization not found"
        description="This organization may have been deleted or you may not have access."
      />
    );
  }

  const detail = data as {
    organization: {
      id: string;
      legal_name: string;
      display_name: string;
      slug: string;
      organization_type: string | null;
      status: string;
      timezone: string;
      billing_email: string | null;
      primary_contact_name: string | null;
      primary_contact_email: string | null;
      address_line1: string | null;
      address_line2: string | null;
      city: string | null;
      postal_code: string | null;
      country_code: string;
      registration_number: string | null;
      tax_vat_number: string | null;
      submitted_at: string | null;
      reviewed_at: string | null;
      reviewed_by: string | null;
      status_reason: string | null;
      created_at: string;
      updated_at: string;
      short_reference: string;
      recruitment_enabled?: boolean;
    };
    members: Array<{
      user_id: string;
      role: string;
      status: string;
      full_name: string | null;
      accepted_at: string | null;
    }>;
    invitations: Array<{
      id: string;
      role: string;
      email_hint: string;
      expires_at: string;
      accepted_at: string | null;
      revoked_at: string | null;
      created_at: string;
      status: string;
      delivery_status?: string;
      access_status?: string;
      last_sent_at?: string | null;
      send_attempt_count?: number;
      last_delivery_error_category?: string | null;
    }>;
    counts: {
      locations: number;
      wards: number;
      shifts_published?: number;
      shifts_total?: number;
      shifts?: number;
    };
  };

  const org = detail.organization;
  const recruitmentEnabled = Boolean(org.recruitment_enabled);
  const latestInvite = detail.invitations[0];
  const accessStatus =
    latestInvite?.access_status ??
    latestInvite?.delivery_status ??
    (latestInvite?.status === 'open' ? 'pending' : latestInvite?.status);
  const profileLabel = organizationProfileLabel({
    status: org.status,
    submittedAt: org.submitted_at,
    hasContact: Boolean(org.primary_contact_name || org.primary_contact_email),
  });
  const typeLabel = org.organization_type
    ? (ORGANIZATION_TYPE_LABELS[org.organization_type as OrganizationType] ??
      org.organization_type)
    : 'Organization';
  const shiftTotal = detail.counts.shifts_total ?? detail.counts.shifts ?? 0;
  const hasStatusAction =
    org.status === 'under_review' ||
    org.status === 'active' ||
    org.status === 'suspended';

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <AdminBackLink href="/admin/organizations" label="Back to organizations" />

      <header className="relative overflow-hidden rounded-[1.35rem] border border-bh-border/90 bg-bh-surface shadow-[0_10px_40px_rgba(7,29,48,0.06)]">
        <div
          aria-hidden
          className="h-1.5 bg-gradient-to-r from-bh-sidebar via-bh-teal to-bh-honey"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(720px_240px_at_0%_0%,rgba(22,166,182,0.08),transparent_55%),radial-gradient(560px_220px_at_100%_0%,rgba(224,170,24,0.08),transparent_50%)]"
        />
        <div className="relative flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:p-6">
          <span
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-bh-sidebar text-base font-semibold tracking-wide text-white shadow-[0_10px_24px_rgba(7,29,48,0.28)]"
            aria-hidden
          >
            {organizationMark(org.display_name)}
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant={
                  org.status === 'active'
                    ? 'success'
                    : org.status === 'suspended' || org.status === 'rejected'
                      ? 'danger'
                      : org.status === 'under_review'
                        ? 'warning'
                        : 'muted'
                }
              >
                {organizationLifecycleLabel(org.status)}
              </Badge>
              <span className="text-xs font-medium uppercase tracking-[0.12em] text-bh-text-muted">
                {typeLabel}
              </span>
            </div>
            <h2 className="mt-2 text-[1.75rem] font-bold tracking-tight text-bh-text">
              {org.display_name}
            </h2>
            <p className="mt-1 text-sm text-bh-text-secondary">
              {org.legal_name} · @{org.slug}
            </p>
            <p className="mt-1 font-mono text-[11px] tracking-[0.14em] text-bh-text-muted">
              REF {org.short_reference}
            </p>
          </div>
        </div>
      </header>

      <div className="grid gap-3 sm:grid-cols-3">
        <SummaryTile
          label="Organization"
          icon={Building2}
          accent="navy"
          value={organizationLifecycleLabel(org.status)}
          detail={`Updated ${formatDateTime(org.updated_at)}`}
        />
        <SummaryTile
          label="Administrator access"
          icon={KeyRound}
          accent="honey"
          value={administratorAccessLabel(accessStatus)}
          detail={
            latestInvite?.expires_at
              ? `Expires ${formatDateTime(latestInvite.expires_at)}`
              : 'No invitation yet'
          }
        />
        <SummaryTile
          label="Organization profile"
          icon={ClipboardList}
          accent="teal"
          value={profileLabel}
          detail={
            org.primary_contact_email
              ? org.primary_contact_email
              : 'No primary contact email'
          }
        />
      </div>

      <section id="profile" className="scroll-mt-6 space-y-6">
        <div className="grid gap-6 lg:grid-cols-2">
          <Panel kicker="Profile" title="Organization profile" icon={Building2}>
            <dl className={DETAIL_GRID}>
              <Detail label="Display name" value={org.display_name} />
              <Detail label="Legal name" value={org.legal_name} />
              <Detail label="Slug" value={org.slug} mono />
              <Detail label="Type" value={typeLabel} />
              <Detail label="Timezone" value={org.timezone} />
              <Detail label="Country" value={org.country_code} />
            </dl>
          </Panel>

          <Panel kicker="Profile" title="Contact and billing" icon={Mail}>
            <dl className={DETAIL_GRID}>
              <Detail label="Primary contact" value={org.primary_contact_name} />
              <Detail label="Contact email" value={org.primary_contact_email} />
              <Detail label="Billing email" value={org.billing_email} />
              <Detail label="Tax/VAT number" value={org.tax_vat_number} />
              <Detail label="Registration number" value={org.registration_number} />
            </dl>
          </Panel>
        </div>

        <Panel kicker="Profile" title="Address" icon={MapPin}>
          <dl className={cn(DETAIL_GRID, 'sm:grid-cols-2')}>
            <Detail label="Address line 1" value={org.address_line1} />
            <Detail label="Address line 2" value={org.address_line2} />
            <Detail label="City" value={org.city} />
            <Detail label="Postal code" value={org.postal_code} />
          </dl>
        </Panel>
      </section>

      <Panel kicker="Record" title="Status history" icon={History}>
        <dl className={cn(DETAIL_GRID, 'sm:grid-cols-2')}>
          <Detail label="Created" value={formatDateTime(org.created_at)} />
          <Detail label="Updated" value={formatDateTime(org.updated_at)} />
          <Detail
            label="Submitted for review"
            value={org.submitted_at ? formatDateTime(org.submitted_at) : null}
          />
          <Detail
            label="Reviewed"
            value={org.reviewed_at ? formatDateTime(org.reviewed_at) : null}
          />
          <Detail label="Reviewed by" value={org.reviewed_by} mono />
          <Detail label="Status reason" value={org.status_reason} />
        </dl>
      </Panel>

      <Panel kicker="Operations" title="Activity summary" icon={Activity}>
        <dl className={cn(DETAIL_GRID, 'grid-cols-2 sm:grid-cols-4')}>
          <Metric label="Locations" icon={MapPin} value={detail.counts.locations} />
          <Metric label="Wards" icon={LayoutGrid} value={detail.counts.wards} />
          <Metric
            label="Published shifts"
            icon={CalendarCheck}
            value={detail.counts.shifts_published ?? 0}
          />
          <Metric label="Shifts" icon={CalendarDays} value={shiftTotal} />
        </dl>
      </Panel>

      <Panel
        kicker="People"
        title={`Members (${detail.members.length})`}
        icon={Users}
      >
        {detail.members.length === 0 ? (
          <p className="rounded-xl border border-dashed border-bh-border px-4 py-6 text-sm text-bh-text-secondary">
            No members yet.
          </p>
        ) : (
          <ul className="overflow-hidden rounded-2xl border border-bh-border/80">
            {detail.members.map((member) => (
              <li
                key={member.user_id}
                className="group flex flex-wrap items-center justify-between gap-3 border-b border-bh-border/70 px-4 py-3.5 transition-colors last:border-b-0 hover:bg-bh-teal-soft/25"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span
                    aria-hidden
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-bh-sidebar text-[12px] font-bold tracking-wide text-white shadow-[0_4px_12px_rgba(7,29,48,0.22)] transition duration-300 group-hover:scale-105"
                  >
                    {organizationMark(member.full_name ?? 'Member')}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-semibold tracking-tight text-bh-text">
                      {member.full_name ?? 'Unnamed'}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                      <span className="inline-flex rounded-full border border-bh-border/80 bg-bh-subtle/80 px-2 py-0.5 text-[11px] font-semibold text-bh-text-secondary">
                        {roleLabel(member.role)}
                      </span>
                      <span
                        className={cn(
                          'inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize ring-1',
                          memberStatusClass(member.status),
                        )}
                      >
                        {member.status.replaceAll('_', ' ')}
                      </span>
                    </div>
                  </div>
                </div>
                <span className="inline-flex items-center rounded-full border border-bh-border/80 bg-white px-2.5 py-1 text-[11px] font-semibold text-bh-text-secondary shadow-sm">
                  {member.accepted_at
                    ? `Joined ${formatDateTime(member.accepted_at)}`
                    : 'Not joined yet'}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel
        kicker="Access"
        icon={Send}
        title={`Invitations (${detail.invitations.length})`}
        description="Send a new activation, replace an open administrator email, or resend the current link."
      >
        <div className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border border-bh-border bg-bh-surface p-4 shadow-[0_4px_16px_rgba(7,29,48,0.04)]">
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-bh-honey-strong">
                New invitation
              </p>
              <p className="mt-1 text-sm font-semibold text-bh-text">Send invitation</p>
              <p className="mt-1 text-xs leading-5 text-bh-text-secondary">
                The recipient gets a secure link to create a password. This does not
                approve the organization.
              </p>
              <div className="mt-4">
                <OrganizationInvitationForm organizationId={org.id} />
              </div>
            </div>
            <ReplaceAdminInviteForm
              organizationId={org.id}
              invitationId={
                latestInvite && latestInvite.status === 'open'
                  ? latestInvite.id
                  : undefined
              }
            />
          </div>

          <div className="rounded-2xl border border-dashed border-bh-border bg-bh-subtle/40 px-4 py-3">
            <CheckActivationRedirectButton />
          </div>

          {detail.invitations.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-bh-border px-4 py-6 text-sm text-bh-text-secondary">
              No invitations sent.
            </p>
          ) : (
            <ul className="overflow-hidden rounded-2xl border border-bh-border/80">
              {detail.invitations.map((inv) => (
                <li
                  key={inv.id}
                  className="grid gap-4 border-b border-bh-border/70 px-4 py-4 transition-colors last:border-b-0 hover:bg-bh-subtle/40 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start"
                >
                  <div className="min-w-0">
                    <p className="flex min-w-0 items-center gap-2 text-sm font-semibold tracking-tight text-bh-text">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-bh-teal-soft text-bh-teal-strong ring-1 ring-bh-teal/20">
                        <Mail className="h-3.5 w-3.5" aria-hidden />
                      </span>
                      <span className="truncate">{inv.email_hint}</span>
                    </p>
                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                      <span className="rounded-full border border-bh-border/80 bg-bh-subtle/80 px-2.5 py-1 text-[11px] font-semibold text-bh-text-secondary">
                        {roleLabel(inv.role)}
                      </span>
                      <span
                        className={cn(
                          'rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize ring-1',
                          inviteStatusClass(inv.status),
                        )}
                      >
                        {inv.status.replaceAll('_', ' ')}
                      </span>
                      <span className="rounded-full bg-bh-honey-soft px-2.5 py-1 text-[11px] font-semibold text-bh-honey-strong ring-1 ring-bh-honey/30">
                        {administratorAccessLabel(
                          inv.access_status ?? inv.delivery_status ?? inv.status,
                        )}
                      </span>
                    </div>
                    <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 rounded-xl border border-bh-border/70 bg-bh-subtle/40 px-3.5 py-3 text-xs sm:grid-cols-3">
                      <div>
                        <dt className="font-semibold uppercase tracking-[0.12em] text-bh-text-muted">
                          Expires
                        </dt>
                        <dd className="mt-0.5 font-medium text-bh-text">
                          {formatDateTime(inv.expires_at)}
                        </dd>
                      </div>
                      <div>
                        <dt className="font-semibold uppercase tracking-[0.12em] text-bh-text-muted">
                          Last sent
                        </dt>
                        <dd className="mt-0.5 font-medium text-bh-text">
                          {inv.last_sent_at ? formatDateTime(inv.last_sent_at) : '—'}
                        </dd>
                      </div>
                      <div>
                        <dt className="font-semibold uppercase tracking-[0.12em] text-bh-text-muted">
                          Attempts
                        </dt>
                        <dd className="mt-0.5 font-medium tabular-nums text-bh-text">
                          {typeof inv.send_attempt_count === 'number'
                            ? inv.send_attempt_count
                            : '—'}
                        </dd>
                      </div>
                    </dl>
                    {inv.last_delivery_error_category ? (
                      <p className="mt-2 text-xs capitalize text-bh-danger">
                        {inv.last_delivery_error_category.replaceAll('_', ' ')}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex flex-col items-stretch gap-2 sm:items-end">
                    {inv.status === 'open' ? (
                      <>
                        <ResendActivationButton
                          invitationId={inv.id}
                          organizationId={org.id}
                          lastSentAt={inv.last_sent_at}
                        />
                        <OrganizationActionsForm
                          action="revoke_invitation"
                          invitationId={inv.id}
                          buttonText="Revoke"
                          buttonClassName="h-10 px-4"
                        />
                      </>
                    ) : (
                      <p className="text-xs text-bh-text-muted">
                        {inv.accepted_at
                          ? `Accepted ${formatDateTime(inv.accepted_at)}`
                          : inv.revoked_at
                            ? `Revoked ${formatDateTime(inv.revoked_at)}`
                            : `Expires ${formatDateTime(inv.expires_at)}`}
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Panel>

      <Panel
        kicker="Control"
        icon={ShieldCheck}
        title="Admin actions"
        description={
          org.status === 'under_review'
            ? 'Decide whether this organization may enter the live Bridge Hive network.'
            : undefined
        }
      >
        {hasStatusAction ? (
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-start">
            {org.status === 'under_review' ? (
              <>
                <OrganizationActionsForm
                  action="approve"
                  organizationId={org.id}
                  buttonText="Approve organization"
                />
                <OrganizationActionsForm
                  action="reject"
                  organizationId={org.id}
                  buttonText="Reject organization"
                  requiresReason
                />
              </>
            ) : null}
            {org.status === 'active' ? (
              <OrganizationActionsForm
                action="suspend"
                organizationId={org.id}
                buttonText="Suspend organization"
                requiresReason
              />
            ) : null}
            {org.status === 'suspended' ? (
              <OrganizationActionsForm
                action="reactivate"
                organizationId={org.id}
                buttonText="Reactivate organization"
                requiresReason
              />
            ) : null}
          </div>
        ) : (
          <p className="rounded-xl border border-dashed border-bh-border px-4 py-6 text-sm text-bh-text-secondary">
            No status change is available while this organization is{' '}
            {organizationLifecycleLabel(org.status).toLowerCase()}.
          </p>
        )}
      </Panel>

      <Panel
        kicker="Recruitment"
        icon={Briefcase}
        title="Recruitment access"
        description="Enable the private organization recruitment portal for org admins. Requires an active organization. Does not grant marketplace worker access."
      >
        <div
          className={cn(
            'relative overflow-hidden rounded-2xl border p-4 transition-colors sm:p-5',
            recruitmentEnabled
              ? 'border-bh-success/30 bg-gradient-to-br from-bh-success-soft via-bh-surface to-bh-surface'
              : 'border-bh-border/80 bg-gradient-to-br from-bh-subtle/70 via-bh-surface to-bh-surface',
          )}
        >
          <div
            aria-hidden
            className={cn(
              'pointer-events-none absolute -right-10 -top-12 h-32 w-32 rounded-full blur-2xl',
              recruitmentEnabled ? 'bg-bh-success/15' : 'bg-bh-teal/10',
            )}
          />
          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-3.5">
              <span
                className={cn(
                  'flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl shadow-[0_8px_18px_rgba(7,29,48,0.18)]',
                  recruitmentEnabled
                    ? 'bg-bh-success text-white'
                    : 'bg-bh-sidebar text-bh-honey',
                )}
              >
                <Briefcase className="h-5 w-5" aria-hidden />
              </span>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold tracking-tight text-bh-text">
                    Recruitment portal
                  </p>
                  <span
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-[0.08em]',
                      recruitmentEnabled
                        ? 'bg-bh-success/15 text-bh-success'
                        : 'bg-bh-subtle text-bh-text-muted ring-1 ring-bh-border',
                    )}
                  >
                    <span
                      aria-hidden
                      className={cn(
                        'h-1.5 w-1.5 rounded-full',
                        recruitmentEnabled
                          ? 'animate-pulse bg-bh-success'
                          : 'bg-bh-text-muted/60',
                      )}
                    />
                    {recruitmentEnabled ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
                <p className="mt-1 text-xs leading-5 text-bh-text-secondary">
                  {recruitmentEnabled
                    ? 'Org admins can use the private recruitment portal.'
                    : 'The private recruitment portal is turned off for this organization.'}
                </p>
                {org.status !== 'active' ? (
                  <p className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-bh-honey/35 bg-bh-honey-soft px-2.5 py-1 text-[11px] font-semibold text-bh-honey-strong">
                    <CircleAlert className="h-3.5 w-3.5" aria-hidden />
                    Organization must be active for portal use
                  </p>
                ) : null}
              </div>
            </div>
            <RecruitmentAccessForm
              organizationId={org.id}
              recruitmentEnabled={recruitmentEnabled}
            />
          </div>
        </div>
      </Panel>
    </div>
  );
}

function organizationMark(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase();
  }
  return name.trim().slice(0, 2).toUpperCase() || '·';
}

const SUMMARY_ACCENT = {
  navy: { bar: 'from-bh-sidebar via-bh-sidebar-raised to-bh-teal', icon: 'bg-bh-sidebar text-bh-honey' },
  honey: { bar: 'from-bh-honey via-bh-honey-strong to-bh-sidebar', icon: 'bg-bh-honey-soft text-bh-honey-strong ring-1 ring-bh-honey/30' },
  teal: { bar: 'from-bh-teal via-bh-teal-strong to-bh-sidebar', icon: 'bg-bh-teal-soft text-bh-teal-strong ring-1 ring-bh-teal/25' },
} as const;

function SummaryTile({
  label,
  value,
  detail,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string;
  detail: string;
  icon: LucideIcon;
  accent: keyof typeof SUMMARY_ACCENT;
}) {
  const tone = SUMMARY_ACCENT[accent];
  return (
    <article className="group relative overflow-hidden rounded-[1.25rem] border border-bh-border/90 bg-bh-surface shadow-[0_8px_24px_rgba(7,29,48,0.05)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_14px_32px_rgba(7,29,48,0.08)] motion-reduce:transition-none motion-reduce:hover:translate-y-0">
      <div aria-hidden className={cn('h-1 bg-gradient-to-r', tone.bar)} />
      <div className="flex items-start gap-3 px-4 py-4">
        <span
          className={cn(
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition duration-300 group-hover:scale-105',
            tone.icon,
          )}
        >
          <Icon className="h-4 w-4" aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-bh-text-muted">
            {label}
          </p>
          <p className="mt-1 text-[15px] font-semibold tracking-tight text-bh-text">
            {value}
          </p>
          <p className="mt-0.5 truncate text-xs text-bh-text-secondary">{detail}</p>
        </div>
      </div>
    </article>
  );
}

function Panel({
  kicker,
  title,
  description,
  icon: Icon,
  children,
}: {
  kicker: string;
  title: string;
  description?: string;
  icon?: LucideIcon;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-[1.25rem] border border-bh-border/90 bg-bh-surface shadow-[0_8px_28px_rgba(7,29,48,0.05)]">
      <div className="flex items-start gap-3 border-b border-bh-border/80 bg-gradient-to-b from-bh-subtle/80 to-bh-surface px-5 py-4">
        {Icon ? (
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-bh-sidebar text-bh-honey shadow-[0_6px_14px_rgba(7,29,48,0.2)]">
            <Icon className="h-4 w-4" aria-hidden />
          </span>
        ) : null}
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-bh-honey-strong">
            {kicker}
          </p>
          <h3 className="mt-1 text-base font-semibold tracking-tight text-bh-text">{title}</h3>
          {description ? (
            <p className="mt-1 max-w-2xl text-sm leading-5 text-bh-text-secondary">
              {description}
            </p>
          ) : null}
        </div>
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

const DETAIL_GRID =
  'grid gap-px overflow-hidden rounded-2xl border border-bh-border/80 bg-bh-border/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]';

function Detail({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string | null | undefined;
  mono?: boolean;
}) {
  const empty = !(value && value.trim());
  return (
    <div className="bg-bh-surface px-4 py-3.5 transition-colors hover:bg-bh-subtle/50">
      <dt className="text-[11px] font-bold uppercase tracking-[0.12em] text-bh-text-muted">
        {label}
      </dt>
      <dd
        className={cn(
          'mt-1 break-words text-sm',
          empty
            ? 'font-medium text-bh-text-muted/70'
            : 'font-semibold tracking-tight text-bh-text',
          mono && !empty && 'font-mono text-[13px] tracking-wide',
        )}
      >
        {empty ? 'Not provided' : value}
      </dd>
    </div>
  );
}

function Metric({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number;
  icon: LucideIcon;
}) {
  return (
    <div className="group bg-bh-surface px-4 py-4 transition-colors hover:bg-bh-subtle/50">
      <div className="flex items-center justify-between gap-2">
        <dt className="text-[11px] font-bold uppercase tracking-[0.12em] text-bh-text-muted">
          {label}
        </dt>
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-bh-teal-soft text-bh-teal-strong ring-1 ring-bh-teal/20 transition duration-300 group-hover:scale-110">
          <Icon className="h-3.5 w-3.5" aria-hidden />
        </span>
      </div>
      <dd className="bh-tabular mt-2 text-[1.75rem] font-bold leading-none tracking-tight text-bh-text">
        {value}
      </dd>
    </div>
  );
}

function memberStatusClass(status: string) {
  if (status === 'active') return 'bg-bh-success-soft text-bh-success ring-bh-success/25';
  if (status === 'suspended' || status === 'removed') {
    return 'bg-bh-danger-soft text-bh-danger ring-bh-danger/25';
  }
  return 'bg-bh-honey-soft text-bh-honey-strong ring-bh-honey/30';
}

function inviteStatusClass(status: string) {
  if (status === 'open') return 'bg-bh-teal-soft text-bh-teal-strong ring-bh-teal/25';
  if (status === 'accepted') return 'bg-bh-success-soft text-bh-success ring-bh-success/25';
  if (status === 'revoked' || status === 'expired') {
    return 'bg-bh-danger-soft text-bh-danger ring-bh-danger/25';
  }
  return 'bg-bh-subtle text-bh-text-secondary ring-bh-border';
}
