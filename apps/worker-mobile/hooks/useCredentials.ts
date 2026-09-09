import { useCallback, useEffect, useState } from 'react';

import { getMyCredentials, type Credential } from '@/lib/queries';

export function useCredentials(workerId?: string | null) {
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [loading, setLoading] = useState(Boolean(workerId));
  const [error, setError] = useState<string>();

  const refresh = useCallback(async () => {
    if (!workerId) {
      setCredentials([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(undefined);
    const result = await getMyCredentials(workerId);
    if (result.error) setError(result.error);
    else setCredentials(result.data);
    setLoading(false);
  }, [workerId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { credentials, loading, error, refresh };
}
