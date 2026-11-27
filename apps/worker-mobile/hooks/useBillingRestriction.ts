import { marketplacePausedForLiveBillingStanding } from '@bridge-hive/domain';
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
      setError(undefined);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(undefined);
    const result = await getMyBillingRestrictionSummary();
    if (result.error) {
      setError(result.error);
      setSummary(null);
    } else {
      setSummary(result.data);
      setError(undefined);
    }
    setLoading(false);
  }, [enabled]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Follows live standing even on sandbox payment builds. Sandbox invoice pay
  // eligibility stays separate in the invoice / checkout paths.
  const isRestricted = marketplacePausedForLiveBillingStanding(summary?.standing);

  return { summary, isRestricted, loading, error, refresh };
}
