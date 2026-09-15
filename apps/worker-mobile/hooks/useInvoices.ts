import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  getMyCommissionInvoices,
  type WorkerInvoiceListItem,
} from '@/lib/invoices';

export type InvoiceFilter = 'all' | 'open' | 'past_due' | 'paid';

export function useInvoices(workerId?: string | null) {
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
    const result = await getMyCommissionInvoices(workerId);
    if (result.error) {
      setError(result.error);
    } else {
      setInvoices(result.data);
    }
    setLoading(false);
  }, [workerId]);

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
