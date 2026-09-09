import { requireOrgMembership } from '@/lib/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { roleLabel } from '@/lib/format';

export default async function OrgSettingsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const ctx = await requireOrgMembership(slug);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-slate-900">Settings</h2>
        <p className="text-sm text-slate-600">
          Organization profile (read-only in Phase 3).
        </p>
      </div>

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
    </div>
  );
}
