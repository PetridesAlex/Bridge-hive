'use client';

import {
  CREDENTIAL_TYPES,
  WORKER_ROLES,
  WORKER_ROLE_LABELS,
  credentialTypeLabel,
  type CredentialType,
} from '@bridge-hive/domain';
import type { Tables } from '@bridge-hive/supabase-types';
import {
  CalendarClock,
  Check,
  ClipboardList,
  FileBadge2,
  FileText,
  IdCard,
  MapPin,
  ShieldCheck,
  Stethoscope,
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
    hint: 'Nursing and employment evidence for specialized openings.',
    icon: FileBadge2,
    types: ['nursing_licence', 'nursing_degree', 'employment_certificate'],
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
  tax_identification_proof: 'Tax ID documentation',
  social_insurance_proof: 'Social insurance evidence',
  cv: 'Curriculum vitae',
};

type Location = Tables<'locations'>;
type Shift = Tables<'shifts'>;
type Requirement = Tables<'shift_requirements'>;

const initial: ActionResult = {};
const KNOWN_CREDENTIAL_SET = new Set<string>(CREDENTIAL_TYPES);

const fieldClass =
  'h-11 rounded-xl border-bh-border bg-bh-surface text-bh-text shadow-none focus-visible:border-bh-teal focus-visible:ring-bh-teal/25';

function Section({
  step,
  title,
  description,
  icon: Icon,
  children,
}: {
  step: number;
  title: string;
  description: string;
  icon: typeof MapPin;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-bh-border bg-bh-surface p-5 shadow-[0_1px_2px_rgba(7,29,48,0.04)] sm:p-6">
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
  shift,
  requirements,
  mode,
}: {
  slug: string;
  locations: Location[];
  shift?: Shift;
  requirements?: Requirement[];
  mode: 'create' | 'edit';
}) {
  const action =
    mode === 'create'
      ? createShiftDraftAction.bind(null, slug)
      : updateShiftDraftAction.bind(null, slug, shift!.id);

  const [state, formAction, pending] = useActionState(action, initial);
  const [title, setTitle] = useState(shift?.title ?? '');
  const [locationId, setLocationId] = useState(
    shift?.location_id ?? locations[0]?.id ?? '',
  );
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
        >
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              name="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Night RN — ICU"
              className={fieldClass}
            />
            <p className="text-xs text-bh-text-muted">
              Optional. Workers see this on the shift card.
            </p>
          </div>

          <div className="space-y-1.5 sm:col-span-2 sm:max-w-md">
            <Label htmlFor="locationId">
              Location <span className="text-bh-danger">*</span>
            </Label>
            <Select
              id="locationId"
              name="locationId"
              required
              value={locationId}
              onChange={(e) => setLocationId(e.target.value)}
              className={fieldClass}
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
            {/* Preserve existing ward on edit without exposing a ward picker. */}
            <input type="hidden" name="wardId" value={shift?.ward_id ?? ''} />
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label>
              Required worker role <span className="text-bh-danger">*</span>
            </Label>
            <input type="hidden" name="requiredRole" value={requiredRole} />
            <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Required worker role">
              {WORKER_ROLES.map((role) => {
                const selected = requiredRole === role;
                return (
                  <button
                    key={role}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => setRequiredRole(role)}
                    className={cn(
                      'flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors',
                      selected
                        ? 'border-bh-teal bg-bh-teal-soft/70 ring-1 ring-bh-teal/30'
                        : 'border-bh-border bg-bh-surface hover:border-bh-border-strong hover:bg-bh-subtle/60',
                    )}
                  >
                    <span
                      className={cn(
                        'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
                        selected
                          ? 'bg-bh-teal text-white'
                          : 'bg-bh-subtle text-bh-text-secondary',
                      )}
                    >
                      <Stethoscope className="h-4 w-4" aria-hidden />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-bh-text">
                        {WORKER_ROLE_LABELS[role]}
                      </span>
                      <span className="block text-xs text-bh-text-muted">
                        Platform credentials still apply
                      </span>
                    </span>
                    {selected ? (
                      <Check className="ml-auto h-4 w-4 shrink-0 text-bh-teal-strong" aria-hidden />
                    ) : null}
                  </button>
                );
              })}
            </div>
            {!requiredRole ? (
              <p className="text-xs text-bh-text-muted">Select a role to continue.</p>
            ) : null}
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
