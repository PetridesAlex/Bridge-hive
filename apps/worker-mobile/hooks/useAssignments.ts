import { useCallback, useEffect, useState } from 'react';

import { getMyAssignments, type ShiftAssignment } from '@/lib/queries';

export function useAssignments(workerId?: string | null) {
  const [assignments, setAssignments] = useState<ShiftAssignment[]>([]);
  const [loading, setLoading] = useState(Boolean(workerId));
  const [error, setError] = useState<string>();

  const refresh = useCallback(async () => {
    if (!workerId) {
      setAssignments([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(undefined);
    const result = await getMyAssignments(workerId);
    if (result.error) setError(result.error);
    else setAssignments(result.data);
    setLoading(false);
  }, [workerId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { assignments, loading, error, refresh };
}
