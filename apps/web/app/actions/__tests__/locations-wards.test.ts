jest.mock('server-only', () => ({}));

jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
}));

const requireOrgMembershipMock = jest.fn();
jest.mock('@/lib/auth', () => ({
  requireOrgMembership: (...args: unknown[]) =>
    requireOrgMembershipMock(...args),
}));

const state = {
  existingWards: [] as Array<{ id: string; name: string }>,
  locationId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb' as string | null,
  lastInsertPayload: undefined as unknown,
};

jest.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    from: (table: string) => {
      if (table === 'locations') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: state.locationId ? { id: state.locationId } : null,
                  error: null,
                }),
              }),
            }),
          }),
        };
      }
      if (table === 'wards') {
        return {
          select: () => ({
            eq: async () => ({
              data: state.existingWards.map(({ id, name }) => ({ id, name })),
              error: null,
            }),
          }),
          insert: (
            payload:
              | { name: string; location_id: string }
              | Array<{ name: string; location_id: string }>,
          ) => {
            state.lastInsertPayload = payload;
            const rows = Array.isArray(payload) ? payload : [payload];
            const result = {
              data: rows.map((row, index) => ({
                id: `ward-new-${index + 1}`,
                name: row.name,
                location_id: row.location_id,
              })),
              error: null,
            };
            return {
              select: () => ({
                single: async () => ({
                  data: result.data[0] ?? null,
                  error: null,
                }),
                then(
                  resolve: (value: typeof result) => unknown,
                  reject?: (reason: unknown) => unknown,
                ) {
                  return Promise.resolve(result).then(resolve, reject);
                },
              }),
            };
          },
          update: () => ({
            eq: () => ({
              eq: async () => ({ error: null }),
            }),
          }),
        };
      }
      return {};
    },
  }),
}));

import {
  createWardAction,
  createWardsBatchAction,
} from '@/app/actions/locations';

const ORG_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const LOCATION_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const SLUG = 'demo-hospital';

function allowedCtx() {
  return {
    org: { id: ORG_ID, slug: SLUG },
    capabilities: {
      canManageWards: true,
      canManageLocations: true,
      canManageShifts: true,
    },
  };
}

function deniedCtx() {
  return {
    org: { id: ORG_ID, slug: SLUG },
    capabilities: {
      canManageWards: false,
      canManageLocations: false,
      canManageShifts: false,
    },
  };
}

describe('createWardAction / createWardsBatchAction', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    state.existingWards = [];
    state.locationId = LOCATION_ID;
    state.lastInsertPayload = undefined;
    requireOrgMembershipMock.mockResolvedValue(allowedCtx());
  });

  it('rejects unauthorized organization members', async () => {
    requireOrgMembershipMock.mockResolvedValue(deniedCtx());
    const fd = new FormData();
    fd.set('name', 'ICU');
    const result = await createWardAction(SLUG, LOCATION_ID, {}, fd);
    expect(result.error).toMatch(/permission/i);
    expect(result.success).toBeUndefined();
  });

  it('rejects wards when location is not in the organization', async () => {
    state.locationId = null;
    const fd = new FormData();
    fd.set('name', 'ICU');
    const result = await createWardAction(SLUG, LOCATION_ID, {}, fd);
    expect(result.error).toMatch(/location not found/i);
  });

  it('trims custom names and rejects blanks', async () => {
    const fd = new FormData();
    fd.set('name', '   ');
    const result = await createWardAction(SLUG, LOCATION_ID, {}, fd);
    expect(result.error).toBeTruthy();
    expect(result.success).toBeUndefined();
  });

  it('rejects case-insensitive duplicate ward names', async () => {
    state.existingWards = [{ id: 'w1', name: 'ICU' }];
    const fd = new FormData();
    fd.set('name', '  icu  ');
    const result = await createWardAction(SLUG, LOCATION_ID, {}, fd);
    expect(result.error).toMatch(/already exists/i);
  });

  it('creates a trimmed ward under the selected location', async () => {
    const fd = new FormData();
    fd.set('name', '  Care Unit  ');
    const result = await createWardAction(SLUG, LOCATION_ID, {}, fd);
    expect(result.success).toBe(true);
    expect(result.wardId).toBe('ward-new-1');
    expect(result.wardName).toBe('Care Unit');
    expect(state.lastInsertPayload).toMatchObject({
      location_id: LOCATION_ID,
      name: 'Care Unit',
    });
  });

  it('batch-adds library wards only for the selected org location and skips duplicates', async () => {
    state.existingWards = [{ id: 'w1', name: 'ICU' }];
    const result = await createWardsBatchAction({
      slug: SLUG,
      locationId: LOCATION_ID,
      names: ['ICU', 'Surgical ward', '  Pathology ward  '],
    });
    expect(result.success).toBe(true);
    expect(result.skippedNames).toEqual(['ICU']);
    expect(result.created?.map((w) => w.name)).toEqual([
      'Surgical ward',
      'Pathology ward',
    ]);
    expect(result.created?.every((w) => w.locationId === LOCATION_ID)).toBe(
      true,
    );
  });

  it('denies batch create for unauthorized users', async () => {
    requireOrgMembershipMock.mockResolvedValue(deniedCtx());
    const result = await createWardsBatchAction({
      slug: SLUG,
      locationId: LOCATION_ID,
      names: ['ICU'],
    });
    expect(result.error).toMatch(/permission/i);
  });
});
