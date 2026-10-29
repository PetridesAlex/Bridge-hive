import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';

import {
  fetchAppReviewDemoCatalog,
  marketplaceShiftFromDemoCatalog,
} from '@/lib/app-review-demo';
import { getPublishedShifts, type MarketplaceShift } from '@/lib/queries';
import { useAuth } from '@/providers/AuthProvider';

export function useShifts() {
  const { user, workerProfile, isVerified, isAppReviewDemo } = useAuth();
  const [shifts, setShifts] = useState<MarketplaceShift[]>([]);
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

    if (isAppReviewDemo) {
      const result = await fetchAppReviewDemoCatalog();
      if (currentRequest !== requestId.current) return;
      if (result.error || !result.data) {
        setShifts([]);
        setError(result.error ?? 'Could not load demonstration catalog.');
        setOffline(false);
      } else {
        setShifts([marketplaceShiftFromDemoCatalog(result.data)]);
        setOffline(false);
      }
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
        const filtered = (role
          ? result.data.filter((shift) => shift.required_role === role)
          : result.data
        ).filter((shift) => shift.open_positions > 0);
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
  }, [user?.id, workerProfile?.worker_role, isAppReviewDemo]);

  // Clear worker-scoped marketplace state on auth/role change.
  useEffect(() => {
    setShifts([]);
    setError(undefined);
    void refresh();
  }, [user?.id, workerProfile?.worker_role, isVerified, isAppReviewDemo, refresh]);

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
    isAppReviewDemo,
  };
}
