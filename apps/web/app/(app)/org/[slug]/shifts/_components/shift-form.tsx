'use client';

import {
  CREDENTIAL_TYPES,
  WORKER_ROLES,
  WORKER_ROLE_LABELS,
  credentialTypeLabel,
  type CredentialType,
  type WorkerRole,
} from '@bridge-hive/domain';
import type { Tables } from '@bridge-hive/supabase-types';
import {
  Activity,
  Building2,
  CalendarClock,
  Check,
  ClipboardList,
  FileBadge2,
  FileText,
  HeartPulse,
  IdCard,
  MapPin,
  Minus,
  Plus,
  ShieldCheck,
  Stethoscope,
  Users,
  Wallet,
} from 'lucide-react';
import Link from 'next/link';
import { useActionState, useEffect, useState } from 'react';
import { toast } from 'sonner';

import {
  createShiftDraftAction,
  updateShiftDraftAction,
  type ActionResult,
} from '@/app/actions/shifts';
import { ShiftScheduleFields } from './shift-schedule-fields';
import { WardLibraryDialog } from '@/components/org/ward-library-dialog';
import {
  WardUnitSelector,
  type WardUnitOption,
} from '@/components/org/ward-unit-selector';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  formatDateTimeLocalInput,
  minorToEurosInput,
  roleLabel,
} from '@/lib/format';
import { cn } from '@/lib/utils';

const CREDENTIAL_GROUPS: Array<{
  id: string;
  title: string;
  hint: string;
  icon: typeof IdCard;
  types: CredentialType[];
}> = [
  {
    id: 'identity',
    title: 'Identity',
    hint: 'Only if this shift needs both sides on file beyond the role baseline.',
    icon: IdCard,
    types: ['identity_document_front', 'identity_document_back'],
  },
  {
    id: 'professional',
    title: 'Professional',
    hint: 'Nursing, physiotherapy, and employment evidence for specialized openings.',
    icon: FileBadge2,
    types: [
      'nursing_licence',
      'nursing_degree',
      'employment_certificate',
      'physiotherapy_degree',
      'physiotherapist_registration_certificate',
      'physiotherapy_practising_licence',
    ],
  },
  {
    id: 'compliance',
    title: 'Compliance',
    hint: 'Tax and insurance proofs when finance needs an extra check.',
    icon: ShieldCheck,
    types: ['tax_identification_proof', 'social_insurance_proof'],
  },
  {
    id: 'optional',
    title: 'Optional',
    hint: 'Helpful context — not usually required to claim.',
    icon: FileText,
    types: ['cv'],
  },
];

const CREDENTIAL_BLURBS: Partial<Record<CredentialType, string>> = {
  identity_document_front: 'Front of national ID',
  identity_document_back: 'Back of national ID',
  nursing_licence: 'Valid licence to practise',
  nursing_degree: 'Degree or diploma evidence',
  employment_certificate: 'Job title confirmation',
  physiotherapy_degree: 'Physiotherapy degree evidence',
  physiotherapist_registration_certificate:
    'Cyprus Physiotherapists Register certificate',
  physiotherapy_practising_licence: 'Current annual practising licence',
  tax_identification_proof: 'Tax ID documentation',
  social_insurance_proof: 'Social insurance evidence',
  cv: 'Curriculum vitae',
};

type Location = Pick<Tables<'locations'>, 'id' | 'name'>;
type Shift = Tables<'shifts'>;
type Requirement = Tables<'shift_requirements'>;

const initial: ActionResult = {};
const KNOWN_CREDENTIAL_SET = new Set<string>(CREDENTIAL_TYPES);

const fieldClass =
  'h-11 rounded-xl border-bh-border bg-bh-surface text-bh-text shadow-none focus-visible:border-bh-teal focus-visible:ring-bh-teal/25';

const fieldClassFeatured =
  'h-11 rounded-xl border-[#16384f]/15 bg-white/90 text-bh-text shadow-[inset_0_1px_0_rgba(255,255,255,0.85)] focus-visible:border-bh-teal focus-visible:ring-bh-teal/25';

const ROLE_META: Record<
  WorkerRole,
  { icon: typeof Stethoscope; blurb: string }
> = {
  registered_nurse: {
    icon: Stethoscope,
    blurb: 'Licensed nursing coverage',
  },
  ward_assistant: {
    icon: HeartPulse,
    blurb: 'Ward support and patient care',
  },
  physiotherapist: {
    icon: Activity,
    blurb: 'Therapy and rehabilitation',
  },
};

