import { useCallback, useEffect, useState } from 'react';

import {
  getMyBillingRestrictionSummary,
  type BillingRestrictionSummary,
} from '@/lib/invoices';

export function useBillingRestriction(enabled = true) {
  const [summary, setSummary] = useState<BillingRestrictionSummary | null>(null);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string>();

  const refresh = useCallback(async () => {
    if (!enabled) {
      setSummary(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(undefined);
    const result = await getMyBillingRestrictionSummary();
    if (result.error) {
      setError(result.error);
    } else {
      setSummary(result.data);
    }
    setLoading(false);
  }, [enabled]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const isRestricted = summary?.standing === 'restricted';

  return { summary, isRestricted, loading, error, refresh };
}
