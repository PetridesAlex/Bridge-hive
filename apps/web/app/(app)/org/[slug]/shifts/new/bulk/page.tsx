import { BULK_SHIFT_MAX, type WorkerRole } from '@bridge-hive/domain';
import { formatInTimeZone } from 'date-fns-tz';
import { CalendarRange, Clock3, Layers, Rocket } from 'lucide-react';
import { redirect } from 'next/navigation';

import { BackLink } from '@/components/org/back-link';
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
  const [{ data: locations }, templateShiftResult] = await Promise.all([
    supabase
      .from('locations')
      .select('id, name, timezone, wards(id, name, location_id)')
      .eq('organization_id', ctx.org.id)
      .order('name'),
    template
      ? supabase
          .from('shifts')
          .select(
            'location_id, ward_id, required_role, starts_at, ends_at, break_minutes, rate_minor, currency, title, notes, acceptance_deadline, required_positions, location:locations(timezone)',
          )
          .eq('id', template)
          .eq('organization_id', ctx.org.id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const wards = (locations ?? []).flatMap((location) => {
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

  let defaults: BulkTemplateDefaults | null = null;
  const shift = templateShiftResult.data;
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
      requiredPositions:
        typeof shift.required_positions === 'number' &&
        Number.isFinite(shift.required_positions)
          ? Math.min(100, Math.max(1, Math.trunc(shift.required_positions)))
          : 1,
    };
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
        <header className="relative isolate overflow-hidden rounded-[22px] border border-[rgba(11,42,67,0.08)] bg-[linear-gradient(135deg,rgba(255,255,255,0.94)_0%,rgba(236,246,250,0.88)_100%)] px-5 py-6 shadow-[0_18px_44px_rgba(7,29,48,0.08)] sm:px-7 sm:py-7">
          <span
            aria-hidden
            className="bh-msg-orb pointer-events-none absolute -right-10 -top-16 -z-10 h-56 w-56 rounded-full bg-[radial-gradient(circle_at_30%_30%,rgba(20,169,181,0.30),rgba(20,169,181,0)_68%)]"
          />
          <span
            aria-hidden
            className="bh-msg-orb bh-msg-orb--slow pointer-events-none absolute -bottom-20 left-1/3 -z-10 h-48 w-48 rounded-full bg-[radial-gradient(circle_at_50%_50%,rgba(228,179,52,0.22),rgba(228,179,52,0)_70%)]"
          />
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              <p className="bh-fade-up inline-flex items-center gap-1.5 rounded-full border border-[rgba(14,143,153,0.28)] bg-[rgba(20,169,181,0.10)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-bh-teal-strong">
                <CalendarRange className="h-3.5 w-3.5" aria-hidden />
                Shifts
              </p>
              <h1 className="bh-msg-title bh-fade-up-delay-1 mt-3 text-[clamp(1.9rem,4.4vw,2.8rem)] font-semibold leading-[1.06] tracking-[-0.035em]">
                Create multiple shifts
              </h1>
              <span
                aria-hidden
                className="bh-msg-rule bh-fade-up-delay-2 mt-3 block h-[3px] w-16 rounded-full bg-[linear-gradient(90deg,#14a9b5,#e4b334)]"
              />
              <p className="bh-fade-up-delay-2 mt-3 max-w-2xl text-[15px] leading-6 text-bh-text-secondary">
                Build the batch row by row, edit every shift on its own, then check the
                times before you save drafts or publish.
              </p>
            </div>
            <ul className="bh-fade-up-delay-2 flex flex-wrap items-center gap-2 lg:max-w-sm lg:justify-end">
              <li className="inline-flex items-center gap-2 rounded-full bg-[#071d30] py-1 pl-1 pr-3.5 text-[13px] font-semibold text-white shadow-[0_8px_18px_rgba(7,29,48,0.22)]">
                <span className="grid h-6 w-6 place-items-center rounded-full bg-[#e4b334] text-[#071d30]">
                  <Clock3 className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden />
                </span>
                {ctx.org.timezone || 'Organization timezone'}
              </li>
              <li className="inline-flex items-center gap-1.5 rounded-full bg-white/85 px-3 py-1.5 text-[13px] font-semibold text-[#071d30] ring-1 ring-[#16384f]/15">
                <Layers className="h-3.5 w-3.5 text-bh-teal-strong" aria-hidden />
                Up to {BULK_SHIFT_MAX} shifts
              </li>
              <li className="inline-flex items-center gap-1.5 rounded-full bg-[#fff3cf] px-3 py-1.5 text-[13px] font-semibold text-[#7a5600] ring-1 ring-[#e4b334]/60">
                <Rocket className="h-3.5 w-3.5" aria-hidden />
                Draft or publish
              </li>
            </ul>
          </div>
        </header>
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
