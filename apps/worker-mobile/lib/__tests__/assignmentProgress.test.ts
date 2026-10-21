import { buildAssignmentProgress } from '@/lib/assignmentProgress';

describe('buildAssignmentProgress', () => {
  it('marks accepted + not ended as waiting on submit after end', () => {
    const model = buildAssignmentProgress('accepted', false);
    expect(model.phase).toBe('waiting_for_end');
    expect(model.steps[0].state).toBe('complete');
    expect(model.steps[1].statusLabel).toBe('After shift end');
    expect(model.steps[1].isCurrent).toBe(true);
    expect(model.steps[2].state).toBe('not_started');
    expect(model.steps[2].statusLabel).toBe('Pending');
  });

  it('marks accepted + ended as ready to submit', () => {
    const model = buildAssignmentProgress('checked_out', true);
    expect(model.phase).toBe('ready_to_submit');
    expect(model.steps[1].state).toBe('in_progress');
    expect(model.steps[1].statusLabel).toBe('Ready');
    expect(model.steps[1].isCurrent).toBe(true);
    expect(model.steps[2].isCurrent).toBe(false);
  });

  it('does not leave Submit hours as current after hours are submitted', () => {
    const model = buildAssignmentProgress('submitted', true);
    expect(model.phase).toBe('under_review');
    expect(model.steps[1].state).toBe('complete');
    expect(model.steps[1].statusLabel).toBe('Hours submitted');
    expect(model.steps[1].isCurrent).toBe(false);
    expect(model.steps[2].state).toBe('under_review');
    expect(model.steps[2].statusLabel).toBe('Under review');
    expect(model.steps[2].isCurrent).toBe(true);
    expect(model.steps[3].statusLabel).toBe('Pending');
  });

  it('marks approved as fully complete', () => {
    const model = buildAssignmentProgress('approved', true);
    expect(model.phase).toBe('approved');
    expect(model.completedCount).toBe(4);
    expect(model.steps[3].state).toBe('approved');
    expect(model.steps[3].isCurrent).toBe(true);
  });

  it('marks rejected on organization review', () => {
    const model = buildAssignmentProgress('rejected', true);
    expect(model.phase).toBe('rejected');
    expect(model.steps[1].state).toBe('complete');
    expect(model.steps[2].state).toBe('rejected');
    expect(model.steps[2].isCurrent).toBe(true);
    expect(model.steps[3].state).toBe('rejected');
  });
});