function clampPositions(raw: string, delta: number): string {
  const parsed = Number.parseInt(raw, 10);
  const base = Number.isFinite(parsed) ? parsed : 1;
  return String(Math.min(100, Math.max(1, base + delta)));
}

function PlacementChip({
  ready,
  label,
  value,
}: {
  ready: boolean;
  label: string;
  value: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex min-w-0 max-w-full items-center gap-2 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1',
        ready
          ? 'bg-white/12 text-white ring-white/15'
          : 'bg-white/6 text-white/65 ring-white/10',
      )}
    >
      <span
        className={cn(
          'h-1.5 w-1.5 shrink-0 rounded-full',
          ready
            ? 'bg-[#e4b334] shadow-[0_0_8px_rgba(228,179,52,0.85)]'
            : 'bg-white/35',
        )}
        aria-hidden
      />
      <span className="uppercase tracking-[0.12em] text-white/50">{label}</span>
      <span className="truncate">{value}</span>
    </span>
  );
}

function Section({
  step,
  title,
  description,
  icon: Icon,
  featured = false,
  meta,
  children,
}: {
  step: number;
  title: string;
  description: string;
  icon: typeof MapPin;
  featured?: boolean;
  meta?: React.ReactNode;
  children: React.ReactNode;
}) {
  if (featured) {
    return (
      <section className="bh-org-enter relative overflow-hidden rounded-2xl border border-[#16384f]/25 bg-white shadow-[0_18px_40px_rgba(7,29,48,0.12)]">
        <header className="relative overflow-hidden bg-[linear-gradient(155deg,#16384f_0%,#071d30_58%,#0c3a42_100%)] px-5 py-4 text-white sm:px-6">
          <span
            aria-hidden
            className="pointer-events-none absolute -left-8 -top-10 h-28 w-28 rounded-full bg-bh-teal/35 blur-2xl"
          />
          <span
            aria-hidden
            className="bh-orb-drift pointer-events-none absolute -bottom-12 right-10 h-24 w-24 rounded-full bg-[#e4b334]/25 blur-2xl"
          />
          <span
            aria-hidden
            className="bh-org-topbar-line pointer-events-none absolute inset-x-0 bottom-0 h-[3px]"
          />
          <div className="relative flex items-start gap-3.5">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#e4b334] text-[#071d30] shadow-[inset_0_1px_0_rgba(255,255,255,0.55),0_8px_16px_rgba(228,179,52,0.35)]">
              <Icon className="h-5 w-5" strokeWidth={2.4} aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#f3d27a]">
                Step {String(step).padStart(2, '0')}
                <span className="mx-2 text-white/35" aria-hidden>
                  ·
                </span>
                <span className="text-white/70">Placement</span>
              </p>
              <h2 className="mt-1 text-[22px] font-bold leading-none tracking-[-0.03em] text-white">
                {title}
              </h2>
              <p className="mt-1.5 text-sm text-white/75">{description}</p>
            </div>
          </div>
          {meta}
        </header>
        <div className="bg-[linear-gradient(180deg,rgba(22,166,182,0.1)_0%,rgba(232,242,250,0.55)_38%,#ffffff_100%)] p-5 sm:p-6">
          <div className="grid gap-4 sm:grid-cols-2">{children}</div>
        </div>
      </section>
    );
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-bh-border bg-bh-surface p-5 shadow-[0_8px_24px_rgba(7,29,48,0.06)] sm:p-6">
      <div className="mb-5 flex items-start gap-3 border-b border-bh-border/70 pb-4">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-bh-teal-soft text-bh-teal-strong">
          <Icon className="h-5 w-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-bh-text-muted">
            Step {step}
          </p>
          <h2 className="text-base font-semibold text-bh-text">{title}</h2>
          <p className="mt-0.5 text-sm text-bh-text-secondary">{description}</p>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>
    </section>
  );
}

