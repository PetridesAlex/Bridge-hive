import Link from 'next/link';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { requireOrgMembership } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import {
  ORG_STATUS_LABELS,
  orgOperationalBlockedMessage,
  type OrgStatus,
} from '@bridge-hive/domain';

export default async function OrgDashboardPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const ctx = await requireOrgMembership(slug);
  const supabase = await createClient();

  const [{ count: openShifts }, { count: locationsCount }, { count: draftShifts }] =
    await Promise.all([
      supabase
        .from('shifts')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', ctx.org.id)
        .eq('status', 'published'),
      supabase
        .from('locations')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', ctx.org.id),
      supabase
        .from('shifts')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', ctx.org.id)
        .eq('status', 'draft'),
    ]);

  const { data: upcoming } = await supabase
    .from('shifts')
    .select('id, title, starts_at, status, required_role')
    .eq('organization_id', ctx.org.id)
    .in('status', ['published', 'filled', 'draft'])
    .gte('starts_at', new Date().toISOString())
    .order('starts_at', { ascending: true })
    .limit(5);

  const statusMessage = orgOperationalBlockedMessage(ctx.org.status as OrgStatus);

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <div className="mb-2 flex items-center gap-2">
            <Badge
              variant={
                ctx.org.status === 'active'
                  ? 'success'
                  : ctx.org.status === 'suspended'
                    ? 'danger'
                    : 'muted'
              }
            >
              {ORG_STATUS_LABELS[ctx.org.status as OrgStatus] ??
                ctx.org.status.toUpperCase()}
            </Badge>
          </div>
          <CardTitle className="text-2xl">
            Welcome to {ctx.org.display_name}
          </CardTitle>
          <p className="text-sm text-slate-600">
            {ctx.capabilities.canOperate
              ? 'Manage locations, publish shifts, and review completed work.'
              : statusMessage}
          </p>
          {ctx.capabilities.canSubmitForReview ? (
            <div className="mt-3">
              <Button asChild>
                <Link href={`/org/${slug}/settings`}>
                  Complete setup and submit for review
                </Link>
              </Button>
            </div>
          ) : null}
        </CardHeader>
      </Card>

      {statusMessage ? (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="pt-6">
            <p className="text-sm font-medium text-amber-900">{statusMessage}</p>
          </CardContent>
        </Card>
      ) : null}

      {ctx.capabilities.canOperate ? (
        <section>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Snapshot
          </h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <CardContent className="pt-6">
                <p className="text-3xl font-semibold">{openShifts ?? 0}</p>
                <p className="text-sm text-slate-500">Open shifts</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-3xl font-semibold">{draftShifts ?? 0}</p>
                <p className="text-sm text-slate-500">Draft shifts</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-3xl font-semibold">{locationsCount ?? 0}</p>
                <p className="text-sm text-slate-500">Locations</p>
              </CardContent>
            </Card>
          </div>
        </section>
      ) : null}

      {ctx.capabilities.canOperate ? (
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Upcoming shifts
            </h2>
            <Button variant="outline" size="sm" asChild>
              <Link href={`/org/${slug}/shifts`}>View all</Link>
            </Button>
          </div>
        {upcoming && upcoming.length > 0 ? (
          <ul className="space-y-2">
            {upcoming.map((shift) => (
              <li key={shift.id}>
                <Link
                  href={`/org/${slug}/shifts/${shift.id}`}
                  className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3 hover:bg-slate-50"
                >
                  <span className="font-medium text-slate-900">
                    {shift.title || shift.required_role}
                  </span>
                  <Badge variant="muted">{shift.status}</Badge>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <Card>
            <CardContent className="py-10 text-center text-sm text-slate-500">
              No upcoming shifts yet.{' '}
              {ctx.capabilities.canManageShifts ? (
                <Link
                  href={`/org/${slug}/shifts/new`}
                  className="font-medium text-slate-900 underline"
                >
                  Create a draft
                </Link>
              ) : null}
            </CardContent>
          </Card>
        )}
        </section>
      ) : null}

      {ctx.capabilities.canOperate ? (
        <section>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Quick actions
          </h2>
          <div className="flex flex-wrap gap-2">
            {ctx.capabilities.canManageLocations ? (
              <Button variant="secondary" asChild>
                <Link href={`/org/${slug}/locations`}>Manage locations</Link>
              </Button>
            ) : null}
            {ctx.capabilities.canManageShifts ? (
              <Button asChild>
                <Link href={`/org/${slug}/shifts/new`}>New draft shift</Link>
              </Button>
            ) : null}
          </div>
        </section>
      ) : null}
    </div>
  );
}
