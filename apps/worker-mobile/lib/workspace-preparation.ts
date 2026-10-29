/** Minimum time the branded workspace-preparation cover stays visible on cold launch. */
export const WORKSPACE_PREPARATION_MINIMUM_MS = 5000;

/**
 * @deprecated Prefer WORKSPACE_PREPARATION_MINIMUM_MS — alias kept for existing imports.
 */
export const APP_BOOT_MIN_MS = WORKSPACE_PREPARATION_MINIMUM_MS;

/** Pure gate: cover dismisses only when auth/onboarding is ready AND the minimum has elapsed. */
export function canDismissWorkspacePreparation(params: {
  ready: boolean;
  minElapsed: boolean;
}): boolean {
  return params.ready && params.minElapsed;
}

/** After the first successful cold-launch enter in this JS runtime, skip the artificial minimum. */
export function workspacePreparationMinMs(consumed: boolean): number {
  return consumed ? 0 : WORKSPACE_PREPARATION_MINIMUM_MS;
}

let workspacePreparationConsumed = false;

export function hasWorkspacePreparationBeenConsumed(): boolean {
  return workspacePreparationConsumed;
}

export function markWorkspacePreparationConsumed(): void {
  workspacePreparationConsumed = true;
}

/** Test-only reset between suites. */
export function resetWorkspacePreparationConsumedForTests(): void {
  workspacePreparationConsumed = false;
}
