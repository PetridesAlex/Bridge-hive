'use client';

import { WORKER_ROLES } from '@bridge-hive/domain';
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
  roleLabel,
} from '@/lib/format';

type Location = Tables<'locations'>;
type Ward = Tables<'wards'>;
type Shift = Tables<'shifts'>;
type Requirement = Tables<'shift_requirements'>;

const initial: ActionResult = {};

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

  const filteredWards = useMemo(
    () => wards.filter((w) => w.location_id === locationId),
    [wards, locationId],
  );

  useEffect(() => {
    if (state.success) toast.success('Shift saved');
    if (state.error) toast.error(state.error);
  }, [state]);

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
        <Label htmlFor="requiredRole">Required role</Label>
        <Select
          id="requiredRole"
          name="requiredRole"
          required
          defaultValue={shift?.required_role ?? WORKER_ROLES[0]}
        >
          {WORKER_ROLES.map((role) => (
            <option key={role} value={role}>
              {roleLabel(role)}
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

      <div className="sm:col-span-2 space-y-1.5">
        <Label htmlFor="requirements">
          Credential requirements (one per line)
        </Label>
        <Textarea
          id="requirements"
          name="requirements"
          placeholder="nursing_license&#10;bls_certificate"
          defaultValue={(requirements ?? [])
            .map((r) => r.requirement_type)
            .join('\n')}
        />
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
