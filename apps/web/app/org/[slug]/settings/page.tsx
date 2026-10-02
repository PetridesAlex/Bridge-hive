import { Suspense } from 'react';

import {
  ORG_STATUS_LABELS,
  orgOperationalBlockedMessage,
  orgPendingSubmitMessage,
  orgProfileCompleteness,
  type OrgRole,
  type OrgStatus,
} from '@bridge-hive/domain';
import { isOwnedOrganizationLogoPath } from '@bridge-hive/domain';

import { OrganizationSettingsView } from '@/components/org/organization-settings-view';
import { PageHeader } from '@/components/org/page-header';
import { StatusBanner } from '@/components/org/dashboard-widgets';
import { requireOrgMembership } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';

export default async function OrgSettingsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const ctx = await requireOrgMembership(slug);
  const supabase = await createClient();

  const { data } = await supabase.rpc('get_my_organization_setup', {
    p_organization_id: ctx.org.id,
  });

  const orgDetail = data as {
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
  } | null;

  const logoPath = orgDetail?.logo_path ?? ctx.org.logo_path ?? null;
  let logoUrl: string | null = null;
  if (logoPath && isOwnedOrganizationLogoPath(ctx.org.id, logoPath)) {
    const { data: signed } = await supabase.storage
      .from('organization-logos')
      .createSignedUrl(logoPath, 60 * 15);
    logoUrl = signed?.signedUrl ?? null;
  }

  const profileComplete =
    orgProfileCompleteness({
      legalName: orgDetail?.legal_name ?? ctx.org.legal_name,
      displayName: orgDetail?.display_name ?? ctx.org.display_name,
      primaryContactName:
        orgDetail?.primary_contact_name ?? ctx.org.primary_contact_name,
      primaryContactEmail:
        orgDetail?.primary_contact_email ?? ctx.org.primary_contact_email,
    }).complete === 4;
  const statusMessage =
    orgPendingSubmitMessage({
      status: ctx.org.status,
      profileComplete,
    }) ?? orgOperationalBlockedMessage(ctx.org.status);
  const canEdit = ctx.capabilities.canEditProfile;
  const canManageBranding = ctx.membership.role === 'org_admin';

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Organization"
        title="Settings"
        subtitle="Profile, branding, access, billing contact, and verification — in one place."
      />

      {statusMessage ? (
        <StatusBanner
          title={`Status: ${ORG_STATUS_LABELS[ctx.org.status]}`}
          body={
            ctx.org.status === 'rejected' && orgDetail?.status_reason
              ? `${statusMessage} ${orgDetail.status_reason}`
              : statusMessage
          }
          tone={
            ctx.org.status === 'rejected'
              ? 'warning'
              : ctx.org.status === 'suspended' || ctx.org.status === 'closed'
                ? 'danger'
                : 'info'
          }
        />
      ) : null}

      <Suspense fallback={<p className="text-sm text-bh-text-secondary">Loading settings…</p>}>
        <OrganizationSettingsView
          slug={slug}
          organizationId={ctx.org.id}
          status={ctx.org.status as OrgStatus}
          role={ctx.membership.role as OrgRole}
          timezone={ctx.org.timezone}
          orgDetail={orgDetail}
          logoUrl={logoUrl}
          canEditProfile={canEdit}
          canSubmitForReview={ctx.capabilities.canSubmitForReview}
          canManageBranding={canManageBranding}
        />
      </Suspense>
    </div>
  );
}
