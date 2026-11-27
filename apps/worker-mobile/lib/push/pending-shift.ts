import AsyncStorage from '@react-native-async-storage/async-storage';

import { isRestorablePendingPushRoute } from '@bridge-hive/domain';

const PENDING_KEY = 'bridgehive.push.pendingShiftRoute';
const handledResponseIds = new Set<string>();
let pendingRoute: string | null = null;

export function claimNotificationResponse(responseId: string): boolean {
  if (!responseId || handledResponseIds.has(responseId)) return false;
  handledResponseIds.add(responseId);
  return true;
}

export function setPendingShiftRoute(route: string) {
  pendingRoute = route;
  void AsyncStorage.setItem(PENDING_KEY, route);
}

export function peekPendingShiftRoute(): string | null {
  return pendingRoute;
}

export function clearPendingShiftRoute() {
  pendingRoute = null;
  void AsyncStorage.removeItem(PENDING_KEY);
}

export async function hydratePendingShiftRoute(): Promise<void> {
  const stored = await AsyncStorage.getItem(PENDING_KEY);
  if (!stored) return;
  // Restore every push target (shift, batch list, message, invoice) — not only
  // `/shifts/:uuid`. Drop arbitrary/foreign paths that may linger in storage.
  if (isRestorablePendingPushRoute(stored)) {
    pendingRoute = stored;
  } else {
    void AsyncStorage.removeItem(PENDING_KEY);
  }
}
