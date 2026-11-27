import { NextResponse } from 'next/server';

import {
  loadAdminShiftsMonitor,
  type AdminShiftMonitorParams,
} from '@/lib/admin/active-shifts';
import {
  buildAdminShiftsCsv,
  buildAdminShiftsWorkbook,
} from '@/lib/admin/active-shifts-export';
import { getPlatformAdminContext } from '@/lib/admin/auth';

export const runtime = 'nodejs';

function parseParams(url: URL): AdminShiftMonitorParams {
  return {
    q: url.searchParams.get('q') ?? undefined,
    org: url.searchParams.get('org') ?? undefined,
    from: url.searchParams.get('from') ?? undefined,
    to: url.searchParams.get('to') ?? undefined,
    role: url.searchParams.get('role') ?? undefined,
    view: url.searchParams.get('view') ?? undefined,
    sort: url.searchParams.get('sort') ?? undefined,
  };
}

export async function GET(request: Request) {
  const ctx = await getPlatformAdminContext();
  if (!ctx) {
    return NextResponse.redirect(new URL('/admin/sign-in', request.url));
  }
  if (
    ctx.adminRole !== 'platform_super_admin' ||
    !ctx.capabilities.canManageOrganizations
  ) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const url = new URL(request.url);
  const format = url.searchParams.get('format') === 'csv' ? 'csv' : 'xlsx';
  const params = parseParams(url);

  const result = await loadAdminShiftsMonitor(params, { exportAll: true });
  if (!result.ok) {
    return NextResponse.json(
      { error: result.error, code: result.code },
      { status: result.code === 'SERVICE_ROLE_MISSING' ? 503 : 500 },
    );
  }

  const stamp = result.refreshedAt.replaceAll(':', '').replaceAll('.', '');
  if (format === 'csv') {
    const csv = buildAdminShiftsCsv(result.rows);
    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="bridge-hive-shifts-${stamp}.csv"`,
        'Cache-Control': 'no-store',
      },
    });
  }

  const buffer = await buildAdminShiftsWorkbook({
    rows: result.rows,
    refreshedAt: result.refreshedAt,
    view: result.view,
    truncated: result.truncated,
    totalMatched: result.total,
  });

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="bridge-hive-shifts-${stamp}.xlsx"`,
      'Cache-Control': 'no-store',
    },
  });
}
