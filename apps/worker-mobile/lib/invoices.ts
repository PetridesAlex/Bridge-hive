import type { Tables } from '@bridge-hive/supabase-types';

import {
  getCheckoutFunctionName,
  getPaymentSheetFunctionName,
  isSandboxPaymentsBuild,
} from '@/constants/stripe';
import { supabase } from '@/lib/supabase';

export type WorkerCommissionInvoice = Tables<'worker_commission_invoices'>;

export type WorkerSandboxCommissionInvoice = {
  id: string;
  invoice_number: string;
  worker_id: string;
  currency: string;
  gross_amount_minor: number;
  commission_rate_bps: number;
  commission_amount_minor: number;
  status: WorkerCommissionInvoice['status'];
  issued_at: string;
  due_at: string;
  paid_at: string | null;
  provider_name: string;
  stripe_customer_id: string | null;
  stripe_checkout_session_id: string | null;
  stripe_payment_intent_id: string | null;
  provider_metadata: Record<string, unknown>;
  label: string;
  created_by: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  /** Sandbox invoices have no approved minutes / rate from a timesheet. */
  approved_minutes?: number;
  rate_minor?: number;
};

export type WorkerInvoiceListItem = (WorkerCommissionInvoice | WorkerSandboxCommissionInvoice) & {
  organizations?: { display_name: string | null; legal_name: string | null } | null;
  shift_assignments?: {
    shifts?: {
      title: string | null;
      starts_at: string;
      ends_at: string;
      rate_minor?: number;
      currency?: string;
    } | null;
  } | null;
  /** Present on sandbox invoices — UI shows TEST receipt labeling. */
  is_sandbox?: boolean;
  label?: string;
};

export type BillingRestrictionSummary = {
  standing: 'good_standing' | 'restricted';
  overdue_count: number;
  overdue_amount_minor: number;
  oldest_due_at: string | null;
};

function asSandboxListItem(
  row: WorkerSandboxCommissionInvoice,
): WorkerInvoiceListItem {
  return {
    ...row,
    approved_minutes: row.approved_minutes ?? 0,
    rate_minor: row.rate_minor ?? 0,
    organizations: { display_name: 'Sandbox TEST', legal_name: 'Sandbox TEST' },
    shift_assignments: {
      shifts: {
        title: 'Sandbox payment test',
        starts_at: row.issued_at,
        ends_at: row.due_at,
      },
    },
    is_sandbox: true,
    label: row.label || 'TEST',
  };
}

/** Sandbox RPCs land in generated types after migration 041 + db:types. */
async function rpcSandbox(name: string, args?: Record<string, unknown>) {
  return (supabase as unknown as {
    rpc: (
      fn: string,
      params?: Record<string, unknown>,
    ) => Promise<{ data: unknown; error: { message: string } | null }>;
  }).rpc(name, args);
}

export async function getMyCommissionInvoices(workerId: string) {
  if (isSandboxPaymentsBuild()) {
    const { data, error } = await rpcSandbox('list_my_sandbox_commission_invoices');
    if (error) {
      return { data: [] as WorkerInvoiceListItem[], error: error.message };
    }
    const rows = (data ?? []) as WorkerSandboxCommissionInvoice[];
    return {
      data: rows.map(asSandboxListItem),
      error: undefined as string | undefined,
    };
  }

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
  if (isSandboxPaymentsBuild()) {
    const { data, error } = await rpcSandbox('get_my_sandbox_commission_invoice', {
      p_invoice_id: invoiceId,
    });
    if (error) {
      return { data: null as WorkerInvoiceListItem | null, error: error.message };
    }
    if (!data) {
      return { data: null, error: undefined as string | undefined };
    }
    const row = data as WorkerSandboxCommissionInvoice;
    if (row.worker_id !== workerId) {
      return { data: null, error: 'Invoice not found.' };
    }
    return { data: asSandboxListItem(row), error: undefined as string | undefined };
  }

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
  // Sandbox builds must not surface live debt standing as payment-test state.
  if (isSandboxPaymentsBuild()) {
    return {
      data: {
        standing: 'good_standing',
        overdue_count: 0,
        overdue_amount_minor: 0,
        oldest_due_at: null,
      } satisfies BillingRestrictionSummary,
      error: undefined as string | undefined,
    };
  }

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
  const { data, error } = await supabase.functions.invoke(getCheckoutFunctionName(), {
    body: { invoice_id: invoiceId },
  });

  if (error) {
    return {
      url: null as string | null,
      error: 'Payment is temporarily unavailable. Please try again later.',
    };
  }

  const payload = data as {
    url?: string;
    error?: string;
    message?: string;
  } | null;
  if (payload?.url) {
    return { url: payload.url, error: undefined as string | undefined };
  }

  if (payload?.error === 'payment_unavailable') {
    return {
      url: null,
      error: payload.message ?? 'Payment is temporarily unavailable. Please try again later.',
    };
  }

  if (payload?.error === 'sandbox_tester_required') {
    return {
      url: null,
      error:
        payload.message ??
        'Sandbox payments require a server-authorized payment test account.',
    };
  }

  return {
    url: null,
    error: 'Payment is temporarily unavailable. Please try again later.',
  };
}

export type PaymentSheetBootstrap = {
  paymentIntentClientSecret: string;
  customerId: string;
  customerSessionClientSecret: string;
  publishableKeyMode: 'test' | 'live' | null;
  lane: 'sandbox' | 'live';
  receiptLabel: string | null;
};

export async function startWorkerInvoicePaymentSheet(invoiceId: string) {
  const { data, error } = await supabase.functions.invoke(
    getPaymentSheetFunctionName(),
    {
      body: { invoice_id: invoiceId },
    },
  );

  if (error) {
    return {
      data: null as PaymentSheetBootstrap | null,
      error: 'Payment is temporarily unavailable. Please try again later.',
    };
  }

  const payload = data as {
    paymentIntent?: string;
    customer?: string;
    customerSessionClientSecret?: string;
    publishableKeyMode?: 'test' | 'live';
    lane?: 'sandbox' | 'live';
    receiptLabel?: string;
    error?: string;
    message?: string;
  } | null;

  if (
    payload?.paymentIntent &&
    payload.customer &&
    payload.customerSessionClientSecret
  ) {
    return {
      data: {
        paymentIntentClientSecret: payload.paymentIntent,
        customerId: payload.customer,
        customerSessionClientSecret: payload.customerSessionClientSecret,
        publishableKeyMode: payload.publishableKeyMode ?? null,
        lane: payload.lane ?? (isSandboxPaymentsBuild() ? 'sandbox' : 'live'),
        receiptLabel: payload.receiptLabel ?? null,
      } satisfies PaymentSheetBootstrap,
      error: undefined as string | undefined,
    };
  }

  if (payload?.error === 'payment_unavailable') {
    return {
      data: null,
      error: payload.message ?? 'Payment is temporarily unavailable. Please try again later.',
    };
  }

  if (payload?.error === 'app_review_demo_forbidden') {
    return {
      data: null,
      error: payload.message ?? 'Demonstration accounts cannot start live payments.',
    };
  }

  if (payload?.error === 'sandbox_tester_required') {
    return {
      data: null,
      error:
        payload.message ??
        'Sandbox payments require a server-authorized payment test account.',
    };
  }

  return {
    data: null,
    error: 'Payment is temporarily unavailable. Please try again later.',
  };
}
