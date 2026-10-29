import { useCallback, useEffect, useState } from 'react';

import {
  fetchAppReviewDemoCatalog,
  type AppReviewDemoCatalog,
} from '@/lib/app-review-demo';
import { useAuth } from '@/providers/AuthProvider';

export function useAppReviewDemoCatalog() {
  const { isAppReviewDemo } = useAuth();
  const [catalog, setCatalog] = useState<AppReviewDemoCatalog | null>(null);
  const [loading, setLoading] = useState(isAppReviewDemo);
  const [error, setError] = useState<string>();

  const refresh = useCallback(async () => {
    if (!isAppReviewDemo) {
      setCatalog(null);
      setError(undefined);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(undefined);
    const result = await fetchAppReviewDemoCatalog();
    if (result.error || !result.data) {
      setCatalog(null);
      setError(result.error ?? 'Could not load demonstration catalog.');
    } else {
      setCatalog(result.data);
    }
    setLoading(false);
  }, [isAppReviewDemo]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { catalog, loading, error, refresh, isAppReviewDemo };
}
