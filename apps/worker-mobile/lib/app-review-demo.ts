import type { WorkerInvoiceListItem } from '@/lib/invoices';
import type { MarketplaceShift } from '@/lib/queries';
import type { WorkerShiftDetails } from '@/lib/rpcs';

export const APP_REVIEW_DEMO_SHIFT_ID = '00000000-0000-4000-8000-000000000001';
export const APP_REVIEW_DEMO_TIMESHEET_ID = '00000000-0000-4000-8000-000000000002';
export const APP_REVIEW_DEMO_INVOICE_ID = '00000000-0000-4000-8000-000000000003';

export type AppReviewDemoCatalog = {
  banner: { title: string; body: string };
  shift: {
    id: string;
    label: string;
    title: string;
    organization_name: string;
    location_name: string;
    required_role: string;
    starts_at: string;
    ends_at: string;
    hourly_rate_minor: number;
    currency: string;
    status: string;
    actions_allowed: boolean;
  };
  timesheet: {
    id: string;
    label: string;
    status: string;
    submitted_minutes: number;
    approved_minutes: number;
    actions_allowed: boolean;
  };
  invoice: {
    id: string;
    label: string;
    status: string;
    amount_minor: number;
    currency: string;
    due_at: string;
    actions_allowed: boolean;
    checkout_allowed: boolean;
  };
};

export function isAppReviewDemoShiftId(id: string | null | undefined): boolean {
  return id === APP_REVIEW_DEMO_SHIFT_ID;
}

export function isAppReviewDemoInvoiceId(id: string | null | undefined): boolean {
  return id === APP_REVIEW_DEMO_INVOICE_ID;
}

export function marketplaceShiftFromDemoCatalog(
  catalog: AppReviewDemoCatalog,
): MarketplaceShift {
  const s = catalog.shift;
  const now = new Date().toISOString();
  return {
    id: s.id,
    title: s.title,
    organization_id: '00000000-0000-4000-8000-0000000000d0',
    location_id: '00000000-0000-4000-8000-0000000000d1',
    ward_id: null,
    starts_at: s.starts_at,
    ends_at: s.ends_at,
    break_minutes: 30,
    rate_minor: s.hourly_rate_minor,
    currency: s.currency,
    required_role: s.required_role as MarketplaceShift['required_role'],
    required_positions: 1,
    status: 'published',
    notes: s.label,
    acceptance_deadline: null,
    created_at: now,
    updated_at: now,
    created_by: null,
    creation_batch_id: null,
    open_positions: 1,
    filled_positions: 0,
    location_name: s.location_name,
    ward_name: null,
    organization_name: s.organization_name,
  };
}

export function workerShiftDetailsFromDemoCatalog(
  catalog: AppReviewDemoCatalog,
): WorkerShiftDetails {
  const s = catalog.shift;
  return {
    shift_id: s.id,
    organization_name: s.organization_name,
    location_name: s.location_name,
    ward_name: null,
    title: s.title,
    starts_at: s.starts_at,
    ends_at: s.ends_at,
    rate_minor: s.hourly_rate_minor,
    currency: s.currency,
    required_role: s.required_role,
    status: s.status,
    notes: s.label,
    break_minutes: 30,
    acceptance_deadline: null,
    required_positions: 1,
    open_positions: 1,
  };
}

export function invoiceListItemFromDemoCatalog(
  catalog: AppReviewDemoCatalog,
  workerId: string,
): WorkerInvoiceListItem {
  const inv = catalog.invoice;
  const shift = catalog.shift;
  const ts = catalog.timesheet;
  const now = new Date().toISOString();
  const gross =
    Math.round((ts.approved_minutes / 60) * shift.hourly_rate_minor) ||
    inv.amount_minor * 10;
  return {
    id: inv.id,
    worker_id: workerId,
    organization_id: '00000000-0000-4000-8000-0000000000d0',
    assignment_id: '00000000-0000-4000-8000-0000000000d2',
    timesheet_id: ts.id,
    invoice_number: 'DEMO-INV-001',
    status: inv.status as WorkerInvoiceListItem['status'],
    commission_amount_minor: inv.amount_minor,
    commission_rate_bps: 1000,
    gross_amount_minor: gross,
    rate_minor: shift.hourly_rate_minor,
    approved_minutes: ts.approved_minutes,
    currency: inv.currency,
    due_at: inv.due_at,
    issued_at: now,
    paid_at: null,
    past_due_at: null,
    void_reason: null,
    voided_at: null,
    provider_name: 'demo',
    provider_metadata: {},
    stripe_checkout_session_id: null,
    stripe_customer_id: null,
    stripe_payment_intent_id: null,
    created_at: now,
    updated_at: now,
    organizations: {
      display_name: shift.organization_name,
      legal_name: shift.organization_name,
    },
    shift_assignments: {
      shifts: {
        title: `${shift.label}: ${shift.title}`,
        starts_at: shift.starts_at,
        ends_at: shift.ends_at,
      },
    },
  };
}

export async function fetchAppReviewDemoCatalog(): Promise<{
  data: AppReviewDemoCatalog | null;
  error?: string;
}> {
  const { supabase } = await import('@/lib/supabase');
  const { data, error } = await supabase.rpc('get_app_review_demo_catalog');
  if (error) {
    return { data: null, error: error.message };
  }
  return { data: data as AppReviewDemoCatalog };
}
