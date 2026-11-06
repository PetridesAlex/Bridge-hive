import { readFileSync } from 'node:fs';
import path from 'node:path';

import { advanceReadCursor, isMessagingEligible } from '../org-worker-messaging';

const migration = readFileSync(
  path.join(
    __dirname,
    '../../../../supabase/migrations/20261106122837_organization_worker_messaging.sql',
  ),
  'utf8',
);

describe('organization_worker_messaging migration contract (source)', () => {
  it('requires this worker’s approved assignment + approved timesheet for the org', () => {
    expect(migration).toContain("sa.status = 'approved'");
    expect(migration).toContain("t.status = 'approved'");
    expect(migration).toContain('sa.worker_id = p_worker_id');
    expect(migration).toContain('s.organization_id = p_organization_id');
    expect(migration).toContain('join public.timesheets t on t.assignment_id = sa.id');
    expect(migration).not.toMatch(/sa\.status\s*=\s*'accepted'/);
    expect(migration).not.toMatch(/ends_at\s*<\s*now\(\)/);
  });

  it('supports all three verified worker roles and blocks demo accounts', () => {
    expect(migration).toContain("'registered_nurse'");
    expect(migration).toContain("'ward_assistant'");
    expect(migration).toContain("'physiotherapist'");
    expect(migration).toContain("wp.verification_status = 'verified'");
    expect(migration).toContain("p.account_status = 'active'");
    expect(migration).toContain('is_app_review_demo_worker');
    expect(migration).toContain('APP_REVIEW_DEMO_FORBIDDEN');
  });

  it('enforces one conversation per org+worker and RPC-only writes', () => {
    expect(migration).toContain(
      'constraint organization_worker_conversations_pair_unique',
    );
    expect(migration).toContain('unique (organization_id, worker_id)');
    expect(migration).toContain(
      'unique (conversation_id, client_message_id)',
    );
    expect(migration).toContain(
      'revoke insert, update, delete on public.organization_worker_messages',
    );
    expect(migration).toContain(
      'revoke insert, update, delete on public.organization_worker_conversations',
    );
    expect(migration).toContain(
      'revoke insert, update, delete on public.organization_worker_conversation_reads',
    );
  });

  it('scopes staff access to active org_admin/org_scheduler via has_org_role', () => {
    expect(migration).toContain("'org_admin'");
    expect(migration).toContain("'org_scheduler'");
    expect(migration).toContain('has_org_role');
    expect(migration).not.toContain("'org_billing'");
    // has_org_role itself requires organization_members.status = 'active'
    const hasOrgRole = readFileSync(
      path.join(__dirname, '../../../../supabase/migrations/002_organizations.sql'),
      'utf8',
    );
    expect(hasOrgRole).toMatch(/m\.status\s*=\s*'active'/);
  });

  it('uses auth.uid() as sender and returns existing row on client_message_id retry', () => {
    expect(migration).toContain('v_uid uuid := auth.uid()');
    expect(migration).toContain('sender_user_id');
    expect(migration).toMatch(/values \(\s*p_conversation_id,\s*v_uid,/);
    expect(migration).toContain('return v_existing;');
    expect(migration).toContain('when unique_violation then');
  });

  it('uses display_name (not organizations.name) and per-user reads PK', () => {
    expect(migration).toContain('o.display_name');
    expect(migration).not.toMatch(/o\.name\b/);
    expect(migration).toContain('primary key (conversation_id, user_id)');
    expect(migration).toContain('and r.user_id = v_uid');
  });

  it('enforces configurable server max length and rate limits on send', () => {
    expect(migration).toContain("'org_worker_message_max_length'");
    expect(migration).toContain("'org_worker_message_rate_limit_count'");
    expect(migration).toContain("'org_worker_message_rate_limit_window_seconds'");
    expect(migration).toContain("get_setting_int('org_worker_message_max_length'");
    expect(migration).toContain('MESSAGE_RATE_LIMITED');
    expect(migration).toContain('MESSAGE_BODY_TOO_LONG');
  });

  it('advances read cursors by (created_at, id) within the same conversation', () => {
    expect(migration).toContain(
      '(v_message.created_at, v_message.id) > (v_prev.created_at, v_prev.id)',
    );
    expect(migration).toContain('and conversation_id = p_conversation_id');
    expect(migration).toContain(
      '(m.created_at, m.id) > (last_read.created_at, last_read.id)',
    );
    expect(migration).toContain('v_should_advance');
    expect(migration).toContain('values (p_conversation_id, v_uid, p_message_id, v_message.created_at)');
  });

  it('rechecks messaging eligibility before dispatching org_worker_message pushes', () => {
    expect(migration).toContain("receipt_error = 'message_unavailable'");
    expect(migration).toContain("e.event_type = 'org_worker_message'");
    expect(migration).toContain(
      'not public.org_worker_messaging_eligible(c.organization_id, c.worker_id)',
    );
  });

  it('enqueues push only for organization_staff sends with message-id publication key', () => {
    expect(migration).toContain("if v_sender_kind = 'organization_staff' then");
    expect(migration).toContain('enqueue_org_worker_message_notification');
    expect(migration).toContain('v_publication_key text := p_message_id::text');
    expect(migration).toContain(
      'on conflict (publication_key) where event_type = \'org_worker_message\'',
    );
  });
});

describe('messaging access helpers', () => {
  it('domain eligibility mirrors approved-work + role gates', () => {
    expect(
      isMessagingEligible({
        organizationActive: true,
        workerAccountActive: true,
        workerVerified: true,
        workerRole: 'physiotherapist',
        isAppReviewDemo: false,
        hasApprovedCompletedWork: true,
      }),
    ).toBe(true);
    expect(
      isMessagingEligible({
        organizationActive: true,
        workerAccountActive: true,
        workerVerified: true,
        workerRole: 'physiotherapist',
        isAppReviewDemo: false,
        hasApprovedCompletedWork: false,
      }),
    ).toBe(false);
  });

  it('read cursors move forward only', () => {
    const advanced = advanceReadCursor({
      previousAt: '2026-01-02T00:00:00.000Z',
      previousMessageId: 'msg-2',
      candidateAt: '2026-01-03T00:00:00.000Z',
      candidateMessageId: 'msg-3',
    });
    expect(advanced).toEqual({
      lastReadAt: '2026-01-03T00:00:00.000Z',
      lastReadMessageId: 'msg-3',
      advanced: true,
    });
    const ignored = advanceReadCursor({
      previousAt: '2026-01-03T00:00:00.000Z',
      previousMessageId: 'msg-3',
      candidateAt: '2026-01-01T00:00:00.000Z',
      candidateMessageId: 'msg-1',
    });
    expect(ignored).toEqual({
      lastReadAt: '2026-01-03T00:00:00.000Z',
      lastReadMessageId: 'msg-3',
      advanced: false,
    });
  });
});
