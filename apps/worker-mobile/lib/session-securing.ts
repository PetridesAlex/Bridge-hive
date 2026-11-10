/** Minimum time the post-login “securing session” cover stays visible. */
export const SESSION_SECURING_MIN_MS = 4000;

/** Hard cap — always dismiss into the workspace even if hydrate is slow. */
export const SESSION_SECURING_MAX_MS = 5000;

export type SessionSecuringStepId =
  | 'verify'
  | 'encrypt'
  | 'sync'
  | 'open';

export const SESSION_SECURING_STEPS: SessionSecuringStepId[] = [
  'verify',
  'encrypt',
  'sync',
  'open',
];

/** Step index for a progress fraction in [0, 1]. */
export function sessionSecuringStepIndex(progress: number): number {
  const clamped = Math.min(1, Math.max(0, progress));
  const last = SESSION_SECURING_STEPS.length - 1;
  return Math.min(last, Math.floor(clamped * SESSION_SECURING_STEPS.length));
}

/** Finish when auth is ready after the minimum, or when the hard cap elapses. */
export function shouldFinishSessionSecuring(params: {
  ready: boolean;
  minElapsed: boolean;
  maxElapsed: boolean;
}): boolean {
  return (params.ready && params.minElapsed) || params.maxElapsed;
}
