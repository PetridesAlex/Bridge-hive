import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

import {
  getMyAssignments,
  type AssignmentWithShift,
} from '@/lib/queries';

export function useAssignments(workerId?: string | null) {
  const [assignments, setAssignments] = useState<AssignmentWithShift[]>([]);
  const [loading, setLoading] = useState(Boolean(workerId));
  const [error, setError] = useState<string>();
  const requestId = useRef(0);

  const refresh = useCallback(async () => {
    const currentRequest = ++requestId.current;
    if (!workerId) {
      if (currentRequest !== requestId.current) return;
      setAssignments([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(undefined);
    const result = await getMyAssignments(workerId);
    if (currentRequest !== requestId.current) return;
    if (result.error) setError(result.error);
    else setAssignments(result.data);
    setLoading(false);
  }, [workerId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void refresh();
    });
    return () => sub.remove();
  }, [refresh]);

  return { assignments, loading, error, refresh };
}
