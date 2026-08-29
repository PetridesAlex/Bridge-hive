import React, { useMemo } from 'react';

import { Stepper, type StepperStep } from '@/components/ui/Stepper';
import type { ShiftTransferStatus } from '@/types';

const FLOW: { key: ShiftTransferStatus; label: string }[] = [
  { key: 'REQUESTED', label: 'Transfer Requested' },
  { key: 'ACCEPTED_BY_REPLACEMENT', label: 'Replacement Accepted' },
  { key: 'PENDING_HOSPITAL_APPROVAL', label: 'Hospital Approval' },
  { key: 'COMPLETED', label: 'Transfer Completed' },
];

type Props = {
  status: ShiftTransferStatus;
};

export function TransferTimeline({ status }: Props) {
  const steps: StepperStep[] = useMemo(() => {
    const currentIndex = FLOW.findIndex((s) => s.key === status);
    return FLOW.map((step, index) => ({
      key: step.key,
      label: step.label,
      done: index < currentIndex || status === 'COMPLETED',
      active: index === currentIndex && status !== 'COMPLETED',
    }));
  }, [status]);

  return <Stepper steps={steps} />;
}
