import { AdminNav } from '@/components/admin/admin-nav';
import { requirePlatformAdmin } from '@/lib/admin/auth';
import { createClient } from '@/lib/supabase/server';

export default async function AdminConsoleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = await requirePlatformAdmin();
  const supabase = await createClient();
  const useFunction = ctx.adminRole === 'platform_support';

  let credentialCount = 0;
  let applicationCount = 0;

  if (ctx.capabilities.canViewCredentialMetadata) {
    if (useFunction) {
      const { data } = await supabase.rpc('credential_support_view');
      credentialCount = (data ?? []).filter(
        (c: { status: string }) =>
          c.status === 'pending' || c.status === 'under_review',
      ).length;
    } else {
      const { count } = await supabase
        .from('credentials')
        .select('id', { count: 'exact', head: true })
        .in('status', ['pending', 'under_review']);
      credentialCount = count ?? 0;
    }
  }

  if (ctx.capabilities.canViewWorkers) {
    const { data } = await supabase.rpc(
      'verification_application_dashboard_counts',
    );
    const dash = Array.isArray(data) ? data[0] : data;
    if (dash && typeof dash === 'object') {
      const row = dash as {
        ready_for_review?: number;
        under_review?: number;
      };
      applicationCount =
        Number(row.ready_for_review ?? 0) + Number(row.under_review ?? 0);
    }
  }

  return (
    <div className="min-h-screen">
      <AdminNav
        role={ctx.adminRole}
        displayName={ctx.profile?.full_name ?? ctx.user.email ?? 'Admin'}
        queueCounts={{
          credentials: credentialCount,
          applications: applicationCount,
        }}
      />
      <div className="mx-auto max-w-6xl px-6 py-8">{children}</div>
    </div>
  );
}
