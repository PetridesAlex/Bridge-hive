import type { Shift } from '@/types';
import { isNightShift, parseLocalDate } from '@/utils/format';

export type ShiftFilters = {
  location?: string;
  date?: string;
  organizationId?: string;
  department?: string;
  professionalRoleId?: string;
  dayShift?: boolean;
  nightShift?: boolean;
  minPay?: number;
  maxPay?: number;
  urgentOnly?: boolean;
};

export const EMPTY_FILTERS: ShiftFilters = {};

export function hasActiveFilters(filters: ShiftFilters): boolean {
  return Object.values(filters).some((v) => v !== undefined && v !== false && v !== '');
}

export function filterShifts(shifts: Shift[], filters: ShiftFilters): Shift[] {
  return shifts.filter((shift) => {
    if (filters.location && shift.city !== filters.location) return false;
    if (filters.date && shift.date !== filters.date) return false;
    if (filters.organizationId && shift.organizationId !== filters.organizationId) return false;
    if (filters.department && shift.departmentName !== filters.department) return false;
    if (filters.professionalRoleId && shift.professionalRoleId !== filters.professionalRoleId) {
      return false;
    }
    if (filters.urgentOnly && !shift.urgent) return false;
    if (filters.minPay !== undefined && shift.pay < filters.minPay) return false;
    if (filters.maxPay !== undefined && shift.pay > filters.maxPay) return false;

    const night = isNightShift(shift.startTime);
    if (filters.dayShift && !filters.nightShift && night) return false;
    if (filters.nightShift && !filters.dayShift && !night) return false;

    return true;
  });
}

export function sortShiftsByDate(shifts: Shift[]): Shift[] {
  return [...shifts].sort((a, b) => {
    const aTime = parseLocalDate(a.date).getTime();
    const bTime = parseLocalDate(b.date).getTime();
    if (aTime !== bTime) return aTime - bTime;
    return a.startTime.localeCompare(b.startTime);
  });
}
