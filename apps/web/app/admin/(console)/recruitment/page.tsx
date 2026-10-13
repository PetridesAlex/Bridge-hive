import {
  RECRUITMENT_PLATFORM_STATUS_LABELS,
  WORKER_ROLE_LABELS,
  type RecruitmentPlatformStatus,
  type WorkerRole,
} from '@bridge-hive/domain';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { EmptyState } from '@/components/empty-state';
import { Badge } from '@/components/ui/badge';
import { requirePlatformAdmin } from '@/lib/admin/auth';
import { asUntypedDb } from '@/lib/recruitment-db';
import { createClient } from '@/lib/supabase/server';

export default async function AdminRecruitmentPage() {
  const ctx = await requirePlatformAdmin();
  if (!ctx.capabilities.canReviewRecruitment) {
    redirect('/admin');
  }

  const supabase = asUntypedDb(await createClient());
  const { data: candidates, error } = await supabase
    .from('recruitment_candidates')
    .select(
      'id, full_name, email_normalized, role, platform_status, submitted_at, current_location',
    )
    .order('submitted_at', { ascending: false })
    .limit(200);

  if (error) {
    return (
      <EmptyState
        title="Recruitment queue unavailable"
        description="Apply migration 029 on this environment before reviewing submissions."
      />
    );
  }

  const rows = candidates ?? [];
  const received = rows.filter((r) => r.platform_status === 'received').length;
  const available = rows.filter((r) => r.platform_status === 'available').length;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-bh-honey-strong">
          Recruitment
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-bh-text">
          Talent submissions
        </h1>
        <p className="mt-1 text-sm text-bh-text-secondary">
          Review candidate applications and set global availability for enabled
          organizations.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Total submissions" value={rows.length} />
        <Stat label="Received / pending" value={received} />
        <Stat label="Available to orgs" value={available} />
      </div>

      {rows.length === 0 ? (
        <EmptyState
          title="No submissions yet"
          description="Public applications to /recruitment/apply will appear here."
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-bh-border bg-bh-surface">
          <table className="w-full text-left text-sm">
            <thead className="bg-bh-subtle text-[11px] uppercase tracking-[0.12em] text-bh-text-muted">
              <tr>
                <th className="px-4 py-3">Candidate</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Submitted</th>
                <th className="px-4 py-3 text-right">Open</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id as string} className="border-t border-bh-border">
                  <td className="px-4 py-3">
                    <p className="font-medium text-bh-text">{row.full_name as string}</p>
                    <p className="text-xs text-bh-text-muted">
                      {row.current_location as string}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    {WORKER_ROLE_LABELS[row.role as WorkerRole] ?? String(row.role)}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="muted">
                      {RECRUITMENT_PLATFORM_STATUS_LABELS[
                        row.platform_status as RecruitmentPlatformStatus
                      ] ?? String(row.platform_status)}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-bh-text-secondary">
                    {new Date(row.submitted_at as string).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/admin/recruitment/${row.id}`}
                      className="font-semibold text-bh-teal-strong hover:underline"
                    >
                      Review
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-bh-border bg-bh-surface px-4 py-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-bh-text-muted">
        {label}
      </p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}
