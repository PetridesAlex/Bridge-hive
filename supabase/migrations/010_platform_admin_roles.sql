-- 010_platform_admin_roles.sql
-- Server-side platform admin authorization (never client-only).

create type public.platform_admin_role as enum (
  'platform_support',
  'platform_verifier',
  'platform_finance',
  'platform_super_admin'
);

create table public.platform_admin_roles (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  role public.platform_admin_role not null,
  granted_by uuid references public.profiles (id) on delete set null,
  granted_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger platform_admin_roles_set_updated_at
before update on public.platform_admin_roles
for each row
execute function public.set_updated_at();

create or replace function public.is_platform_admin(
  p_required_role public.platform_admin_role default null
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.platform_admin_roles r
    where r.user_id = auth.uid()
      and (
        p_required_role is null
        or r.role = p_required_role
        or r.role = 'platform_super_admin'
      )
  );
$$;

revoke all on function public.is_platform_admin(public.platform_admin_role) from public;
grant execute on function public.is_platform_admin(public.platform_admin_role) to authenticated;

-- ---------------------------------------------------------------------------
-- RLS: platform_admin_roles
-- ---------------------------------------------------------------------------

alter table public.platform_admin_roles enable row level security;

create policy "platform_admin_roles_select_own_or_super"
on public.platform_admin_roles
for select
to authenticated
using (
  user_id = auth.uid()
  or public.is_platform_admin('platform_super_admin')
);

-- Grants are service-role / SQL bootstrap only (no client insert).
revoke all on table public.platform_admin_roles from anon;
grant select on table public.platform_admin_roles to authenticated;

-- ---------------------------------------------------------------------------
-- Cross-tenant audit read for platform admins
-- ---------------------------------------------------------------------------

create policy "audit_events_select_platform_admin"
on public.audit_events
for select
to authenticated
using (public.is_platform_admin());

-- ---------------------------------------------------------------------------
-- Credential / worker verification by platform_verifier
-- ---------------------------------------------------------------------------

create policy "credentials_select_platform_verifier"
on public.credentials
for select
to authenticated
using (
  public.is_platform_admin('platform_verifier')
  or public.is_platform_admin('platform_support')
);

create policy "credentials_update_platform_verifier"
on public.credentials
for update
to authenticated
using (public.is_platform_admin('platform_verifier'))
with check (public.is_platform_admin('platform_verifier'));

create policy "worker_profiles_select_platform_admin"
on public.worker_profiles
for select
to authenticated
using (
  public.is_platform_admin('platform_verifier')
  or public.is_platform_admin('platform_support')
);

create policy "worker_profiles_update_platform_verifier"
on public.worker_profiles
for update
to authenticated
using (public.is_platform_admin('platform_verifier'))
with check (public.is_platform_admin('platform_verifier'));

-- Session flag so verifiers can change locked status fields.
create or replace function public.credentials_guard_client_status()
returns trigger
language plpgsql
as $$
begin
  if current_setting('bridgehive.allow_platform_verify', true) = 'on' then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if new.status is distinct from 'pending' then
      raise exception 'CREDENTIAL_STATUS_LOCKED';
    end if;
    if new.verified_by is not null or new.verified_at is not null then
      raise exception 'CREDENTIAL_VERIFY_LOCKED';
    end if;
    return new;
  end if;

  if auth.uid() is not null and auth.role() = 'authenticated' then
    if new.status is distinct from old.status
       or new.verified_by is distinct from old.verified_by
       or new.verified_at is distinct from old.verified_at then
      raise exception 'CREDENTIAL_STATUS_LOCKED';
    end if;
  end if;

  return new;
end;
$$;

create or replace function public.worker_profiles_guard_verification()
returns trigger
language plpgsql
as $$
begin
  if current_setting('bridgehive.allow_platform_verify', true) = 'on' then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if new.verification_status is distinct from 'draft' then
      raise exception 'WORKER_VERIFICATION_LOCKED';
    end if;
    return new;
  end if;

  if auth.uid() is not null and auth.role() = 'authenticated' then
    if new.verification_status is distinct from old.verification_status then
      raise exception 'WORKER_VERIFICATION_LOCKED';
    end if;
  end if;

  return new;
end;
$$;

create or replace function public.verify_credential(
  p_credential_id uuid,
  p_decision text,
  p_rejection_reason text default null
)
returns public.credentials
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cred public.credentials;
  v_decision text := lower(trim(p_decision));
begin
  if auth.uid() is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  if not public.is_platform_admin('platform_verifier') then
    raise exception 'NOT_AUTHORIZED';
  end if;

  if v_decision not in ('approve', 'reject') then
    raise exception 'INVALID_DECISION';
  end if;

  select * into v_cred
  from public.credentials
  where id = p_credential_id
  for update;

  if not found then
    raise exception 'CREDENTIAL_NOT_FOUND';
  end if;

  perform set_config('bridgehive.allow_platform_verify', 'on', true);

  if v_decision = 'approve' then
    update public.credentials
    set
      status = 'verified',
      verified_by = auth.uid(),
      verified_at = now(),
      rejection_reason = null,
      updated_at = now()
    where id = v_cred.id
    returning * into v_cred;
  else
    if p_rejection_reason is null or char_length(trim(p_rejection_reason)) = 0 then
      raise exception 'REJECTION_REASON_REQUIRED';
    end if;

    update public.credentials
    set
      status = 'rejected',
      verified_by = auth.uid(),
      verified_at = now(),
      rejection_reason = p_rejection_reason,
      updated_at = now()
    where id = v_cred.id
    returning * into v_cred;
  end if;

  perform set_config('bridgehive.allow_platform_verify', 'off', true);

  perform public.create_audit_event(
    null,
    'credential',
    v_cred.id,
    'verify_credential_' || v_decision,
    null,
    to_jsonb(v_cred)
  );

  return v_cred;
end;
$$;

create or replace function public.set_worker_verification(
  p_worker_id uuid,
  p_status public.verification_status,
  p_reason text default null
)
returns public.worker_profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  v_worker public.worker_profiles;
begin
  if auth.uid() is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  if not public.is_platform_admin('platform_verifier') then
    raise exception 'NOT_AUTHORIZED';
  end if;

  select * into v_worker
  from public.worker_profiles
  where user_id = p_worker_id
  for update;

  if not found then
    raise exception 'WORKER_NOT_FOUND';
  end if;

  perform set_config('bridgehive.allow_platform_verify', 'on', true);

  update public.worker_profiles
  set
    verification_status = p_status,
    updated_at = now()
  where user_id = p_worker_id
  returning * into v_worker;

  perform set_config('bridgehive.allow_platform_verify', 'off', true);

  perform public.create_audit_event(
    null,
    'worker_profile',
    p_worker_id,
    'set_worker_verification',
    jsonb_build_object('reason', p_reason),
    to_jsonb(v_worker)
  );

  return v_worker;
end;
$$;

revoke all on function public.verify_credential(uuid, text, text) from public;
grant execute on function public.verify_credential(uuid, text, text) to authenticated;

revoke all on function public.set_worker_verification(uuid, public.verification_status, text) from public;
grant execute on function public.set_worker_verification(uuid, public.verification_status, text) to authenticated;

-- Storage: platform verifiers may read credential files for review.
create policy "credentials_storage_select_platform_verifier"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'credentials'
  and public.is_platform_admin('platform_verifier')
);

create index if not exists platform_admin_roles_role_idx
  on public.platform_admin_roles (role);
