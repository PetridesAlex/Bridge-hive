import Link from 'next/link';

import { EmptyState } from '@/components/empty-state';
import { PermissionGuard } from '@/components/permission-guard';
import { ShiftStatusBadge } from '@/components/shift-status-badge';
import { Button } from '@/components/ui/button';
import { requireOrgMembership } from '@/lib/auth';
import { formatDateTime, formatRate, roleLabel } from '@/lib/format';
import { createClient } from '@/lib/supabase/server';

export default async function ShiftsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const ctx = await requireOrgMembership(slug);
  const supabase = await createClient();

  const { data: shifts } = await supabase
    .from('shifts')
    .select(
      'id, title, status, starts_at, ends_at, required_role, rate_minor, currency, location:locations(name)',
    )
    .eq('organization_id', ctx.org.id)
    .order('starts_at', { ascending: false });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">Shifts</h2>
          <p className="text-sm text-slate-600">
            Create drafts, publish openings, and track assignments.
          </p>
        </div>
        <PermissionGuard allowed={ctx.capabilities.canManageShifts}>
          <Button asChild>
            <Link href={`/org/${slug}/shifts/new`}>New draft shift</Link>
          </Button>
        </PermissionGuard>
      </div>

      {!shifts?.length ? (
        <EmptyState
          title="No shifts yet"
          description="Create a draft shift and publish it when ready."
          action={
            ctx.capabilities.canManageShifts ? (
              <Button asChild>
                <Link href={`/org/${slug}/shifts/new`}>New draft shift</Link>
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Shift</th>
                <th className="px-4 py-3 font-medium">When</th>
                <th className="px-4 py-3 font-medium">Rate</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {shifts.map((shift) => {
                const locationName =
                  shift.location &&
                  typeof shift.location === 'object' &&
                  'name' in shift.location
                    ? String(shift.location.name)
                    : '—';
                return (
                  <tr key={shift.id} className="border-b border-slate-100 last:border-0">
                    <td className="px-4 py-3">
                      <Link
                        href={`/org/${slug}/shifts/${shift.id}`}
                        className="font-medium text-slate-900 hover:underline"
                      >
                        {shift.title || roleLabel(shift.required_role)}
                      </Link>
                      <p className="text-xs text-slate-500">
                        {locationName} · {roleLabel(shift.required_role)}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {formatDateTime(shift.starts_at, ctx.org.timezone)}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {formatRate(shift.rate_minor, shift.currency)}
                    </td>
                    <td className="px-4 py-3">
                      <ShiftStatusBadge status={shift.status} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
