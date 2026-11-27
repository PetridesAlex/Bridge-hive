import 'server-only';

import {
  ADMIN_OCCUPYING_ASSIGNMENT_STATUSES,
  ADMIN_SHIFTS_EXPORT_CAP,
  ADMIN_SHIFTS_PAGE_SIZE,
  adminShiftCapacity,
  adminShiftMatchesMonitorView,
  adminShiftRoleLabel,
  adminShiftShortRef,
  computeAdminShiftAggregates,
  deriveAdminShiftPhase,
  parseAdminShiftMonitorSort,
  parseAdminShiftMonitorView,
  parseAdminShiftRoleFilter,
  type AdminShiftMonitorSort,
  type AdminShiftMonitorView,
  type AdminShiftPhase,
} from '@bridge-hive/domain';
import { fromZonedTime } from 'date-fns-tz';

import { createServiceRoleClient } from '@/lib/supabase/admin';

export type AdminShiftMonitorParams = {
  q?: string;
  org?: string;
  from?: string;
  to?: string;
  role?: string;
  view?: string;
  sort?: string;
  page?: string;
};

export type AdminShiftMonitorRow = {
  id: string;
  shortRef: string;
  organizationId: string;
  organizationName: string;
  locationId: string | null;
  locationName: string | null;
  locationCity: string | null;
  timeZone: string;
  startsAt: string;
  endsAt: string;
  requiredRole: string;
  roleLabel: string;
  requiredPositions: number;
  occupied: number;
  remaining: number;
  status: string;
  phase: AdminShiftPhase;
  createdAt: string;
  updatedAt: string;
  rateMinor: number;
  currency: string;
  title: string | null;
  notes: string | null;
};

export type AdminShiftMonitorAggregates = {
  shiftCount: number;
  organizationCount: number;
  requiredSlots: number;
  occupiedSlots: number;
  unfilledSlots: number;
};

export type AdminShiftMonitorResult =
  | {
      ok: true;
      rows: AdminShiftMonitorRow[];
      total: number;
      page: number;
      pageSize: number;
      view: AdminShiftMonitorView;
      sort: AdminShiftMonitorSort;
      aggregates: AdminShiftMonitorAggregates;
      refreshedAt: string;
      truncated?: boolean;
    }
  | {
      ok: false;
      error: string;
      code?: 'SERVICE_ROLE_MISSING' | 'QUERY_FAILED';
    };

type ShiftJoinRow = {
  id: string;
  organization_id: string;
  location_id: string | null;
  starts_at: string;
  ends_at: string;
  required_role: string;
  required_positions: number;
  status: string;
  created_at: string;
  updated_at: string;
  rate_minor: number;
  currency: string;
  title: string | null;
  notes: string | null;
  organizations:
    | { id: string; display_name: string; timezone: string | null }
    | { id: string; display_name: string; timezone: string | null }[]
    | null;
  locations:
    | {
        id: string;
        name: string;
        city: string | null;
        timezone: string | null;
      }
    | {
        id: string;
        name: string;
        city: string | null;
        timezone: string | null;
      }[]
    | null;
};

type ServiceClient = ReturnType<typeof createServiceRoleClient>;

const SHIFT_SELECT = `
  id,
  organization_id,
  location_id,
  starts_at,
  ends_at,
  required_role,
  required_positions,
  status,
  created_at,
  updated_at,
  rate_minor,
  currency,
  title,
  notes,
  organizations!inner ( id, display_name, timezone ),
  locations ( id, name, city, timezone )
`;

function one<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function parseYmd(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  const trimmed = raw.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return undefined;
  return trimmed;
}

function ymdBoundsIso(
  ymd: string,
  timeZone: string,
  edge: 'start' | 'endExclusive',
): string {
  const start = fromZonedTime(`${ymd}T00:00:00`, timeZone);
  if (edge === 'start') return start.toISOString();
  return new Date(start.getTime() + 24 * 60 * 60 * 1000).toISOString();
}

