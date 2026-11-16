-- 20261113190000_org_worker_message_deletion.sql
-- Applied on Bridge-Hive and Bridge-Hive-Test.
-- Adds two user actions to organization <-> worker chat:
--   1. Delete a message the caller sent (for both sides; the text is erased and
--      the row stays as a "message deleted" marker so the thread order and
--      read cursors keep working).
--   2. Delete a chat for the caller only (remove the conversation and the person
--      from the caller's inbox and clear the caller's history up to now). The
--      other side keeps its copy. A new message after the clear brings the
--      conversation back, showing only messages sent after the clear.
-- Writes only through SECURITY DEFINER RPCs. Does not depend on the reactions
-- migration. Does not change send_org_worker_message, push, eligibility, shifts,
-- timesheets, invoices, or payouts.
--
-- Legal retention of chat content is NOT decided here. Message text is erased
-- on delete. The deleted marker keeps sender, time, and id. A chat delete for
-- one person does not erase the other person's copy. No retention period is set.

-- ---------------------------------------------------------------------------
-- Message deletion columns
-- ---------------------------------------------------------------------------

alter table public.organization_worker_messages
  add column if not exists deleted_at timestamptz,
  add column if not exists deleted_by uuid references public.profiles (id) on delete set null;

alter table public.organization_worker_messages
  drop constraint if exists organization_worker_messages_body_nonempty;

alter table public.organization_worker_messages
  add constraint organization_worker_messages_body_nonempty
  check (
    (deleted_at is not null and body = '')
    or (deleted_at is null and char_length(trim(body)) > 0)
  );

-- ---------------------------------------------------------------------------
-- Per-person clear marker ("delete chat" for me)
-- ---------------------------------------------------------------------------

