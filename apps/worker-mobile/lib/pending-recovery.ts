/**
 * In-memory holder for a parsed worker recovery OTP.
 * Never persist token_hash to AsyncStorage or navigation params.
 */

type PendingRecovery =
  | { kind: 'token'; tokenHash: string }
  | { kind: 'error'; message: string };

let pending: PendingRecovery | null = null;

/** True after explicit Confirm on the reset-password screen (session is recovery). */
let recoverySessionActive = false;

export function setPendingRecoveryTokenHash(tokenHash: string): void {
  const trimmed = tokenHash.trim();
  pending = trimmed ? { kind: 'token', tokenHash: trimmed } : null;
}

export function setPendingRecoveryError(message: string): void {
  pending = { kind: 'error', message };
}

export function getPendingRecoveryTokenHash(): string | null {
  if (pending?.kind === 'token') return pending.tokenHash;
  return null;
}

export function getPendingRecoveryError(): string | null {
  if (pending?.kind === 'error') return pending.message;
  return null;
}

export function clearPendingRecovery(): void {
  pending = null;
}

export function markWorkerRecoverySessionActive(): void {
  recoverySessionActive = true;
}

export function clearWorkerRecoverySessionFlag(): void {
  recoverySessionActive = false;
}

export function isWorkerRecoverySessionActive(): boolean {
  return recoverySessionActive;
}

export function clearAllWorkerRecoveryState(): void {
  pending = null;
  recoverySessionActive = false;
}
