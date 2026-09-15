import type { Tables } from '@bridge-hive/supabase-types';

import { supabase } from '@/lib/supabase';

export type WorkerCommissionInvoice = Tables<'worker_commission_invoices'>;

export type WorkerInvoiceListItem = WorkerCommissionInvoice & {
  organizations?: { display_name: string | null; legal_name: string | null } | null;
  shift_assignments?: {
    shifts?: {
      title: string | null;
      starts_at: string;
      ends_at: string;
    } | null;
  } | null;
};

export type BillingRestrictionSummary = {
  standing: 'good_standing' | 'restricted';
  overdue_count: number;
  overdue_amount_minor: number;
  oldest_due_at: string | null;
};

export async function getMyCommissionInvoices(workerId: string) {
  const { data, error } = await supabase
    .from('worker_commission_invoices')
    .select(
      `
      *,
      organizations ( display_name, legal_name ),
      shift_assignments (
        shifts ( title, starts_at, ends_at )
      )
    `,
    )
    .eq('worker_id', workerId)
    .order('due_at', { ascending: true });

  return {
    data: (data ?? []) as WorkerInvoiceListItem[],
    error: error?.message,
  };
}

export async function getMyCommissionInvoice(invoiceId: string, workerId: string) {
  const { data, error } = await supabase
    .from('worker_commission_invoices')
    .select(
      `
      *,
      organizations ( display_name, legal_name ),
      shift_assignments (
        shifts ( title, starts_at, ends_at, rate_minor, currency )
      )
    `,
    )
    .eq('id', invoiceId)
    .eq('worker_id', workerId)
    .maybeSingle();

  return {
    data: (data as WorkerInvoiceListItem | null) ?? null,
    error: error?.message,
  };
}

export async function getMyBillingRestrictionSummary() {
  const { data, error } = await supabase.rpc('get_my_billing_restriction_summary');
  if (error) {
    return { data: null as BillingRestrictionSummary | null, error: error.message };
  }
  return {
    data: data as BillingRestrictionSummary,
    error: undefined as string | undefined,
  };
}

export async function startWorkerInvoiceCheckout(invoiceId: string) {
  const { data, error } = await supabase.functions.invoke('create-worker-invoice-checkout', {
    body: { invoice_id: invoiceId },
  });

  if (error) {
    return {
      url: null as string | null,
      error: 'Payment is temporarily unavailable. Please try again later.',
    };
  }

  const payload = data as { url?: string; error?: string; message?: string } | null;
  if (payload?.url) {
    return { url: payload.url, error: undefined as string | undefined };
  }

  if (payload?.error === 'payment_unavailable') {
    return {
      url: null,
      error: payload.message ?? 'Payment is temporarily unavailable. Please try again later.',
    };
  }

  return {
    url: null,
    error: 'Payment is temporarily unavailable. Please try again later.',
  };
}
