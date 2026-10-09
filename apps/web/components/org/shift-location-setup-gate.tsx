import {
  ArrowRight,
  Building2,
  CalendarClock,
  CheckCircle2,
  MapPin,
  MapPinPlus,
  Sparkles,
  Users,
} from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const PIPELINE = [
  {
    id: 'location',
    label: 'Location',
    detail: 'Site, wards, and timezone',
    active: true,
    Icon: MapPin,
  },
  {
    id: 'shift',
    label: 'Shift details',
    detail: 'Role, hours, and rate',
    active: false,
    Icon: CalendarClock,
  },
  {
    id: 'staff',
    label: 'Staffing',
    detail: 'Draft privately first',
    active: false,
    Icon: Users,
  },
  {
    id: 'publish',
    label: 'Publish',
    detail: 'Open when ready',
    active: false,
    Icon: CheckCircle2,
  },
] as const;

/**
 * Premium empty gate when an org tries to create shifts without any location.
 */
export function ShiftLocationSetupGate({
  slug,
  context = 'single',
}: {
  slug: string;
  context?: 'single' | 'bulk';
}) {
  const headline =
    context === 'bulk'
      ? 'Set up a location to build shifts in bulk'
      : 'Set up your first location to create shifts';
  const body =
    context === 'bulk'
      ? 'Bulk schedules need a site with wards and a timezone. Add one location, then return to generate openings in minutes.'
      : 'Every shift is anchored to a clinical site. Add a location once — wards, address, and timezone unlock draft and publish flows.';

  return (
    <section
      className={cn(
        'relative overflow-hidden rounded-3xl border border-bh-border bg-bh-surface',
        'shadow-[0_8px_30px_rgba(7,29,48,0.06)]',
      )}
    >
      <div
        className={cn(
          'bh-gradient-sheen absolute inset-0 opacity-90',
          'bg-[linear-gradient(135deg,var(--bh-teal-soft)_0%,var(--bh-surface)_42%,var(--bh-honey-soft)_100%)]',
        )}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-bh-teal/15 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-20 left-10 h-44 w-44 rounded-full bg-bh-honey/20 blur-3xl"
        aria-hidden
      />

      <div className="relative grid gap-8 p-6 sm:p-8 lg:grid-cols-[1.15fr_0.85fr] lg:gap-10 lg:p-10">
        <div className="space-y-6">
          <div className="bh-fade-up inline-flex items-center gap-2 rounded-full border border-bh-teal/25 bg-bh-surface/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-bh-teal-strong shadow-sm backdrop-blur-sm">
            <Sparkles className="h-3.5 w-3.5" aria-hidden />
            Setup required
          </div>

          <div className="bh-fade-up-delay-1 space-y-3">
            <div className="flex items-start gap-4">
              <span className="bh-soft-pulse flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-bh-sidebar text-bh-honey shadow-[0_10px_28px_rgba(7,29,48,0.22)]">
                <MapPinPlus className="h-7 w-7" aria-hidden />
              </span>
              <div className="min-w-0 pt-0.5">
                <h2 className="text-2xl font-bold tracking-tight text-bh-text sm:text-[28px] sm:leading-9">
                  {headline}
                </h2>
                <p className="mt-2 max-w-xl text-sm leading-6 text-bh-text-secondary">
                  {body}
                </p>
              </div>
            </div>
          </div>

          <ol className="bh-fade-up-delay-2 grid gap-2 sm:grid-cols-2">
            {PIPELINE.map((step, index) => {
              const Icon = step.Icon;
              return (
                <li
                  key={step.id}
                  className={cn(
                    'flex items-start gap-3 rounded-2xl border px-3.5 py-3 transition-colors',
                    step.active
                      ? 'border-bh-teal/35 bg-bh-surface/90 shadow-sm ring-1 ring-bh-teal/15'
                      : 'border-bh-border/80 bg-bh-surface/55 text-bh-text-secondary',
                  )}
                >
                  <span
                    className={cn(
                      'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-xs font-bold',
                      step.active
                        ? 'bg-bh-teal text-white'
                        : 'bg-bh-subtle text-bh-text-muted',
                    )}
                  >
                    {index + 1}
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <Icon
                        className={cn(
                          'h-3.5 w-3.5',
                          step.active ? 'text-bh-teal-strong' : 'text-bh-text-muted',
                        )}
                        aria-hidden
                      />
                      <p
                        className={cn(
                          'text-sm font-semibold',
                          step.active ? 'text-bh-text' : 'text-bh-text-secondary',
                        )}
                      >
                        {step.label}
                      </p>
                    </div>
                    <p className="mt-0.5 text-xs leading-5 text-bh-text-muted">
                      {step.detail}
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>

          <div className="bh-fade-up-delay-3 flex flex-wrap items-center gap-3">
            <Button asChild size="lg" variant="honey">
              <Link href={`/org/${slug}/locations?new=1`}>
                Add location
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href={`/org/${slug}/locations`}>View locations</Link>
            </Button>
            <Button asChild size="lg" variant="ghost">
              <Link href={`/org/${slug}/shifts`}>Back to shifts</Link>
            </Button>
          </div>
        </div>

        <aside className="bh-fade-up-delay-2 relative overflow-hidden rounded-3xl border border-bh-sidebar/10 bg-bh-sidebar p-5 text-bh-sidebar-text shadow-[0_16px_40px_rgba(7,29,48,0.28)] sm:p-6">
          <div
            className="pointer-events-none absolute -right-8 top-0 h-32 w-32 rounded-full bg-bh-teal/30 blur-2xl"
            aria-hidden
          />
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-bh-honey">
            What you unlock
          </p>
          <ul className="relative mt-4 space-y-3">
            {[
              {
                title: 'Site-aware scheduling',
                copy: 'Shifts inherit timezone and ward structure from the location.',
                Icon: Building2,
              },
              {
                title: 'Draft before publish',
                copy: 'Build privately, then open roles to verified clinicians.',
                Icon: CalendarClock,
              },
              {
                title: 'Role-matched staffing',
                copy: 'Registered Nurse, Ward Assistant, and Physiotherapist openings stay correctly scoped.',
                Icon: Users,
              },
            ].map((item) => {
              const Icon = item.Icon;
              return (
                <li
                  key={item.title}
                  className="flex gap-3 rounded-2xl border border-white/10 bg-white/5 px-3.5 py-3 backdrop-blur-sm"
                >
                  <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-bh-teal/25 text-bh-honey">
                    <Icon className="h-4 w-4" aria-hidden />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-white">{item.title}</p>
                    <p className="mt-0.5 text-xs leading-5 text-bh-sidebar-muted">
                      {item.copy}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
          <p className="relative mt-5 text-xs leading-5 text-bh-sidebar-muted">
            Tip: after you save a location, this page unlocks the full create flow
            automatically.
          </p>
        </aside>
      </div>
    </section>
  );
}
