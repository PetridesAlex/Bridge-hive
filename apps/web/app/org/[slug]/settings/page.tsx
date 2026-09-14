import { ORG_STATUS_LABELS, orgOperationalBlockedMessage } from '@bridge-hive/domain';

import { OrgProfileForm } from '@/components/org-profile-form';
import { requireOrgMembership } from '@/lib/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { roleLabel } from '@/lib/format';
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
  } | null;

  const statusMessage = orgOperationalBlockedMessage(ctx.org.status);
  const canEdit = ctx.capabilities.canEditProfile;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-slate-900">Settings</h2>
        <p className="text-sm text-slate-600">
          {canEdit
            ? 'Update your organization profile and submit for review.'
            : 'Organization profile information.'}
        </p>
      </div>

      {statusMessage ? (
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-800">
          <p className="font-medium">
            Status: {ORG_STATUS_LABELS[ctx.org.status]}
          </p>
          <p className="mt-1">{statusMessage}</p>
          {ctx.org.status === 'under_review' ? (
            <p className="mt-1">Organization submitted for review.</p>
          ) : null}
        </div>
      ) : null}

      {orgDetail ? (
        <OrgProfileForm
          organizationId={ctx.org.id}
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
          canSubmitForReview={ctx.capabilities.canSubmitForReview}
          readOnly={!canEdit}
        />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Organization</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <p className="text-slate-500">Display name</p>
              <p className="font-medium">{ctx.org.display_name}</p>
            </div>
            <div>
              <p className="text-slate-500">Legal name</p>
              <p className="font-medium">{ctx.org.legal_name}</p>
            </div>
            <div>
              <p className="text-slate-500">Slug</p>
              <p className="font-medium">{ctx.org.slug}</p>
            </div>
            <div>
              <p className="text-slate-500">Timezone</p>
              <p className="font-medium">{ctx.org.timezone}</p>
            </div>
            <div>
              <p className="text-slate-500">Billing email</p>
              <p className="font-medium">{ctx.org.billing_email ?? '—'}</p>
            </div>
            <div>
              <p className="text-slate-500">Your role</p>
              <p className="font-medium">{roleLabel(ctx.membership.role)}</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
