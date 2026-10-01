/**
 * Holds the pending confirmation email in memory (and web sessionStorage)
 * so it is not exposed in the browser URL.
 * Never stores passwords.
 */

const STORAGE_KEY = 'bh_worker_pending_confirm_email';

let memoryEmail: string | null = null;

function canUseSessionStorage(): boolean {
  try {
    return typeof sessionStorage !== 'undefined';
  } catch {
    return false;
  }
}

export function setPendingConfirmEmail(email: string): void {
  const normalized = email.trim().toLowerCase();
  memoryEmail = normalized || null;
  if (canUseSessionStorage()) {
    if (memoryEmail) sessionStorage.setItem(STORAGE_KEY, memoryEmail);
    else sessionStorage.removeItem(STORAGE_KEY);
  }
}

export function getPendingConfirmEmail(): string | null {
  if (memoryEmail) return memoryEmail;
  if (canUseSessionStorage()) {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (stored) {
      memoryEmail = stored;
      return stored;
    }
  }
  return null;
}

export function clearPendingConfirmEmail(): void {
  memoryEmail = null;
  if (canUseSessionStorage()) {
    sessionStorage.removeItem(STORAGE_KEY);
  }
}
