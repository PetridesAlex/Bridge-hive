/**
 * Server-authoritative shift capacity for the worker app.
 *
 * Occupancy must come from get_worker_shift_details → shift_open_positions.
 * Never invent open seats from required_positions, and never recount
 * shift_assignments under the worker JWT (RLS hides peer rows).
 */

export const AVAILABILITY_UNAVAILABLE = 'AVAILABILITY_UNAVAILABLE';

/** Finite non-negative integer open count, otherwise null (unknown). */
export function parseOpenPositions(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  if (!Number.isInteger(value) || value < 0) return null;
  return value;
}

export function parseRequiredPositions(value: unknown, fallback = 1): number {
  if (typeof value === 'number' && Number.isInteger(value) && value >= 1) {
    return value;
  }
  return fallback;
}

export type AvailabilityFields = {
  open_positions: number | null;
  filled_positions: number | null;
  availability_known: boolean;
  availability_error: string | null;
};

/**
 * Map an RPC open_positions value into display/claim fields.
 * Missing/null open → unknown (not 0, not "all open").
 */
export function availabilityFromOpenPositions(
  openRaw: unknown,
  requiredRaw: unknown,
  options?: { error?: string | null },
): AvailabilityFields {
  const required = parseRequiredPositions(requiredRaw);
  const open = parseOpenPositions(openRaw);
  if (open == null) {
    return {
      open_positions: null,
      filled_positions: null,
      availability_known: false,
      availability_error: options?.error ?? AVAILABILITY_UNAVAILABLE,
    };
  }
  return {
    open_positions: open,
    filled_positions: Math.max(0, required - open),
    availability_known: true,
    availability_error: null,
  };
}

/** Marketplace list filter: keep unknowns; drop only known-empty capacity. */
export function marketplaceShiftIsVisible(shift: {
  availability_known: boolean;
  open_positions: number | null;
}): boolean {
  if (!shift.availability_known || shift.open_positions == null) return true;
  return shift.open_positions > 0;
}

/** Claim CTA: require known positive open seats. */
export function canClaimWithAvailability(params: {
  availabilityKnown: boolean;
  openPositions: number | null;
  shiftPublished: boolean;
  alreadyAssigned: boolean;
  liveActionsAllowed: boolean;
}): boolean {
  return (
    params.liveActionsAllowed &&
    params.shiftPublished &&
    !params.alreadyAssigned &&
    params.availabilityKnown &&
    typeof params.openPositions === 'number' &&
    params.openPositions > 0
  );
}

export type ShiftDetailsCapacityInput = {
  shift_id: string;
  organization_name: string;
  location_name: string;
  ward_name: string | null;
  title: string | null;
  starts_at: string;
  ends_at: string;
  rate_minor: number;
  currency: string;
  required_role: string;
  status: string;
  notes: string | null;
  break_minutes: number;
  acceptance_deadline: string | null;
  required_positions?: number | null;
  open_positions?: number | null;
  location_address_line1?: string | null;
  location_address_line2?: string | null;
  location_city?: string | null;
  location_postal_code?: string | null;
  location_country_code?: string | null;
  location_latitude?: number | null;
  location_longitude?: number | null;
};

export type NormalizedShiftDetailsCapacity = ShiftDetailsCapacityInput & {
  required_positions: number;
  open_positions: number | null;
  availability_known: boolean;
  availability_error: string | null;
};

/** Normalize RPC row capacity — never invent open seats. */
export function normalizeShiftDetailsCapacity(
  row: ShiftDetailsCapacityInput,
): NormalizedShiftDetailsCapacity {
  const required = parseRequiredPositions(row.required_positions);
  const availability = availabilityFromOpenPositions(row.open_positions, required);
  return {
    ...row,
    required_positions: required,
    open_positions: availability.open_positions,
    availability_known: availability.availability_known,
    availability_error: availability.availability_error,
  };
}

/**
 * Metadata-only path when get_worker_shift_details is missing.
 * Intentionally ignores any worker-visible assignment count.
 */
export function metadataOnlyShiftDetailsCapacity(params: {
  shiftId: string;
  title: string | null;
  startsAt: string;
  endsAt: string;
  rateMinor: number;
  currency: string;
  requiredRole: string;
  status: string;
  notes: string | null;
  breakMinutes: number;
  acceptanceDeadline: string | null;
  requiredPositions: unknown;
  /** @deprecated Accepted only to prove it is ignored. */
  visibleAssignmentCount?: number;
}): NormalizedShiftDetailsCapacity {
  void params.visibleAssignmentCount;
  const required = parseRequiredPositions(params.requiredPositions);
  const availability = availabilityFromOpenPositions(null, required, {
    error: AVAILABILITY_UNAVAILABLE,
  });
  return {
    shift_id: params.shiftId,
    organization_name: 'Organization',
    location_name: 'Location',
    ward_name: null,
    title: params.title,
    starts_at: params.startsAt,
    ends_at: params.endsAt,
    rate_minor: params.rateMinor,
    currency: params.currency,
    required_role: params.requiredRole,
    status: params.status,
    notes: params.notes,
    break_minutes: params.breakMinutes,
    acceptance_deadline: params.acceptanceDeadline,
    required_positions: required,
    open_positions: availability.open_positions,
    availability_known: availability.availability_known,
    availability_error: availability.availability_error,
    location_address_line1: null,
    location_address_line2: null,
    location_city: null,
    location_postal_code: null,
    location_country_code: null,
    location_latitude: null,
    location_longitude: null,
  };
}