function normalizeParams(raw: AdminShiftMonitorParams) {
  const view = parseAdminShiftMonitorView(raw.view);
  const sort = parseAdminShiftMonitorSort(raw.sort);
  const role = parseAdminShiftRoleFilter(raw.role);
  const page = Math.max(1, Number(raw.page ?? '1') || 1);
  const q = raw.q?.trim() || undefined;
  const org =
    raw.org &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      raw.org.trim(),
    )
      ? raw.org.trim()
      : undefined;
  const from = parseYmd(raw.from);
  const to = parseYmd(raw.to);
  return { view, sort, role, page, q, org, from, to };
}

type Normalized = ReturnType<typeof normalizeParams>;

function mapRow(
  row: ShiftJoinRow,
  occupied: number,
  now: Date,
): AdminShiftMonitorRow {
  const org = one(row.organizations);
  const loc = one(row.locations);
  const timeZone =
    loc?.timezone?.trim() || org?.timezone?.trim() || 'Europe/Nicosia';
  const cap = adminShiftCapacity({
    requiredPositions: row.required_positions,
    occupied,
  });
  return {
    id: row.id,
    shortRef: adminShiftShortRef(row.id),
    organizationId: row.organization_id,
    organizationName: org?.display_name ?? 'Unknown organization',
    locationId: loc?.id ?? row.location_id,
    locationName: loc?.name ?? null,
    locationCity: loc?.city ?? null,
    timeZone,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    requiredRole: row.required_role,
    roleLabel: adminShiftRoleLabel(row.required_role),
    requiredPositions: cap.required,
    occupied: cap.occupied,
    remaining: cap.remaining,
    status: row.status,
    phase: deriveAdminShiftPhase(row.starts_at, row.ends_at, now),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    rateMinor: row.rate_minor,
    currency: row.currency || 'EUR',
    title: row.title,
    notes: row.notes,
  };
}

async function occupancyByShiftId(
  admin: ServiceClient,
  shiftIds: string[],
): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  if (shiftIds.length === 0) return map;

  const { data, error } = await admin
    .from('shift_assignments')
    .select('shift_id, status')
    .in('shift_id', shiftIds)
    .in('status', [...ADMIN_OCCUPYING_ASSIGNMENT_STATUSES]);

  if (error) throw new Error(error.message);

  for (const row of data ?? []) {
    const id = row.shift_id as string;
    map.set(id, (map.get(id) ?? 0) + 1);
  }
  return map;
}

function applyFilters(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  query: any,
  params: Normalized,
  nowIso: string,
  fromIso?: string,
  toIsoExclusive?: string,
) {
  let q = query;
  if (params.org) q = q.eq('organization_id', params.org);
  if (params.role) q = q.eq('required_role', params.role);

  switch (params.view) {
    case 'active':
    case 'upcoming':
    case 'in_progress':
      q = q
        .in('status', ['published', 'filled', 'in_progress'])
        .gt('ends_at', nowIso);
      break;
    case 'ended':
      q = q.lte('ends_at', nowIso).neq('status', 'draft');
      break;
    case 'cancelled':
      q = q.eq('status', 'cancelled');
      break;
    case 'draft':
      q = q.eq('status', 'draft');
      break;
    default:
      break;
  }

  if (fromIso) q = q.gte('starts_at', fromIso);
  if (toIsoExclusive) q = q.lt('starts_at', toIsoExclusive);
  return q;
}

function applySort(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  query: any,
  sort: AdminShiftMonitorSort,
) {
  if (sort === 'starts_desc') {
    return query
      .order('starts_at', { ascending: false })
      .order('id', { ascending: true });
  }
  if (sort === 'updated_desc') {
    return query
      .order('updated_at', { ascending: false })
      .order('id', { ascending: true });
  }
  return query
    .order('starts_at', { ascending: true })
    .order('id', { ascending: true });
}

function matchesSearch(row: AdminShiftMonitorRow, q: string): boolean {
  const needle = q.toLowerCase();
  return [
    row.organizationName,
    row.shortRef,
    row.id,
    row.locationName ?? '',
    row.locationCity ?? '',
    row.title ?? '',
  ]
    .join(' ')
    .toLowerCase()
    .includes(needle);
}

