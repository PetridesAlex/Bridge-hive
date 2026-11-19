import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const migrationPath = path.join(
  __dirname,
  '../../../../supabase/migrations/20261118180000_worker_invoice_due_soon_reminder.sql',
);
const migration = readFileSync(migrationPath, 'utf8');

describe('invoice_due_soon reminder migration contract', () => {
  it('is a forward migration after the hosted head and has a stable SHA-256', () => {
    expect(path.basename(migrationPath).startsWith('20261118180000')).toBe(true);
    const sha = createHash('sha256').update(migration).digest('hex');
    // Frozen for the Prompt 1 readiness manifest — update only with intentional SQL edits.
    expect(sha).toBe(
      '3da76ece8e2d5026e1001b2eef68ba5bffc704bdb7e60065c56b7253d1ed902d',
    );
  });

  it('adds durable invoice_due_soon identity and push enqueue without sandbox reads', () => {
    expect(migration).toContain("'invoice_due_soon'");
    expect(migration).toContain('enqueue_invoice_due_soon_notification');
    expect(migration).toContain('notifications_invoice_due_soon_once');
    expect(migration).toContain('worker_notification_events_invoice_due_soon_uidx');
    expect(migration).toContain('invalidate_invoice_due_soon_pending');
    expect(migration).not.toContain('from public.worker_sandbox_commission_invoices');
    expect(migration).toContain('is_app_review_demo_worker');
    expect(migration).toContain("i.status = 'open'");
    expect(migration).toContain("interval '3 days'");
  });

  it('preserves overdue restriction on due_at and does not invent suspension_at', () => {
    expect(migration).toContain("status = 'past_due'");
    expect(migration).toContain('due_at <= now()');
    expect(migration).not.toContain('suspension_at');
    expect(migration).not.toContain('grace period');
  });

  it('extends claim_worker_push_deliveries for invoice eligibility recheck', () => {
    expect(migration).toContain('invoice_unavailable');
    expect(migration).toContain('e.invoice_id as "invoiceId"');
    expect(migration).toContain("e.event_type = 'invoice_due_soon'");
  });

  it('does not schedule production cron in this migration', () => {
    expect(migration).not.toContain('cron.schedule');
    expect(migration).not.toContain('process-worker-commission-overdue');
  });
});
