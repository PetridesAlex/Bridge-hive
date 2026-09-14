import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';

import { getPublishedShifts, type Shift } from '@/lib/queries';
import { useAuth } from '@/providers/AuthProvider';

export function useShifts() {
  const { user, workerProfile, isVerified } = useAuth();
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [offline, setOffline] = useState(false);
  const requestId = useRef(0);

  const refresh = useCallback(async () => {
    const currentRequest = ++requestId.current;
    setLoading(true);
    setError(undefined);

    if (!user?.id) {
      setShifts([]);
      setLoading(false);
      return;
    }

    try {
      const result = await getPublishedShifts();
      if (currentRequest !== requestId.current) return;

      if (result.error) {
        setShifts([]);
        setError(
          /network|fetch|failed|offline/i.test(result.error)
            ? 'We couldn’t load shifts. Check your connection and try again.'
            : 'We couldn’t load shifts. Check your connection and try again.',
        );
        setOffline(/network|fetch|failed|offline/i.test(result.error));
      } else {
        // Marketplace RLS already enforces role/org/deadline. Keep enum-safe client filter.
        const role = workerProfile?.worker_role;
        const filtered = role
          ? result.data.filter((shift) => shift.required_role === role)
          : result.data;
        setShifts(filtered);
        setOffline(false);
      }
    } catch {
      if (currentRequest !== requestId.current) return;
      setShifts([]);
      setError('We couldn’t load shifts. Check your connection and try again.');
      setOffline(true);
    } finally {
      if (currentRequest === requestId.current) {
        setLoading(false);
      }
    }
  }, [user?.id, workerProfile?.worker_role]);

  // Clear worker-scoped marketplace state on auth/role change.
  useEffect(() => {
    setShifts([]);
    setError(undefined);
    void refresh();
  }, [user?.id, workerProfile?.worker_role, isVerified, refresh]);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  return {
    shifts,
    loading,
    error,
    offline,
    refresh,
    workerRole: workerProfile?.worker_role ?? null,
    isVerified,
  };
}
