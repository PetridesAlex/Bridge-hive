import type { Metadata } from 'next';

import { OrganizationShell } from '@/components/org/organization-shell';

import type { SwitcherOrg } from '@/components/org/organization-switcher';
import { getAuthBundle, requireOrgMembership } from '@/lib/auth';
import { signedOrgLogoUrl } from '@/lib/org-signed-logo.server';

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
      logoUrl: await signedOrgLogoUrl(m.organization.id, m.organization.logo_path),
    })),
  );

  const currentLogoUrl =
    memberships.find((m) => m.id === ctx.org.id)?.logoUrl ??
    (await signedOrgLogoUrl(ctx.org.id, ctx.org.logo_path));

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
    >
      {children}
    </OrganizationShell>
  );
}
