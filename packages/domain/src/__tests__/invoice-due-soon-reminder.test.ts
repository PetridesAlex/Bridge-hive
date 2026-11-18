import {
  INVOICE_DUE_SOON_PUSH_TYPE,
  appRouteFromPushData,
  assertSafeShiftPushData,
  buildInvoiceDueSoonNotification,
  invoiceNotificationPath,
  invoiceNotificationUrl,
  invoiceRouteFromPushData,
} from '../push-notifications';
import {
  INVOICE_DUE_SOON_WARNING_DAYS,
  formatInvoiceDeadlineUtc,
  isInvoiceDueSoonWarningWindow,
} from '../worker-invoices';
import { DEFAULT_COMMISSION_RATE_BPS, WORKER_COMMISSION_DUE_DAYS } from '../types';

const invoiceId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

describe('invoice due-soon window and policy constants', () => {
  it('preserves 17% commission and 10-day deadline constants', () => {
    expect(DEFAULT_COMMISSION_RATE_BPS).toBe(1700);
    expect(WORKER_COMMISSION_DUE_DAYS).toBe(10);
    expect(INVOICE_DUE_SOON_WARNING_DAYS).toBe(3);
  });

  it('opens the warning at/inside three days and closes at/after due_at', () => {
    const due = new Date('2026-11-21T12:00:00.000Z');
    expect(
      isInvoiceDueSoonWarningWindow(due, new Date('2026-11-18T12:00:00.000Z')),
    ).toBe(true);
    expect(
      isInvoiceDueSoonWarningWindow(due, new Date('2026-11-18T12:00:00.001Z')),
    ).toBe(true);
    expect(
      isInvoiceDueSoonWarningWindow(due, new Date('2026-11-18T11:59:59.999Z')),
    ).toBe(false);
    expect(
      isInvoiceDueSoonWarningWindow(due, new Date('2026-11-21T12:00:00.000Z')),
    ).toBe(false);
    expect(
      isInvoiceDueSoonWarningWindow(due, new Date('2026-11-21T11:59:59.000Z')),
    ).toBe(true);
  });

  it('formats deadlines in UTC without shifting to device midnight', () => {
    expect(formatInvoiceDeadlineUtc('2026-11-21T12:30:00.000Z')).toBe(
      '2026-11-21 12:30 UTC',
    );
  });
});

describe('invoice due-soon push payload', () => {
  it('builds lock-screen copy without amounts or invoice numbers', () => {
    const en = buildInvoiceDueSoonNotification({ invoiceId, locale: 'en' });
    const el = buildInvoiceDueSoonNotification({ invoiceId, locale: 'el' });
    expect(en).toMatchObject({
      title: 'Bridge Hive reminder',
      body: 'An invoice needs your attention. Open Bridge Hive to review the deadline.',
      data: {
        type: INVOICE_DUE_SOON_PUSH_TYPE,
        invoiceId,
        url: `bridgehive://invoices/${invoiceId}`,
      },
    });
    expect(el?.title).toBe('Υπενθύμιση Bridge Hive');
    expect(JSON.stringify(en)).not.toMatch(/€|EUR|WH-|tax|IBAN|debt/i);
    expect(JSON.stringify(el)).not.toMatch(/€|EUR|WH-|ΑΦΜ|IBAN/i);
  });

  it('validates only the worker invoice route', () => {
    expect(invoiceNotificationUrl(invoiceId)).toBe(`bridgehive://invoices/${invoiceId}`);
    expect(invoiceNotificationPath(invoiceId)).toBe(`/invoices/${invoiceId}`);
    expect(
      invoiceRouteFromPushData({
        type: INVOICE_DUE_SOON_PUSH_TYPE,
        invoiceId,
        url: `bridgehive://invoices/${invoiceId}`,
      }),
    ).toBe(`/invoices/${invoiceId}`);
    expect(
      invoiceRouteFromPushData({
        type: INVOICE_DUE_SOON_PUSH_TYPE,
        invoiceId,
        url: 'https://evil.example/invoices/' + invoiceId,
      }),
    ).toBeNull();
    expect(
      invoiceRouteFromPushData({
        type: INVOICE_DUE_SOON_PUSH_TYPE,
        invoiceId: 'not-a-uuid',
        url: 'bridgehive://invoices/not-a-uuid',
      }),
    ).toBeNull();
    expect(
      appRouteFromPushData({
        type: INVOICE_DUE_SOON_PUSH_TYPE,
        invoiceId,
        url: `bridgehive://invoices/${invoiceId}`,
      }),
    ).toBe(`/invoices/${invoiceId}`);
  });

  it('accepts in-app notification rows that use invoice_id', () => {
    expect(
      invoiceRouteFromPushData({
        invoice_id: invoiceId,
      }),
    ).toBe(`/invoices/${invoiceId}`);
  });

  it('assertSafeShiftPushData accepts invoice payloads', () => {
    const data = assertSafeShiftPushData({
      type: INVOICE_DUE_SOON_PUSH_TYPE,
      invoiceId,
      url: `bridgehive://invoices/${invoiceId}`,
    });
    expect(data).toEqual({
      type: INVOICE_DUE_SOON_PUSH_TYPE,
      invoiceId,
      url: `bridgehive://invoices/${invoiceId}`,
    });
  });
});
