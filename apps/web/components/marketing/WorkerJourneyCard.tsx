'use client';

import type { WorkerJourneyStep } from '@/components/marketing/worker-journey-data';

type WorkerJourneyCardProps = {
  activeStep: number | null;
  onStepChange: (index: number | null) => void;
  steps: WorkerJourneyStep[];
  cardTitle: string;
  /** Template with `{n}` and `{label}` placeholders. */
  stepAriaTemplate: string;
};

function renderAriaLabel(template: string, index: number, label: string): string {
  return template.replace('{n}', String(index + 1)).replace('{label}', label);
}

export function WorkerJourneyCard({
  activeStep,
  onStepChange,
  steps,
  cardTitle,
  stepAriaTemplate,
}: WorkerJourneyCardProps) {
  return (
    <div className="m-wj-card">
      <h3 className="m-wj-card-title">{cardTitle}</h3>
      <ol className="m-wj-list">
        {steps.map((step, index) => {
          const active = activeStep === index;
          return (
            <li key={step.id} className={`m-wj-item${active ? ' is-active' : ''}`}>
              <button
                type="button"
                className="m-wj-item-btn"
                aria-current={active ? 'step' : undefined}
                aria-label={renderAriaLabel(stepAriaTemplate, index, step.label)}
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
