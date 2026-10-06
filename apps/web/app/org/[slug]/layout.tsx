import type { Metadata } from 'next';

import { OrganizationShell } from '@/components/org/organization-shell';
import type { SwitcherOrg } from '@/components/org/organization-switcher';
import { getAuthBundle, requireOrgMembership } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { isOwnedOrganizationLogoPath } from '@bridge-hive/domain';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  try {
    const { slug } = await params;
    const ctx = await requireOrgMembership(slug);
    return { title: ctx.org.display_name };
  } catch {
    return { title: 'Organization · Bridge Hive' };
  }
}

async function signedLogoUrl(
  organizationId: string,
  logoPath: string | null | undefined,
): Promise<string | null> {
  if (!logoPath || !isOwnedOrganizationLogoPath(organizationId, logoPath)) {
    return null;
  }
  const supabase = await createClient();
  const { data } = await supabase.storage
    .from('organization-logos')
    .createSignedUrl(logoPath, 60 * 15);
  return data?.signedUrl ?? null;
}

export default async function OrgLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const ctx = await requireOrgMembership(slug);
  const bundle = await getAuthBundle();

  const memberships: SwitcherOrg[] = await Promise.all(
    (bundle?.memberships ?? []).map(async (m) => ({
      id: m.organization.id,
      slug: m.organization.slug,
      displayName: m.organization.display_name,
      status: m.organization.status,
      role: m.role,
      logoUrl: await signedLogoUrl(m.organization.id, m.organization.logo_path),
    })),
  );

  const currentLogoUrl = await signedLogoUrl(ctx.org.id, ctx.org.logo_path);

  const current: SwitcherOrg = {
    id: ctx.org.id,
    slug: ctx.org.slug,
    displayName: ctx.org.display_name,
    status: ctx.org.status,
    role: ctx.membership.role,
    logoUrl: currentLogoUrl,
  };

  const userLabel =
    ctx.profile?.full_name?.trim() ||
    ctx.user.email?.split('@')[0] ||
    'Account';

  return (
    <OrganizationShell
      slug={slug}
      orgName={ctx.org.display_name}
      orgLogoUrl={currentLogoUrl}
      current={current}
      memberships={memberships}
      capabilities={ctx.capabilities}
      userLabel={userLabel}
      userEmail={ctx.user.email}
      canCreateShift={ctx.capabilities.canManageShifts}
    >
      {children}
    </OrganizationShell>
  );
}
