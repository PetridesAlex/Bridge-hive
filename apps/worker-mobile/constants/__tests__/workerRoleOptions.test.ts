import { WORKER_ROLES, WORKER_ROLE_LABELS } from '@bridge-hive/domain';

import { getWorkerRoleOptions, WORKER_ROLE_OPTIONS } from '../workerRoleOptions';

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

describe('getWorkerRoleOptions', () => {
  it('uses the provided translator for titles and descriptions', () => {
    const translate = (key: string) => `T:${key}`;
    const options = getWorkerRoleOptions(translate);
    expect(options.map((o) => o.role)).toEqual([...WORKER_ROLES]);
    const physio = options.find((o) => o.role === 'physiotherapist');
    expect(physio?.title).toBe('T:roles.physiotherapist');
    expect(physio?.description).toBe('T:roles.physiotherapist_desc');
  });
});
