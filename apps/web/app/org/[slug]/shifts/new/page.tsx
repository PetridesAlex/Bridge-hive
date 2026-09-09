import Link from 'next/link';
import { redirect } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { requireOrgMembership } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';

import { ShiftForm } from '../_components/shift-form';

export default async function NewShiftPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const ctx = await requireOrgMembership(slug);

  if (!ctx.capabilities.canManageShifts) {
    redirect(`/org/${slug}/shifts`);
  }

  const supabase = await createClient();
  const { data: locations } = await supabase
    .from('locations')
    .select('*')
    .eq('organization_id', ctx.org.id)
    .order('name');

  const locationIds = (locations ?? []).map((l) => l.id);
  const { data: wards } = locationIds.length
    ? await supabase
        .from('wards')
        .select('*')
        .in('location_id', locationIds)
        .order('name')
    : { data: [] };

  return (
    <div className="space-y-6">
      <div>
        <Button variant="ghost" size="sm" asChild className="mb-2 -ml-2">
          <Link href={`/org/${slug}/shifts`}>← Shifts</Link>
        </Button>
        <h2 className="text-2xl font-semibold text-slate-900">New draft shift</h2>
        <p className="text-sm text-slate-600">
          Drafts stay private until you publish them.
        </p>
      </div>

      {!locations?.length ? (
        <Card>
          <CardContent className="py-8 text-sm text-slate-600">
            Create a location before adding shifts.{' '}
            <Link
              href={`/org/${slug}/locations?new=1`}
              className="font-medium text-slate-900 underline"
            >
              Add location
            </Link>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Shift details</CardTitle>
          </CardHeader>
          <CardContent>
            <ShiftForm
              slug={slug}
              locations={locations}
              wards={wards ?? []}
              mode="create"
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
