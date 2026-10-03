import { redirect } from 'next/navigation';

import { BackLink } from '@/components/org/back-link';
import { PageHeader } from '@/components/org/page-header';
import { ShiftLocationSetupGate } from '@/components/org/shift-location-setup-gate';
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

  const hasLocations = Boolean(locations?.length);

  return (
    <div className="space-y-6 bh-fade-up">
      <div className="space-y-3">
        <BackLink href={`/org/${slug}/shifts`} label="Shifts" />
        <PageHeader
          eyebrow="Shifts"
          title={hasLocations ? 'Create shift' : 'Prepare to create shifts'}
          subtitle={
            hasLocations
              ? 'Four short steps. Filter by location and role up top, then save as a private draft until staffing is ready.'
              : 'Bridge Hive schedules are location-first. Complete this one setup step to unlock drafting and publishing.'
          }
        />
      </div>

      {!hasLocations ? (
        <ShiftLocationSetupGate slug={slug} context="single" />
      ) : (
        <ShiftForm slug={slug} locations={locations!} mode="create" />
      )}
    </div>
  );
}
