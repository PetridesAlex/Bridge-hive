-- Authorization / uniqueness smoke assertions for message reactions.
-- Run only when local Supabase has applied 20261112120000_*.
-- Not executed in CI unless db test harness is configured.
-- Live Realtime join authorization is not claimed by this file.

begin;

select plan(10);

select has_table('public', 'organization_worker_message_reactions');
select has_function('public', 'list_org_worker_message_reaction_summaries', array['uuid[]']);
select has_function('public', 'set_org_worker_message_reaction', array['uuid', 'text']);
select has_function('public', 'clear_org_worker_message_reaction', array['uuid']);
select has_function('public', 'org_worker_reactions_broadcast_topic', array['uuid']);
select has_function('public', 'org_worker_reactions_topic_conversation_id', array['text']);
select has_function('public', 'org_worker_message_reactions_broadcast', array[]::text[]);

-- Reactions must not be in the postgres_changes publication (DELETE skips deleted-row RLS).
select ok(
  not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'organization_worker_message_reactions'
  ),
  'reactions table is not in supabase_realtime publication'
);

select ok(
  exists (
    select 1
    from pg_policy
    where polrelid = 'realtime.messages'::regclass
      and polname = 'org_worker_reactions_broadcast_select'
      and polcmd = 'r'
  ),
  'private Broadcast receive policy exists on realtime.messages'
);

select ok(
  not exists (
    select 1
    from pg_policy
    where polrelid = 'realtime.messages'::regclass
      and polname like '%org_worker_reactions%'
      and polcmd = 'a'
  ),
  'no client INSERT policy for org_worker reaction Broadcast topics'
);

select * from finish();

rollback;
