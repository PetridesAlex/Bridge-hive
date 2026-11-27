import {
  ADMIN_SHIFTS_EXPORT_CAP,
  adminShiftPhaseLabel,
  formatMoneyMinor,
  sanitizeSpreadsheetText,
} from '@bridge-hive/domain';
import ExcelJS from 'exceljs';

import type { AdminShiftMonitorRow } from '@/lib/admin/active-shifts';
import { shiftStatusLabel } from '@/lib/format';

function windowLabel(row: AdminShiftMonitorRow): string {
  const start = new Date(row.startsAt).toISOString();
  const end = new Date(row.endsAt).toISOString();
  return `${start} → ${end}`;
}

export async function buildAdminShiftsWorkbook(params: {
  rows: AdminShiftMonitorRow[];
  refreshedAt: string;
  view: string;
  truncated?: boolean;
  totalMatched: number;
}): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Bridge Hive Admin';
  workbook.created = new Date(params.refreshedAt);

  const meta = workbook.addWorksheet('Export info');
  meta.getColumn(1).width = 28;
  meta.getColumn(2).width = 64;
  meta.addRow(['Export timestamp (UTC)', params.refreshedAt]);
  meta.addRow(['Timezone note', 'Schedule ISO timestamps are UTC; UI displays org/location TZ']);
  meta.addRow(['View filter', params.view]);
  meta.addRow(['Rows in file', params.rows.length]);
  meta.addRow(['Matching rows (loaded)', params.totalMatched]);
  meta.addRow(['Export cap', ADMIN_SHIFTS_EXPORT_CAP]);
  meta.addRow([
    'Truncated',
    params.truncated ? 'Yes — results exceeded safe export cap' : 'No',
  ]);
  meta.addRow([
    'Basis',
    'Gross hourly rate from shifts.rate_minor; capacity via occupying assignment statuses',
  ]);

  const sheet = workbook.addWorksheet('Active shifts');
  sheet.columns = [
    { header: 'Short ref', key: 'shortRef', width: 12 },
    { header: 'Shift ID', key: 'id', width: 38 },
    { header: 'Organization', key: 'organizationName', width: 28 },
    { header: 'Organization ID', key: 'organizationId', width: 38 },
    { header: 'Location', key: 'locationName', width: 22 },
    { header: 'City', key: 'locationCity', width: 16 },
    { header: 'Timezone', key: 'timeZone', width: 18 },
    { header: 'Starts at (UTC ISO)', key: 'startsAt', width: 24 },
    { header: 'Ends at (UTC ISO)', key: 'endsAt', width: 24 },
    { header: 'Schedule window', key: 'window', width: 42 },
    { header: 'Role', key: 'roleLabel', width: 18 },
    { header: 'Required', key: 'required', width: 10 },
    { header: 'Occupied', key: 'occupied', width: 10 },
    { header: 'Remaining', key: 'remaining', width: 10 },
    { header: 'Status', key: 'status', width: 14 },
    { header: 'Phase', key: 'phase', width: 12 },
    { header: 'Gross hourly', key: 'rate', width: 14 },
    { header: 'Currency', key: 'currency', width: 10 },
    { header: 'Created at (UTC ISO)', key: 'createdAt', width: 24 },
    { header: 'Updated at (UTC ISO)', key: 'updatedAt', width: 24 },
    { header: 'Title', key: 'title', width: 24 },
  ];

  sheet.getRow(1).font = { bold: true };

  for (const row of params.rows) {
    sheet.addRow({
      shortRef: sanitizeSpreadsheetText(row.shortRef),
      id: sanitizeSpreadsheetText(row.id),
      organizationName: sanitizeSpreadsheetText(row.organizationName),
      organizationId: sanitizeSpreadsheetText(row.organizationId),
      locationName: sanitizeSpreadsheetText(row.locationName),
      locationCity: sanitizeSpreadsheetText(row.locationCity),
      timeZone: sanitizeSpreadsheetText(row.timeZone),
      startsAt: row.startsAt,
      endsAt: row.endsAt,
      window: sanitizeSpreadsheetText(windowLabel(row)),
      roleLabel: sanitizeSpreadsheetText(row.roleLabel),
      required: row.requiredPositions,
      occupied: row.occupied,
      remaining: row.remaining,
      status: sanitizeSpreadsheetText(shiftStatusLabel(row.status)),
      phase: sanitizeSpreadsheetText(adminShiftPhaseLabel(row.phase)),
      rate: formatMoneyMinor(row.rateMinor, row.currency),
      currency: sanitizeSpreadsheetText(row.currency),
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      title: sanitizeSpreadsheetText(row.title),
    });
  }

  // Force text columns to stay literal (no formula objects).
  const textKeys = [
    'shortRef',
    'id',
    'organizationName',
    'organizationId',
    'locationName',
    'locationCity',
    'timeZone',
    'window',
    'roleLabel',
    'status',
    'phase',
    'rate',
    'currency',
    'title',
  ];
  for (let r = 2; r <= sheet.rowCount; r += 1) {
    for (const key of textKeys) {
      const cell = sheet.getRow(r).getCell(key);
      if (typeof cell.value === 'string') {
        cell.numFmt = '@';
      }
    }
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

export function buildAdminShiftsCsv(rows: AdminShiftMonitorRow[]): string {
  const headers = [
    'Short ref',
    'Shift ID',
    'Organization',
    'Organization ID',
    'Location',
    'City',
    'Timezone',
    'Starts at (UTC ISO)',
    'Ends at (UTC ISO)',
    'Role',
    'Required',
    'Occupied',
    'Remaining',
    'Status',
    'Phase',
    'Gross hourly',
    'Currency',
    'Created at (UTC ISO)',
    'Updated at (UTC ISO)',
    'Title',
  ];

  const escape = (value: string) => {
    const safe = sanitizeSpreadsheetText(value);
    if (/[",\n\r]/.test(safe)) {
      return `"${safe.replaceAll('"', '""')}"`;
    }
    return safe;
  };

  const lines = [headers.join(',')];
  for (const row of rows) {
    lines.push(
      [
        escape(row.shortRef),
        escape(row.id),
        escape(row.organizationName),
        escape(row.organizationId),
        escape(row.locationName ?? ''),
        escape(row.locationCity ?? ''),
        escape(row.timeZone),
        escape(row.startsAt),
        escape(row.endsAt),
        escape(row.roleLabel),
        String(row.requiredPositions),
        String(row.occupied),
        String(row.remaining),
        escape(shiftStatusLabel(row.status)),
        escape(adminShiftPhaseLabel(row.phase)),
        escape(formatMoneyMinor(row.rateMinor, row.currency)),
        escape(row.currency),
        escape(row.createdAt),
        escape(row.updatedAt),
        escape(row.title ?? ''),
      ].join(','),
    );
  }
  return `${lines.join('\n')}\n`;
}
