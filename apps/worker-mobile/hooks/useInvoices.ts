import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  fetchAppReviewDemoCatalog,
  invoiceListItemFromDemoCatalog,
} from '@/lib/app-review-demo';
import {
  getMyCommissionInvoices,
  type WorkerInvoiceListItem,
} from '@/lib/invoices';
import type { InvoiceLoadStatus } from '@/lib/invoice-load';
import { useAuth } from '@/providers/AuthProvider';

export type InvoiceFilter = 'all' | 'open' | 'past_due' | 'paid';

export function useInvoices(workerId?: string | null) {
  const { isAppReviewDemo } = useAuth();
  const [invoices, setInvoices] = useState<WorkerInvoiceListItem[]>([]);
  const [loadStatus, setLoadStatus] = useState<InvoiceLoadStatus>(
    workerId ? 'loading' : 'idle',
  );
  const [errorCode, setErrorCode] = useState<'denied' | 'failed' | undefined>();
  const [filter, setFilter] = useState<InvoiceFilter>('all');
  const requestIdRef = useRef(0);
  const invoicesRef = useRef(invoices);
  invoicesRef.current = invoices;

  const refresh = useCallback(async () => {
    if (!workerId) {
      setInvoices([]);
      setLoadStatus('idle');
      setErrorCode(undefined);
      return;
    }
    const requestId = ++requestIdRef.current;
    setLoadStatus('loading');
    setErrorCode(undefined);

    try {
      if (isAppReviewDemo) {
        const result = await fetchAppReviewDemoCatalog();
        if (requestId !== requestIdRef.current) return;
        if (result.error || !result.data) {
          setErrorCode('failed');
          setLoadStatus('failed');
          if (invoicesRef.current.length === 0) setInvoices([]);
        } else {
          setInvoices([invoiceListItemFromDemoCatalog(result.data, workerId)]);
          setLoadStatus('success');
        }
        return;
      }

      const result = await getMyCommissionInvoices(workerId);
      if (requestId !== requestIdRef.current) return;

      if (result.status === 'denied' || result.status === 'failed') {
        setErrorCode(result.code);
        setLoadStatus(result.status);
        if (invoicesRef.current.length === 0) {
          setInvoices([]);
        }
        return;
      }

      setInvoices(result.data);
      setLoadStatus(result.status);
      setErrorCode(undefined);
    } catch {
      if (requestId !== requestIdRef.current) return;
      setErrorCode('failed');
      setLoadStatus('failed');
    }
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
    loading: loadStatus === 'loading',
    loadStatus,
    errorCode,
    /** @deprecated Prefer errorCode + loadStatus */
    error: errorCode,
    refresh,
    filter,
    setFilter,
  };
}