async function fetchMappedWindow(args: {
  admin: ServiceClient;
  params: Normalized;
  now: Date;
  nowIso: string;
  fromIso?: string;
  toIsoExclusive?: string;
  offset: number;
  limit: number;
  withExactCount: boolean;
}): Promise<{
  rows: AdminShiftMonitorRow[];
  exactCount: number | null;
}> {
  const {
    admin,
    params,
    now,
    nowIso,
    fromIso,
    toIsoExclusive,
    offset,
    limit,
    withExactCount,
  } = args;

  let query = admin
    .from('shifts')
    .select(SHIFT_SELECT, withExactCount ? { count: 'exact' } : undefined);

  query = applyFilters(query, params, nowIso, fromIso, toIsoExclusive);
  query = applySort(query, params.sort);

  const { data, error, count } = await query.range(offset, offset + limit - 1);
  if (error) throw new Error(error.message);

  const rawRows = (data ?? []) as unknown as ShiftJoinRow[];
  const occ = await occupancyByShiftId(
    admin,
    rawRows.map((r) => r.id),
  );
  let rows = rawRows.map((r) => mapRow(r, occ.get(r.id) ?? 0, now));

  if (params.q) {
    rows = rows.filter((row) => matchesSearch(row, params.q!));
  }
  rows = rows.filter((row) =>
    adminShiftMatchesMonitorView({
      view: params.view,
      status: row.status,
      startsAtIso: row.startsAt,
      endsAtIso: row.endsAt,
      now,
    }),
  );

  return { rows, exactCount: count ?? null };
}

/**
 * Load cross-organization shifts for the super-admin monitor.
 * Caller must already have verified platform_super_admin.
 */
