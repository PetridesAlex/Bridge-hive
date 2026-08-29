import { create } from 'zustand';

import { CURRENT_MEMBER, initialShifts, mockReplacements } from '@/data/mock';
import type { ReplacementCandidate, Shift, ShiftTransfer, ShiftTransferStatus } from '@/types';

type ShiftState = {
  shifts: Shift[];
  transfers: ShiftTransfer[];
  replacements: ReplacementCandidate[];
  activeMemberId: string;
  setActiveMemberId: (id: string) => void;
  acceptShift: (shiftId: string) => boolean;
  getShift: (id: string) => Shift | undefined;
  getTransferForShift: (shiftId: string) => ShiftTransfer | undefined;
  requestTransfer: (shiftId: string, replacementId: string) => ShiftTransfer | null;
  advanceTransfer: (transferId: string) => void;
  completeTransferDemo: (transferId: string) => void;
};

const TRANSFER_FLOW: ShiftTransferStatus[] = [
  'REQUESTED',
  'ACCEPTED_BY_REPLACEMENT',
  'PENDING_HOSPITAL_APPROVAL',
  'COMPLETED',
];

export const useShiftStore = create<ShiftState>((set, get) => ({
  shifts: initialShifts,
  transfers: [],
  replacements: mockReplacements,
  activeMemberId: CURRENT_MEMBER.id,

  setActiveMemberId: (id) => set({ activeMemberId: id }),

  getShift: (id) => get().shifts.find((s) => s.id === id),

  getTransferForShift: (shiftId) =>
    get().transfers.find((t) => t.shiftId === shiftId && t.status !== 'DECLINED'),

  acceptShift: (shiftId) => {
    const shift = get().getShift(shiftId);
    if (!shift || shift.status !== 'OPEN' || shift.remainingPositions <= 0) return false;
    const memberId = get().activeMemberId;

    set((state) => ({
      shifts: state.shifts.map((s) =>
        s.id === shiftId
          ? {
              ...s,
              status: 'CONFIRMED',
              filledPositions: s.filledPositions + 1,
              remainingPositions: Math.max(0, s.remainingPositions - 1),
              assignedToMemberId: memberId,
            }
          : s,
      ),
    }));
    return true;
  },

  requestTransfer: (shiftId, replacementId) => {
    const shift = get().getShift(shiftId);
    const replacement = get().replacements.find((r) => r.id === replacementId);
    if (!shift || !replacement || shift.status !== 'CONFIRMED') return null;

    const existing = get().getTransferForShift(shiftId);
    if (existing && existing.status !== 'EXPIRED' && existing.status !== 'DECLINED') {
      return existing;
    }

    const transfer: ShiftTransfer = {
      id: `tr_${Date.now()}`,
      marketId: shift.marketId,
      shiftId,
      organizationId: shift.organizationId,
      fromMemberId: get().activeMemberId,
      toMemberId: replacement.id,
      toMemberName: replacement.fullName,
      status: 'REQUESTED',
      hospitalApprovalRequired: true,
      requestedAt: new Date().toISOString(),
      noCancellationFee: true,
    };

    set((state) => ({ transfers: [transfer, ...state.transfers] }));
    return transfer;
  },

  advanceTransfer: (transferId) => {
    set((state) => ({
      transfers: state.transfers.map((t) => {
        if (t.id !== transferId) return t;
        const idx = TRANSFER_FLOW.indexOf(t.status);
        if (idx < 0 || idx >= TRANSFER_FLOW.length - 1) return t;
        const next = TRANSFER_FLOW[idx + 1];
        if (next === 'COMPLETED') {
          return { ...t, status: next, completedAt: new Date().toISOString() };
        }
        return { ...t, status: next };
      }),
    }));

    const transfer = get().transfers.find((t) => t.id === transferId);
    if (transfer?.status === 'COMPLETED') {
      set((state) => ({
        shifts: state.shifts.map((s) =>
          s.id === transfer.shiftId
            ? {
                ...s,
                status: 'TRANSFERRED',
                assignedToMemberId: transfer.toMemberId,
              }
            : s,
        ),
      }));
    }
  },

  completeTransferDemo: (transferId) => {
    for (let i = 0; i < TRANSFER_FLOW.length; i += 1) {
      const current = get().transfers.find((t) => t.id === transferId);
      if (!current || current.status === 'COMPLETED') break;
      get().advanceTransfer(transferId);
    }
  },
}));

export function selectAvailableShifts(shifts: Shift[]) {
  return shifts.filter((s) => s.status === 'OPEN');
}

export function selectUpcomingShifts(shifts: Shift[], memberId: string) {
  return shifts.filter((s) => s.status === 'CONFIRMED' && s.assignedToMemberId === memberId);
}

export function selectCompletedShifts(shifts: Shift[], memberId: string) {
  return shifts.filter((s) => s.status === 'COMPLETED' && s.assignedToMemberId === memberId);
}

export function selectTransferredShifts(shifts: Shift[]) {
  return shifts.filter((s) => s.status === 'TRANSFERRED');
}

export function selectNextShift(shifts: Shift[], memberId: string) {
  const upcoming = selectUpcomingShifts(shifts, memberId).sort((a, b) =>
    `${a.date}${a.startTime}`.localeCompare(`${b.date}${b.startTime}`),
  );
  return upcoming[0];
}
