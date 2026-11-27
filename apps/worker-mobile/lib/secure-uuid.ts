import { isMessagingUuid } from '@bridge-hive/domain';
import * as Crypto from 'expo-crypto';

/**
 * Secure client message id for native + web via Expo Crypto.
 * Returns null when generation fails — never a weak Math.random placeholder.
 */
export function createSecureClientMessageId(): string | null {
  try {
    const id = Crypto.randomUUID();
    return isMessagingUuid(id) ? id : null;
  } catch {
    return null;
  }
}

/** Redacted capability probe for private diagnostics (booleans only). */
export function secureUuidCapability(): { hasRandomUUID: boolean; sampleValid: boolean } {
  const hasRandomUUID = typeof Crypto.randomUUID === 'function';
  let sampleValid = false;
  if (hasRandomUUID) {
    try {
      sampleValid = isMessagingUuid(Crypto.randomUUID());
    } catch {
      sampleValid = false;
    }
  }
  return { hasRandomUUID, sampleValid };
}
