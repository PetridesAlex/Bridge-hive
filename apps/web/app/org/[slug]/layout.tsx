import { OrgNav } from '@/components/org-nav';
import { requireOrgMembership } from '@/lib/auth';

export default async function OrgLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const ctx = await requireOrgMembership(slug);

  return (
    <div className="min-h-screen">
      <OrgNav
        slug={slug}
        orgName={ctx.org.display_name}
        role={ctx.membership.role}
      />
      <div className="mx-auto max-w-6xl px-6 py-8">{children}</div>
    </div>
  );
}
