'use server';

import { requirePlatformAdmin } from '@/lib/admin/auth';
import { loadAdminShiftAssignedWorkers } from '@/lib/admin/active-shifts';

export async function getAdminShiftAssignedWorkersAction(shiftId: string) {
  const ctx = await requirePlatformAdmin('platform_super_admin');
  if (!ctx.capabilities.canManageOrganizations) {
    return { ok: false as const, error: 'Permission denied' };
  }
  return loadAdminShiftAssignedWorkers(shiftId);
}
