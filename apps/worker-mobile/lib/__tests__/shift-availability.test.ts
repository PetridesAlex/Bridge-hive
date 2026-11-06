import {
  AVAILABILITY_UNAVAILABLE,
  availabilityFromOpenPositions,
  canClaimWithAvailability,
  marketplaceShiftIsVisible,
  metadataOnlyShiftDetailsCapacity,
  normalizeShiftDetailsCapacity,
  parseOpenPositions,
} from '../shift-availability';

const baseRpcRow = {
  shift_id: 's1',
  organization_name: 'Org',
  location_name: 'Site',
  ward_name: null as string | null,
  title: 'Night',
  starts_at: '2030-01-01T08:00:00Z',
  ends_at: '2030-01-01T16:00:00Z',
  rate_minor: 2500,
  currency: 'EUR',
  required_role: 'registered_nurse',
  status: 'published',
  notes: null as string | null,
  break_minutes: 30,
  acceptance_deadline: null as string | null,
};

describe('shift availability helpers', () => {
  it('parses only finite non-negative integer open counts', () => {
    expect(parseOpenPositions(0)).toBe(0);
    expect(parseOpenPositions(3)).toBe(3);
    expect(parseOpenPositions(null)).toBeNull();
    expect(parseOpenPositions(undefined)).toBeNull();
    expect(parseOpenPositions('2')).toBeNull();
    expect(parseOpenPositions(1.5)).toBeNull();
    expect(parseOpenPositions(-1)).toBeNull();
  });

  it('treats missing/null open_positions as unknown — never all-open or zero', () => {
    const missing = availabilityFromOpenPositions(undefined, 4);
    expect(missing).toEqual({
      open_positions: null,
      filled_positions: null,
      availability_known: false,
      availability_error: AVAILABILITY_UNAVAILABLE,
    });

    const nulled = availabilityFromOpenPositions(null, 4);
    expect(nulled.availability_known).toBe(false);
    expect(nulled.open_positions).toBeNull();
    expect(nulled.filled_positions).toBeNull();
  });

  it('preserves a real zero count as known fully booked', () => {
    expect(availabilityFromOpenPositions(0, 4)).toEqual({
      open_positions: 0,
      filled_positions: 4,
      availability_known: true,
      availability_error: null,
    });
  });

  it('preserves a valid positive count', () => {
    expect(availabilityFromOpenPositions(3, 4)).toEqual({
      open_positions: 3,
      filled_positions: 1,
      availability_known: true,
      availability_error: null,
    });
  });

  it('keeps unknown capacity visible in marketplace filters', () => {
    expect(
      marketplaceShiftIsVisible({ availability_known: false, open_positions: null }),
    ).toBe(true);
    expect(
      marketplaceShiftIsVisible({ availability_known: true, open_positions: 0 }),
    ).toBe(false);
    expect(
      marketplaceShiftIsVisible({ availability_known: true, open_positions: 2 }),
    ).toBe(true);
  });

  it('disables claim when availability is unknown', () => {
    expect(
      canClaimWithAvailability({
        liveActionsAllowed: true,
        shiftPublished: true,
        alreadyAssigned: false,
        availabilityKnown: false,
        openPositions: null,
      }),
    ).toBe(false);
    expect(
      canClaimWithAvailability({
        liveActionsAllowed: true,
        shiftPublished: true,
        alreadyAssigned: false,
        availabilityKnown: true,
        openPositions: 2,
      }),
    ).toBe(true);
  });
});

describe('getWorkerShiftDetails availability contract', () => {
  it('maps RPC missing/unavailable without inventing open seats', () => {
    const data = metadataOnlyShiftDetailsCapacity({
      shiftId: 's1',
      title: 'Night',
      startsAt: '2030-01-01T08:00:00Z',
      endsAt: '2030-01-01T16:00:00Z',
      rateMinor: 2500,
      currency: 'EUR',
      requiredRole: 'registered_nurse',
      status: 'published',
      notes: null,
      breakMinutes: 30,
      acceptanceDeadline: null,
      requiredPositions: 4,
    });
    expect(data.required_positions).toBe(4);
    expect(data.open_positions).toBeNull();
    expect(data.availability_known).toBe(false);
    expect(data.availability_error).toBe(AVAILABILITY_UNAVAILABLE);
  });

  it('maps missing/null open_positions from RPC as unknown', () => {
    const data = normalizeShiftDetailsCapacity({
      ...baseRpcRow,
      required_positions: 4,
      open_positions: null,
    });
    expect(data.availability_known).toBe(false);
    expect(data.open_positions).toBeNull();
  });

  it('does not treat a worker seeing only their own assignment as capacity proof', () => {
    const fromRpc = normalizeShiftDetailsCapacity({
      ...baseRpcRow,
      required_positions: 4,
      open_positions: 1,
    });
    expect(fromRpc.open_positions).toBe(1);
    expect(fromRpc.availability_known).toBe(true);

    const withoutRpc = metadataOnlyShiftDetailsCapacity({
      shiftId: 's1',
      title: 'Night',
      startsAt: '2030-01-01T08:00:00Z',
      endsAt: '2030-01-01T16:00:00Z',
      rateMinor: 2500,
      currency: 'EUR',
      requiredRole: 'registered_nurse',
      status: 'published',
      notes: null,
      breakMinutes: 30,
      acceptanceDeadline: null,
      requiredPositions: 4,
      // Old bug path: RLS-visible self assignment must not invent 3 open.
      visibleAssignmentCount: 1,
    });
    expect(withoutRpc.open_positions).toBeNull();
    expect(withoutRpc.availability_known).toBe(false);
  });

  it('maps a real zero and a valid positive open count', () => {
    expect(
      normalizeShiftDetailsCapacity({
        ...baseRpcRow,
        required_positions: 4,
        open_positions: 0,
      }).open_positions,
    ).toBe(0);
    expect(
      normalizeShiftDetailsCapacity({
        ...baseRpcRow,
        required_positions: 4,
        open_positions: 3,
      }).open_positions,
    ).toBe(3);
  });

  it('recovers to known capacity after a successful retry payload', () => {
    const first = metadataOnlyShiftDetailsCapacity({
      shiftId: 's1',
      title: 'Night',
      startsAt: '2030-01-01T08:00:00Z',
      endsAt: '2030-01-01T16:00:00Z',
      rateMinor: 2500,
      currency: 'EUR',
      requiredRole: 'registered_nurse',
      status: 'published',
      notes: null,
      breakMinutes: 30,
      acceptanceDeadline: null,
      requiredPositions: 4,
    });
    expect(first.availability_known).toBe(false);

    const retry = normalizeShiftDetailsCapacity({
      ...baseRpcRow,
      required_positions: 4,
      open_positions: 2,
    });
    expect(retry.availability_known).toBe(true);
    expect(retry.open_positions).toBe(2);
    expect(retry.availability_error).toBeNull();
  });
});
