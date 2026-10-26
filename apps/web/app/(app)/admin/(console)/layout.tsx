import { AdminShell } from '@/components/admin/admin-shell';
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
  let organizationsAwaitingReview = 0;
  let unreadOrgNotices = 0;

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

  if (ctx.capabilities.canManageOrganizations) {
    const [{ data }, { count }] = await Promise.all([
      supabase.rpc('list_admin_organizations', {
        p_status: 'under_review',
        p_sort: 'oldest',
        p_limit: 1,
        p_offset: 0,
      }),
      supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('type', 'org_submitted')
        .is('read_at', null),
    ]);
    const rows = (data ?? []) as Array<{ total_count?: number }>;
    organizationsAwaitingReview = Number(rows[0]?.total_count ?? 0);
    unreadOrgNotices = count ?? 0;
  }

  return (
    <AdminShell
      capabilities={ctx.capabilities}
      displayName={ctx.profile?.full_name ?? ctx.user.email ?? 'Admin'}
      email={ctx.user.email}
      queueCounts={{
        credentials: credentialCount,
        applications: applicationCount,
        organizations: organizationsAwaitingReview,
        unreadOrgNotices,
      }}
    >
      {children}
    </AdminShell>
  );
}
