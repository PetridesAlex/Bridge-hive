import { readFileSync } from 'node:fs';
import path from 'node:path';

import {
  canDeleteMessage,
  canReactToMessage,
  isMessagingDeleteUnavailableError,
  mergeThreadSnapshot,
  type OrgWorkerMessageRow,
} from '../org-worker-messaging';

const CONV = '11111111-1111-4111-8111-111111111111';
const ME = '22222222-2222-4222-8222-222222222222';
const OTHER = '33333333-3333-4333-8333-333333333333';
const MSG = '44444444-4444-4444-8444-444444444444';

function row(overrides: Partial<OrgWorkerMessageRow> = {}): OrgWorkerMessageRow {
  return {
    id: MSG,
    conversationId: CONV,
    senderUserId: ME,
    senderKind: 'worker',
    body: 'hello',
    createdAt: '2026-11-13T10:00:00.000Z',
    clientMessageId: 'c1',
    deletedAt: null,
    ...overrides,
  } as OrgWorkerMessageRow;
}

describe('message deletion helpers', () => {
  it('lets a sender delete only their own, real, undeleted messages', () => {
    expect(canDeleteMessage(row(), ME)).toBe(true);
    expect(canDeleteMessage(row(), OTHER)).toBe(false);
    expect(canDeleteMessage(row(), null)).toBe(false);
    expect(canDeleteMessage(row({ deletedAt: '2026-11-13T11:00:00.000Z' }), ME)).toBe(false);
    expect(canDeleteMessage(row({ id: 'temp-1' }), ME)).toBe(false);
  });

  it('does not allow reacting to deleted messages', () => {
    expect(canReactToMessage(row())).toBe(true);
    expect(canReactToMessage(row({ deletedAt: '2026-11-13T11:00:00.000Z' }))).toBe(false);
  });

  it('recognises a missing delete RPC but not unrelated errors', () => {
    expect(
      isMessagingDeleteUnavailableError(
        'Could not find the function public.delete_org_worker_message(p_message_id) in the schema cache',
      ),
    ).toBe(true);
    expect(isMessagingDeleteUnavailableError('MESSAGE_DELETE_FORBIDDEN')).toBe(false);
    expect(isMessagingDeleteUnavailableError(null)).toBe(false);
  });

  it('a refreshed snapshot replaces the original text with the deleted marker', () => {
    const merged = mergeThreadSnapshot(
      [row()],
      [row({ body: '', deletedAt: '2026-11-13T11:00:00.000Z' })],
      CONV,
    );
    expect(merged).toHaveLength(1);
    expect(merged[0].deletedAt).toBe('2026-11-13T11:00:00.000Z');
    expect(merged[0].body).toBe('');
  });
});

describe('20261113190000 message deletion migration contract (source)', () => {
  const sql = readFileSync(
    path.join(
      __dirname,
      '../../../../supabase/migrations/20261113190000_org_worker_message_deletion.sql',
    ),
    'utf8',
  );

  it('soft-deletes by erasing the body, never by deleting the row', () => {
    expect(sql).toContain('deleted_at');
    expect(sql).toContain("body = ''");
    expect(sql).not.toMatch(/delete\s+from\s+public\.organization_worker_messages\b/i);
  });

  it('only the sender can delete a message', () => {
    expect(sql).toContain('create or replace function public.delete_org_worker_message');
    expect(sql).toContain('MESSAGE_DELETE_FORBIDDEN');
    expect(sql).toContain('auth.uid()');
    expect(sql).toContain('security definer');
  });

  it('chat delete is per-user and never touches the other party', () => {
    expect(sql).toContain('organization_worker_conversation_clears');
    expect(sql).toContain('create or replace function public.clear_org_worker_conversation');
    expect(sql).toContain("'me_only'");
    expect(sql).not.toMatch(/delete\s+from\s+public\.organization_worker_conversations\b/i);
  });

  it('keeps client writes revoked on the new table', () => {
    expect(sql).toMatch(/revoke\s+insert,\s*update,\s*delete\s+on\s+public\.organization_worker_conversation_clears/i);
  });

  it('lists hide cleared history and deleted bodies', () => {
    expect(sql).toContain('create or replace function public.list_org_worker_conversations');
    expect(sql).toContain('create or replace function public.list_org_worker_messages');
    expect(sql).toContain('cleared_at');
  });
});
