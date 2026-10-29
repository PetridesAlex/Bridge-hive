import {
  APP_REVIEW_DEMO_INVOICE_ID,
  APP_REVIEW_DEMO_SHIFT_ID,
  invoiceListItemFromDemoCatalog,
  isAppReviewDemoInvoiceId,
  isAppReviewDemoShiftId,
  marketplaceShiftFromDemoCatalog,
  workerShiftDetailsFromDemoCatalog,
  type AppReviewDemoCatalog,
} from '../app-review-demo';

const sampleCatalog: AppReviewDemoCatalog = {
  banner: {
    title: 'App Review demonstration account',
    body: 'Safe sample data',
  },
  shift: {
    id: APP_REVIEW_DEMO_SHIFT_ID,
    label: 'APP REVIEW DEMO — NOT A LIVE SHIFT',
    title: 'Day shift — Ward sample',
    organization_name: 'Demo Care Facility (sample)',
    location_name: 'Sample ward',
    required_role: 'registered_nurse',
    starts_at: '2030-01-15T08:00:00+00:00',
    ends_at: '2030-01-15T16:00:00+00:00',
    hourly_rate_minor: 1800,
    currency: 'EUR',
    status: 'published',
    actions_allowed: false,
  },
  timesheet: {
    id: '00000000-0000-4000-8000-000000000002',
    label: 'APP REVIEW DEMO — NOT A REAL TIMESHEET',
    status: 'approved',
    submitted_minutes: 450,
    approved_minutes: 450,
    actions_allowed: false,
  },
  invoice: {
    id: APP_REVIEW_DEMO_INVOICE_ID,
    label: 'APP REVIEW DEMO — NOT A REAL INVOICE',
    status: 'open',
    amount_minor: 3400,
    currency: 'EUR',
    due_at: '2030-01-22T00:00:00+00:00',
    actions_allowed: false,
    checkout_allowed: false,
  },
};

describe('app-review-demo helpers', () => {
  it('identifies demo resource ids', () => {
    expect(isAppReviewDemoShiftId(APP_REVIEW_DEMO_SHIFT_ID)).toBe(true);
    expect(isAppReviewDemoShiftId('live-id')).toBe(false);
    expect(isAppReviewDemoInvoiceId(APP_REVIEW_DEMO_INVOICE_ID)).toBe(true);
  });

  it('maps catalog shift for marketplace cards without enabling actions', () => {
    const shift = marketplaceShiftFromDemoCatalog(sampleCatalog);
    expect(shift.id).toBe(APP_REVIEW_DEMO_SHIFT_ID);
    expect(shift.notes).toContain('APP REVIEW DEMO');
    expect(shift.open_positions).toBe(1);
    expect(shift.organization_name).toBe('Demo Care Facility (sample)');
  });

  it('maps catalog into shift detail and invoice list shapes', () => {
    const detail = workerShiftDetailsFromDemoCatalog(sampleCatalog);
    expect(detail.shift_id).toBe(APP_REVIEW_DEMO_SHIFT_ID);
    expect(detail.notes).toContain('NOT A LIVE SHIFT');

    const invoice = invoiceListItemFromDemoCatalog(sampleCatalog, 'worker-1');
    expect(invoice.id).toBe(APP_REVIEW_DEMO_INVOICE_ID);
    expect(invoice.status).toBe('open');
    expect(invoice.commission_amount_minor).toBe(3400);
    expect(invoice.shift_assignments?.shifts?.title).toContain('APP REVIEW DEMO');
  });
});
