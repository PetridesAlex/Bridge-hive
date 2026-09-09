-- 006_infrastructure.sql
-- Device tokens, in-app notifications, and immutable audit events.

create table public.device_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  platform text not null,
  expo_push_token text not null,
  last_seen_at timestamptz not null default now(),
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint device_tokens_platform_check check (platform in ('ios', 'android', 'web')),
  constraint device_tokens_token_unique unique (expo_push_token)
);

create trigger device_tokens_set_updated_at
before update on public.device_tokens
for each row
execute function public.set_updated_at();

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  type text not null,
  title text not null,
  body text not null,
  data jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  constraint notifications_type_nonempty check (char_length(trim(type)) > 0)
);

create table public.audit_events (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references public.profiles (id) on delete set null,
  organization_id uuid references public.organizations (id) on delete set null,
  entity_type text not null,
  entity_id uuid,
  action text not null,
  before jsonb,
  after jsonb,
  created_at timestamptz not null default now(),
  constraint audit_events_entity_type_nonempty check (char_length(trim(entity_type)) > 0),
  constraint audit_events_action_nonempty check (char_length(trim(action)) > 0)
);

-- ---------------------------------------------------------------------------
-- Audit helper
-- ---------------------------------------------------------------------------

create or replace function public.create_audit_event(
  p_organization_id uuid,
  p_entity_type text,
  p_entity_id uuid,
  p_action text,
  p_before jsonb default null,
  p_after jsonb default null
)
returns public.audit_events
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.audit_events;
begin
  insert into public.audit_events (
    actor_user_id,
    organization_id,
    entity_type,
    entity_id,
    action,
    before,
    after
  )
  values (
    auth.uid(),
    p_organization_id,
    p_entity_type,
    p_entity_id,
    p_action,
    p_before,
    p_after
  )
  returning * into v_row;

  return v_row;
end;
$$;

revoke all on function public.create_audit_event(uuid, text, uuid, text, jsonb, jsonb) from public;
grant execute on function public.create_audit_event(uuid, text, uuid, text, jsonb, jsonb) to authenticated;

-- ---------------------------------------------------------------------------
-- RLS: device_tokens
-- ---------------------------------------------------------------------------

alter table public.device_tokens enable row level security;

create policy "device_tokens_select_own"
on public.device_tokens
for select
to authenticated
using (user_id = auth.uid());

create policy "device_tokens_insert_own"
on public.device_tokens
for insert
to authenticated
with check (user_id = auth.uid());

create policy "device_tokens_update_own"
on public.device_tokens
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "device_tokens_delete_own"
on public.device_tokens
for delete
to authenticated
using (user_id = auth.uid());

revoke all on table public.device_tokens from anon;
grant select, insert, update, delete on table public.device_tokens to authenticated;

-- ---------------------------------------------------------------------------
-- RLS: notifications
-- ---------------------------------------------------------------------------

alter table public.notifications enable row level security;

create policy "notifications_select_own"
on public.notifications
for select
to authenticated
using (user_id = auth.uid());

create policy "notifications_update_own_read"
on public.notifications
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

-- Inserts are server-side / security definer workflows.

revoke all on table public.notifications from anon;
grant select, update on table public.notifications to authenticated;

-- ---------------------------------------------------------------------------
-- RLS: audit_events
-- ---------------------------------------------------------------------------

alter table public.audit_events enable row level security;

-- Org members may read org-scoped audit history (no cross-tenant).
create policy "audit_events_select_org_member"
on public.audit_events
for select
to authenticated
using (
  organization_id is not null
  and public.is_org_member(organization_id)
);

-- Actors may read their own audit rows (e.g. worker claim history).
create policy "audit_events_select_own_actor"
on public.audit_events
for select
to authenticated
using (actor_user_id = auth.uid());

-- No direct client inserts; use create_audit_event / RPCs.
revoke all on table public.audit_events from anon;
grant select on table public.audit_events to authenticated;
