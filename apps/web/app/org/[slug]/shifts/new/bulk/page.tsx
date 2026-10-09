import type { WorkerRole } from '@bridge-hive/domain';
import { formatInTimeZone } from 'date-fns-tz';
import { redirect } from 'next/navigation';

import { BackLink } from '@/components/org/back-link';
import { PageHeader } from '@/components/org/page-header';
import { requireOrgMembership } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';

import {
  BulkShiftBuilder,
  type BulkTemplateDefaults,
} from './_components/bulk-shift-builder';

export default async function BulkNewShiftsPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ template?: string }>;
}) {
  const { slug } = await params;
  const { template } = await searchParams;
  const ctx = await requireOrgMembership(slug);

  if (!ctx.capabilities.canManageShifts || !ctx.capabilities.canOperate) {
    redirect(`/org/${slug}/shifts`);
  }

  const supabase = await createClient();
  const { data: locations } = await supabase
    .from('locations')
    .select('id, name, timezone')
    .eq('organization_id', ctx.org.id)
    .order('name');

  const locationIds = (locations ?? []).map((l) => l.id);
  const { data: wards } =
    locationIds.length > 0
      ? await supabase
          .from('wards')
          .select('id, name, location_id')
          .in('location_id', locationIds)
          .order('name')
      : { data: [] as Array<{ id: string; name: string; location_id: string }> };

  let defaults: BulkTemplateDefaults | null = null;
  if (template) {
    const { data: shift } = await supabase
      .from('shifts')
      .select(
        'location_id, ward_id, required_role, starts_at, ends_at, break_minutes, rate_minor, currency, title, notes, acceptance_deadline, location:locations(timezone)',
      )
      .eq('id', template)
      .eq('organization_id', ctx.org.id)
      .maybeSingle();

    if (shift) {
      const loc =
        shift.location && typeof shift.location === 'object' && 'timezone' in shift.location
          ? (shift.location as { timezone: string })
          : null;
      const tz = loc?.timezone ?? 'Europe/Nicosia';
      const startHm = formatInTimeZone(new Date(shift.starts_at), tz, 'HH:mm');
      const endHm = formatInTimeZone(new Date(shift.ends_at), tz, 'HH:mm');
      let deadlineHours: number | null = null;
      if (shift.acceptance_deadline) {
        const ms =
          new Date(shift.starts_at).getTime() -
          new Date(shift.acceptance_deadline).getTime();
        if (ms > 0) {
          deadlineHours = Math.round(ms / (60 * 60 * 1000));
        }
      }
      defaults = {
        locationId: shift.location_id,
        wardId: shift.ward_id,
        requiredRole: shift.required_role as WorkerRole,
        startHm,
        endHm,
        breakMinutes: shift.break_minutes,
        rateMinor: shift.rate_minor,
        currency: shift.currency,
        title: shift.title,
        notes: shift.notes,
        deadlineHoursBefore: deadlineHours,
      };
    }
  }

  const wardOptions = (wards ?? []).map((w) => ({
    id: w.id as string,
    name: w.name as string,
    locationId: w.location_id as string,
  }));

  return (
    <div className="space-y-6 pb-28">
      <div className="space-y-3">
        <BackLink href={`/org/${slug}/shifts`} label="Shifts" />
        <PageHeader
          eyebrow="Shifts"
          title="Create multiple shifts"
          subtitle={`Build a finite preview, review times in ${ctx.org.timezone || 'organization timezone'}, then save as drafts or publish.`}
        />
      </div>

      <BulkShiftBuilder
        slug={slug}
        organizationTimezone={ctx.org.timezone || 'Europe/Nicosia'}
        canPublish={ctx.capabilities.canPublishShifts}
        locations={(locations ?? []).map((l) => ({
          id: l.id,
          name: l.name,
          timezone: l.timezone,
        }))}
        wards={wardOptions}
        defaults={defaults}
      />
    </div>
  );
}
