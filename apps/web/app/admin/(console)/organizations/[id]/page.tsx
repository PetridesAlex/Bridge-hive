import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

import {
  CheckActivationRedirectButton,
  ReplaceAdminInviteForm,
  ResendActivationButton,
} from '@/components/admin/activation-controls';
import { OrganizationActionsForm } from '@/components/admin/organization-actions-form';
import { OrganizationInvitationForm } from '@/components/admin/organization-invitation-form';
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
      <Link
        href="/admin/organizations"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-bh-text-secondary transition hover:text-bh-text"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Back to organizations
      </Link>

      <header className="overflow-hidden rounded-2xl border border-bh-border bg-bh-surface shadow-[0_8px_28px_rgba(7,29,48,0.06)]">
        <div
          aria-hidden
          className="h-1 bg-gradient-to-r from-bh-sidebar via-bh-honey to-bh-sidebar"
        />
        <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:p-6">
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
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-bh-text">
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
          value={organizationLifecycleLabel(org.status)}
          detail={`Updated ${formatDateTime(org.updated_at)}`}
        />
        <SummaryTile
          label="Administrator access"
          value={administratorAccessLabel(accessStatus)}
          detail={
            latestInvite?.expires_at
              ? `Expires ${formatDateTime(latestInvite.expires_at)}`
              : 'No invitation yet'
          }
        />
        <SummaryTile
          label="Organization profile"
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
          <Panel kicker="Profile" title="Organization profile">
            <dl className="grid gap-px overflow-hidden rounded-xl border border-bh-border bg-bh-border">
              <Detail label="Display name" value={org.display_name} />
              <Detail label="Legal name" value={org.legal_name} />
              <Detail label="Slug" value={org.slug} mono />
              <Detail label="Type" value={typeLabel} />
              <Detail label="Timezone" value={org.timezone} />
              <Detail label="Country" value={org.country_code} />
            </dl>
          </Panel>

          <Panel kicker="Profile" title="Contact and billing">
            <dl className="grid gap-px overflow-hidden rounded-xl border border-bh-border bg-bh-border">
              <Detail label="Primary contact" value={org.primary_contact_name} />
              <Detail label="Contact email" value={org.primary_contact_email} />
              <Detail label="Billing email" value={org.billing_email} />
              <Detail label="Tax/VAT number" value={org.tax_vat_number} />
              <Detail label="Registration number" value={org.registration_number} />
            </dl>
          </Panel>
        </div>

        <Panel kicker="Profile" title="Address">
          <dl className="grid gap-px overflow-hidden rounded-xl border border-bh-border bg-bh-border sm:grid-cols-2">
            <Detail label="Address line 1" value={org.address_line1} />
            <Detail label="Address line 2" value={org.address_line2} />
            <Detail label="City" value={org.city} />
            <Detail label="Postal code" value={org.postal_code} />
          </dl>
        </Panel>
      </section>

      <Panel kicker="Record" title="Status history">
        <dl className="grid gap-px overflow-hidden rounded-xl border border-bh-border bg-bh-border sm:grid-cols-2">
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

      <Panel kicker="Operations" title="Activity summary">
        <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-bh-border bg-bh-border sm:grid-cols-4">
          <Metric label="Locations" value={detail.counts.locations} />
          <Metric label="Wards" value={detail.counts.wards} />
          <Metric
            label="Published shifts"
            value={detail.counts.shifts_published ?? 0}
          />
          <Metric label="Shifts" value={shiftTotal} />
        </dl>
      </Panel>

      <Panel kicker="People" title={`Members (${detail.members.length})`}>
        {detail.members.length === 0 ? (
          <p className="rounded-xl border border-dashed border-bh-border px-4 py-6 text-sm text-bh-text-secondary">
            No members yet.
          </p>
        ) : (
          <ul className="overflow-hidden rounded-xl border border-bh-border">
            {detail.members.map((member) => (
              <li
                key={member.user_id}
                className="flex flex-wrap items-center justify-between gap-3 border-b border-bh-border px-4 py-3 last:border-b-0"
              >
                <div className="min-w-0">
                  <p className="font-medium text-bh-text">
                    {member.full_name ?? 'Unnamed'}
                  </p>
                  <p className="mt-0.5 text-sm capitalize text-bh-text-secondary">
                    {roleLabel(member.role)} · {member.status.replaceAll('_', ' ')}
                  </p>
                </div>
                <p className="text-xs text-bh-text-muted">
                  {member.accepted_at
                    ? `Joined ${formatDateTime(member.accepted_at)}`
                    : 'Not joined yet'}
                </p>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel
        kicker="Access"
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
            <ul className="overflow-hidden rounded-2xl border border-bh-border">
              {detail.invitations.map((inv) => (
                <li
                  key={inv.id}
                  className="grid gap-4 border-b border-bh-border px-4 py-4 last:border-b-0 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-bh-text">
                      {inv.email_hint}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <span className="rounded-full bg-bh-subtle px-2.5 py-1 text-[11px] font-semibold text-bh-text">
                        {roleLabel(inv.role)}
                      </span>
                      <span className="rounded-full bg-bh-sidebar px-2.5 py-1 text-[11px] font-semibold capitalize text-white">
                        {inv.status.replaceAll('_', ' ')}
                      </span>
                      <span className="rounded-full bg-bh-honey-soft px-2.5 py-1 text-[11px] font-semibold text-bh-text">
                        {administratorAccessLabel(
                          inv.access_status ?? inv.delivery_status ?? inv.status,
                        )}
                      </span>
                    </div>
                    <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-xs sm:grid-cols-3">
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
                          buttonClassName="h-10 rounded-full px-4"
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

      <Panel kicker="Control" title="Admin actions">
        {hasStatusAction ? (
          <div className="flex flex-wrap gap-2">
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

function SummaryTile({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <article className="rounded-2xl border border-bh-border bg-bh-surface px-4 py-4 shadow-[0_4px_16px_rgba(7,29,48,0.04)]">
      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-bh-text-muted">
        {label}
      </p>
      <p className="mt-2 text-lg font-semibold tracking-tight text-bh-text">{value}</p>
      <p className="mt-1 truncate text-xs text-bh-text-secondary">{detail}</p>
    </article>
  );
}

function Panel({
  kicker,
  title,
  description,
  children,
}: {
  kicker: string;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-bh-border bg-bh-surface shadow-[0_8px_28px_rgba(7,29,48,0.05)]">
      <div className="border-b border-bh-border px-5 py-4">
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
      <div className="p-5">{children}</div>
    </section>
  );
}

function Detail({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string | null | undefined;
  mono?: boolean;
}) {
  const shown = value && value.trim() ? value : '—';
  return (
    <div className="bg-bh-surface px-4 py-3">
      <dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-bh-text-muted">
        {label}
      </dt>
      <dd
        className={cn(
          'mt-1 break-words text-sm font-medium text-bh-text',
          mono && shown !== '—' && 'font-mono text-[13px] tracking-wide',
        )}
      >
        {shown}
      </dd>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-bh-surface px-4 py-4">
      <dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-bh-text-muted">
        {label}
      </dt>
      <dd className="mt-1 text-2xl font-semibold tabular-nums text-bh-text">{value}</dd>
    </div>
  );
}
