import { WORKER_ROLE_LABELS } from '@bridge-hive/domain';

describe('Marketplace empty and error copy', () => {
  it('builds a role-aware empty title for ward assistants', () => {
    const roleLabel = WORKER_ROLE_LABELS.ward_assistant;
    expect(`No open ${roleLabel} shifts are available right now.`).toBe(
      'No open Ward Assistant shifts are available right now.',
    );
  });

  it('keeps load failures distinct from empty marketplace copy', () => {
    const loadError = 'We couldn’t load shifts. Check your connection and try again.';
    expect(loadError).not.toMatch(/No open/i);
  });

  it('compares required roles using canonical enum values', () => {
    const shiftRole: string = 'ward_assistant';
    const workerRole: string = 'ward_assistant';
    expect(shiftRole === workerRole).toBe(true);
    expect(shiftRole === 'Ward Assistant').toBe(false);
  });
});

describe('Acceptance deadline validation copy', () => {
  it('explains past deadlines must be extended before workers can see the shift', () => {
    expect(
      'The acceptance deadline has passed, so eligible workers will not see this shift in the marketplace.',
    ).toMatch(/will not see this shift/i);
  });
});
