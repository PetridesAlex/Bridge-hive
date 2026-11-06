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

/**
 * Artificial minimum only applies to signed-out cold launch (Welcome / login).
 * Signed-in users go straight to the dashboard as soon as auth is ready.
 * After the first successful enter in this JS runtime, skip the minimum entirely.
 */
export function workspacePreparationMinMs(
  consumed: boolean,
  hasSession = false,
): number {
  if (consumed || hasSession) return 0;
  return WORKSPACE_PREPARATION_MINIMUM_MS;
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
