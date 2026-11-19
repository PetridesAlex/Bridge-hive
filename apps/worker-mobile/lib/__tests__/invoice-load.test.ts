import {
  classifyInvoiceListError,
  invoiceDetailBase,
  invoiceListBackFallback,
  invoiceListHref,
  invoiceTotalsUsable,
} from '../invoice-load';

describe('invoice load classification', () => {
  it('maps sandbox authorization denials', () => {
    expect(classifyInvoiceListError('NOT_AUTHORIZED')).toBe('denied');
    expect(classifyInvoiceListError('Error: not_authorized')).toBe('denied');
    expect(classifyInvoiceListError('sandbox_tester_required')).toBe('denied');
  });

  it('maps other errors as failed', () => {
    expect(classifyInvoiceListError('network timeout')).toBe('failed');
    expect(classifyInvoiceListError(undefined)).toBe('failed');
  });

  it('only allows totals for empty or success', () => {
    expect(invoiceTotalsUsable('success')).toBe(true);
    expect(invoiceTotalsUsable('empty')).toBe(true);
    expect(invoiceTotalsUsable('denied')).toBe(false);
    expect(invoiceTotalsUsable('failed')).toBe(false);
    expect(invoiceTotalsUsable('loading')).toBe(false);
  });

  it('resolves tab vs profile invoice parents', () => {
    expect(invoiceListHref('/payments')).toBe('/(tabs)/invoices');
    expect(invoiceListHref('/profile/payments')).toBe('/profile/invoices');
    expect(invoiceDetailBase('/profile/invoices/abc')).toBe('/profile/invoices');
    expect(invoiceDetailBase('/invoices/abc')).toBe('/invoices');
    expect(invoiceListBackFallback('/profile/invoices')).toBe('/(tabs)/profile');
    expect(invoiceListBackFallback('/invoices')).toBe('/(tabs)/payments');
  });
});
