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
  ArrowLeft,
  ArrowRight,
  Check,
  ClipboardList,
  Euro,
  FileBadge2,
  FileText,
  HeartPulse,
  IdCard,
  MapPin,
  Minus,
  Plus,
  Sparkles,
  ShieldCheck,
  Stethoscope,
  Users,
  Wallet,
} from 'lucide-react';
import Link from 'next/link';
import { useActionState, useEffect, useRef, useState } from 'react';
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
    hint: 'Tax and social insurance numbers when finance needs an extra check.',
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
  tax_identification_proof: 'Tax identification number',
  social_insurance_proof: 'Social insurance number',
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
  {
    icon: typeof Stethoscope;
    blurb: string;
    /** Solid gradient for the icon tile (unselected) and the card (selected). */
    gradient: string;
    glow: string;
    idleBorder: string;
    idleHover: string;
    bar: string;
  }
> = {
  registered_nurse: {
    icon: Stethoscope,
    blurb: 'Licensed nursing coverage',
    gradient: 'bg-[linear-gradient(135deg,#7c3aed_0%,#5b21b6_100%)]',
    glow: 'shadow-[0_14px_28px_rgba(109,40,217,0.4)]',
    idleBorder: 'border-violet-200 bg-violet-50/60',
    idleHover: 'hover:border-violet-400 hover:shadow-[0_12px_24px_rgba(109,40,217,0.18)]',
    bar: 'bg-violet-500',
  },
  ward_assistant: {
    icon: HeartPulse,
    blurb: 'Ward support and patient care',
    gradient: 'bg-[linear-gradient(135deg,#0e8f99_0%,#0a6c75_100%)]',
    glow: 'shadow-[0_14px_28px_rgba(14,143,153,0.4)]',
    idleBorder: 'border-teal-200 bg-teal-50/60',
    idleHover: 'hover:border-teal-400 hover:shadow-[0_12px_24px_rgba(14,143,153,0.18)]',
    bar: 'bg-teal-500',
  },
  physiotherapist: {
    icon: Activity,
    blurb: 'Therapy and rehabilitation',
    gradient: 'bg-[linear-gradient(135deg,#ea580c_0%,#c2410c_100%)]',
    glow: 'shadow-[0_14px_28px_rgba(234,88,12,0.4)]',
    idleBorder: 'border-orange-200 bg-orange-50/60',
    idleHover: 'hover:border-orange-400 hover:shadow-[0_12px_24px_rgba(234,88,12,0.18)]',
    bar: 'bg-orange-500',
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

const RATE_QUICK_PICKS = [15, 20, 25, 30, 40] as const;

const NOTE_SNIPPETS = [
  'Parking is available on site.',
  'Please bring your ID badge.',
  'Wear the unit uniform.',
  'Report to the ward reception on arrival.',
] as const;

/** Rough paid hours between two local datetime strings, minus the stored break. */
function estimatePaidHours(startsAt: string, endsAt: string, breakMinutes: number): number | null {
  if (!startsAt || !endsAt) return null;
  const start = new Date(startsAt).getTime();
  const end = new Date(endsAt).getTime();
  if (Number.isNaN(start) || Number.isNaN(end) || end <= start) return null;
  const minutes = (end - start) / 60000 - Math.max(0, breakMinutes || 0);
  return minutes > 0 ? minutes / 60 : null;
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
  const [notes, setNotes] = useState(shift?.notes ?? '');
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
  const titleSuggestion = [
    roleLabel(requiredRole || ''),
    wardName,
  ]
    .filter((part): part is string => Boolean(part && part.trim()))
    .join(' \u2014 ');

  // Only one site? No need to make the user pick it.
  useEffect(() => {
    if (!locationId && locations.length === 1) setLocationId(locations[0].id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
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

  const rateNumber = Number.parseFloat(rateEuros);
  const paidHours = estimatePaidHours(startsAt, endsAt, shift?.break_minutes ?? 0);
  const positionsNumber = Math.max(1, Number.parseInt(requiredPositions, 10) || 1);
  const checklist = [
    { id: 'role', label: 'Role', done: Boolean(requiredRole) },
    { id: 'location', label: 'Location', done: Boolean(locationId) },
    { id: 'time', label: 'Date & time', done: paidHours !== null },
    { id: 'rate', label: 'Hourly rate', done: Number.isFinite(rateNumber) && rateNumber > 0 },
  ];
  const checklistDone = checklist.filter((item) => item.done).length;
  const readyToSave = checklistDone === checklist.length;
  const [step, setStep] = useState(0);
  const [maxStep, setMaxStep] = useState(0);
  const formRef = useRef<HTMLFormElement>(null);
  const stepperRef = useRef<HTMLDivElement>(null);
  const STEPS = [
    { id: 'where', label: 'Where & who', icon: MapPin, done: Boolean(requiredRole && locationId) },
    { id: 'when', label: 'When', icon: CalendarClock, done: paidHours !== null },
    {
      id: 'pay',
      label: 'Pay',
      icon: Wallet,
      done: Number.isFinite(rateNumber) && rateNumber > 0,
    },
    { id: 'extras', label: 'Requirements', icon: ClipboardList, done: step === 3 },
  ] as const;
  const lastStep = STEPS.length - 1;

  function goToStep(next: number) {
    const clamped = Math.max(0, Math.min(lastStep, next));
    setStep(clamped);
    setMaxStep((current) => Math.max(current, clamped));
    requestAnimationFrame(() =>
      stepperRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }),
    );
  }

  /** Uses the browser's own validation bubbles, but only for the visible step. */
  function validateStep(index: number): boolean {
    const panel = formRef.current?.querySelector<HTMLElement>(`[data-step-panel="${index}"]`);
    if (!panel) return true;
    const fields = panel.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(
      'input, select, textarea',
    );
    for (const field of Array.from(fields)) {
      if (!field.checkValidity()) {
        field.reportValidity();
        return false;
      }
    }
    if (index === 0 && (!requiredRole || !locationId)) return false;
    if (index === 1 && !(startsAt && endsAt)) return false;
    return true;
  }

  function nextStep() {
    if (validateStep(step)) goToStep(step + 1);
  }

  const perWorkerEstimate =
    paidHours && Number.isFinite(rateNumber) && rateNumber > 0 ? rateNumber * paidHours : null;

  return (
    <form
      ref={formRef}
      action={formAction}
      className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]"
      onKeyDown={(event) => {
        // Enter inside a text field should move forward, not save a half-finished shift.
        const target = event.target as HTMLElement;
        if (
          event.key === 'Enter' &&
          step < lastStep &&
          target.tagName === 'INPUT' &&
          (target as HTMLInputElement).type !== 'submit'
        ) {
          event.preventDefault();
          nextStep();
        }
      }}
      onInvalidCapture={(event) => {
        // A required field on another step failed native validation: jump to it.
        const panel = (event.target as HTMLElement).closest<HTMLElement>('[data-step-panel]');
        const index = panel ? Number(panel.dataset.stepPanel) : -1;
        if (index >= 0 && index !== step) setStep(index);
      }}
    >
      <div className="space-y-5">
        <div
          ref={stepperRef}
          role="tablist"
          aria-label="Create shift steps"
          className="flex gap-1 overflow-x-auto rounded-2xl border border-bh-border bg-bh-surface p-1.5 shadow-[0_1px_2px_rgba(7,29,48,0.04)]"
          onKeyDown={(event) => {
            let next = step;
            if (event.key === 'ArrowRight') next = Math.min(lastStep, step + 1);
            else if (event.key === 'ArrowLeft') next = Math.max(0, step - 1);
            else return;
            event.preventDefault();
            event.stopPropagation();
            goToStep(next);
          }}
        >
          {STEPS.map((item, index) => {
            const selected = index === step;
            const StepIcon = item.icon;
            const completed = item.done && !selected && index <= maxStep;
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={selected}
                tabIndex={selected ? 0 : -1}
                onClick={() => goToStep(index)}
                className={cn(
                  'group inline-flex min-w-0 flex-1 items-center justify-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bh-teal motion-reduce:transition-none',
                  selected
                    ? 'bg-[linear-gradient(155deg,#16384f_0%,#071d30_80%)] text-white shadow-[0_8px_18px_rgba(7,29,48,0.22)]'
                    : 'text-bh-text-secondary hover:bg-bh-subtle hover:text-bh-text',
                )}
              >
                <span
                  aria-hidden
                  className={cn(
                    'grid h-6 w-6 shrink-0 place-items-center rounded-full text-[11px] font-bold',
                    selected
                      ? 'bg-[#e4b334] text-[#071d30]'
                      : completed
                        ? 'bg-emerald-600 text-white'
                        : 'bg-bh-subtle text-bh-text-muted ring-1 ring-bh-border',
                  )}
                >
                  {completed ? <Check className="h-3.5 w-3.5" strokeWidth={3.2} /> : index + 1}
                </span>
                <span className="truncate">{item.label}</span>
                <span className="sr-only">{completed ? ' (complete)' : ''}</span>
                <StepIcon className="hidden h-4 w-4 shrink-0 opacity-70 xl:block" aria-hidden />
              </button>
            );
          })}
        </div>

        <div hidden={step !== 0} data-step-panel={0} className="space-y-5">
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
          <div className="grid gap-5 rounded-2xl border border-[#16384f]/10 bg-white/85 p-4 shadow-[0_10px_28px_rgba(7,29,48,0.07)] backdrop-blur-sm sm:col-span-2 sm:grid-cols-[minmax(0,1fr)_16rem] sm:p-5">
            <div className="space-y-2">
              <Label htmlFor="title" className="inline-flex items-center gap-1.5 font-bold text-[#071d30]">
                <FileText className="h-3.5 w-3.5 text-bh-teal-strong" aria-hidden />
                Title
                <span className="rounded-full bg-bh-subtle px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-bh-text-muted">
                  Optional
                </span>
              </Label>
              <Input
                id="title"
                name="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Night RN — ICU"
                className={cn(fieldClassFeatured, 'h-12 text-[15px] font-semibold')}
              />
              {!title.trim() && titleSuggestion ? (
                <button
                  type="button"
                  onClick={() => setTitle(titleSuggestion)}
                  className="group/sug inline-flex max-w-full items-center gap-1.5 rounded-full bg-[#fff3cf] px-3 py-1 text-xs font-semibold text-[#7a5600] ring-1 ring-[#e4b334]/60 transition-all hover:-translate-y-0.5 hover:bg-[#ffe9a8] motion-reduce:hover:translate-y-0"
                >
                  <Plus className="h-3 w-3 shrink-0" aria-hidden />
                  <span className="truncate">Use &ldquo;{titleSuggestion}&rdquo;</span>
                </button>
              ) : (
                <p className="text-xs text-bh-text-muted">Workers see this on the shift card.</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="requiredPositions" className="inline-flex items-center gap-1.5 font-bold text-[#071d30]">
                <Users className="h-3.5 w-3.5 text-bh-teal-strong" aria-hidden />
                Positions
              </Label>
              <div className="flex items-center rounded-2xl border-2 border-[#16384f]/15 bg-white p-1 shadow-[0_6px_16px_rgba(7,29,48,0.06)] transition-colors focus-within:border-bh-teal">
                <button
                  type="button"
                  aria-label="Decrease positions"
                  onClick={() => setRequiredPositions((current) => clampPositions(current, -1))}
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-[#071d30] transition-colors hover:bg-bh-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bh-teal"
                >
                  <Minus className="h-4 w-4" aria-hidden />
                </button>
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
                  className="bh-tabular h-10 min-w-0 flex-1 border-0 bg-transparent px-1 text-center text-xl font-bold text-[#071d30] shadow-none [appearance:textfield] focus-visible:border-transparent focus-visible:ring-0 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                />
                <button
                  type="button"
                  aria-label="Increase positions"
                  onClick={() => setRequiredPositions((current) => clampPositions(current, 1))}
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#071d30] text-white transition-colors hover:bg-[#0c2f48] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bh-honey"
                >
                  <Plus className="h-4 w-4" aria-hidden />
                </button>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                {[1, 2, 3, 5, 10].map((n) => {
                  const active = Number.parseInt(requiredPositions, 10) === n;
                  return (
                    <button
                      key={n}
                      type="button"
                      aria-pressed={active}
                      onClick={() => setRequiredPositions(String(n))}
                      className={cn(
                        'h-7 min-w-9 rounded-full px-2.5 text-xs font-bold transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bh-teal motion-reduce:transition-none',
                        active
                          ? 'bg-[#071d30] text-white shadow-[0_6px_14px_rgba(7,29,48,0.25)]'
                          : 'bg-white text-[#071d30] ring-1 ring-[#16384f]/15 hover:-translate-y-0.5 hover:ring-bh-teal motion-reduce:hover:translate-y-0',
                      )}
                    >
                      {n}
                    </button>
                  );
                })}
                <span className="text-[11px] text-bh-text-muted">max 100</span>
              </div>
            </div>
          </div>

          <div className="space-y-5 rounded-2xl border border-[#16384f]/10 bg-white/85 p-4 shadow-[0_10px_28px_rgba(7,29,48,0.07)] backdrop-blur-sm sm:col-span-2 sm:p-5">
            <div className="space-y-2.5">
              <Label id="location-label" className="inline-flex items-center gap-1.5 font-bold text-[#071d30]">
                <Building2 className="h-3.5 w-3.5 text-bh-teal-strong" aria-hidden />
                Location <span className="text-bh-danger">*</span>
              </Label>
              {/* Keeps native "required" validation for the card picker. */}
              <input
                name="locationId"
                value={locationId}
                onChange={() => undefined}
                required
                tabIndex={-1}
                aria-hidden
                className="pointer-events-none absolute h-0 w-0 opacity-0"
              />
              <div
                role="radiogroup"
                aria-labelledby="location-label"
                className={cn('grid gap-2.5', locations.length > 1 && 'sm:grid-cols-2 xl:grid-cols-3')}
              >
                {locations.map((loc) => {
                  const selected = loc.id === locationId;
                  return (
                    <button
                      key={loc.id}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => {
                        setLocationId(loc.id);
                        const stillValid = wards.some(
                          (ward) => ward.id === wardId && ward.locationId === loc.id,
                        );
                        if (!stillValid) setWardId('');
                      }}
                      className={cn(
                        'group flex items-center gap-3 rounded-2xl border-2 px-3.5 py-3 text-left transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bh-teal focus-visible:ring-offset-2 motion-reduce:transition-none',
                        selected
                          ? '-translate-y-0.5 border-transparent bg-[linear-gradient(135deg,#0e8f99_0%,#0a6c75_100%)] text-white shadow-[0_14px_28px_rgba(14,143,153,0.38)]'
                          : 'border-[#16384f]/12 bg-white hover:-translate-y-0.5 hover:border-bh-teal/50 hover:shadow-[0_10px_22px_rgba(7,29,48,0.08)]',
                      )}
                    >
                      <span
                        className={cn(
                          'grid h-10 w-10 shrink-0 place-items-center rounded-xl',
                          selected
                            ? 'bg-white text-[#0a6c75]'
                            : 'bg-bh-teal-soft text-bh-teal-strong',
                        )}
                      >
                        <MapPin className="h-[18px] w-[18px]" strokeWidth={2.3} aria-hidden />
                      </span>
                      <span className="line-clamp-2 min-w-0 flex-1 break-words text-sm font-bold leading-snug tracking-tight">
                        {loc.name}
                      </span>
                      <span
                        aria-hidden
                        className={cn(
                          'grid h-5 w-5 shrink-0 place-items-center rounded-full',
                          selected
                            ? 'bg-white text-[#0a6c75]'
                            : 'border-2 border-[#16384f]/20',
                        )}
                      >
                        {selected ? <Check className="h-3 w-3" strokeWidth={3.2} /> : null}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Label id="ward-label" htmlFor="wardId" className="inline-flex items-center gap-1.5 font-bold text-[#071d30]">
                  <HeartPulse className="h-3.5 w-3.5 text-bh-teal-strong" aria-hidden />
                  Ward / Unit
                  <span className="rounded-full bg-bh-subtle px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-bh-text-muted">
                    Optional
                  </span>
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
              {!locationId ? (
                <p className="rounded-xl border border-dashed border-[#16384f]/20 bg-bh-subtle/50 px-3 py-2.5 text-sm text-bh-text-muted">
                  Choose a location first to see its wards.
                </p>
              ) : wards.filter((ward) => ward.locationId === locationId).length === 0 ? (
                <p className="rounded-xl border border-dashed border-[#e4b334]/60 bg-[#fff8e8] px-3 py-2.5 text-sm text-[#7a5600]">
                  No saved wards for this location yet. Use &ldquo;Add from ward library&rdquo;, or leave it unspecified.
                </p>
              ) : wards.filter((ward) => ward.locationId === locationId).length > 10 ? (
                <WardUnitSelector
                  id="wardId"
                  locationId={locationId}
                  wardId={wardId}
                  wards={wards}
                  onWardChange={setWardId}
                  aria-label="Ward / unit"
                />
              ) : (
                <div role="radiogroup" aria-labelledby="ward-label" className="flex flex-wrap gap-2">
                  {[{ id: '', name: 'Not specified' }, ...wards
                    .filter((ward) => ward.locationId === locationId)
                    .sort((a, b) => a.name.localeCompare(b.name))].map((ward) => {
                    const selected = ward.id === wardId;
                    return (
                      <button
                        key={ward.id || 'none'}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        onClick={() => setWardId(ward.id)}
                        className={cn(
                          'inline-flex h-10 items-center gap-1.5 rounded-xl px-3.5 text-sm font-semibold transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bh-teal motion-reduce:transition-none',
                          selected
                            ? 'bg-[linear-gradient(155deg,#16384f_0%,#071d30_80%)] text-white shadow-[0_8px_18px_rgba(7,29,48,0.25)]'
                            : 'bg-white text-[#071d30] ring-1 ring-[#16384f]/15 hover:-translate-y-0.5 hover:ring-bh-teal motion-reduce:hover:translate-y-0',
                          selected && ward.id === '' ? 'opacity-90' : '',
                        )}
                      >
                        {selected ? (
                          <Check className="h-3.5 w-3.5 text-[#e4b334]" strokeWidth={3} aria-hidden />
                        ) : null}
                        {ward.name}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-3 rounded-2xl border border-white/80 bg-white/70 p-4 shadow-[0_8px_24px_rgba(7,29,48,0.05)] backdrop-blur-sm sm:col-span-2">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <Label className="text-bh-text">
                Required worker role <span className="text-bh-danger">*</span>
              </Label>
              {roleReady ? (
                <span
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-white',
                    ROLE_META[requiredRole as WorkerRole]?.gradient ?? 'bg-[#071d30]',
                  )}
                >
                  <Check className="h-3 w-3" strokeWidth={3} aria-hidden />
                  {roleLabel(requiredRole)}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#fff3cf] px-2.5 py-1 text-[11px] font-semibold text-[#7a5600] ring-1 ring-[#e4b334]/60">
                  <span className="relative flex h-1.5 w-1.5" aria-hidden>
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#e4b334] opacity-70 motion-reduce:animate-none" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#e4b334]" />
                  </span>
                  Select a role to continue
                </span>
              )}
            </div>
            <input type="hidden" name="requiredRole" value={requiredRole} />
            <div
              className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3"
              role="radiogroup"
              aria-label="Required worker role"
              onKeyDown={(event) => {
                const keys = ['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp'];
                if (!keys.includes(event.key)) return;
                event.preventDefault();
                const index = WORKER_ROLES.indexOf(requiredRole as WorkerRole);
                const forward = event.key === 'ArrowRight' || event.key === 'ArrowDown';
                const next =
                  (index + (forward ? 1 : -1) + WORKER_ROLES.length) % WORKER_ROLES.length;
                setRequiredRole(WORKER_ROLES[next]);
                const buttons =
                  event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="radio"]');
                buttons[next]?.focus();
              }}
            >
              {WORKER_ROLES.map((role, roleIndex) => {
                const selected = requiredRole === role;
                const meta = ROLE_META[role];
                const RoleIcon = meta.icon;
                return (
                  <button
                    key={role}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    tabIndex={selected || (!roleReady && roleIndex === 0) ? 0 : -1}
                    onClick={() => setRequiredRole(role)}
                    className={cn(
                      'group relative flex items-center gap-3.5 overflow-hidden rounded-2xl border-2 px-4 py-4 text-left transition-[background-color,box-shadow,transform,border-color] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bh-teal focus-visible:ring-offset-2 motion-reduce:transition-none motion-reduce:hover:translate-y-0',
                      selected
                        ? cn('-translate-y-0.5 border-transparent text-white', meta.gradient, meta.glow)
                        : cn('hover:-translate-y-0.5', meta.idleBorder, meta.idleHover),
                    )}
                  >
                    {!selected ? (
                      <span
                        aria-hidden
                        className={cn('absolute inset-x-0 top-0 h-1', meta.bar)}
                      />
                    ) : (
                      <span
                        aria-hidden
                        className="pointer-events-none absolute -right-6 -top-8 h-24 w-24 rounded-full bg-white/15 blur-xl"
                      />
                    )}
                    <span
                      className={cn(
                        'relative flex h-12 w-12 shrink-0 items-center justify-center rounded-xl transition-transform duration-200 group-hover:scale-105 motion-reduce:transition-none',
                        selected
                          ? 'bg-white text-[#071d30] shadow-[0_8px_16px_rgba(0,0,0,0.2)]'
                          : cn('text-white shadow-[0_8px_16px_rgba(7,29,48,0.2)]', meta.gradient),
                      )}
                    >
                      <RoleIcon className="h-5 w-5" strokeWidth={2.3} aria-hidden />
                    </span>
                    <span className="relative min-w-0">
                      <span
                        className={cn(
                          'block text-[15px] font-bold tracking-tight',
                          selected ? 'text-white' : 'text-[#071d30]',
                        )}
                      >
                        {WORKER_ROLE_LABELS[role]}
                      </span>
                      <span
                        className={cn(
                          'mt-0.5 block text-xs font-medium',
                          selected ? 'text-white/85' : 'text-bh-text-secondary',
                        )}
                      >
                        {meta.blurb}
                      </span>
                    </span>
                    <span
                      aria-hidden
                      className={cn(
                        'relative ml-auto grid h-6 w-6 shrink-0 place-items-center rounded-full transition-all duration-200 motion-reduce:transition-none',
                        selected
                          ? 'scale-100 bg-white text-[#071d30] opacity-100'
                          : 'scale-75 border-2 border-[#16384f]/20 opacity-70',
                      )}
                    >
                      {selected ? <Check className="h-3.5 w-3.5" strokeWidth={3.2} /> : null}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </Section>
        </div>

        <div hidden={step !== 1} data-step-panel={1} className="space-y-5">
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
          {/* Break field removed from the UI; keep any existing value so edits do not change it. */}
          <input type="hidden" name="breakMinutes" value={shift?.break_minutes ?? 0} />
        </Section>
        </div>

        <div hidden={step !== 2} data-step-panel={2} className="space-y-5">
        <Section
          step={3}
          title="Pay"
          description="Hourly gross rate paid to the worker after timesheet approval."
          icon={Wallet}
        >
          <div className="grid gap-4 sm:col-span-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,15rem)]">
            <div className="space-y-3">
              <Label htmlFor="rateEuros" className="font-bold text-[#071d30]">
                Hourly rate (EUR) <span className="text-bh-danger">*</span>
              </Label>
              <div className="relative">
                <span
                  aria-hidden
                  className="pointer-events-none absolute left-2.5 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-xl bg-[linear-gradient(135deg,#e4b334_0%,#c8951b_100%)] text-[#071d30] shadow-[0_6px_14px_rgba(228,179,52,0.4)]"
                >
                  <Euro className="h-[18px] w-[18px]" strokeWidth={2.6} />
                </span>
                <Input
                  id="rateEuros"
                  name="rateEuros"
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min="0.01"
                  required
                  value={rateEuros}
                  onChange={(e) => setRateEuros(e.target.value)}
                  placeholder="0.00"
                  className="bh-tabular h-14 rounded-2xl border-2 border-[#16384f]/15 bg-white pl-16 pr-16 text-2xl font-bold text-[#071d30] shadow-[0_6px_16px_rgba(7,29,48,0.06)] focus-visible:border-bh-teal focus-visible:ring-bh-teal/25"
                />
                <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-bh-text-muted">
                  / hr
                </span>
              </div>
              <input type="hidden" name="currency" value="EUR" />
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="mr-1 text-[11px] font-semibold uppercase tracking-wider text-bh-text-muted">
                  Quick pick
                </span>
                {RATE_QUICK_PICKS.map((n) => {
                  const active = Number.isFinite(rateNumber) && rateNumber === n;
                  return (
                    <button
                      key={n}
                      type="button"
                      aria-pressed={active}
                      onClick={() => setRateEuros(String(n))}
                      className={cn(
                        'h-8 rounded-full px-3 text-xs font-bold transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bh-teal motion-reduce:transition-none',
                        active
                          ? 'bg-[#071d30] text-white shadow-[0_6px_14px_rgba(7,29,48,0.25)]'
                          : 'bg-white text-[#071d30] ring-1 ring-[#16384f]/15 hover:-translate-y-0.5 hover:ring-bh-teal motion-reduce:hover:translate-y-0',
                      )}
                    >
                      €{n}
                    </button>
                  );
                })}
              </div>
              <p className="flex items-start gap-1.5 text-xs leading-5 text-bh-text-muted">
                <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-bh-teal-strong" aria-hidden />
                Organization pays approved gross to the worker. Bridge Hive commission is billed
                to the worker separately.
              </p>
            </div>

            <div className="relative overflow-hidden rounded-2xl bg-[linear-gradient(155deg,#16384f_0%,#071d30_70%)] p-4 text-white shadow-[0_14px_30px_rgba(7,29,48,0.25)]">
              <span
                aria-hidden
                className="pointer-events-none absolute -right-6 -top-8 h-24 w-24 rounded-full bg-[#e4b334]/25 blur-2xl"
              />
              <p className="relative text-[11px] font-semibold uppercase tracking-[0.14em] text-[#f3d27a]">
                Estimated pay
              </p>
              {perWorkerEstimate ? (
                <>
                  <p className="bh-tabular relative mt-1.5 text-3xl font-bold tracking-tight">
                    €{perWorkerEstimate.toFixed(2)}
                  </p>
                  <p className="relative text-xs text-white/75">
                    per worker &middot; {paidHours?.toFixed(1)} paid h
                  </p>
                  {positionsNumber > 1 ? (
                    <p className="bh-tabular relative mt-3 rounded-xl bg-white/10 px-3 py-2 text-xs font-semibold text-white">
                      {positionsNumber} workers &middot; €
                      {(perWorkerEstimate * positionsNumber).toFixed(2)} total
                    </p>
                  ) : null}
                </>
              ) : (
                <p className="relative mt-2 text-sm leading-5 text-white/75">
                  Enter a rate and shift times to see what this shift will cost.
                </p>
              )}
              <p className="relative mt-3 text-[11px] leading-4 text-white/55">
                Gross, before approval. Final pay follows approved hours.
              </p>
            </div>
          </div>
        </Section>
        </div>

        <div hidden={step !== 3} data-step-panel={3} className="space-y-5">
        <Section
          step={4}
          title="Requirements and notes"
          description="Role credentials are already enforced by Bridge Hive. Add extras only when this opening needs more."
          icon={ClipboardList}
        >
          <div className="overflow-hidden rounded-2xl border border-[#16384f]/12 bg-white shadow-[0_10px_28px_rgba(7,29,48,0.07)] sm:col-span-2">
            <div className="flex flex-wrap items-center justify-between gap-3 bg-[linear-gradient(135deg,#0e8f99_0%,#0a6c75_100%)] px-4 py-3 text-white">
              <div className="flex items-center gap-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white text-[#0a6c75]">
                  <ShieldCheck className="h-[18px] w-[18px]" strokeWidth={2.3} aria-hidden />
                </span>
                <div>
                  <p className="text-sm font-bold leading-tight">Additional credentials</p>
                  <p className="text-xs text-white/80">Optional &middot; applies to this shift only</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold transition-colors',
                    selectedRequirements.length > 0
                      ? 'bg-white text-[#0a6c75]'
                      : 'bg-white/15 text-white',
                  )}
                  aria-live="polite"
                >
                  {selectedRequirements.length > 0 ? (
                    <Check className="h-3 w-3" strokeWidth={3} aria-hidden />
                  ) : null}
                  {selectedRequirements.length === 0
                    ? 'Role baseline only'
                    : `${selectedRequirements.length} extra selected`}
                </span>
                {selectedRequirements.length > 0 ? (
                  <button
                    type="button"
                    onClick={() => setSelectedRequirements([])}
                    className="rounded-full px-2.5 py-1 text-xs font-semibold text-white/85 underline-offset-2 transition-colors hover:bg-white/15 hover:text-white hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                  >
                    Clear
                  </button>
                ) : null}
              </div>
            </div>

            <div className="divide-y divide-[#16384f]/10">
              {CREDENTIAL_GROUPS.map((group) => {
                const Icon = group.icon;
                return (
                  <div
                    key={group.id}
                    className="grid gap-2.5 px-4 py-3.5 md:grid-cols-[9.5rem_minmax(0,1fr)] md:items-start"
                  >
                    <div className="flex items-center gap-2 md:flex-col md:items-start md:gap-1">
                      <span className="inline-flex items-center gap-2">
                        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-[#071d30] text-white">
                          <Icon className="h-3.5 w-3.5" aria-hidden />
                        </span>
                        <span className="text-sm font-bold text-[#071d30]">{group.title}</span>
                      </span>
                      <span className="hidden text-[11px] leading-4 text-bh-text-muted md:block">
                        {group.hint}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {group.types.map((type) => {
                        const checked = selectedRequirements.includes(type);
                        return (
                          <button
                            key={type}
                            type="button"
                            role="checkbox"
                            aria-checked={checked}
                            title={CREDENTIAL_BLURBS[type] ?? 'Extra document for this shift'}
                            onClick={() => toggleRequirement(type)}
                            className={cn(
                              'inline-flex h-9 items-center gap-2 rounded-xl px-3 text-sm font-semibold transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bh-teal focus-visible:ring-offset-1 motion-reduce:transition-none',
                              checked
                                ? 'bg-[linear-gradient(135deg,#0e8f99_0%,#0a6c75_100%)] text-white shadow-[0_8px_18px_rgba(14,143,153,0.35)]'
                                : 'bg-white text-[#071d30] ring-1 ring-[#16384f]/15 hover:-translate-y-0.5 hover:ring-bh-teal motion-reduce:hover:translate-y-0',
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
                              aria-hidden
                              className={cn(
                                'grid h-4 w-4 shrink-0 place-items-center rounded-full',
                                checked ? 'bg-white text-[#0a6c75]' : 'border-2 border-[#16384f]/25',
                              )}
                            >
                              {checked ? <Check className="h-2.5 w-2.5" strokeWidth={3.5} /> : null}
                            </span>
                            {credentialTypeLabel(type)}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="space-y-2.5 rounded-2xl border border-[#16384f]/12 bg-white p-4 shadow-[0_10px_28px_rgba(7,29,48,0.07)] sm:col-span-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Label htmlFor="notes" className="inline-flex items-center gap-1.5 font-bold text-[#071d30]">
                <FileText className="h-3.5 w-3.5 text-bh-teal-strong" aria-hidden />
                Notes for workers
                <span className="rounded-full bg-bh-subtle px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-bh-text-muted">
                  Optional
                </span>
              </Label>
              <span className="bh-tabular text-[11px] font-semibold text-bh-text-muted">
                {notes.length} chars
              </span>
            </div>
            <Textarea
              id="notes"
              name="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Parking, unit entry, uniform, or reporting instructions…"
              className="min-h-[88px] rounded-xl border-2 border-[#16384f]/12 bg-white text-[15px] focus-visible:border-bh-teal focus-visible:ring-bh-teal/25"
            />
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="mr-1 inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-bh-text-muted">
                <Sparkles className="h-3 w-3" aria-hidden />
                Quick add
              </span>
              {NOTE_SNIPPETS.map((snippet) => {
                const used = notes.includes(snippet);
                return (
                  <button
                    key={snippet}
                    type="button"
                    disabled={used}
                    onClick={() =>
                      setNotes((current) => (current.trim() ? `${current.trimEnd()} ${snippet}` : snippet))
                    }
                    className="inline-flex h-8 items-center gap-1 rounded-full bg-white px-3 text-xs font-semibold text-[#071d30] ring-1 ring-[#16384f]/15 transition-all hover:-translate-y-0.5 hover:ring-bh-teal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bh-teal disabled:translate-y-0 disabled:bg-bh-subtle disabled:text-bh-text-muted disabled:ring-0 motion-reduce:hover:translate-y-0"
                  >
                    {used ? (
                      <Check className="h-3 w-3 text-bh-teal-strong" strokeWidth={3} aria-hidden />
                    ) : (
                      <Plus className="h-3 w-3" aria-hidden />
                    )}
                    {snippet.replace(/\.$/, '')}
                  </button>
                );
              })}
            </div>
          </div>
        </Section>
        </div>

        {state.error ? (
          <p className="rounded-xl border border-bh-danger/20 bg-bh-danger-soft px-4 py-3 text-sm text-bh-danger" role="alert">
            {state.error}
          </p>
        ) : null}

        <div className="sticky bottom-3 z-10 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-bh-border bg-bh-surface/95 px-4 py-3 shadow-[0_8px_24px_rgba(7,29,48,0.08)] backdrop-blur">
          <div className="flex items-center gap-3">
            <Button variant="outline" asChild>
              <Link href={`/org/${slug}/shifts`}>Cancel</Link>
            </Button>
            <p className="bh-tabular hidden text-xs font-semibold text-bh-text-muted sm:block">
              Step {step + 1} of {STEPS.length}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {step > 0 ? (
              <Button type="button" variant="outline" onClick={() => goToStep(step - 1)}>
                <ArrowLeft className="h-4 w-4" aria-hidden />
                Back
              </Button>
            ) : null}
            {step < lastStep ? (
              <Button
                type="button"
                onClick={nextStep}
                disabled={step === 0 && (!requiredRole || locations.length === 0)}
                className="min-w-28 bg-[linear-gradient(155deg,#16384f_0%,#071d30_80%)] text-white hover:opacity-95"
              >
                Next
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Button>
            ) : null}
            <Button
              type="submit"
              variant={step === lastStep ? 'default' : 'outline'}
              disabled={pending || locations.length === 0 || !requiredRole}
              className={step === lastStep ? 'min-w-32' : undefined}
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
            <div>
              <div className="mb-1.5 flex items-center justify-between text-[11px] font-bold uppercase tracking-wider">
                <span className={readyToSave ? 'text-emerald-700' : 'text-bh-text-muted'}>
                  {readyToSave ? 'Ready to save' : `${checklistDone} of ${checklist.length} complete`}
                </span>
                <span className="bh-tabular text-[#071d30]">
                  {Math.round((checklistDone / checklist.length) * 100)}%
                </span>
              </div>
              <div
                className="h-2 overflow-hidden rounded-full bg-[#16384f]/10"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={checklist.length}
                aria-valuenow={checklistDone}
                aria-label="Shift form completion"
              >
                <div
                  className={cn(
                    'h-full rounded-full transition-[width] duration-500 motion-reduce:transition-none',
                    readyToSave
                      ? 'bg-[linear-gradient(90deg,#10b981,#059669)]'
                      : 'bg-[linear-gradient(90deg,#e4b334,#f59e0b)]',
                  )}
                  style={{ width: `${(checklistDone / checklist.length) * 100}%` }}
                />
              </div>
              <ul className="mt-2.5 grid grid-cols-2 gap-1.5">
                {checklist.map((item) => (
                  <li
                    key={item.id}
                    className={cn(
                      'flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-semibold transition-colors',
                      item.done
                        ? 'bg-emerald-50 text-emerald-800'
                        : 'bg-bh-subtle text-bh-text-muted',
                    )}
                  >
                    <span
                      aria-hidden
                      className={cn(
                        'grid h-4 w-4 shrink-0 place-items-center rounded-full',
                        item.done ? 'bg-emerald-600 text-white' : 'border-2 border-[#16384f]/20',
                      )}
                    >
                      {item.done ? <Check className="h-2.5 w-2.5" strokeWidth={3.5} /> : null}
                    </span>
                    {item.label}
                  </li>
                ))}
              </ul>
            </div>

            <div className="overflow-hidden rounded-xl border border-[#16384f]/10">
              <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-3 bg-[linear-gradient(135deg,#e6f6f8_0%,#ffffff_100%)] px-3 py-2.5">
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-[linear-gradient(135deg,#0e8f99,#0a6c75)] text-white">
                  <CalendarClock className="h-4 w-4" aria-hidden />
                </span>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-bh-teal-strong">
                    Starts
                  </p>
                  <p className="truncate text-sm font-bold text-[#071d30]">
                    {formatPreviewTime(startsAt)}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-3 border-t border-[#16384f]/10 bg-[linear-gradient(135deg,#e8eefc_0%,#ffffff_100%)] px-3 py-2.5">
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-[linear-gradient(135deg,#4f46e5,#312e81)] text-white">
                  <CalendarClock className="h-4 w-4" aria-hidden />
                </span>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-700">
                    Ends
                  </p>
                  <p className="truncate text-sm font-bold text-[#071d30]">
                    {formatPreviewTime(endsAt)}
                  </p>
                </div>
              </div>
              {paidHours ? (
                <div className="flex items-center justify-between border-t border-[#16384f]/10 bg-bh-subtle/60 px-3 py-2 text-xs">
                  <span className="font-semibold text-bh-text-muted">Paid duration</span>
                  <span className="bh-tabular font-bold text-[#071d30]">
                    {paidHours.toFixed(paidHours % 1 === 0 ? 0 : 1)} h
                  </span>
                </div>
              ) : null}
            </div>

            <div className="relative overflow-hidden rounded-xl bg-[linear-gradient(135deg,#e4b334_0%,#c8951b_100%)] px-4 py-3.5 text-[#071d30] shadow-[0_12px_26px_rgba(228,179,52,0.35)]">
              <span
                aria-hidden
                className="pointer-events-none absolute -right-5 -top-6 h-20 w-20 rounded-full bg-white/30 blur-xl"
              />
              <p className="relative text-[10px] font-bold uppercase tracking-wider text-[#5c4300]">
                Hourly rate
              </p>
              <p className="bh-tabular relative mt-0.5 text-3xl font-extrabold tracking-tight">
                €{rateEuros || '—'}
                <span className="ml-1 text-sm font-bold text-[#5c4300]">/ hr</span>
              </p>
              {perWorkerEstimate ? (
                <p className="bh-tabular relative mt-1.5 rounded-lg bg-[#071d30]/90 px-2.5 py-1.5 text-xs font-semibold text-white">
                  ≈ €{perWorkerEstimate.toFixed(2)} per worker
                  {positionsNumber > 1
                    ? ` · €${(perWorkerEstimate * positionsNumber).toFixed(2)} for ${positionsNumber}`
                    : ''}
                </p>
              ) : null}
            </div>

            <dl className="space-y-2 text-sm">
              <div className="flex items-center justify-between gap-3">
                <dt className="inline-flex items-center gap-1.5 text-bh-text-muted">
                  <Users className="h-3.5 w-3.5" aria-hidden />
                  Positions
                </dt>
                <dd className="bh-tabular rounded-full bg-[#071d30] px-2.5 py-0.5 text-xs font-bold text-white">
                  {positionsNumber}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="inline-flex items-center gap-1.5 text-bh-text-muted">
                  <HeartPulse className="h-3.5 w-3.5" aria-hidden />
                  Ward
                </dt>
                <dd className="max-w-[60%] truncate text-right font-semibold text-bh-text">
                  {wardName || 'Not specified'}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="inline-flex items-center gap-1.5 text-bh-text-muted">
                  <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
                  Credentials
                </dt>
                <dd
                  className={cn(
                    'rounded-full px-2.5 py-0.5 text-xs font-bold',
                    selectedRequirements.length === 0
                      ? 'bg-bh-subtle text-bh-text-secondary'
                      : 'bg-bh-teal text-white',
                  )}
                >
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

            <p className="flex items-start gap-2 rounded-xl border border-[#e4b334]/40 bg-[#fff8e8] px-3 py-2.5 text-xs leading-5 text-[#7a5600]">
              <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
              Drafts stay private until you publish from the shifts list.
            </p>
          </div>
        </div>
      </aside>
    </form>
  );
}
