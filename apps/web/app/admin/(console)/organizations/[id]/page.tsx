import Link from 'next/link';

import { OrganizationActionsForm } from '@/components/admin/organization-actions-form';
import { OrganizationInvitationForm } from '@/components/admin/organization-invitation-form';
import { EmptyState } from '@/components/empty-state';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { requirePlatformAdmin } from '@/lib/admin/auth';
import { formatDateTime, roleLabel } from '@/lib/format';
import { createClient } from '@/lib/supabase/server';
import {
  ORG_STATUS_LABELS,
  ORGANIZATION_TYPE_LABELS,
  type OrgStatus,
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
    }>;
    counts: {
      locations: number;
      wards: number;
      shifts: number;
    };
  };

  const org = detail.organization;

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/admin/organizations"
          className="text-sm text-slate-600 hover:text-slate-900"
        >
          ← Back to organizations
        </Link>
      </div>

      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <Badge
              variant={
                org.status === 'active'
                  ? 'success'
                  : org.status === 'suspended' || org.status === 'rejected'
                    ? 'danger'
                    : 'muted'
              }
            >
              {ORG_STATUS_LABELS[org.status as OrgStatus] ?? org.status}
            </Badge>
            {org.organization_type ? (
              <span className="text-sm text-slate-500">
                {ORGANIZATION_TYPE_LABELS[org.organization_type as OrganizationType] ??
                  org.organization_type}
              </span>
            ) : null}
          </div>
          <h2 className="text-2xl font-semibold text-slate-900">
            {org.display_name}
          </h2>
          <p className="text-sm text-slate-600">
            {org.legal_name} · @{org.slug}
          </p>
          <p className="mt-1 text-xs text-slate-500">Ref {org.short_reference}</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Organization profile</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm">
            <div>
              <p className="text-slate-500">Display name</p>
              <p className="font-medium">{org.display_name}</p>
            </div>
            <div>
              <p className="text-slate-500">Legal name</p>
              <p className="font-medium">{org.legal_name}</p>
            </div>
            <div>
              <p className="text-slate-500">Slug</p>
              <p className="font-medium font-mono">{org.slug}</p>
            </div>
            <div>
              <p className="text-slate-500">Type</p>
              <p className="font-medium">
                {org.organization_type
                  ? ORGANIZATION_TYPE_LABELS[org.organization_type as OrganizationType]
                  : '—'}
              </p>
            </div>
            <div>
              <p className="text-slate-500">Timezone</p>
              <p className="font-medium">{org.timezone}</p>
            </div>
            <div>
              <p className="text-slate-500">Country</p>
              <p className="font-medium">{org.country_code}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Contact & billing</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm">
            <div>
              <p className="text-slate-500">Primary contact</p>
              <p className="font-medium">{org.primary_contact_name ?? '—'}</p>
            </div>
            <div>
              <p className="text-slate-500">Contact email</p>
              <p className="font-medium">{org.primary_contact_email ?? '—'}</p>
            </div>
            <div>
              <p className="text-slate-500">Billing email</p>
              <p className="font-medium">{org.billing_email ?? '—'}</p>
            </div>
            <div>
              <p className="text-slate-500">Tax/VAT number</p>
              <p className="font-medium">{org.tax_vat_number ?? '—'}</p>
            </div>
            <div>
              <p className="text-slate-500">Registration number</p>
              <p className="font-medium">{org.registration_number ?? '—'}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Address</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <p className="text-slate-500">Address line 1</p>
            <p className="font-medium">{org.address_line1 ?? '—'}</p>
          </div>
          <div>
            <p className="text-slate-500">Address line 2</p>
            <p className="font-medium">{org.address_line2 ?? '—'}</p>
          </div>
          <div>
            <p className="text-slate-500">City</p>
            <p className="font-medium">{org.city ?? '—'}</p>
          </div>
          <div>
            <p className="text-slate-500">Postal code</p>
            <p className="font-medium">{org.postal_code ?? '—'}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Status history</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm">
          <div>
            <p className="text-slate-500">Created</p>
            <p className="font-medium">{formatDateTime(org.created_at)}</p>
          </div>
          {org.submitted_at ? (
            <div>
              <p className="text-slate-500">Submitted for review</p>
              <p className="font-medium">{formatDateTime(org.submitted_at)}</p>
            </div>
          ) : null}
          {org.reviewed_at ? (
            <div>
              <p className="text-slate-500">Reviewed</p>
              <p className="font-medium">{formatDateTime(org.reviewed_at)}</p>
            </div>
          ) : null}
          {org.status_reason ? (
            <div>
              <p className="text-slate-500">Status reason</p>
              <p className="font-medium">{org.status_reason}</p>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Activity summary</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm sm:grid-cols-3">
          <div>
            <p className="text-slate-500">Locations</p>
            <p className="text-2xl font-semibold">{detail.counts.locations}</p>
          </div>
          <div>
            <p className="text-slate-500">Wards</p>
            <p className="text-2xl font-semibold">{detail.counts.wards}</p>
          </div>
          <div>
            <p className="text-slate-500">Shifts</p>
            <p className="text-2xl font-semibold">{detail.counts.shifts}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Members ({detail.members.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {detail.members.length === 0 ? (
            <p className="text-sm text-slate-500">No members yet.</p>
          ) : (
            <div className="space-y-2">
              {detail.members.map((member) => (
                <div
                  key={member.user_id}
                  className="flex items-center justify-between rounded-md border border-slate-200 p-3"
                >
                  <div>
                    <p className="font-medium text-slate-900">
                      {member.full_name ?? 'Unnamed'}
                    </p>
                    <p className="text-sm text-slate-500">
                      {roleLabel(member.role)} · {member.status}
                    </p>
                  </div>
                  {member.accepted_at ? (
                    <p className="text-xs text-slate-500">
                      Joined {formatDateTime(member.accepted_at)}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Invitations ({detail.invitations.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <OrganizationInvitationForm organizationId={org.id} />
          {detail.invitations.length === 0 ? (
            <p className="text-sm text-slate-500">No invitations sent.</p>
          ) : (
            <div className="space-y-2">
              {detail.invitations.map((inv) => (
                <div
                  key={inv.id}
                  className="flex items-center justify-between rounded-md border border-slate-200 p-3"
                >
                  <div>
                    <p className="font-medium text-slate-900">{inv.email_hint}</p>
                    <p className="text-sm text-slate-500">
                      {roleLabel(inv.role)} · {inv.status}
                    </p>
                  </div>
                  <div className="text-right">
                    {inv.status === 'open' ? (
                      <OrganizationActionsForm
                        action="revoke_invitation"
                        invitationId={inv.id}
                        buttonText="Revoke"
                      />
                    ) : (
                      <p className="text-xs text-slate-500">
                        {inv.accepted_at
                          ? `Accepted ${formatDateTime(inv.accepted_at)}`
                          : inv.revoked_at
                            ? `Revoked ${formatDateTime(inv.revoked_at)}`
                            : `Expires ${formatDateTime(inv.expires_at)}`}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Admin actions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
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
        </CardContent>
      </Card>
    </div>
  );
}
