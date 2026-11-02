import {
  WORKER_ROLES,
  WORKER_ROLE_LABELS,
  type WorkerRole,
} from '@bridge-hive/domain';

const ROLE_TITLE_KEYS = {
  registered_nurse: 'roles.registered_nurse',
  ward_assistant: 'roles.ward_assistant',
  physiotherapist: 'roles.physiotherapist',
} as const satisfies Record<WorkerRole, string>;

const ROLE_DESC_KEYS = {
  registered_nurse: 'roles.registered_nurse_desc',
  ward_assistant: 'roles.ward_assistant_desc',
  physiotherapist: 'roles.physiotherapist_desc',
} as const satisfies Record<WorkerRole, string>;

/** English fallbacks — avoid importing i18n at module load (Jest / non-UI callers). */
const ROLE_DESC_EN: Record<WorkerRole, string> = {
  registered_nurse: 'Licensed nursing professionals for clinical shift coverage.',
  ward_assistant: 'Support roles for ward and care-team assistance.',
  physiotherapist: 'Licensed physiotherapy professionals for scheduled care.',
};

export type WorkerRoleOption = {
  role: WorkerRole;
  title: string;
  description: string;
};

type TranslateFn = (key: string, options?: Record<string, unknown>) => string;

/** Onboarding role cards — driven by the shared domain role registry + i18n. */
export function getWorkerRoleOptions(translate?: TranslateFn): WorkerRoleOption[] {
  return WORKER_ROLES.map((role) => ({
    role,
    title: translate ? translate(ROLE_TITLE_KEYS[role]) : WORKER_ROLE_LABELS[role],
    description: translate ? translate(ROLE_DESC_KEYS[role]) : ROLE_DESC_EN[role],
  }));
}

/** English defaults for tests / non-React callers. Prefer getWorkerRoleOptions(t). */
export const WORKER_ROLE_OPTIONS: WorkerRoleOption[] = getWorkerRoleOptions();