function formatPreviewTime(value: string): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function ShiftForm({
  slug,
  locations,
  wards: initialWards = [],
  shift,
  requirements,
  mode,
  canManageWards = true,
}: {
  slug: string;
  locations: Location[];
  wards?: WardUnitOption[];
  shift?: Shift;
  requirements?: Requirement[];
  mode: 'create' | 'edit';
  canManageWards?: boolean;
}) {
  const action =
    mode === 'create'
      ? createShiftDraftAction.bind(null, slug)
      : updateShiftDraftAction.bind(null, slug, shift!.id);

  const [state, formAction, pending] = useActionState(action, initial);
  const [title, setTitle] = useState(shift?.title ?? '');
  const [requiredPositions, setRequiredPositions] = useState(
    String(shift?.required_positions ?? 1),
  );
  const [locationId, setLocationId] = useState(
    shift?.location_id ?? locations[0]?.id ?? '',
  );
  const [wards, setWards] = useState<WardUnitOption[]>(initialWards);
  const [wardId, setWardId] = useState(shift?.ward_id ?? '');
  const [requiredRole, setRequiredRole] = useState(shift?.required_role ?? '');
  const [startsAt, setStartsAt] = useState(
    shift?.starts_at ? formatDateTimeLocalInput(shift.starts_at) : '',
  );
  const [endsAt, setEndsAt] = useState(
    shift?.ends_at ? formatDateTimeLocalInput(shift.ends_at) : '',
  );
  const [acceptanceDeadline, setAcceptanceDeadline] = useState(
    shift?.acceptance_deadline
      ? formatDateTimeLocalInput(shift.acceptance_deadline)
      : '',
  );
  const [rateEuros, setRateEuros] = useState(
    shift ? minorToEurosInput(shift.rate_minor) : '25.00',
  );
  const initialRequirementTypes = (requirements ?? [])
    .map((r) => r.requirement_type)
    .filter((type): type is CredentialType => KNOWN_CREDENTIAL_SET.has(type));
  const [selectedRequirements, setSelectedRequirements] = useState<string[]>(
    initialRequirementTypes,
  );

  const locationName =
    locations.find((l) => l.id === locationId)?.name ?? 'Select location';
  const wardName = wards.find((ward) => ward.id === wardId)?.name;
  const locationReady = Boolean(locationId);
  const roleReady = Boolean(requiredRole);
  const positionsCount = Number.parseInt(requiredPositions, 10);
  const positionsReady = Number.isFinite(positionsCount) && positionsCount >= 1;
  const placementReadyCount = [locationReady, roleReady, positionsReady].filter(
    Boolean,
  ).length;

  useEffect(() => {
    if (state.success) toast.success('Shift saved as draft');
    if (state.error) toast.error(state.error);
  }, [state]);

  function toggleRequirement(type: string) {
    setSelectedRequirements((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type],
    );
  }

  return (
    <form action={formAction} className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
      <div className="space-y-5">
        <Section
          step={1}
          title="Where and who"
          description="Choose the site and the worker role needed for this opening."
          icon={MapPin}
          featured
          meta={
            <div className="relative mt-4 space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <PlacementChip
                  ready={locationReady}
                  label="Site"
                  value={locationReady ? locationName : 'Needed'}
                />
                <PlacementChip
                  ready={Boolean(wardName)}
                  label="Ward"
                  value={wardName ?? 'Optional'}
                />
                <PlacementChip
                  ready={roleReady}
                  label="Role"
                  value={roleReady ? roleLabel(requiredRole) : 'Needed'}
                />
                <PlacementChip
                  ready={positionsReady}
                  label="Positions"
                  value={positionsReady ? String(positionsCount) : 'Needed'}
                />
                <span
                  className="ml-auto text-[11px] font-semibold uppercase tracking-[0.14em] text-white/60"
                  aria-live="polite"
                >
                  {placementReadyCount}/3 ready
                </span>
              </div>
              <div
                className="h-1 overflow-hidden rounded-full bg-white/10"
                role="progressbar"
                aria-label="Placement completeness"
                aria-valuemin={0}
                aria-valuemax={3}
                aria-valuenow={placementReadyCount}
              >
                <div
                  className="h-full rounded-full bg-[#e4b334] shadow-[0_0_10px_rgba(228,179,52,0.55)] transition-[width] duration-300 ease-out motion-reduce:transition-none"
                  style={{ width: `${(placementReadyCount / 3) * 100}%` }}
                />
              </div>
            </div>
          }
        >
          <div className="grid gap-4 rounded-2xl border border-white/80 bg-white/70 p-4 shadow-[0_8px_24px_rgba(7,29,48,0.05)] backdrop-blur-sm sm:col-span-2 sm:grid-cols-[minmax(0,1fr)_13.5rem]">
            <div className="space-y-1.5">
              <Label htmlFor="title" className="text-bh-text">
                Title
              </Label>
              <Input
                id="title"
                name="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Night RN — ICU"
                className={fieldClassFeatured}
              />
              <p className="text-xs text-bh-text-muted">
                Optional. Workers see this on the shift card.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="requiredPositions" className="text-bh-text">
                Positions
              </Label>
              <div className="relative">
                <Users
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-bh-teal-strong"
                  aria-hidden
                />
                <Input
                  id="requiredPositions"
                  name="requiredPositions"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={100}
                  step={1}
                  title="Number of professionals needed for this shift"
                  aria-label="Number of professionals needed for this shift"
                  value={requiredPositions}
                  onChange={(e) => setRequiredPositions(e.target.value)}
                  required
                  className={cn(fieldClassFeatured, 'pl-10 pr-[4.75rem]')}
                />
                <div className="absolute right-1.5 top-1/2 flex -translate-y-1/2 overflow-hidden rounded-lg bg-[#071d30] shadow-[0_6px_14px_rgba(7,29,48,0.2)]">
                  <button
                    type="button"
                    aria-label="Decrease positions"
                    onClick={() =>
                      setRequiredPositions((current) => clampPositions(current, -1))
                    }
                    className="grid h-8 w-8 place-items-center text-white/80 transition-colors hover:bg-white/10 hover:text-white"
                  >
                    <Minus className="h-3.5 w-3.5" aria-hidden />
                  </button>
                  <button
                    type="button"
                    aria-label="Increase positions"
                    onClick={() =>
                      setRequiredPositions((current) => clampPositions(current, 1))
                    }
                    className="grid h-8 w-8 place-items-center border-l border-white/15 text-white/80 transition-colors hover:bg-white/10 hover:text-white"
                  >
                    <Plus className="h-3.5 w-3.5" aria-hidden />
                  </button>
                </div>
              </div>
              <p className="text-xs text-bh-text-muted">
                How many eligible professionals can accept this shift (1–100).
              </p>
            </div>
          </div>

          <div className="grid gap-4 rounded-2xl border border-white/80 bg-white/70 p-4 shadow-[0_8px_24px_rgba(7,29,48,0.05)] backdrop-blur-sm sm:col-span-2 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="locationId" className="inline-flex items-center gap-1.5 text-bh-text">
                <Building2 className="h-3.5 w-3.5 text-bh-teal-strong" aria-hidden />
                Location <span className="text-bh-danger">*</span>
              </Label>
              <Select
                id="locationId"
                name="locationId"
                required
                value={locationId}
                onChange={(e) => {
                  const nextLocationId = e.target.value;
                  setLocationId(nextLocationId);
                  const stillValid = wards.some(
                    (ward) =>
                      ward.id === wardId && ward.locationId === nextLocationId,
                  );
                  if (!stillValid) setWardId('');
                }}
                className={fieldClassFeatured}
              >
                <option value="" disabled>
                  Select location
                </option>
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Label htmlFor="wardId" className="text-bh-text">
                  Ward / Unit
                </Label>
                <WardLibraryDialog
                  slug={slug}
                  locations={locations.map((loc) => ({
                    id: loc.id,
                    name: loc.name,
                  }))}
                  wards={wards}
                  defaultLocationId={locationId}
                  canManage={canManageWards}
                  onCreated={(created, autoSelectWardId) => {
                    setWards((prev) => {
                      const next = [...prev];
                      for (const row of created) {
                        if (!next.some((ward) => ward.id === row.id)) {
                          next.push({
                            id: row.id,
                            name: row.name,
                            locationId: row.locationId,
                          });
                        }
                      }
                      return next;
                    });
                    if (autoSelectWardId) setWardId(autoSelectWardId);
                  }}
                />
              </div>
              <input type="hidden" name="wardId" value={wardId} />
              <WardUnitSelector
                id="wardId"
                locationId={locationId}
                wardId={wardId}
                wards={wards}
                onWardChange={setWardId}
                aria-label="Ward / unit"
              />
            </div>
          </div>

          <div className="space-y-3 rounded-2xl border border-white/80 bg-white/70 p-4 shadow-[0_8px_24px_rgba(7,29,48,0.05)] backdrop-blur-sm sm:col-span-2">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <Label className="text-bh-text">
                Required worker role <span className="text-bh-danger">*</span>
              </Label>
              {roleReady ? (
                <span className="rounded-full bg-[#071d30] px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#f3d27a]">
                  {roleLabel(requiredRole)}
                </span>
              ) : (
                <span className="text-[11px] font-medium text-bh-text-muted">
                  Select a role to continue
                </span>
              )}
            </div>
            <input type="hidden" name="requiredRole" value={requiredRole} />
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3" role="radiogroup" aria-label="Required worker role">
              {WORKER_ROLES.map((role) => {
                const selected = requiredRole === role;
                const RoleIcon = ROLE_META[role].icon;
                return (
                  <button
                    key={role}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => setRequiredRole(role)}
                    className={cn(
                      'group flex items-center gap-3 rounded-xl border px-4 py-3.5 text-left transition-[background-color,box-shadow,transform,border-color] duration-200 motion-reduce:transition-none motion-reduce:hover:translate-y-0',
                      selected
                        ? 'border-white/15 bg-[linear-gradient(155deg,#16384f_0%,#071d30_72%)] text-white shadow-[0_12px_24px_rgba(7,29,48,0.22)]'
                        : 'border-[#16384f]/10 bg-white/85 hover:-translate-y-0.5 hover:border-[#16384f]/25 hover:bg-white hover:shadow-[0_10px_22px_rgba(7,29,48,0.08)]',
                    )}
                  >
                    <span
                      className={cn(
                        'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
                        selected
                          ? 'bg-[#e4b334] text-[#071d30] shadow-[inset_0_1px_0_rgba(255,255,255,0.55)]'
                          : 'bg-bh-teal-soft text-bh-teal-strong',
                      )}
                    >
                      <RoleIcon className="h-4 w-4" strokeWidth={2.3} aria-hidden />
                    </span>
                    <span className="min-w-0">
                      <span
                        className={cn(
                          'block text-sm font-semibold',
                          selected ? 'text-white' : 'text-bh-text',
                        )}
                      >
                        {WORKER_ROLE_LABELS[role]}
                      </span>
                      <span
                        className={cn(
                          'block text-xs',
                          selected ? 'text-white/70' : 'text-bh-text-muted',
                        )}
                      >
                        {ROLE_META[role].blurb}
                      </span>
                    </span>
                    {selected ? (
                      <Check className="ml-auto h-4 w-4 shrink-0 text-[#e4b334]" aria-hidden />
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>
        </Section>

        <Section
          step={2}
          title="When"
          description="Choose the day and a ward pattern, then fine-tune times if needed."
          icon={CalendarClock}
        >
          <ShiftScheduleFields
            startsAt={startsAt}
            endsAt={endsAt}
            acceptanceDeadline={acceptanceDeadline}
            onStartsAtChange={setStartsAt}
            onEndsAtChange={setEndsAt}
            onAcceptanceDeadlineChange={setAcceptanceDeadline}
          />
          <div className="space-y-1.5 sm:col-span-2 sm:max-w-xs">
            <Label htmlFor="breakMinutes">Break (minutes)</Label>
            <Input
              id="breakMinutes"
              name="breakMinutes"
              type="number"
              min={0}
              defaultValue={shift?.break_minutes ?? 0}
              className={fieldClass}
            />
          </div>
        </Section>

        <Section
          step={3}
          title="Pay"
          description="Hourly gross rate paid to the worker after timesheet approval."
          icon={Wallet}
        >
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="rateEuros">
              Hourly rate (EUR) <span className="text-bh-danger">*</span>
            </Label>
            <div className="relative max-w-xs">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-bh-text-muted">
                €
              </span>
              <Input
                id="rateEuros"
                name="rateEuros"
                type="number"
                step="0.01"
                min="0.01"
                required
                value={rateEuros}
                onChange={(e) => setRateEuros(e.target.value)}
                className={cn(fieldClass, 'pl-8')}
              />
            </div>
            <input type="hidden" name="currency" value="EUR" />
            <p className="text-xs text-bh-text-muted">
              Organization pays approved gross to the worker. Bridge Hive commission is billed
              to the worker separately.
            </p>
          </div>
        </Section>

        <Section
          step={4}
          title="Requirements and notes"
          description="Role credentials are already enforced by Bridge Hive. Add extras only when this opening needs more."
          icon={ClipboardList}
        >
          <div className="space-y-4 sm:col-span-2">
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-bh-teal/20 bg-bh-teal-soft/40 px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-bh-text">Additional credentials</p>
                <p className="text-xs text-bh-text-secondary">
                  Tap to require a document for this shift only.
                </p>
              </div>
              <span
                className={cn(
                  'inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold transition-colors',
                  selectedRequirements.length > 0
                    ? 'border-bh-teal/30 bg-bh-surface text-bh-teal-strong'
                    : 'border-bh-border bg-bh-surface text-bh-text-muted',
                )}
                aria-live="polite"
              >
                {selectedRequirements.length === 0
                  ? 'Role baseline only'
                  : `${selectedRequirements.length} extra selected`}
              </span>
            </div>

            <div className="space-y-4">
              {CREDENTIAL_GROUPS.map((group) => {
                const Icon = group.icon;
                const groupSelected = group.types.filter((t) =>
                  selectedRequirements.includes(t),
                ).length;
                return (
                  <div
                    key={group.id}
                    className="overflow-hidden rounded-2xl border border-bh-border bg-gradient-to-b from-bh-subtle/50 to-bh-surface"
                  >
                    <div className="flex items-start gap-3 border-b border-bh-border/70 px-4 py-3">
                      <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-bh-surface text-bh-teal-strong ring-1 ring-bh-border">
                        <Icon className="h-4 w-4" aria-hidden />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold text-bh-text">{group.title}</p>
                          {groupSelected > 0 ? (
                            <span className="rounded-full bg-bh-teal-soft px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-bh-teal-strong">
                              {groupSelected} selected
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-0.5 text-xs text-bh-text-muted">{group.hint}</p>
                      </div>
                    </div>
                    <div className="grid gap-2 p-3 sm:grid-cols-2">
                      {group.types.map((type) => {
                        const checked = selectedRequirements.includes(type);
                        return (
                          <button
                            key={type}
                            type="button"
                            role="checkbox"
                            aria-checked={checked}
                            onClick={() => toggleRequirement(type)}
                            className={cn(
                              'group/cred relative flex items-start gap-3 rounded-xl border px-3.5 py-3 text-left transition-all duration-200 motion-reduce:transition-none',
                              checked
                                ? 'border-bh-teal bg-bh-teal-soft/70 shadow-[0_0_0_1px_rgba(22,166,182,0.25)]'
                                : 'border-bh-border/80 bg-bh-surface hover:-translate-y-0.5 hover:border-bh-border-strong hover:bg-bh-subtle/60 hover:shadow-sm motion-reduce:hover:translate-y-0',
                            )}
                          >
                            <input
                              type="checkbox"
                              name="requirementTypes"
                              value={type}
                              checked={checked}
                              onChange={() => toggleRequirement(type)}
                              className="sr-only"
                              tabIndex={-1}
                            />
                            <span
                              className={cn(
                                'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors',
                                checked
                                  ? 'border-bh-teal bg-bh-teal text-white'
                                  : 'border-bh-border-strong bg-bh-surface text-transparent group-hover/cred:border-bh-teal/50',
                              )}
                              aria-hidden
                            >
                              <Check className="h-3.5 w-3.5" />
                            </span>
                            <span className="min-w-0">
                              <span className="block text-sm font-semibold text-bh-text">
                                {credentialTypeLabel(type)}
                              </span>
                              <span className="mt-0.5 block text-xs text-bh-text-muted">
                                {CREDENTIAL_BLURBS[type] ?? 'Extra document for this shift'}
                              </span>
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="notes">Notes for workers</Label>
            <Textarea
              id="notes"
              name="notes"
              defaultValue={shift?.notes ?? ''}
              placeholder="Parking, unit entry, uniform, or reporting instructions…"
              className="min-h-[104px] rounded-xl border-bh-border bg-bh-subtle/30 focus-visible:border-bh-teal focus-visible:bg-bh-surface focus-visible:ring-bh-teal/25"
            />
            <p className="text-xs text-bh-text-muted">
              Visible to workers who view or claim this shift.
            </p>
          </div>
        </Section>

        {state.error ? (
          <p className="rounded-xl border border-bh-danger/20 bg-bh-danger-soft px-4 py-3 text-sm text-bh-danger" role="alert">
            {state.error}
          </p>
        ) : null}

        <div className="sticky bottom-3 z-10 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-bh-border bg-bh-surface/95 px-4 py-3 shadow-[0_8px_24px_rgba(7,29,48,0.08)] backdrop-blur">
          <p className="text-xs text-bh-text-muted">
            Saves as a private draft. Publish when you are ready.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" asChild>
              <Link href={`/org/${slug}/shifts`}>Cancel</Link>
            </Button>
            <Button
              type="submit"
              disabled={pending || locations.length === 0 || !requiredRole}
            >
              {pending ? 'Saving…' : mode === 'create' ? 'Save draft' : 'Save changes'}
            </Button>
          </div>
        </div>
      </div>

      <aside className="lg:sticky lg:top-24 lg:self-start">
        <div className="overflow-hidden rounded-2xl border border-bh-sidebar/15 bg-bh-surface shadow-[0_12px_32px_rgba(7,29,48,0.1)]">
          <div className="relative overflow-hidden bg-bh-sidebar px-5 pb-5 pt-5 text-bh-sidebar-text">
            <div
              className="pointer-events-none absolute -right-8 -top-10 h-32 w-32 rounded-full bg-bh-teal/25 blur-2xl"
              aria-hidden
            />
            <div
              className="pointer-events-none absolute -bottom-10 left-8 h-24 w-24 rounded-full bg-bh-honey/20 blur-2xl"
              aria-hidden
            />
            <div className="relative flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-bh-honey">
                  Live preview
                </p>
                <h3 className="mt-1.5 text-[18px] font-bold leading-snug tracking-tight text-white">
                  {title.trim() || 'Untitled shift'}
                </h3>
              </div>
              <span className="shrink-0 rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-white/90">
                Draft
              </span>
            </div>
            <div className="relative mt-4 flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-bh-teal/25 px-2.5 py-1 text-[11px] font-semibold text-bh-teal-soft">
                <Stethoscope className="h-3 w-3" aria-hidden />
                {requiredRole ? roleLabel(requiredRole) : 'Role pending'}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-semibold text-bh-sidebar-text">
                <MapPin className="h-3 w-3" aria-hidden />
                {locationName !== '—' ? locationName : 'Location pending'}
              </span>
            </div>
          </div>

          <div className="space-y-4 p-5">
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-xl border border-bh-border bg-gradient-to-br from-bh-teal-soft/50 to-bh-surface px-3 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-bh-teal-strong">
                  Starts
                </p>
                <p className="mt-1 text-sm font-semibold leading-snug text-bh-text">
                  {formatPreviewTime(startsAt)}
                </p>
              </div>
              <div className="rounded-xl border border-bh-border bg-gradient-to-br from-bh-info-soft/60 to-bh-surface px-3 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-bh-info">
                  Ends
                </p>
                <p className="mt-1 text-sm font-semibold leading-snug text-bh-text">
                  {formatPreviewTime(endsAt)}
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-bh-honey/25 bg-gradient-to-r from-bh-honey-soft/90 to-bh-surface px-4 py-3.5">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-bh-text-muted">
                Hourly rate
              </p>
              <p className="bh-tabular mt-1 text-2xl font-bold tracking-tight text-bh-sidebar">
                €{rateEuros || '—'}
                <span className="ml-1 text-sm font-semibold text-bh-text-secondary">/ hr</span>
              </p>
            </div>

            <dl className="space-y-3 text-sm">
              <div className="flex items-start justify-between gap-3">
                <dt className="text-bh-text-muted">Credentials</dt>
                <dd className="max-w-[60%] text-right font-semibold text-bh-text">
                  {selectedRequirements.length === 0
                    ? 'Role baseline'
                    : `${selectedRequirements.length} extra`}
                </dd>
              </div>
            </dl>

            {selectedRequirements.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {selectedRequirements.slice(0, 4).map((type) => (
                  <span
                    key={type}
                    className="rounded-full border border-bh-teal/20 bg-bh-teal-soft/60 px-2 py-0.5 text-[10px] font-semibold text-bh-teal-strong"
                  >
                    {credentialTypeLabel(type)}
                  </span>
                ))}
                {selectedRequirements.length > 4 ? (
                  <span className="rounded-full bg-bh-subtle px-2 py-0.5 text-[10px] font-semibold text-bh-text-muted">
                    +{selectedRequirements.length - 4}
                  </span>
                ) : null}
              </div>
            ) : null}

            <p className="rounded-xl border border-bh-border/80 bg-bh-subtle/60 px-3 py-2.5 text-xs leading-5 text-bh-text-secondary">
              Drafts stay private until you publish from the shifts list.
            </p>
          </div>
        </div>
      </aside>
    </form>
  );
}