export async function loadAdminShiftsMonitor(
  raw: AdminShiftMonitorParams,
  options?: { pageSize?: number; exportAll?: boolean; now?: Date },
): Promise<AdminShiftMonitorResult> {
  const now = options?.now ?? new Date();
  const params = normalizeParams(raw);
  const pageSize = options?.exportAll
    ? ADMIN_SHIFTS_EXPORT_CAP
    : (options?.pageSize ?? ADMIN_SHIFTS_PAGE_SIZE);

  let admin: ServiceClient;
  try {
    admin = createServiceRoleClient();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (
      message.includes('SUPABASE_SERVICE_ROLE_KEY') ||
      message.includes('Missing')
    ) {
      return {
        ok: false,
        code: 'SERVICE_ROLE_MISSING',
        error:
          'Server prerequisite missing: SUPABASE_SERVICE_ROLE_KEY must be set for the Next.js web server (never in public/Expo env).',
      };
    }
    return { ok: false, code: 'QUERY_FAILED', error: message };
  }

  const filterTz = 'Europe/Nicosia';
  const fromIso = params.from
    ? ymdBoundsIso(params.from, filterTz, 'start')
    : undefined;
  const toIsoExclusive = params.to
    ? ymdBoundsIso(params.to, filterTz, 'endExclusive')
    : undefined;
  const nowIso = now.toISOString();

  const needsPostFilter =
    Boolean(params.q) ||
    params.view === 'upcoming' ||
    params.view === 'in_progress';

  try {
    if (options?.exportAll || needsPostFilter) {
      const { rows } = await fetchMappedWindow({
        admin,
        params,
        now,
        nowIso,
        fromIso,
        toIsoExclusive,
        offset: 0,
        limit: ADMIN_SHIFTS_EXPORT_CAP,
        withExactCount: false,
      });

      const truncated = rows.length >= ADMIN_SHIFTS_EXPORT_CAP;
      const aggregates = computeAdminShiftAggregates(
        rows.map((r) => ({
          organizationId: r.organizationId,
          requiredPositions: r.requiredPositions,
          occupied: r.occupied,
        })),
      );

      if (options?.exportAll) {
        return {
          ok: true,
          rows: rows.slice(0, ADMIN_SHIFTS_EXPORT_CAP),
          total: rows.length,
          page: 1,
          pageSize: ADMIN_SHIFTS_EXPORT_CAP,
          view: params.view,
          sort: params.sort,
          aggregates,
          refreshedAt: nowIso,
          truncated,
        };
      }

      const start = (params.page - 1) * pageSize;
      return {
        ok: true,
        rows: rows.slice(start, start + pageSize),
        total: rows.length,
        page: params.page,
        pageSize,
        view: params.view,
        sort: params.sort,
        aggregates,
        refreshedAt: nowIso,
        truncated,
      };
    }

    const pageOffset = (params.page - 1) * pageSize;
    const pageResult = await fetchMappedWindow({
      admin,
      params,
      now,
      nowIso,
      fromIso,
      toIsoExclusive,
      offset: pageOffset,
      limit: pageSize,
      withExactCount: true,
    });

    const aggResult = await fetchMappedWindow({
      admin,
      params,
      now,
      nowIso,
      fromIso,
      toIsoExclusive,
      offset: 0,
      limit: ADMIN_SHIFTS_EXPORT_CAP,
      withExactCount: false,
    });

    const aggregates = computeAdminShiftAggregates(
      aggResult.rows.map((r) => ({
        organizationId: r.organizationId,
        requiredPositions: r.requiredPositions,
        occupied: r.occupied,
      })),
    );

    return {
      ok: true,
      rows: pageResult.rows,
      total: pageResult.exactCount ?? pageResult.rows.length,
      page: params.page,
      pageSize,
      view: params.view,
      sort: params.sort,
      aggregates,
      refreshedAt: nowIso,
      truncated: aggResult.rows.length >= ADMIN_SHIFTS_EXPORT_CAP,
    };
  } catch (err) {
    return {
      ok: false,
      code: 'QUERY_FAILED',
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export type AdminShiftAssignmentDetail = {
  assignmentId: string;
  workerId: string;
  fullName: string;
  status: string;
  acceptedAt: string | null;
  checkInAt: string | null;
  checkOutAt: string | null;
};

export async function loadAdminShiftAssignedWorkers(shiftId: string): Promise<
  | { ok: true; workers: AdminShiftAssignmentDetail[] }
  | { ok: false; error: string }
> {
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      shiftId,
    )
  ) {
    return { ok: false, error: 'Invalid shift id' };
  }

  let admin: ServiceClient;
  try {
    admin = createServiceRoleClient();
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }

  const { data, error } = await admin
    .from('shift_assignments')
    .select('id, status, worker_id, accepted_at, check_in_at, check_out_at')
    .eq('shift_id', shiftId)
    .in('status', [...ADMIN_OCCUPYING_ASSIGNMENT_STATUSES])
    .order('accepted_at', { ascending: true });

  if (error) {
    return { ok: false, error: error.message };
  }

  const assignments = data ?? [];
  const workerIds = assignments.map((r) => r.worker_id as string);
  const { data: profiles } =
    workerIds.length > 0
      ? await admin.from('profiles').select('id, full_name').in('id', workerIds)
      : { data: [] as Array<{ id: string; full_name: string | null }> };

  const nameById = new Map(
    (profiles ?? []).map((p) => [
      p.id as string,
      ((p.full_name as string | null) ?? '').trim() || 'Worker',
    ]),
  );

  return {
    ok: true,
    workers: assignments.map((row) => ({
      assignmentId: row.id as string,
      workerId: row.worker_id as string,
      fullName: nameById.get(row.worker_id as string) ?? 'Worker',
      status: row.status as string,
      acceptedAt: (row.accepted_at as string | null) ?? null,
      checkInAt: (row.check_in_at as string | null) ?? null,
      checkOutAt: (row.check_out_at as string | null) ?? null,
    })),
  };
}

export function buildAdminShiftsQueryString(
  params: AdminShiftMonitorParams,
  overrides?: Partial<AdminShiftMonitorParams>,
): string {
  const merged = { ...params, ...overrides };
  const qs = new URLSearchParams();
  if (merged.q?.trim()) qs.set('q', merged.q.trim());
  if (merged.org?.trim()) qs.set('org', merged.org.trim());
  if (merged.from?.trim()) qs.set('from', merged.from.trim());
  if (merged.to?.trim()) qs.set('to', merged.to.trim());
  if (merged.role?.trim()) qs.set('role', merged.role.trim());
  if (merged.view && merged.view !== 'active') qs.set('view', merged.view);
  if (merged.sort && merged.sort !== 'starts_asc') qs.set('sort', merged.sort);
  if (merged.page && merged.page !== '1') qs.set('page', merged.page);
  const s = qs.toString();
  return s ? `?${s}` : '';
}