create table if not exists public.organization_worker_conversation_clears (
  conversation_id uuid not null
    references public.organization_worker_conversations (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  cleared_at timestamptz not null default now(),
  primary key (conversation_id, user_id)
);

comment on table public.organization_worker_conversation_clears is
  'Per-user chat delete. Hides the conversation and earlier messages for that user only.';

alter table public.organization_worker_conversation_clears enable row level security;

drop policy if exists organization_worker_conversation_clears_select_own
  on public.organization_worker_conversation_clears;
create policy organization_worker_conversation_clears_select_own
on public.organization_worker_conversation_clears
for select
to authenticated
using (user_id = auth.uid());

revoke insert, update, delete on public.organization_worker_conversation_clears
  from public, anon, authenticated;
grant select on public.organization_worker_conversation_clears to authenticated;

-- ---------------------------------------------------------------------------
-- Participant check (own name; independent of the reactions migration)
-- ---------------------------------------------------------------------------

create or replace function public.org_worker_is_conversation_participant(
  p_conversation_id uuid
)
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

  if public.is_app_review_demo_worker(v_uid) then
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
    return true;
  end if;

  return public.has_org_role(
    v_org_id,
    array['org_admin'::public.org_role, 'org_scheduler'::public.org_role]
  );
end;
$$;

revoke all on function public.org_worker_is_conversation_participant(uuid)
  from public, anon;
grant execute on function public.org_worker_is_conversation_participant(uuid)
  to authenticated;

-- ---------------------------------------------------------------------------
-- Delete my message
-- ---------------------------------------------------------------------------

create or replace function public.delete_org_worker_message(
  p_message_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_message public.organization_worker_messages;
  v_latest record;
begin
  if v_uid is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  if p_message_id is null then
    raise exception 'INVALID_ARGUMENTS';
  end if;

  select * into v_message
  from public.organization_worker_messages
  where id = p_message_id
  for update;

  if not found then
    raise exception 'MESSAGE_NOT_FOUND';
  end if;

  if not public.org_worker_is_conversation_participant(v_message.conversation_id) then
    raise exception 'MESSAGING_FORBIDDEN';
  end if;

  -- Only the sender can delete a message. The server never trusts a client id.
  if v_message.sender_user_id <> v_uid then
    raise exception 'MESSAGE_DELETE_FORBIDDEN';
  end if;

  if v_message.deleted_at is not null then
    return jsonb_build_object(
      'messageId', v_message.id,
      'deleted', true,
      'alreadyDeleted', true
    );
  end if;

  update public.organization_worker_messages
  set
    body = '',
    deleted_at = now(),
    deleted_by = v_uid
  where id = v_message.id;

  -- Reactions on an erased message have no purpose. The table exists only when
  -- the reactions migration has been applied.
  if to_regclass('public.organization_worker_message_reactions') is not null then
    execute
      'delete from public.organization_worker_message_reactions where message_id = $1'
      using v_message.id;
  end if;

  -- A push that has not been sent yet must not announce an erased message.
  update public.worker_notification_deliveries d
  set
    status = 'invalid',
    receipt_error = 'message_deleted',
    updated_at = now()
  from public.worker_notification_events e
  where d.event_id = e.id
    and d.status = 'pending'
    and e.event_type = 'org_worker_message'
    and e.publication_key = v_message.id::text;

  -- Keep the inbox preview from showing erased text.
  select m.body, m.sender_kind, m.created_at
  into v_latest
  from public.organization_worker_messages m
  where m.conversation_id = v_message.conversation_id
    and m.deleted_at is null
  order by m.created_at desc, m.id desc
  limit 1;

  update public.organization_worker_conversations
  set
    last_message_preview = case when v_latest.body is null then null else left(v_latest.body, 280) end,
    last_sender_kind = coalesce(v_latest.sender_kind, last_sender_kind),
    updated_at = now()
  where id = v_message.conversation_id;

  return jsonb_build_object(
    'messageId', v_message.id,
    'deleted', true,
    'alreadyDeleted', false
  );
end;
$$;

revoke all on function public.delete_org_worker_message(uuid)
  from public, anon;
grant execute on function public.delete_org_worker_message(uuid)
  to authenticated;

-- ---------------------------------------------------------------------------
-- Delete chat for me
-- ---------------------------------------------------------------------------

create or replace function public.clear_org_worker_conversation(
  p_conversation_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_cleared_at timestamptz := now();
begin
  if v_uid is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  if p_conversation_id is null then
    raise exception 'INVALID_ARGUMENTS';
  end if;

  if not public.org_worker_is_conversation_participant(p_conversation_id) then
    raise exception 'MESSAGING_FORBIDDEN';
  end if;

  insert into public.organization_worker_conversation_clears (
    conversation_id,
    user_id,
    cleared_at
  )
  values (p_conversation_id, v_uid, v_cleared_at)
  on conflict (conversation_id, user_id) do update
  set cleared_at = excluded.cleared_at;

  return jsonb_build_object(
    'conversationId', p_conversation_id,
    'clearedAt', v_cleared_at,
    'scope', 'me_only'
  );
end;
$$;

revoke all on function public.clear_org_worker_conversation(uuid)
  from public, anon;
grant execute on function public.clear_org_worker_conversation(uuid)
  to authenticated;

-- ---------------------------------------------------------------------------
-- Inbox list: hide cleared chats, ignore erased and cleared messages in unread
-- ---------------------------------------------------------------------------

create or replace function public.list_org_worker_conversations(
  p_organization_id uuid default null,
  p_limit integer default 50
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_limit integer := least(greatest(coalesce(p_limit, 50), 1), 100);
begin
  if v_uid is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  if public.is_app_review_demo_worker(v_uid) then
    raise exception 'APP_REVIEW_DEMO_FORBIDDEN';
  end if;

  if p_organization_id is not null then
    if not public.has_org_role(
      p_organization_id,
      array['org_admin'::public.org_role, 'org_scheduler'::public.org_role]
    ) then
      raise exception 'MESSAGING_FORBIDDEN';
    end if;
  end if;

  return coalesce(
    (
      select jsonb_agg(to_jsonb(row_data) order by row_data."lastMessageAt" desc nulls last)
      from (
        select
          c.id,
          c.organization_id as "organizationId",
          c.worker_id as "workerId",
          c.last_message_at as "lastMessageAt",
          c.last_message_preview as "lastMessagePreview",
          c.last_sender_kind as "lastSenderKind",
          c.created_at as "createdAt",
          o.display_name as "organizationName",
          p.full_name as "workerName",
          wp.worker_role as "workerRole",
          coalesce(
            (
              select count(*)::integer
              from public.organization_worker_messages m
              left join public.organization_worker_conversation_reads r
                on r.conversation_id = c.id
               and r.user_id = v_uid
              left join public.organization_worker_messages last_read
                on last_read.id = r.last_read_message_id
               and last_read.conversation_id = c.id
              where m.conversation_id = c.id
                and m.sender_user_id <> v_uid
                and m.deleted_at is null
                and (cl.cleared_at is null or m.created_at > cl.cleared_at)
                and (
                  r.last_read_message_id is null
                  or last_read.id is null
                  or (m.created_at, m.id) > (last_read.created_at, last_read.id)
                )
            ),
            0
          ) as "unreadCount"
        from public.organization_worker_conversations c
        join public.organizations o on o.id = c.organization_id
        join public.profiles p on p.id = c.worker_id
        join public.worker_profiles wp on wp.user_id = c.worker_id
        left join public.organization_worker_conversation_clears cl
          on cl.conversation_id = c.id
         and cl.user_id = v_uid
        where (
          (
            p_organization_id is not null
            and c.organization_id = p_organization_id
            and public.has_org_role(
              c.organization_id,
              array['org_admin'::public.org_role, 'org_scheduler'::public.org_role]
            )
          )
          or (
            p_organization_id is null
            and c.worker_id = v_uid
          )
        )
        and (
          cl.cleared_at is null
          or (c.last_message_at is not null and c.last_message_at > cl.cleared_at)
        )
        order by c.last_message_at desc nulls last, c.created_at desc
        limit v_limit
      ) row_data
    ),
    '[]'::jsonb
  );
end;
$$;

revoke all on function public.list_org_worker_conversations(uuid, integer)
  from public, anon;
grant execute on function public.list_org_worker_conversations(uuid, integer)
  to authenticated;

-- ---------------------------------------------------------------------------
-- Message list: no history before my clear, erased text never returned
-- ---------------------------------------------------------------------------

create or replace function public.list_org_worker_messages(
  p_conversation_id uuid,
  p_before_created_at timestamptz default null,
  p_before_id uuid default null,
  p_limit integer default 50
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_conversation public.organization_worker_conversations;
  v_limit integer := least(greatest(coalesce(p_limit, 50), 1), 100);
  v_cleared_at timestamptz;
begin
  if v_uid is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  if public.is_app_review_demo_worker(v_uid) then
    raise exception 'APP_REVIEW_DEMO_FORBIDDEN';
  end if;

  select * into v_conversation
  from public.organization_worker_conversations
  where id = p_conversation_id;

  if not found then
    raise exception 'CONVERSATION_NOT_FOUND';
  end if;

  if v_uid <> v_conversation.worker_id
     and not public.has_org_role(
       v_conversation.organization_id,
       array['org_admin'::public.org_role, 'org_scheduler'::public.org_role]
     ) then
    raise exception 'MESSAGING_FORBIDDEN';
  end if;

  select cl.cleared_at into v_cleared_at
  from public.organization_worker_conversation_clears cl
  where cl.conversation_id = p_conversation_id
    and cl.user_id = v_uid;

  return coalesce(
    (
      select jsonb_agg(to_jsonb(row_data) order by row_data."createdAt" asc, row_data.id asc)
      from (
        select *
        from (
          select
            m.id,
            m.conversation_id as "conversationId",
            m.sender_user_id as "senderUserId",
            m.sender_kind as "senderKind",
            case when m.deleted_at is null then m.body else '' end as body,
            m.client_message_id as "clientMessageId",
            m.created_at as "createdAt",
            m.deleted_at as "deletedAt",
            coalesce(nullif(trim(p.full_name), ''), 'Member') as "senderName"
          from public.organization_worker_messages m
          join public.profiles p on p.id = m.sender_user_id
          where m.conversation_id = p_conversation_id
            and (v_cleared_at is null or m.created_at > v_cleared_at)
            and (
              p_before_created_at is null
              or (m.created_at, m.id) < (p_before_created_at, p_before_id)
            )
          order by m.created_at desc, m.id desc
          limit v_limit
        ) newest_first
      ) row_data
    ),
    '[]'::jsonb
  );
end;
$$;

revoke all on function public.list_org_worker_messages(uuid, timestamptz, uuid, integer)
  from public, anon;
grant execute on function public.list_org_worker_messages(uuid, timestamptz, uuid, integer)
  to authenticated;
