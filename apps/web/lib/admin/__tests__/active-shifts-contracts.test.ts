import fs from 'node:fs';
import path from 'node:path';

const root = path.join(__dirname, '../../..');

function source(relative: string) {
  return fs.readFileSync(path.join(root, relative), 'utf8');
}

describe('admin active shifts contracts', () => {
  it('gates the page and export to platform super admin', () => {
    const page = source('app/(app)/admin/(console)/shifts/page.tsx');
    expect(page).toContain("requirePlatformAdmin('platform_super_admin')");
    expect(page).toContain('canManageOrganizations');

    const exportRoute = source('app/api/admin/shifts/export/route.ts');
    expect(exportRoute).toContain('getPlatformAdminContext');
    expect(exportRoute).toContain("adminRole !== 'platform_super_admin'");
    expect(exportRoute).toContain('status: 403');
  });

  it('keeps service role server-only and out of client components', () => {
    const loader = source('lib/admin/active-shifts.ts');
    expect(loader).toContain("import 'server-only'");
    expect(loader).toContain('createServiceRoleClient');

    const client = source('components/admin/active-shifts-monitor.tsx');
    expect(client).not.toContain('createServiceRoleClient');
    expect(client).not.toContain('SUPABASE_SERVICE_ROLE');
  });

  it('registers sidebar nav and org deep-link', () => {
    const sidebar = source('components/admin/admin-sidebar.tsx');
    expect(sidebar).toContain("href: '/admin/shifts'");
    expect(sidebar).toContain("label: 'Shifts'");

    const orgDetail = source(
      'app/(app)/admin/(console)/organizations/[id]/page.tsx',
    );
    expect(orgDetail).toContain('/admin/shifts?org=');
    expect(orgDetail).toContain('View shifts');
  });

  it('exports genuine xlsx via exceljs and labeled csv alternative', () => {
    const exportLib = source('lib/admin/active-shifts-export.ts');
    expect(exportLib).toContain("from 'exceljs'");
    expect(exportLib).toContain('sanitizeSpreadsheetText');
    expect(exportLib).toContain('buildAdminShiftsCsv');

    const route = source('app/api/admin/shifts/export/route.ts');
    expect(route).toContain('buildAdminShiftsWorkbook');
    expect(route).toContain('format === \'csv\'');
    expect(route).toContain('exportAll: true');
  });
});
