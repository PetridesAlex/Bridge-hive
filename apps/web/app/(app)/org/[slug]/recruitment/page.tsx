import {
  RECRUITMENT_ORG_PIPELINE_LABELS,
  WORKER_ROLE_LABELS,
  type RecruitmentOrgPipelineStatus,
  type WorkerRole,
} from '@bridge-hive/domain';
import Link from 'next/link';

import { EmptyState } from '@/components/empty-state';
import { PageHeader } from '@/components/org/page-header';
import { Badge } from '@/components/ui/badge';
import { requireOrgMembership } from '@/lib/auth';
import { asUntypedDb } from '@/lib/recruitment-db';
import { createClient } from '@/lib/supabase/server';

export default async function OrgRecruitmentPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const ctx = await requireOrgMembership(slug);

  if (!ctx.capabilities.canAccessRecruitment) {
    return (
      <EmptyState
        title="Recruitment not available"
        description="This organization is not enabled for Bridge Hive Recruitment, or your role cannot access it. Ask a platform administrator to enable recruitment for an active organization."
      />
    );
  }

  const roleFilter =
    typeof sp.role === 'string' && sp.role.length > 0 ? sp.role : null;
  const q = typeof sp.q === 'string' ? sp.q.trim().toLowerCase() : '';

  const supabase = asUntypedDb(await createClient());
  let candidateQuery = supabase
    .from('recruitment_candidates')
    .select(
      'id, full_name, role, current_location, country_of_residence, platform_status, submitted_at',
    )
    .eq('platform_status', 'available')
    .order('submitted_at', { ascending: false })
    .limit(100);

  if (roleFilter) {
    candidateQuery = candidateQuery.eq('role', roleFilter);
  }

  const [{ data: candidates, error }, { data: pipeline }, { count: shortlistCount }] =
    await Promise.all([
      candidateQuery,
      supabase
        .from('recruitment_org_pipeline')
        .select('candidate_id, status')
        .eq('organization_id', ctx.org.id),
      supabase
        .from('recruitment_org_pipeline')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', ctx.org.id)
        .eq('status', 'shortlisted'),
    ]);

  if (error) {
    return (
      <EmptyState
        title="Unable to load candidates"
        description="Recruitment data is not available in this environment yet, or access was denied."
      />
    );
  }

  const pipelineByCandidate = new Map(
    (pipeline ?? []).map((row) => [row.candidate_id as string, row.status as string]),
  );

  const rows = (candidates ?? [])
    .filter((c) => {
      if (!q) return true;
      const hay = `${c.full_name} ${c.current_location} ${c.country_of_residence}`.toLowerCase();
      return hay.includes(q);
    })
    .map((c) => ({
      ...c,
      orgStatus: pipelineByCandidate.get(c.id as string) ?? null,
    }));

  const availableCount = rows.length;
  const newlyAdded = rows.filter((c) => {
    const submitted = new Date(c.submitted_at as string).getTime();
    return Date.now() - submitted < 1000 * 60 * 60 * 24 * 14;
  }).length;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Recruitment"
        title="Talent network"
        subtitle="Browse available Bridge Hive talent profiles for your organization. Organization pipeline status is private to you."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Metric label="Available candidates" value={availableCount} />
        <Metric label="Newly added (14 days)" value={newlyAdded} />
        <Metric label="Your shortlist" value={shortlistCount ?? 0} />
      </div>

      <form className="flex flex-wrap items-end gap-3 rounded-2xl border border-bh-border bg-bh-surface p-4">
        <label className="text-sm font-medium text-bh-text">
          Search
          <input
            name="q"
            defaultValue={q}
            placeholder="Name or location"
            className="mt-1 block h-10 w-56 rounded-xl border border-bh-border bg-bh-subtle px-3 text-sm"
          />
        </label>
        <label className="text-sm font-medium text-bh-text">
          Role
          <select
            name="role"
            defaultValue={roleFilter ?? ''}
            className="mt-1 block h-10 rounded-xl border border-bh-border bg-bh-subtle px-3 text-sm"
          >
            <option value="">All roles</option>
            <option value="registered_nurse">Registered Nurse</option>
            <option value="ward_assistant">Ward Assistant</option>
            <option value="physiotherapist">Physiotherapist</option>
          </select>
        </label>
        <button
          type="submit"
          className="h-10 rounded-full bg-bh-sidebar px-4 text-sm font-semibold text-white"
        >
          Apply filters
        </button>
      </form>

      {rows.length === 0 ? (
        <EmptyState
          title="No available candidates"
          description="When Bridge Hive marks profiles available, they will appear here."
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-bh-border bg-bh-surface">
          <table className="w-full text-left text-sm">
            <thead className="bg-bh-subtle/70 text-[11px] uppercase tracking-[0.12em] text-bh-text-muted">
              <tr>
                <th className="px-4 py-3">Candidate</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Location</th>
                <th className="px-4 py-3">Your status</th>
                <th className="px-4 py-3 text-right">Open</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id as string} className="border-t border-bh-border">
                  <td className="px-4 py-3 font-medium text-bh-text">
                    {row.full_name as string}
                  </td>
                  <td className="px-4 py-3">
                    {row.role
                      ? (WORKER_ROLE_LABELS[row.role as WorkerRole] ?? String(row.role))
                      : '—'}
                  </td>
                  <td className="px-4 py-3 text-bh-text-secondary">
                    {row.current_location as string}
                  </td>
                  <td className="px-4 py-3">
                    {row.orgStatus ? (
                      <Badge>
                        {RECRUITMENT_ORG_PIPELINE_LABELS[
                          row.orgStatus as RecruitmentOrgPipelineStatus
                        ] ?? row.orgStatus}
                      </Badge>
                    ) : (
                      <span className="text-bh-text-muted">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/org/${slug}/recruitment/${row.id}`}
                      className="font-semibold text-bh-teal-strong hover:underline"
                    >
                      View
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

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-bh-border bg-bh-surface px-4 py-4 shadow-[0_4px_16px_rgba(7,29,48,0.04)]">
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-bh-text-muted">
        {label}
      </p>
      <p className="mt-1 text-2xl font-semibold tabular-nums text-bh-text">{value}</p>
    </div>
  );
}
