/**
 * Cross-route flag for the post-login “Securing your session” cover.
 * Survives Expo Router remounts so we never flash empty navy between sign-in
 * and the securing UI. Finish is idempotent across login + root overlay.
 */

type Listener = (active: boolean) => void;

let handoffActive = false;
let handoffFinished = false;
const listeners = new Set<Listener>();

function emit(): void {
  for (const listener of listeners) {
    listener(handoffActive);
  }
}

export function beginSessionHandoff(): void {
  handoffFinished = false;
  if (handoffActive) {
    emit();
    return;
  }
  handoffActive = true;
  emit();
}

export function isSessionHandoffActive(): boolean {
  return handoffActive;
}

export function completeSessionHandoff(): void {
  if (!handoffActive && handoffFinished) return;
  handoffActive = false;
  handoffFinished = true;
  emit();
}

/**
 * Run dashboard navigation once even if login + root overlay both finish.
 * Returns true when this caller should navigate.
 */
export function claimSessionHandoffFinish(): boolean {
  if (handoffFinished) return false;
  handoffFinished = true;
  handoffActive = false;
  emit();
  return true;
}

/** Subscribe to handoff changes (root overlay). Returns unsubscribe. */
export function subscribeSessionHandoff(listener: Listener): () => void {
  listeners.add(listener);
  listener(handoffActive);
  return () => {
    listeners.delete(listener);
  };
}

/** Test helper only. */
export function resetSessionHandoffForTests(): void {
  handoffActive = false;
  handoffFinished = false;
  emit();
}
