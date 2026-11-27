import { buildAdminShiftsCsv } from '@/lib/admin/active-shifts-export';
import type { AdminShiftMonitorRow } from '@/lib/admin/active-shifts';

const sample: AdminShiftMonitorRow = {
  id: '5275f9d5-1111-4111-8111-111111111111',
  shortRef: '5275F9D5',
  organizationId: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',
  organizationName: '=Evil Org',
  locationId: null,
  locationName: '+Location',
  locationCity: '@City',
  timeZone: 'Europe/Nicosia',
  startsAt: '2026-06-15T18:00:00.000Z',
  endsAt: '2026-06-16T02:00:00.000Z',
  requiredRole: 'registered_nurse',
  roleLabel: 'Registered Nurse',
  requiredPositions: 2,
  occupied: 1,
  remaining: 1,
  status: 'published',
  phase: 'upcoming',
  createdAt: '2026-06-01T00:00:00.000Z',
  updatedAt: '2026-06-10T00:00:00.000Z',
  rateMinor: 2500,
  currency: 'EUR',
  title: '-Title',
  notes: null,
};

describe('admin shifts export', () => {
  it('sanitizes formula-leading fields in CSV', () => {
    const csv = buildAdminShiftsCsv([sample]);
    expect(csv).toContain("'=Evil Org");
    expect(csv).toContain("'+Location");
    expect(csv).toContain("'@City");
    expect(csv).toContain("'-Title");
    expect(csv).toContain('5275F9D5');
    expect(csv.split('\n')[0]).toContain('Gross hourly');
  });
});
