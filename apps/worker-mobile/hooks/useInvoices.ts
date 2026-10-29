import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  fetchAppReviewDemoCatalog,
  invoiceListItemFromDemoCatalog,
} from '@/lib/app-review-demo';
import {
  getMyCommissionInvoices,
  type WorkerInvoiceListItem,
} from '@/lib/invoices';
import { useAuth } from '@/providers/AuthProvider';

export type InvoiceFilter = 'all' | 'open' | 'past_due' | 'paid';

export function useInvoices(workerId?: string | null) {
  const { isAppReviewDemo } = useAuth();
  const [invoices, setInvoices] = useState<WorkerInvoiceListItem[]>([]);
  const [loading, setLoading] = useState(Boolean(workerId));
  const [error, setError] = useState<string>();
  const [filter, setFilter] = useState<InvoiceFilter>('all');

  const refresh = useCallback(async () => {
    if (!workerId) {
      setInvoices([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(undefined);

    if (isAppReviewDemo) {
      const result = await fetchAppReviewDemoCatalog();
      if (result.error || !result.data) {
        setError(result.error ?? 'Could not load demonstration catalog.');
        setInvoices([]);
      } else {
        setInvoices([invoiceListItemFromDemoCatalog(result.data, workerId)]);
      }
      setLoading(false);
      return;
    }

    const result = await getMyCommissionInvoices(workerId);
    if (result.error) {
      setError(result.error);
    } else {
      setInvoices(result.data);
    }
    setLoading(false);
  }, [workerId, isAppReviewDemo]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const filtered = useMemo(() => {
    if (filter === 'all') return invoices;
    if (filter === 'open') {
      return invoices.filter((i) => i.status === 'open' || i.status === 'payment_processing');
    }
    return invoices.filter((i) => i.status === filter);
  }, [filter, invoices]);

  return {
    invoices: filtered,
    allInvoices: invoices,
    loading,
    error,
    refresh,
    filter,
    setFilter,
  };
}
