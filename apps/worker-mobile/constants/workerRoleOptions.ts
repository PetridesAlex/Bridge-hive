import {
  WORKER_ROLES,
  WORKER_ROLE_LABELS,
  type WorkerRole,
} from '@bridge-hive/domain';

const WORKER_ROLE_DESCRIPTIONS: Record<WorkerRole, string> = {
  registered_nurse:
    'Licensed nurses delivering hands-on clinical care on registered nurse shifts.',
  ward_assistant:
    'Ward support staff assisting daily patient care on ward assistant shifts.',
  physiotherapist:
    'Registered physiotherapists providing therapy and rehabilitation on physio shifts.',
};

export type WorkerRoleOption = {
  role: WorkerRole;
  title: string;
  description: string;
};

/** Onboarding role cards — driven by the shared domain role registry. */
export const WORKER_ROLE_OPTIONS: WorkerRoleOption[] = WORKER_ROLES.map(
  (role) => ({
    role,
    title: WORKER_ROLE_LABELS[role],
    description: WORKER_ROLE_DESCRIPTIONS[role],
  }),
);
