'use client';

import {
  CREDENTIAL_TYPES,
  WORKER_ROLES,
  WORKER_ROLE_LABELS,
  credentialTypeLabel,
  type CredentialType,
} from '@bridge-hive/domain';
import type { Tables } from '@bridge-hive/supabase-types';
import { useActionState, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import {
  createShiftDraftAction,
  updateShiftDraftAction,
  type ActionResult,
} from '@/app/actions/shifts';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  formatDateTimeLocalInput,
  minorToEurosInput,
} from '@/lib/format';

type Location = Tables<'locations'>;
type Ward = Tables<'wards'>;
type Shift = Tables<'shifts'>;
type Requirement = Tables<'shift_requirements'>;

const initial: ActionResult = {};

const KNOWN_CREDENTIAL_SET = new Set<string>(CREDENTIAL_TYPES);

export function ShiftForm({
  slug,
  locations,
  wards,
  shift,
  requirements,
  mode,
}: {
  slug: string;
  locations: Location[];
  wards: Ward[];
  shift?: Shift;
  requirements?: Requirement[];
  mode: 'create' | 'edit';
}) {
  const action =
    mode === 'create'
      ? createShiftDraftAction.bind(null, slug)
      : updateShiftDraftAction.bind(null, slug, shift!.id);

  const [state, formAction, pending] = useActionState(action, initial);
  const [locationId, setLocationId] = useState(
    shift?.location_id ?? locations[0]?.id ?? '',
  );
  const [requiredRole, setRequiredRole] = useState(shift?.required_role ?? '');
  const initialRequirementTypes = (requirements ?? [])
    .map((r) => r.requirement_type)
    .filter((type): type is CredentialType => KNOWN_CREDENTIAL_SET.has(type));
  const [selectedRequirements, setSelectedRequirements] = useState<string[]>(
    initialRequirementTypes,
  );

  const filteredWards = useMemo(
    () => wards.filter((w) => w.location_id === locationId),
    [wards, locationId],
  );

  useEffect(() => {
    if (state.success) toast.success('Shift saved');
    if (state.error) toast.error(state.error);
  }, [state]);

  function toggleRequirement(type: string) {
    setSelectedRequirements((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type],
    );
  }

  return (
    <form action={formAction} className="grid gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2 space-y-1.5">
        <Label htmlFor="title">Title (optional)</Label>
        <Input id="title" name="title" defaultValue={shift?.title ?? ''} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="locationId">Location</Label>
        <Select
          id="locationId"
          name="locationId"
          required
          value={locationId}
          onChange={(e) => setLocationId(e.target.value)}
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
        <Label htmlFor="wardId">Ward (optional)</Label>
        <Select id="wardId" name="wardId" defaultValue={shift?.ward_id ?? ''}>
          <option value="">No ward</option>
          {filteredWards.map((ward) => (
            <option key={ward.id} value={ward.id}>
              {ward.name}
            </option>
          ))}
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="requiredRole">
          Required worker role <span className="text-red-600">*</span>
        </Label>
        <Select
          id="requiredRole"
          name="requiredRole"
          required
          value={requiredRole}
          onChange={(e) => setRequiredRole(e.target.value)}
        >
          <option value="" disabled>
            Select required worker role
          </option>
          {WORKER_ROLES.map((role) => (
            <option key={role} value={role}>
              {WORKER_ROLE_LABELS[role]}
            </option>
          ))}
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="breakMinutes">Break minutes</Label>
        <Input
          id="breakMinutes"
          name="breakMinutes"
          type="number"
          min={0}
          defaultValue={shift?.break_minutes ?? 0}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="startsAt">Starts at</Label>
        <Input
          id="startsAt"
          name="startsAt"
          type="datetime-local"
          required
          defaultValue={
            shift?.starts_at ? formatDateTimeLocalInput(shift.starts_at) : ''
          }
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="endsAt">Ends at</Label>
        <Input
          id="endsAt"
          name="endsAt"
          type="datetime-local"
          required
          defaultValue={
            shift?.ends_at ? formatDateTimeLocalInput(shift.ends_at) : ''
          }
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="rateEuros">Hourly rate (EUR)</Label>
        <Input
          id="rateEuros"
          name="rateEuros"
          type="number"
          step="0.01"
          min="0.01"
          required
          defaultValue={shift ? minorToEurosInput(shift.rate_minor) : '25.00'}
        />
        <input type="hidden" name="currency" value="EUR" />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="acceptanceDeadline">Acceptance deadline (optional)</Label>
        <Input
          id="acceptanceDeadline"
          name="acceptanceDeadline"
          type="datetime-local"
          defaultValue={
            shift?.acceptance_deadline
              ? formatDateTimeLocalInput(shift.acceptance_deadline)
              : ''
          }
        />
      </div>

      <div className="sm:col-span-2 space-y-2">
        <Label>Additional credential requirements (optional)</Label>
        <p className="text-xs text-slate-500">
          Platform role credentials are always required. Select only extra
          documents for this shift.
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          {CREDENTIAL_TYPES.map((type) => (
            <label
              key={type}
              className="flex items-start gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm"
            >
              <input
                type="checkbox"
                name="requirementTypes"
                value={type}
                checked={selectedRequirements.includes(type)}
                onChange={() => toggleRequirement(type)}
                className="mt-1"
              />
              <span>{credentialTypeLabel(type)}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="sm:col-span-2 space-y-1.5">
        <Label htmlFor="notes">Notes</Label>
        <Textarea id="notes" name="notes" defaultValue={shift?.notes ?? ''} />
      </div>

      {state.error ? (
        <p className="sm:col-span-2 text-sm text-red-600" role="alert">
          {state.error}
        </p>
      ) : null}

      <div className="sm:col-span-2">
        <Button type="submit" disabled={pending || locations.length === 0}>
          {pending
            ? 'Saving…'
            : mode === 'create'
              ? 'Create draft'
              : 'Save draft'}
        </Button>
      </div>
    </form>
  );
}
