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
  const { data: locationRows } = await supabase
    .from('locations')
    .select('id, name, wards(id, name, location_id)')
    .eq('organization_id', ctx.org.id)
    .order('name');

  const locations = (locationRows ?? []).map((location) => ({
    id: location.id,
    name: location.name,
  }));
  const wards = (locationRows ?? []).flatMap((location) => {
    const nested = Array.isArray(location.wards) ? location.wards : [];
    return nested.flatMap((ward) =>
      ward &&
      typeof ward === 'object' &&
      'id' in ward &&
      'name' in ward &&
      typeof ward.id === 'string' &&
      typeof ward.name === 'string'
        ? [
            {
              id: ward.id,
              name: ward.name,
              location_id:
                'location_id' in ward && typeof ward.location_id === 'string'
                  ? ward.location_id
                  : location.id,
            },
          ]
        : [],
    );
  });

  const hasLocations = Boolean(locations.length);

  return (
    <div className="space-y-6 bh-fade-up">
      <div className="space-y-3">
        <BackLink href={`/org/${slug}/shifts`} label="Shifts" />
        <PageHeader
          eyebrow="Shifts"
          title={hasLocations ? 'Create shift' : 'Prepare to create shifts'}
          subtitle={
            hasLocations
              ? 'Four short steps. Save as a private draft, then publish when staffing is ready.'
              : 'Bridge Hive schedules are location-first. Complete this one setup step to unlock drafting and publishing.'
          }
        />
      </div>

      {!hasLocations ? (
        <ShiftLocationSetupGate slug={slug} context="single" />
      ) : (
        <ShiftForm
          slug={slug}
          locations={locations}
          wards={wards.map((ward) => ({
            id: ward.id,
            name: ward.name,
            locationId: ward.location_id,
          }))}
          mode="create"
          canManageWards={ctx.capabilities.canManageWards}
        />
      )}
    </div>
  );
}
