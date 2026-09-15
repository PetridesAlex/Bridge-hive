import { useCallback, useEffect, useRef, useState } from 'react';

import {
  getMyCommissionInvoice,
  type WorkerInvoiceListItem,
} from '@/lib/invoices';

export function useInvoice(
  invoiceId?: string | null,
  workerId?: string | null,
  options?: { authLoading?: boolean },
) {
  const authLoading = options?.authLoading ?? false;
  const [invoice, setInvoice] = useState<WorkerInvoiceListItem | null>(null);
  const [loading, setLoading] = useState(Boolean(invoiceId) && (authLoading || Boolean(workerId)));
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string>();
  const hasInvoiceRef = useRef(false);

  useEffect(() => {
    hasInvoiceRef.current = invoice != null;
  }, [invoice]);

  const refresh = useCallback(async () => {
    if (!invoiceId) {
      setInvoice(null);
      setLoading(false);
      setRefreshing(false);
      setError(undefined);
      return;
    }
    if (!workerId) {
      // Auth still hydrating: keep loading. Settled without session: stop spinning
      // so the screen can show sign_in_required.
      setInvoice(null);
      setLoading(authLoading);
      setRefreshing(false);
      setError(undefined);
      return;
    }

    const soft = hasInvoiceRef.current;
    if (soft) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(undefined);

    try {
      const result = await getMyCommissionInvoice(invoiceId, workerId);
      if (result.error) {
        setError(result.error);
        if (!soft) setInvoice(null);
      } else if (!result.data) {
        setError('Invoice not found.');
        setInvoice(null);
      } else {
        setInvoice(result.data);
        setError(undefined);
      }
    } catch {
      setError('Could not load invoice. Check your connection and try again.');
      if (!soft) setInvoice(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [invoiceId, workerId, authLoading]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { invoice, loading, refreshing, error, refresh };
}
