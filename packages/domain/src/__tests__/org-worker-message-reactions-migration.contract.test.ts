import { readFileSync } from 'node:fs';
import path from 'node:path';

const migration = readFileSync(
  path.join(
    __dirname,
    '../../../../supabase/migrations/20261112120000_organization_worker_message_reactions.sql',
  ),
  'utf8',
);

describe('organization_worker_message_reactions migration contract (source)', () => {
  it('creates reactions table with one-per-user uniqueness and allowlist', () => {
    expect(migration).toContain('create table public.organization_worker_message_reactions');
    expect(migration).toContain('unique (message_id, reactor_user_id)');
    expect(migration).toContain("'thumbsup'");
    expect(migration).toContain("'heart'");
    expect(migration).toContain("'joy'");
    expect(migration).toContain("'tada'");
    expect(migration).toContain("'open_mouth'");
    expect(migration).toContain("'pray'");
    expect(migration).toContain('conversation_id uuid not null');
  });

  it('enables select-only RLS and revokes client writes', () => {
    expect(migration).toContain(
      'alter table public.organization_worker_message_reactions enable row level security',
    );
    expect(migration).toContain(
      'revoke insert, update, delete on public.organization_worker_message_reactions',
    );
    expect(migration).toContain('grant select on public.organization_worker_message_reactions');
    expect(migration).toContain('has_org_role');
    expect(migration).toContain('is_app_review_demo_worker');
  });

  it('exposes list/set/clear SECURITY DEFINER RPCs with auth.uid()', () => {
    expect(migration).toContain(
      'create or replace function public.list_org_worker_message_reaction_summaries',
    );
    expect(migration).toContain(
      'create or replace function public.set_org_worker_message_reaction',
    );
    expect(migration).toContain(
      'create or replace function public.clear_org_worker_message_reaction',
    );
    expect(migration).toContain('v_uid uuid := auth.uid()');
    expect(migration).toContain('org_worker_can_access_conversation');
    expect(migration).toContain('on conflict (message_id, reactor_user_id) do update');
  });

  it('does not publish reactions to supabase_realtime (DELETE skips deleted-row RLS)', () => {
    expect(migration).not.toContain(
      'alter publication supabase_realtime add table public.organization_worker_message_reactions',
    );
    expect(migration).not.toContain(
      'alter table public.organization_worker_message_reactions replica identity full',
    );
    expect(migration).toContain(
      'Do NOT add organization_worker_message_reactions to supabase_realtime',
    );
  });

  it('delivers reaction activity via private Broadcast with conversation authorization', () => {
    expect(migration).toContain('perform realtime.send(');
    expect(migration).toContain("event => 'reaction_changed'");
    expect(migration).toContain('private => true');
    expect(migration).toContain('org-worker-reactions:');
    expect(migration).toContain('create policy org_worker_reactions_broadcast_select');
    expect(migration).toContain('on realtime.messages');
    expect(migration).toContain('for select');
    expect(migration).toContain('org_worker_can_access_conversation');
    expect(migration).toContain('org_worker_reactions_topic_conversation_id');
    // Clients must not be able to forge reaction broadcasts on the topic.
    expect(migration).toContain('No client INSERT policy');
    expect(migration).not.toMatch(
      /create policy[\s\S]*on realtime\.messages[\s\S]*for insert/i,
    );
  });
});
