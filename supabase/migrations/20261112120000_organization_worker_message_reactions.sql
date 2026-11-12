-- 20261112120000_organization_worker_message_reactions.sql
-- One reaction per user per message on organization ↔ worker chat.
-- Writes only via SECURITY DEFINER RPCs. Does not affect unread/push/email.

-- ---------------------------------------------------------------------------
-- Table
-- ---------------------------------------------------------------------------

create table public.organization_worker_message_reactions (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null
    references public.organization_worker_messages (id) on delete cascade,
  conversation_id uuid not null
    references public.organization_worker_conversations (id) on delete cascade,
  reactor_user_id uuid not null references public.profiles (id) on delete cascade,
  reaction_key text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint organization_worker_message_reactions_key_check
    check (
      reaction_key in (
        'thumbsup',
        'heart',
        'joy',
        'tada',
        'open_mouth',
        'pray'
      )
    ),
  constraint organization_worker_message_reactions_user_unique
    unique (message_id, reactor_user_id)
);

create trigger organization_worker_message_reactions_set_updated_at
before update on public.organization_worker_message_reactions
for each row
execute function public.set_updated_at();

create index organization_worker_message_reactions_conversation_idx
  on public.organization_worker_message_reactions (conversation_id);

create index organization_worker_message_reactions_message_idx
  on public.organization_worker_message_reactions (message_id);

comment on table public.organization_worker_message_reactions is
  'Emoji reactions on org↔worker messages. One row per reactor per message.';

-- ---------------------------------------------------------------------------
-- RLS (select only; mutations via SECURITY DEFINER RPCs)
-- ---------------------------------------------------------------------------

alter table public.organization_worker_message_reactions enable row level security;

create policy organization_worker_message_reactions_select_worker
on public.organization_worker_message_reactions
for select
to authenticated
using (
  exists (
    select 1
    from public.organization_worker_conversations c
    where c.id = conversation_id
      and c.worker_id = auth.uid()
      and not public.is_app_review_demo_worker(auth.uid())
  )
);

create policy organization_worker_message_reactions_select_org_staff
on public.organization_worker_message_reactions
for select
to authenticated
using (
  exists (
    select 1
    from public.organization_worker_conversations c
    where c.id = conversation_id
      and public.has_org_role(
        c.organization_id,
        array['org_admin'::public.org_role, 'org_scheduler'::public.org_role]
      )
      and public.organization_is_operational(c.organization_id)
  )
);

revoke insert, update, delete on public.organization_worker_message_reactions
  from public, anon, authenticated;
grant select on public.organization_worker_message_reactions to authenticated;

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create or replace function public.org_worker_reaction_emoji(p_key text)
returns text
language sql
immutable
as $$
  select case p_key
    when 'thumbsup' then '👍'
    when 'heart' then '❤️'
    when 'joy' then '😂'
    when 'tada' then '🎉'
    when 'open_mouth' then '😮'
    when 'pray' then '🙏'
    else null
  end;
$$;

revoke all on function public.org_worker_reaction_emoji(text)
  from public, anon;
grant execute on function public.org_worker_reaction_emoji(text)
  to authenticated;

