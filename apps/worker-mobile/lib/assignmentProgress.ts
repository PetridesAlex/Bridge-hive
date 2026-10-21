import type { ProgressStepState } from '@/components/ui/ProgressStep';

export type AssignmentProgressPhase =
  | 'waiting_for_end'
  | 'ready_to_submit'
  | 'under_review'
  | 'approved'
  | 'rejected';

export type AssignmentProgressStep = {
  step: number;
  title: string;
  description?: string;
  statusLabel: string;
  state: ProgressStepState;
  isCurrent: boolean;
};

export type AssignmentProgressModel = {
  phase: AssignmentProgressPhase;
  phaseTitle: string;
  phaseSubtitle: string;
  currentStep: number;
  completedCount: number;
  totalSteps: number;
  steps: AssignmentProgressStep[];
};

/** Mirrors `canSubmitCompletedHours` without importing RPC/supabase clients. */
function awaitingHoursSubmit(status: string | undefined): boolean {
  return status === 'accepted' || status === 'checked_in' || status === 'checked_out';
}

function normalizeStatus(
  status: string | undefined,
): 'accepted' | 'submitted' | 'approved' | 'rejected' | 'unknown' {
  if (!status) return 'unknown';
  if (status === 'checked_in' || status === 'checked_out' || status === 'accepted') {
    return 'accepted';
  }
  if (status === 'submitted' || status === 'approved' || status === 'rejected') {
    return status;
  }
  return 'unknown';
}

/**
 * Single source of truth for assignment workday progress across
 * shift detail, My work, and any other dashboard surfaces.
 */
export function buildAssignmentProgress(
  status: string | undefined,
  shiftEnded: boolean,
): AssignmentProgressModel {
  const norm = normalizeStatus(status);
  const awaitingSubmit = awaitingHoursSubmit(status);

  let phase: AssignmentProgressPhase;
  let phaseTitle: string;
  let phaseSubtitle: string;
  let currentStep: number;

  if (norm === 'rejected') {
    phase = 'rejected';
    phaseTitle = 'Hours not approved';
    phaseSubtitle = 'The organization declined this timesheet. Open the shift for next steps.';
    currentStep = 3;
  } else if (norm === 'approved') {
    phase = 'approved';
    phaseTitle = 'Hours approved';
    phaseSubtitle = 'Your timesheet is approved and ready for payroll.';
    currentStep = 4;
  } else if (norm === 'submitted') {
    phase = 'under_review';
    phaseTitle = 'With the organization';
    phaseSubtitle = 'Your hours are submitted and awaiting organization approval.';
    currentStep = 3;
  } else if (awaitingSubmit && shiftEnded) {
    phase = 'ready_to_submit';
    phaseTitle = 'Ready to submit hours';
    phaseSubtitle = 'Shift ended — enter completed hours for organization review.';
    currentStep = 2;
  } else {
    phase = 'waiting_for_end';
    phaseTitle = 'Shift accepted';
    phaseSubtitle = 'Submit completed hours after the scheduled end time.';
    currentStep = 2;
  }

  const steps: AssignmentProgressStep[] = [
    {
      step: 1,
      title: 'Accepted',
      description: 'You claimed this shift',
      statusLabel: norm === 'unknown' ? 'Pending' : 'Done',
      state: norm === 'unknown' ? 'not_started' : 'complete',
      isCurrent: false,
    },
    {
      step: 2,
      title: 'Submit hours',
      description:
        phase === 'ready_to_submit'
          ? 'Enter your completed hours'
          : phase === 'waiting_for_end'
            ? 'Available after the shift ends'
            : 'Hours sent for review',
      statusLabel:
        norm === 'submitted' || norm === 'approved' || norm === 'rejected'
          ? 'Hours submitted'
          : phase === 'ready_to_submit'
            ? 'Ready'
            : 'After shift end',
      state:
        norm === 'submitted' || norm === 'approved' || norm === 'rejected'
          ? 'complete'
          : phase === 'ready_to_submit' || phase === 'waiting_for_end'
            ? 'in_progress'
            : 'not_started',
      isCurrent: phase === 'ready_to_submit' || phase === 'waiting_for_end',
    },
    {
      step: 3,
      title: 'Organization review',
      description:
        phase === 'under_review'
          ? 'Waiting on organization approval'
          : phase === 'rejected'
            ? 'Timesheet was declined'
            : phase === 'approved'
              ? 'Review complete'
              : 'Starts after you submit hours',
      statusLabel:
        norm === 'approved'
          ? 'Done'
          : norm === 'rejected'
            ? 'Rejected'
            : norm === 'submitted'
              ? 'Under review'
              : 'Pending',
      state:
        norm === 'approved'
          ? 'complete'
          : norm === 'rejected'
            ? 'rejected'
            : norm === 'submitted'
              ? 'under_review'
              : 'not_started',
      isCurrent: phase === 'under_review' || phase === 'rejected',
    },
    {
      step: 4,
      title: 'Approved',
      description:
        phase === 'approved'
          ? 'Ready for payroll'
          : phase === 'rejected'
            ? 'Not approved'
            : 'Final confirmation from the organization',
      statusLabel:
        norm === 'approved' ? 'Approved' : norm === 'rejected' ? 'Rejected' : 'Pending',
      state:
        norm === 'approved' ? 'approved' : norm === 'rejected' ? 'rejected' : 'not_started',
      isCurrent: phase === 'approved',
    },
  ];

  const completedCount = steps.filter(
    (s) => s.state === 'complete' || s.state === 'approved',
  ).length;

  return {
    phase,
    phaseTitle,
    phaseSubtitle,
    currentStep,
    completedCount,
    totalSteps: steps.length,
    steps,
  };
}
