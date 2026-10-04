'use client';

import { WORKER_JOURNEY_STEPS } from '@/components/marketing/worker-journey-data';

export function WorkerJourneyCard({
  activeStep,
  onStepChange,
}: {
  activeStep: number | null;
  onStepChange: (index: number | null) => void;
}) {
  return (
    <div className="m-wj-card">
      <h3 className="m-wj-card-title">Worker journey</h3>
      <ol className="m-wj-list">
        {WORKER_JOURNEY_STEPS.map((step, index) => {
          const active = activeStep === index;
          return (
            <li key={step.id} className={`m-wj-item${active ? ' is-active' : ''}`}>
              <button
                type="button"
                className="m-wj-item-btn"
                aria-current={active ? 'step' : undefined}
                aria-label={`Step ${index + 1}: ${step.label}`}
                onMouseEnter={() => onStepChange(index)}
                onMouseLeave={() => onStepChange(null)}
                onFocus={() => onStepChange(index)}
                onBlur={() => onStepChange(null)}
                onClick={() => onStepChange(active ? null : index)}
              >
                <span className="m-wj-item-index" aria-hidden="true">
                  {index + 1}
                </span>
                <span className="m-wj-item-copy">
                  <strong>{step.label}</strong>
                  <span className="m-wj-item-body">{step.body}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