create or replace function public.org_worker_can_access_conversation(p_conversation_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_org_id uuid;
  v_worker_id uuid;
begin
  if v_uid is null or p_conversation_id is null then
    return false;
  end if;

  select c.organization_id, c.worker_id
  into v_org_id, v_worker_id
  from public.organization_worker_conversations c
  where c.id = p_conversation_id;

  if not found then
    return false;
  end if;

  if v_worker_id = v_uid then
    return public.org_worker_messaging_eligible(v_org_id, v_worker_id);
  end if;

  return public.has_org_role(
      v_org_id,
      array['org_admin'::public.org_role, 'org_scheduler'::public.org_role]
    )
    and public.organization_is_operational(v_org_id)
    and public.org_worker_messaging_eligible(v_org_id, v_worker_id);
end;
$$;

revoke all on function public.org_worker_can_access_conversation(uuid)
  from public, anon;
grant execute on function public.org_worker_can_access_conversation(uuid)
  to authenticated;

-- ---------------------------------------------------------------------------
-- RPCs
-- ---------------------------------------------------------------------------

create or replace function public.list_org_worker_message_reaction_summaries(
  p_message_ids uuid[]
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;

  if p_message_ids is null or cardinality(p_message_ids) = 0 then
    return '[]'::jsonb;
  end if;

  return coalesce(
    (
      with visible as (
        select m.id as message_id
        from public.organization_worker_messages m
        where m.id = any (p_message_ids)
          and public.org_worker_can_access_conversation(m.conversation_id)
      ),
      agg as (
        select
          r.message_id,
          r.reaction_key,
          count(*)::int as reaction_count,
          bool_or(r.reactor_user_id = v_uid) as reacted_by_me
        from public.organization_worker_message_reactions r
        join visible v on v.message_id = r.message_id
        group by r.message_id, r.reaction_key
      )
      select jsonb_agg(
        jsonb_build_object(
          'messageId', message_id,
          'reactions', reactions
        )
        order by message_id
      )
      from (
        select
          v.message_id,
          coalesce(
            (
              select jsonb_agg(
                jsonb_build_object(
                  'key', a.reaction_key,
                  'emoji', public.org_worker_reaction_emoji(a.reaction_key),
                  'count', a.reaction_count,
                  'reactedByMe', a.reacted_by_me
                )
                order by a.reaction_key
              )
              from agg a
              where a.message_id = v.message_id
            ),
            '[]'::jsonb
          ) as reactions
        from visible v
      ) summarized
    ),
    '[]'::jsonb
  );
end;
$$;

revoke all on function public.list_org_worker_message_reaction_summaries(uuid[])
  from public, anon;
grant execute on function public.list_org_worker_message_reaction_summaries(uuid[])
  to authenticated;

create or replace function public.set_org_worker_message_reaction(
  p_message_id uuid,
  p_reaction_key text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_message public.organization_worker_messages%rowtype;
  v_row public.organization_worker_message_reactions%rowtype;
begin
  if v_uid is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;

  if p_message_id is null or p_reaction_key is null then
    raise exception 'INVALID_INPUT' using errcode = '22023';
  end if;

  if p_reaction_key not in (
    'thumbsup',
    'heart',
    'joy',
    'tada',
    'open_mouth',
    'pray'
  ) then
    raise exception 'INVALID_REACTION_KEY' using errcode = '22023';
  end if;

  select * into v_message
  from public.organization_worker_messages m
  where m.id = p_message_id;

  if not found then
    raise exception 'MESSAGE_NOT_FOUND' using errcode = 'P0002';
  end if;

  if not public.org_worker_can_access_conversation(v_message.conversation_id) then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  insert into public.organization_worker_message_reactions (
    message_id,
    conversation_id,
    reactor_user_id,
    reaction_key
  )
  values (
    v_message.id,
    v_message.conversation_id,
    v_uid,
    p_reaction_key
  )
  on conflict (message_id, reactor_user_id) do update
  set
    reaction_key = excluded.reaction_key,
    updated_at = now()
  returning * into v_row;

  return jsonb_build_object(
    'messageId', v_row.message_id,
    'reactionKey', v_row.reaction_key,
    'emoji', public.org_worker_reaction_emoji(v_row.reaction_key),
    'reactorUserId', v_row.reactor_user_id
  );
end;
$$;

revoke all on function public.set_org_worker_message_reaction(uuid, text)
  from public, anon;
grant execute on function public.set_org_worker_message_reaction(uuid, text)
  to authenticated;

create or replace function public.clear_org_worker_message_reaction(
  p_message_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_message public.organization_worker_messages%rowtype;
  v_deleted int := 0;
begin
  if v_uid is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;

  if p_message_id is null then
    raise exception 'INVALID_INPUT' using errcode = '22023';
  end if;

  select * into v_message
  from public.organization_worker_messages m
  where m.id = p_message_id;

  if not found then
    raise exception 'MESSAGE_NOT_FOUND' using errcode = 'P0002';
  end if;

  if not public.org_worker_can_access_conversation(v_message.conversation_id) then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  delete from public.organization_worker_message_reactions r
  where r.message_id = p_message_id
    and r.reactor_user_id = v_uid;

  get diagnostics v_deleted = row_count;

  return jsonb_build_object(
    'messageId', p_message_id,
    'cleared', v_deleted > 0
  );
end;
$$;

revoke all on function public.clear_org_worker_message_reaction(uuid)
  from public, anon;
grant execute on function public.clear_org_worker_message_reaction(uuid)
  to authenticated;

-- ---------------------------------------------------------------------------
-- Realtime (private Broadcast only — not postgres_changes publication)
-- ---------------------------------------------------------------------------
-- Supabase documents that Realtime postgres_changes DELETE delivery does not
-- apply normal deleted-row RLS authorization. Publishing this table would let
-- an authenticated nonparticipant who knows a conversation_id filter receive
-- DELETE old-row fields (message_id, conversation_id, reactor_user_id,
-- reaction_key) even though RPC/table DELETE remains access-checked.
-- Delivery therefore uses private Broadcast with server-enforced
-- realtime.messages SELECT authorization on a conversation-scoped topic.
-- Do NOT add organization_worker_message_reactions to supabase_realtime.

create or replace function public.org_worker_reactions_broadcast_topic(
  p_conversation_id uuid
)
returns text
language sql
immutable
as $$
  select case
    when p_conversation_id is null then null
    else 'org-worker-reactions:' || p_conversation_id::text
  end;
$$;

revoke all on function public.org_worker_reactions_broadcast_topic(uuid)
  from public, anon;
grant execute on function public.org_worker_reactions_broadcast_topic(uuid)
  to authenticated;

create or replace function public.org_worker_reactions_topic_conversation_id(
  p_topic text
)
returns uuid
language plpgsql
immutable
as $$
begin
  if p_topic is null
    or p_topic !~* '^org-worker-reactions:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  then
    return null;
  end if;
  return substring(p_topic from char_length('org-worker-reactions:') + 1)::uuid;
exception
  when others then
    return null;
end;
$$;

revoke all on function public.org_worker_reactions_topic_conversation_id(text)
  from public, anon;
grant execute on function public.org_worker_reactions_topic_conversation_id(text)
  to authenticated;

create or replace function public.org_worker_message_reactions_broadcast()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_conversation_id uuid;
  v_message_id uuid;
  v_op text;
begin
  if tg_op = 'DELETE' then
    v_conversation_id := old.conversation_id;
    v_message_id := old.message_id;
    v_op := 'DELETE';
  else
    v_conversation_id := new.conversation_id;
    v_message_id := new.message_id;
    v_op := tg_op;
  end if;

  -- Server-only send. Clients have no INSERT policy on realtime.messages for
  -- this topic, so they cannot forge reaction activity events.
  perform realtime.send(
    payload => jsonb_build_object(
      'conversation_id', v_conversation_id,
      'message_id', v_message_id,
      'op', v_op
    ),
    event => 'reaction_changed',
    topic => public.org_worker_reactions_broadcast_topic(v_conversation_id),
    private => true
  );

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

revoke all on function public.org_worker_message_reactions_broadcast()
  from public, anon, authenticated;

create trigger organization_worker_message_reactions_broadcast
after insert or update or delete on public.organization_worker_message_reactions
for each row
execute function public.org_worker_message_reactions_broadcast();

-- Receive-only: conversation participants may join the private Broadcast topic.
-- No client INSERT policy — broadcasts originate from the trigger above.
drop policy if exists org_worker_reactions_broadcast_select on realtime.messages;

create policy org_worker_reactions_broadcast_select
on realtime.messages
for select
to authenticated
using (
  extension = 'broadcast'
  and public.org_worker_can_access_conversation(
    public.org_worker_reactions_topic_conversation_id((select realtime.topic()))
  )
);
