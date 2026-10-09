import {
  WORKER_ROLE_LABELS,
  WORKER_ROLES,
  isWorkerRole,
} from '@bridge-hive/domain';

describe('worker role registry (physiotherapist)', () => {
  it('includes physiotherapist as an exact machine value', () => {
    expect(WORKER_ROLES).toEqual([
      'registered_nurse',
      'ward_assistant',
      'physiotherapist',
    ]);
    expect(isWorkerRole('physiotherapist')).toBe(true);
    expect(WORKER_ROLE_LABELS.physiotherapist).toBe('Physiotherapist');
    expect(WORKER_ROLE_LABELS.physiotherapist).not.toBe(
      WORKER_ROLE_LABELS.registered_nurse,
    );
  });

  it('does not coerce unknown roles to registered_nurse', () => {
    expect(isWorkerRole('registered_nurse')).toBe(true);
    expect(isWorkerRole('doctor')).toBe(false);
    expect(isWorkerRole(null)).toBe(false);
  });
});
