import { useCallback, useEffect, useState } from 'react';

import {
  getMyPayoutAccount,
  getMyPayouts,
  type Payout,
  type PayoutAccount,
} from '@/lib/queries';

export function usePayouts(workerId?: string | null) {
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [account, setAccount] = useState<PayoutAccount | null>(null);
  const [loading, setLoading] = useState(Boolean(workerId));
  const [error, setError] = useState<string>();

  const refresh = useCallback(async () => {
    if (!workerId) {
      setPayouts([]);
      setAccount(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(undefined);
    const [payoutResult, accountResult] = await Promise.all([
      getMyPayouts(workerId),
      getMyPayoutAccount(workerId),
    ]);
    if (payoutResult.error || accountResult.error) {
      setError(payoutResult.error ?? accountResult.error);
    } else {
      setPayouts(payoutResult.data);
      setAccount(accountResult.data);
    }
    setLoading(false);
  }, [workerId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { payouts, account, loading, error, refresh };
}
