import { useCallback, useEffect, useState } from 'react';

import { getPublishedShifts, type Shift } from '@/lib/queries';

export function useShifts() {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [offline, setOffline] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(undefined);
    try {
      const result = await getPublishedShifts();
      if (result.error) {
        setError(result.error);
        setOffline(/network|fetch|failed/i.test(result.error));
      } else {
        setShifts(result.data);
        setOffline(false);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load shifts');
      setOffline(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { shifts, loading, error, offline, refresh };
}
