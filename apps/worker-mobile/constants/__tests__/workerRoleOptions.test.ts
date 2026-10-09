import { WORKER_ROLES, WORKER_ROLE_LABELS } from '@bridge-hive/domain';

import { WORKER_ROLE_OPTIONS } from '../workerRoleOptions';

describe('WORKER_ROLE_OPTIONS', () => {
  it('exposes all shared domain roles including physiotherapist', () => {
    expect(WORKER_ROLE_OPTIONS.map((o) => o.role)).toEqual([...WORKER_ROLES]);
    expect(WORKER_ROLE_OPTIONS.some((o) => o.role === 'physiotherapist')).toBe(true);
  });

  it('labels physiotherapist distinctly from registered nurse', () => {
    const physio = WORKER_ROLE_OPTIONS.find((o) => o.role === 'physiotherapist');
    expect(physio?.title).toBe(WORKER_ROLE_LABELS.physiotherapist);
    expect(physio?.title).not.toBe(WORKER_ROLE_LABELS.registered_nurse);
  });
});
