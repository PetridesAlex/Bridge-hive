export type InvoiceLoadStatus =
  | 'idle'
  | 'loading'
  | 'success'
  | 'empty'
  | 'failed'
  | 'denied';

export type InvoiceLoadErrorCode = 'denied' | 'failed';

export type InvoiceListResult<T> =
  | { status: 'success'; data: T[] }
  | { status: 'empty'; data: [] }
  | { status: 'denied'; data: []; code: 'denied'; message: string }
  | { status: 'failed'; data: []; code: 'failed'; message: string };

/** Map raw Supabase/RPC errors to a stable client code (no SQL/raw leak to UI). */
export function classifyInvoiceListError(message: string | null | undefined): InvoiceLoadErrorCode {
  const raw = (message ?? '').toUpperCase();
  if (
    raw.includes('NOT_AUTHORIZED') ||
    raw.includes('SANDBOX_TESTER') ||
    raw.includes('SANDBOX TESTER') ||
    raw.includes('PAYMENT_SANDBOX')
  ) {
    return 'denied';
  }
  return 'failed';
}

export function invoiceTotalsUsable(status: InvoiceLoadStatus): boolean {
  return status === 'success' || status === 'empty';
}

/** Path-aware invoice list root for tab vs Account stack. */
export function invoiceListHref(pathname: string): '/profile/invoices' | '/(tabs)/invoices' {
  return pathname.includes('/profile/') ? '/profile/invoices' : '/(tabs)/invoices';
}

export function invoiceDetailBase(pathname: string): '/profile/invoices' | '/invoices' {
  return pathname.includes('/profile/') ? '/profile/invoices' : '/invoices';
}

export function invoiceListBackFallback(pathname: string): '/(tabs)/profile' | '/(tabs)/payments' {
  return pathname.includes('/profile/') ? '/(tabs)/profile' : '/(tabs)/payments';
}
