-- 017_organization_onboarding.sql
-- Organization provisioning, secure invitations, lifecycle RPCs,
-- operational status gates, and platform-admin organization oversight.
-- Migrations 001–016 must remain unchanged.

create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------------------
-- 1. Extend org_status enum (keep closed as legacy terminal).
-- ---------------------------------------------------------------------------

alter type public.org_status add value if not exists 'under_review';
alter type public.org_status add value if not exists 'rejected';

-- ---------------------------------------------------------------------------
-- 2. Organization type enum + profile / review columns
-- ---------------------------------------------------------------------------

do $$ begin
  create type public.organization_type as enum (
    'hospital',
    'clinic',
    'nursing_home',
    'other'
  );
exception
  when duplicate_object then null;
end $$;

alter table public.organizations
  add column if not exists organization_type public.organization_type not null default 'hospital',
  add column if not exists registration_number text,
  add column if not exists registration_number_normalized text,
  add column if not exists tax_vat_number text,
  add column if not exists address_line1 text,
  add column if not exists address_line2 text,
  add column if not exists city text,
  add column if not exists postal_code text,
  add column if not exists country_code text not null default 'CY',
  add column if not exists primary_contact_name text,
  add column if not exists primary_contact_email text,
  add column if not exists submitted_at timestamptz,
  add column if not exists reviewed_at timestamptz,
  add column if not exists reviewed_by uuid references public.profiles (id) on delete set null,
  add column if not exists status_reason text;

create unique index if not exists organizations_registration_number_normalized_uidx
  on public.organizations (registration_number_normalized)
  where registration_number_normalized is not null;

-- ---------------------------------------------------------------------------
-- 3. Organization invitations (token hash only)
-- ---------------------------------------------------------------------------

create table if not exists public.organization_invitations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  email_normalized text not null,
  role public.org_role not null,
  token_hash text not null,
  expires_at timestamptz not null,
  created_by uuid not null references public.profiles (id) on delete restrict,
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  accepted_by uuid references public.profiles (id) on delete set null,
  revoked_at timestamptz,
  revoked_by uuid references public.profiles (id) on delete set null,
  constraint organization_invitations_email_format
    check (email_normalized ~* '^[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}$'),
  constraint organization_invitations_token_hash_unique unique (token_hash),
  constraint organization_invitations_reason_exclusive check (
    (accepted_at is null or revoked_at is null)
  )
);

create index if not exists organization_invitations_org_idx
  on public.organization_invitations (organization_id, created_at desc);

create index if not exists organization_invitations_email_idx
  on public.organization_invitations (email_normalized);

alter table public.organization_invitations enable row level security;

-- Members may see invitations for their own org (no token_hash exposed via RPC views).
-- Direct select of token_hash is still possible for members — revoke column via view/RPC.
-- Prefer: no client select on raw table; use RPCs. Block all client access.
revoke all on table public.organization_invitations from anon, authenticated;
-- Service role / security definer only.

-- ---------------------------------------------------------------------------
-- 4. Helpers
-- ---------------------------------------------------------------------------

create or replace function public.normalize_email(p_email text)
returns text
language sql
immutable
set search_path = public
as $$
  select nullif(lower(trim(coalesce(p_email, ''))), '');
$$;

create or replace function public.normalize_org_slug(p_slug text)
returns text
language sql
immutable
set search_path = public
as $$
  select nullif(
    regexp_replace(
      regexp_replace(lower(trim(coalesce(p_slug, ''))), '[^a-z0-9\-]+', '-', 'g'),
      '(^-+)|(-+$)',
      '',
      'g'
    ),
    ''
  );
$$;

create or replace function public.normalize_registration_number(p_value text)
returns text
language sql
immutable
set search_path = public
as $$
  select nullif(upper(regexp_replace(trim(coalesce(p_value, '')), '\s+', '', 'g')), '');
$$;

create or replace function public.organization_is_operational(p_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organizations o
    where o.id = p_organization_id
      and o.status = 'active'
  );
$$;

revoke all on function public.organization_is_operational(uuid) from public;
grant execute on function public.organization_is_operational(uuid) to authenticated;

create or replace function public.hash_invitation_token(p_raw_token text)
returns text
language sql
immutable
set search_path = public, extensions
as $$
  select encode(extensions.digest(convert_to(p_raw_token, 'UTF8'), 'sha256'), 'hex');
$$;

create or replace function public.generate_invitation_raw_token()
returns text
language sql
volatile
set search_path = public, extensions
as $$
  select encode(extensions.gen_random_bytes(32), 'hex');
$$;

create or replace function public.notify_organization_event(
  p_user_id uuid,
  p_event_type text,
  p_org_display_name text,
  p_safe_reason text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_title text;
  v_body text;
  v_type text;
  v_reason text := nullif(left(trim(coalesce(p_safe_reason, '')), 200), '');
begin
  if p_user_id is null or p_event_type is null then
    return;
  end if;

  case p_event_type
    when 'invitation_created' then
      v_type := 'org_invitation_created';
      v_title := 'Organization invitation';
      v_body := format('You have been invited to join %s on Bridge Hive.', coalesce(p_org_display_name, 'an organization'));
    when 'invitation_accepted' then
      v_type := 'org_invitation_accepted';
      v_title := 'Invitation accepted';
      v_body := format('A member accepted an invitation to %s.', coalesce(p_org_display_name, 'your organization'));
    when 'submitted' then
      v_type := 'org_submitted';
      v_title := 'Organization submitted';
      v_body := format('%s was submitted for Bridge Hive review.', coalesce(p_org_display_name, 'Your organization'));
    when 'approved' then
      v_type := 'org_approved';
      v_title := 'Organization approved';
      v_body := format('%s is now active on Bridge Hive.', coalesce(p_org_display_name, 'Your organization'));
    when 'rejected' then
      v_type := 'org_rejected';
      v_title := 'Organization application rejected';
      v_body := format(
        '%s was not approved.%s',
        coalesce(p_org_display_name, 'Your organization'),
        case when v_reason is null then '' else ' ' || v_reason end
      );
    when 'suspended' then
      v_type := 'org_suspended';
      v_title := 'Organization suspended';
      v_body := format(
        '%s has been suspended.%s',
        coalesce(p_org_display_name, 'Your organization'),
        case when v_reason is null then '' else ' ' || v_reason end
      );
    when 'reactivated' then
      v_type := 'org_reactivated';
      v_title := 'Organization reactivated';
      v_body := format('%s is active again.', coalesce(p_org_display_name, 'Your organization'));
    else
      return;
  end case;

  insert into public.notifications (user_id, type, title, body, data)
  values (
    p_user_id,
    v_type,
    v_title,
    v_body,
    jsonb_build_object('event', p_event_type)
  );
end;
$$;

revoke all on function public.notify_organization_event(uuid, text, text, text) from public;

-- ---------------------------------------------------------------------------
-- 5. Guard: clients cannot set status / review fields / sensitive identity
-- ---------------------------------------------------------------------------

create or replace function public.organizations_guard_client_write()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  -- RPCs set this flag for authorized lifecycle / profile writes.
  if current_setting('bridgehive.allow_org_lifecycle', true) = 'on' then
    return new;
  end if;

  -- Allow postgres/service seeding and migrations (existing tests insert as postgres).
  if current_user in ('postgres', 'supabase_admin', 'supabase_auth_admin') then
    return new;
  end if;

  if tg_op = 'INSERT' then
    raise exception 'ORG_INSERT_LOCKED';
  end if;

  if new.status is distinct from old.status
     or new.submitted_at is distinct from old.submitted_at
     or new.reviewed_at is distinct from old.reviewed_at
     or new.reviewed_by is distinct from old.reviewed_by
     or new.status_reason is distinct from old.status_reason
     or new.slug is distinct from old.slug
  then
    raise exception 'ORG_STATUS_LOCKED';
  end if;

  -- Block direct client updates (no UPDATE grant to authenticated).
  raise exception 'ORG_UPDATE_LOCKED';
end;
$$;

drop trigger if exists organizations_guard_client_write on public.organizations;
create trigger organizations_guard_client_write
before insert or update on public.organizations
for each row
execute function public.organizations_guard_client_write();

-- Ensure authenticated cannot update/insert organizations directly
revoke insert, update, delete on table public.organizations from authenticated;
grant select on table public.organizations to authenticated;

-- ---------------------------------------------------------------------------
-- 6. Operational RLS gates for locations / wards / shifts
-- ---------------------------------------------------------------------------

drop policy if exists "locations_insert_admin_scheduler" on public.locations;
create policy "locations_insert_admin_scheduler"
on public.locations
for insert
to authenticated
with check (
  public.organization_is_operational(organization_id)
  and public.has_org_role(
    organization_id,
    array['org_admin'::public.org_role, 'org_scheduler'::public.org_role]
  )
);

drop policy if exists "locations_update_admin_scheduler" on public.locations;
create policy "locations_update_admin_scheduler"
on public.locations
for update
to authenticated
using (
  public.organization_is_operational(organization_id)
  and public.has_org_role(
    organization_id,
    array['org_admin'::public.org_role, 'org_scheduler'::public.org_role]
  )
)
with check (
  public.organization_is_operational(organization_id)
  and public.has_org_role(
    organization_id,
    array['org_admin'::public.org_role, 'org_scheduler'::public.org_role]
  )
);

drop policy if exists "locations_delete_admin" on public.locations;
create policy "locations_delete_admin"
on public.locations
for delete
to authenticated
using (
  public.organization_is_operational(organization_id)
  and public.has_org_role(organization_id, array['org_admin'::public.org_role])
);

drop policy if exists "wards_insert_admin_scheduler" on public.wards;
create policy "wards_insert_admin_scheduler"
on public.wards
for insert
to authenticated
with check (
  exists (
    select 1
    from public.locations l
    where l.id = location_id
      and public.organization_is_operational(l.organization_id)
      and public.has_org_role(
        l.organization_id,
        array['org_admin'::public.org_role, 'org_scheduler'::public.org_role]
      )
  )
);

drop policy if exists "wards_update_admin_scheduler" on public.wards;
create policy "wards_update_admin_scheduler"
on public.wards
for update
to authenticated
using (
  exists (
    select 1
    from public.locations l
    where l.id = location_id
      and public.organization_is_operational(l.organization_id)
      and public.has_org_role(
        l.organization_id,
        array['org_admin'::public.org_role, 'org_scheduler'::public.org_role]
      )
  )
)
with check (
  exists (
    select 1
    from public.locations l
    where l.id = location_id
      and public.organization_is_operational(l.organization_id)
      and public.has_org_role(
        l.organization_id,
        array['org_admin'::public.org_role, 'org_scheduler'::public.org_role]
      )
  )
);

drop policy if exists "wards_delete_admin" on public.wards;
create policy "wards_delete_admin"
on public.wards
for delete
to authenticated
using (
  exists (
    select 1
    from public.locations l
    where l.id = location_id
      and public.organization_is_operational(l.organization_id)
      and public.has_org_role(l.organization_id, array['org_admin'::public.org_role])
  )
);

drop policy if exists "shifts_insert_admin_scheduler" on public.shifts;
create policy "shifts_insert_admin_scheduler"
on public.shifts
for insert
to authenticated
with check (
  public.organization_is_operational(organization_id)
  and public.has_org_role(
    organization_id,
    array['org_admin'::public.org_role, 'org_scheduler'::public.org_role]
  )
  and status in ('draft', 'published')
);

drop policy if exists "shifts_update_admin_scheduler" on public.shifts;
create policy "shifts_update_admin_scheduler"
on public.shifts
for update
to authenticated
using (
  public.organization_is_operational(organization_id)
  and public.has_org_role(
    organization_id,
    array['org_admin'::public.org_role, 'org_scheduler'::public.org_role]
  )
)
with check (
  public.organization_is_operational(organization_id)
  and public.has_org_role(
    organization_id,
    array['org_admin'::public.org_role, 'org_scheduler'::public.org_role]
  )
);

drop policy if exists "shifts_delete_draft_admin" on public.shifts;
create policy "shifts_delete_draft_admin"
on public.shifts
for delete
to authenticated
using (
  status = 'draft'
  and public.organization_is_operational(organization_id)
  and public.has_org_role(organization_id, array['org_admin'::public.org_role])
);

-- ---------------------------------------------------------------------------
-- 7. publish_shift + review_timesheet require active organization
-- ---------------------------------------------------------------------------

create or replace function public.publish_shift(p_shift_id uuid)
returns public.shifts
language plpgsql
security definer
set search_path = public
as $$
declare
  v_shift public.shifts;
begin
  if auth.uid() is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  select * into v_shift
  from public.shifts
  where id = p_shift_id
  for update;

  if not found then
    raise exception 'SHIFT_NOT_FOUND';
  end if;

  if not public.organization_is_operational(v_shift.organization_id) then
    raise exception 'ORG_NOT_ACTIVE';
  end if;

  if not public.has_org_role(
    v_shift.organization_id,
    array['org_admin'::public.org_role, 'org_scheduler'::public.org_role]
  ) then
    raise exception 'NOT_AUTHORIZED';
  end if;

  if v_shift.status <> 'draft' then
    raise exception 'SHIFT_NOT_DRAFT';
  end if;

  if v_shift.ends_at <= now() then
    raise exception 'SHIFT_IN_PAST';
  end if;

  if v_shift.acceptance_deadline is not null
     and v_shift.acceptance_deadline <= now() then
    raise exception 'SHIFT_DEADLINE_IN_PAST';
  end if;

  update public.shifts
  set
    status = 'published',
    acceptance_deadline = coalesce(acceptance_deadline, starts_at),
    updated_at = now()
  where id = v_shift.id
  returning * into v_shift;

  perform public.create_audit_event(
    v_shift.organization_id,
    'shift',
    v_shift.id,
    'publish_shift',
    jsonb_build_object('status', 'draft'),
    jsonb_build_object('status', 'published')
  );

  return v_shift;
end;
$$;

revoke all on function public.publish_shift(uuid) from public;
grant execute on function public.publish_shift(uuid) to authenticated;

-- Mirror 012 review_timesheet with active-organization gate.
create or replace function public.review_timesheet(
  p_timesheet_id uuid,
  p_decision text,
  p_approved_minutes integer default null,
  p_review_note text default null
)
returns public.timesheets
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ts public.timesheets;
  v_assignment public.shift_assignments;
  v_shift public.shifts;
  v_decision text := lower(trim(p_decision));
begin
  if auth.uid() is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  if v_decision not in ('approve', 'reject') then
    raise exception 'INVALID_DECISION';
  end if;

  select * into v_ts
  from public.timesheets
  where id = p_timesheet_id
  for update;

  if not found then
    raise exception 'TIMESHEET_NOT_FOUND';
  end if;

  if v_ts.status <> 'submitted' then
    raise exception 'TIMESHEET_NOT_SUBMITTED';
  end if;

  select * into v_assignment
  from public.shift_assignments
  where id = v_ts.assignment_id
  for update;

  select * into v_shift
  from public.shifts
  where id = v_assignment.shift_id;

  if not public.organization_is_operational(v_shift.organization_id) then
    raise exception 'ORG_NOT_ACTIVE';
  end if;

  if not public.has_org_role(
    v_shift.organization_id,
    array['org_admin'::public.org_role, 'org_scheduler'::public.org_role]
  ) then
    raise exception 'NOT_AUTHORIZED';
  end if;

  perform set_config('bridgehive.allow_timesheet_review', 'on', true);

  if v_decision = 'approve' then
    if p_approved_minutes is null or p_approved_minutes < 0 then
      raise exception 'APPROVED_MINUTES_REQUIRED';
    end if;

    update public.timesheets
    set
      status = 'approved',
      approved_minutes = p_approved_minutes,
      reviewed_by = auth.uid(),
      reviewed_at = now(),
      review_note = p_review_note,
      updated_at = now()
    where id = v_ts.id
    returning * into v_ts;

    update public.shift_assignments
    set status = 'approved', updated_at = now()
    where id = v_assignment.id;

    update public.shifts
    set status = 'completed', updated_at = now()
    where id = v_shift.id
      and status in ('filled', 'in_progress', 'awaiting_approval');

    perform public.create_financial_snapshot(v_assignment.id);
  else
    if p_review_note is null or char_length(trim(p_review_note)) = 0 then
      raise exception 'REVIEW_NOTE_REQUIRED';
    end if;

    update public.timesheets
    set
      status = 'rejected',
      approved_minutes = null,
      reviewed_by = auth.uid(),
      reviewed_at = now(),
      review_note = p_review_note,
      updated_at = now()
    where id = v_ts.id
    returning * into v_ts;

    update public.shift_assignments
    set status = 'rejected', updated_at = now()
    where id = v_assignment.id;
  end if;

  perform set_config('bridgehive.allow_timesheet_review', 'off', true);

  perform public.create_audit_event(
    v_shift.organization_id,
    'timesheet',
    v_ts.id,
    'review_timesheet_' || v_decision,
    jsonb_build_object('status', 'submitted'),
    jsonb_build_object('status', v_ts.status, 'decision', v_decision)
  );

  insert into public.notifications (user_id, type, title, body, data)
  values (
    v_assignment.worker_id,
    'timesheet_' || v_decision,
    case when v_decision = 'approve' then 'Timesheet approved' else 'Timesheet rejected' end,
    case
      when v_decision = 'approve' then 'Your submitted hours were approved.'
      else coalesce(left(trim(p_review_note), 200), 'Your timesheet was rejected.')
    end,
    jsonb_build_object(
      'timesheet_id', v_ts.id,
      'assignment_id', v_assignment.id,
      'decision', v_decision
    )
  );

  return v_ts;
end;
$$;

revoke all on function public.review_timesheet(uuid, text, integer, text) from public;
grant execute on function public.review_timesheet(uuid, text, integer, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 8. Internal invitation creator (returns raw token once)
-- ---------------------------------------------------------------------------

create or replace function public._create_organization_invitation_internal(
  p_organization_id uuid,
  p_email text,
  p_role public.org_role,
  p_created_by uuid
)
returns table (
  invitation_id uuid,
  raw_token text,
  expires_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := public.normalize_email(p_email);
  v_token text;
  v_hash text;
  v_expires timestamptz := now() + interval '72 hours';
  v_id uuid;
begin
  if v_email is null then
    raise exception 'EMAIL_REQUIRED';
  end if;

  if p_role is null then
    raise exception 'ROLE_REQUIRED';
  end if;

  -- Revoke prior open invites for same email+org
  update public.organization_invitations i
  set
    revoked_at = now(),
    revoked_by = p_created_by
  where i.organization_id = p_organization_id
    and i.email_normalized = v_email
    and i.accepted_at is null
    and i.revoked_at is null;

  v_token := public.generate_invitation_raw_token();
  v_hash := public.hash_invitation_token(v_token);

  insert into public.organization_invitations (
    organization_id,
    email_normalized,
    role,
    token_hash,
    expires_at,
    created_by
  ) values (
    p_organization_id,
    v_email,
    p_role,
    v_hash,
    v_expires,
    p_created_by
  )
  returning id into v_id;

  invitation_id := v_id;
  raw_token := v_token;
  expires_at := v_expires;
  return next;
end;
$$;

revoke all on function public._create_organization_invitation_internal(uuid, text, public.org_role, uuid) from public;

-- ---------------------------------------------------------------------------
-- 9. create_organization_with_admin_invite (super_admin)
-- ---------------------------------------------------------------------------

create or replace function public.create_organization_with_admin_invite(
  p_legal_name text,
  p_display_name text,
  p_slug text,
  p_organization_type public.organization_type,
  p_admin_email text,
  p_billing_email text default null,
  p_timezone text default 'Europe/Nicosia',
  p_primary_contact_name text default null,
  p_primary_contact_email text default null,
  p_address_line1 text default null,
  p_address_line2 text default null,
  p_city text default null,
  p_postal_code text default null,
  p_country_code text default 'CY',
  p_registration_number text default null,
  p_tax_vat_number text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_slug text := public.normalize_org_slug(p_slug);
  v_admin_email text := public.normalize_email(p_admin_email);
  v_org_id uuid;
  v_invite record;
  v_reg text := public.normalize_registration_number(p_registration_number);
  v_tax text := nullif(trim(coalesce(p_tax_vat_number, '')), '');
begin
  if auth.uid() is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  if not public.is_platform_admin('platform_super_admin') then
    raise exception 'NOT_AUTHORIZED';
  end if;

  if nullif(trim(coalesce(p_legal_name, '')), '') is null then
    raise exception 'LEGAL_NAME_REQUIRED';
  end if;

  if nullif(trim(coalesce(p_display_name, '')), '') is null then
    raise exception 'DISPLAY_NAME_REQUIRED';
  end if;

  if v_slug is null or v_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' then
    raise exception 'INVALID_SLUG';
  end if;

  if exists (select 1 from public.organizations o where o.slug = v_slug) then
    raise exception 'SLUG_TAKEN';
  end if;

  if v_admin_email is null then
    raise exception 'ADMIN_EMAIL_REQUIRED';
  end if;

  if p_organization_type is null then
    raise exception 'ORGANIZATION_TYPE_REQUIRED';
  end if;

  if v_reg is not null and exists (
    select 1 from public.organizations o where o.registration_number_normalized = v_reg
  ) then
    raise exception 'REGISTRATION_NUMBER_TAKEN';
  end if;

  perform set_config('bridgehive.allow_org_lifecycle', 'on', true);

  insert into public.organizations (
    legal_name,
    display_name,
    slug,
    organization_type,
    billing_email,
    timezone,
    status,
    primary_contact_name,
    primary_contact_email,
    address_line1,
    address_line2,
    city,
    postal_code,
    country_code,
    registration_number,
    registration_number_normalized,
    tax_vat_number
  ) values (
    trim(p_legal_name),
    trim(p_display_name),
    v_slug,
    p_organization_type,
    public.normalize_email(p_billing_email),
    coalesce(nullif(trim(p_timezone), ''), 'Europe/Nicosia'),
    'pending',
    nullif(trim(coalesce(p_primary_contact_name, '')), ''),
    public.normalize_email(p_primary_contact_email),
    nullif(trim(coalesce(p_address_line1, '')), ''),
    nullif(trim(coalesce(p_address_line2, '')), ''),
    nullif(trim(coalesce(p_city, '')), ''),
    nullif(trim(coalesce(p_postal_code, '')), ''),
    coalesce(nullif(upper(trim(p_country_code)), ''), 'CY'),
    nullif(trim(coalesce(p_registration_number, '')), ''),
    v_reg,
    v_tax
  )
  returning id into v_org_id;

  select * into v_invite
  from public._create_organization_invitation_internal(
    v_org_id,
    v_admin_email,
    'org_admin'::public.org_role,
    auth.uid()
  );

  perform public.create_audit_event(
    v_org_id,
    'organization',
    v_org_id,
    'organization_created',
    null,
    jsonb_build_object(
      'slug', v_slug,
      'status', 'pending',
      'organization_type', p_organization_type::text
    )
  );

  perform public.create_audit_event(
    v_org_id,
    'organization_invitation',
    v_invite.invitation_id,
    'invitation_created',
    null,
    jsonb_build_object(
      'role', 'org_admin',
      'expires_at', v_invite.expires_at
    )
  );

  -- Notify matching profile if they already have an account (by email via auth.users)
  perform public.notify_organization_event(
    p.id,
    'invitation_created',
    trim(p_display_name),
    null
  )
  from public.profiles p
  join auth.users u on u.id = p.id
  where lower(u.email) = v_admin_email;

  perform set_config('bridgehive.allow_org_lifecycle', 'off', true);

  return jsonb_build_object(
    'organization_id', v_org_id,
    'invitation_id', v_invite.invitation_id,
    'raw_token', v_invite.raw_token,
    'expires_at', v_invite.expires_at,
    'slug', v_slug
  );
end;
$$;

revoke all on function public.create_organization_with_admin_invite(
  text, text, text, public.organization_type, text, text, text, text, text, text, text, text, text, text, text, text
) from public;
grant execute on function public.create_organization_with_admin_invite(
  text, text, text, public.organization_type, text, text, text, text, text, text, text, text, text, text, text, text
) to authenticated;


-- ---------------------------------------------------------------------------
-- 10. create_organization_invitation / revoke / accept
-- ---------------------------------------------------------------------------

create or replace function public.create_organization_invitation(
  p_organization_id uuid,
  p_email text,
  p_role public.org_role
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org public.organizations;
  v_invite record;
  v_is_super boolean := public.is_platform_admin('platform_super_admin');
  v_is_org_admin boolean := public.has_org_role(
    p_organization_id,
    array['org_admin'::public.org_role]
  );
begin
  if auth.uid() is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  select * into v_org from public.organizations where id = p_organization_id;
  if not found then
    raise exception 'ORG_NOT_FOUND';
  end if;

  if p_role = 'org_admin' then
    if not v_is_super then
      raise exception 'NOT_AUTHORIZED';
    end if;
  else
    if not (
      v_is_super
      or (v_is_org_admin and v_org.status = 'active' and p_role in ('org_scheduler', 'org_billing'))
    ) then
      raise exception 'NOT_AUTHORIZED';
    end if;
  end if;

  select * into v_invite
  from public._create_organization_invitation_internal(
    p_organization_id,
    p_email,
    p_role,
    auth.uid()
  );

  perform public.create_audit_event(
    p_organization_id,
    'organization_invitation',
    v_invite.invitation_id,
    'invitation_created',
    null,
    jsonb_build_object('role', p_role::text, 'expires_at', v_invite.expires_at)
  );

  perform public.notify_organization_event(
    p.id,
    'invitation_created',
    v_org.display_name,
    null
  )
  from public.profiles p
  join auth.users u on u.id = p.id
  where lower(u.email) = public.normalize_email(p_email);

  return jsonb_build_object(
    'invitation_id', v_invite.invitation_id,
    'raw_token', v_invite.raw_token,
    'expires_at', v_invite.expires_at,
    'organization_id', p_organization_id,
    'slug', v_org.slug
  );
end;
$$;

revoke all on function public.create_organization_invitation(uuid, text, public.org_role) from public;
grant execute on function public.create_organization_invitation(uuid, text, public.org_role) to authenticated;

create or replace function public.revoke_organization_invitation(p_invitation_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inv public.organization_invitations;
  v_is_super boolean := public.is_platform_admin('platform_super_admin');
begin
  if auth.uid() is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  select * into v_inv
  from public.organization_invitations
  where id = p_invitation_id
  for update;

  if not found then
    raise exception 'INVITATION_NOT_FOUND';
  end if;

  if not (
    v_is_super
    or public.has_org_role(v_inv.organization_id, array['org_admin'::public.org_role])
  ) then
    raise exception 'NOT_AUTHORIZED';
  end if;

  if v_inv.accepted_at is not null then
    raise exception 'INVITATION_ALREADY_ACCEPTED';
  end if;

  if v_inv.revoked_at is not null then
    raise exception 'INVITATION_ALREADY_REVOKED';
  end if;

  update public.organization_invitations
  set revoked_at = now(), revoked_by = auth.uid()
  where id = v_inv.id;

  perform public.create_audit_event(
    v_inv.organization_id,
    'organization_invitation',
    v_inv.id,
    'invitation_revoked',
    null,
    jsonb_build_object('role', v_inv.role::text)
  );
end;
$$;

revoke all on function public.revoke_organization_invitation(uuid) from public;
grant execute on function public.revoke_organization_invitation(uuid) to authenticated;

create or replace function public.accept_organization_invitation(p_raw_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_hash text;
  v_inv public.organization_invitations;
  v_org public.organizations;
  v_email text;
  v_member_id uuid;
begin
  if auth.uid() is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  if nullif(trim(coalesce(p_raw_token, '')), '') is null then
    raise exception 'TOKEN_REQUIRED';
  end if;

  v_hash := public.hash_invitation_token(trim(p_raw_token));

  select * into v_inv
  from public.organization_invitations
  where token_hash = v_hash
  for update;

  if not found then
    raise exception 'INVITATION_INVALID';
  end if;

  if v_inv.revoked_at is not null then
    raise exception 'INVITATION_REVOKED';
  end if;

  if v_inv.accepted_at is not null then
    raise exception 'INVITATION_ALREADY_USED';
  end if;

  if v_inv.expires_at <= now() then
    raise exception 'INVITATION_EXPIRED';
  end if;

  select lower(email) into v_email from auth.users where id = auth.uid();
  if v_email is null or v_email <> v_inv.email_normalized then
    raise exception 'EMAIL_MISMATCH';
  end if;

  select * into v_org from public.organizations where id = v_inv.organization_id;
  if not found then
    raise exception 'ORG_NOT_FOUND';
  end if;

  if exists (
    select 1 from public.organization_members m
    where m.organization_id = v_inv.organization_id
      and m.user_id = auth.uid()
      and m.status = 'active'
  ) then
    raise exception 'ALREADY_MEMBER';
  end if;

  insert into public.organization_members (
    organization_id,
    user_id,
    role,
    status,
    invited_at,
    accepted_at,
    invited_by
  ) values (
    v_inv.organization_id,
    auth.uid(),
    v_inv.role,
    'active',
    v_inv.created_at,
    now(),
    v_inv.created_by
  )
  on conflict (organization_id, user_id) do update
    set
      role = excluded.role,
      status = 'active',
      accepted_at = now(),
      invited_by = excluded.invited_by,
      updated_at = now()
  returning id into v_member_id;

  update public.organization_invitations
  set accepted_at = now(), accepted_by = auth.uid()
  where id = v_inv.id;

  perform public.create_audit_event(
    v_inv.organization_id,
    'organization_invitation',
    v_inv.id,
    'invitation_accepted',
    null,
    jsonb_build_object('role', v_inv.role::text, 'membership_id', v_member_id)
  );

  -- Notify creator (sanitized)
  perform public.notify_organization_event(
    v_inv.created_by,
    'invitation_accepted',
    v_org.display_name,
    null
  );

  return jsonb_build_object(
    'organization_id', v_org.id,
    'slug', v_org.slug,
    'role', v_inv.role,
    'membership_id', v_member_id
  );
end;
$$;

revoke all on function public.accept_organization_invitation(text) from public;
grant execute on function public.accept_organization_invitation(text) to authenticated;

-- Peek invitation (safe metadata for accept page) by raw token
create or replace function public.get_organization_invitation_preview(p_raw_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inv public.organization_invitations;
  v_org public.organizations;
  v_hash text;
begin
  if nullif(trim(coalesce(p_raw_token, '')), '') is null then
    raise exception 'TOKEN_REQUIRED';
  end if;

  v_hash := public.hash_invitation_token(trim(p_raw_token));

  select * into v_inv from public.organization_invitations where token_hash = v_hash;
  if not found then
    raise exception 'INVITATION_INVALID';
  end if;

  select * into v_org from public.organizations where id = v_inv.organization_id;

  return jsonb_build_object(
    'organization_display_name', v_org.display_name,
    'role', v_inv.role,
    'email_hint', left(v_inv.email_normalized, 2) || '•••@' || split_part(v_inv.email_normalized, '@', 2),
    'expires_at', v_inv.expires_at,
    'status', case
      when v_inv.revoked_at is not null then 'revoked'
      when v_inv.accepted_at is not null then 'accepted'
      when v_inv.expires_at <= now() then 'expired'
      else 'open'
    end
  );
end;
$$;

revoke all on function public.get_organization_invitation_preview(text) from public;
grant execute on function public.get_organization_invitation_preview(text) to anon, authenticated;


-- ---------------------------------------------------------------------------
-- 11. Profile update + submit for review
-- ---------------------------------------------------------------------------

drop function if exists public.update_organization_profile(
  uuid, text, text, text, text, text, text, text, text, text, text, text, text, text
);

create or replace function public.update_organization_profile(
  p_organization_id uuid,
  p_legal_name text default null,
  p_display_name text default null,
  p_billing_email text default null,
  p_timezone text default null,
  p_primary_contact_name text default null,
  p_primary_contact_email text default null,
  p_address_line1 text default null,
  p_address_line2 text default null,
  p_city text default null,
  p_postal_code text default null,
  p_country_code text default null,
  p_registration_number text default null,
  p_tax_vat_number text default null,
  p_organization_type public.organization_type default null
)
returns public.organizations
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org public.organizations;
  v_reg text;
begin
  if auth.uid() is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  if not public.has_org_role(p_organization_id, array['org_admin'::public.org_role]) then
    raise exception 'NOT_AUTHORIZED';
  end if;

  select * into v_org from public.organizations where id = p_organization_id for update;
  if not found then
    raise exception 'ORG_NOT_FOUND';
  end if;

  if v_org.status not in ('pending', 'rejected') then
    raise exception 'ORG_PROFILE_LOCKED';
  end if;

  v_reg := case
    when p_registration_number is null then v_org.registration_number_normalized
    else public.normalize_registration_number(p_registration_number)
  end;

  if v_reg is not null and exists (
    select 1 from public.organizations o
    where o.registration_number_normalized = v_reg and o.id <> p_organization_id
  ) then
    raise exception 'REGISTRATION_NUMBER_TAKEN';
  end if;

  perform set_config('bridgehive.allow_org_lifecycle', 'on', true);

  update public.organizations
  set
    legal_name = coalesce(nullif(trim(p_legal_name), ''), legal_name),
    display_name = coalesce(nullif(trim(p_display_name), ''), display_name),
    billing_email = case
      when p_billing_email is null then billing_email
      else public.normalize_email(p_billing_email)
    end,
    timezone = coalesce(nullif(trim(p_timezone), ''), timezone),
    primary_contact_name = case
      when p_primary_contact_name is null then primary_contact_name
      else nullif(trim(p_primary_contact_name), '')
    end,
    primary_contact_email = case
      when p_primary_contact_email is null then primary_contact_email
      else public.normalize_email(p_primary_contact_email)
    end,
    address_line1 = case
      when p_address_line1 is null then address_line1
      else nullif(trim(p_address_line1), '')
    end,
    address_line2 = case
      when p_address_line2 is null then address_line2
      else nullif(trim(p_address_line2), '')
    end,
    city = case when p_city is null then city else nullif(trim(p_city), '') end,
    postal_code = case
      when p_postal_code is null then postal_code
      else nullif(trim(p_postal_code), '')
    end,
    country_code = coalesce(nullif(upper(trim(p_country_code)), ''), country_code),
    registration_number = case
      when p_registration_number is null then registration_number
      else nullif(trim(p_registration_number), '')
    end,
    registration_number_normalized = v_reg,
    tax_vat_number = case
      when p_tax_vat_number is null then tax_vat_number
      else nullif(trim(p_tax_vat_number), '')
    end,
    organization_type = coalesce(p_organization_type, organization_type),
    updated_at = now()
  where id = p_organization_id
  returning * into v_org;

  perform set_config('bridgehive.allow_org_lifecycle', 'off', true);

  perform public.create_audit_event(
    p_organization_id,
    'organization',
    p_organization_id,
    'organization_profile_updated',
    null,
    jsonb_build_object('status', v_org.status::text)
  );

  return v_org;
end;
$$;

revoke all on function public.update_organization_profile(
  uuid, text, text, text, text, text, text, text, text, text, text, text, text, text, public.organization_type
) from public;
grant execute on function public.update_organization_profile(
  uuid, text, text, text, text, text, text, text, text, text, text, text, text, text, public.organization_type
) to authenticated;

create or replace function public.submit_organization_for_review(p_organization_id uuid)
returns public.organizations
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org public.organizations;
  v_admin record;
  v_missing text[] := array[]::text[];
begin
  if auth.uid() is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  if not public.has_org_role(p_organization_id, array['org_admin'::public.org_role]) then
    raise exception 'NOT_AUTHORIZED';
  end if;

  select * into v_org from public.organizations where id = p_organization_id for update;
  if not found then
    raise exception 'ORG_NOT_FOUND';
  end if;

  if v_org.status not in ('pending', 'rejected') then
    raise exception 'INVALID_TRANSITION';
  end if;

  if nullif(trim(coalesce(v_org.legal_name, '')), '') is null then
    v_missing := array_append(v_missing, 'legal_name');
  end if;
  if nullif(trim(coalesce(v_org.display_name, '')), '') is null then
    v_missing := array_append(v_missing, 'display_name');
  end if;
  if nullif(trim(coalesce(v_org.primary_contact_name, '')), '') is null then
    v_missing := array_append(v_missing, 'primary_contact_name');
  end if;
  if nullif(trim(coalesce(v_org.primary_contact_email, '')), '') is null then
    v_missing := array_append(v_missing, 'primary_contact_email');
  end if;

  if cardinality(v_missing) > 0 then
    raise exception 'ORG_PROFILE_INCOMPLETE:%', array_to_string(v_missing, ',');
  end if;

  perform set_config('bridgehive.allow_org_lifecycle', 'on', true);

  update public.organizations
  set
    status = 'under_review',
    submitted_at = now(),
    status_reason = null,
    updated_at = now()
  where id = p_organization_id
  returning * into v_org;

  perform set_config('bridgehive.allow_org_lifecycle', 'off', true);

  perform public.create_audit_event(
    p_organization_id,
    'organization',
    p_organization_id,
    'organization_submitted',
    jsonb_build_object('status', 'pending'),
    jsonb_build_object('status', 'under_review')
  );

  -- Notify super admins
  for v_admin in
    select r.user_id
    from public.platform_admin_roles r
    join public.profiles p on p.id = r.user_id
    where r.role = 'platform_super_admin'
      and p.account_status = 'active'
  loop
    perform public.notify_organization_event(
      v_admin.user_id,
      'submitted',
      v_org.display_name,
      null
    );
  end loop;

  return v_org;
end;
$$;

revoke all on function public.submit_organization_for_review(uuid) from public;
grant execute on function public.submit_organization_for_review(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 12. Lifecycle: approve / reject / suspend / reactivate
-- ---------------------------------------------------------------------------

create or replace function public.approve_organization(p_organization_id uuid)
returns public.organizations
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org public.organizations;
  v_member record;
begin
  if auth.uid() is null then raise exception 'NOT_AUTHENTICATED'; end if;
  if not public.is_platform_admin('platform_super_admin') then
    raise exception 'NOT_AUTHORIZED';
  end if;

  select * into v_org from public.organizations where id = p_organization_id for update;
  if not found then raise exception 'ORG_NOT_FOUND'; end if;
  if v_org.status <> 'under_review' then raise exception 'INVALID_TRANSITION'; end if;

  perform set_config('bridgehive.allow_org_lifecycle', 'on', true);
  update public.organizations
  set
    status = 'active',
    reviewed_at = now(),
    reviewed_by = auth.uid(),
    status_reason = null,
    updated_at = now()
  where id = p_organization_id
  returning * into v_org;
  perform set_config('bridgehive.allow_org_lifecycle', 'off', true);

  perform public.create_audit_event(
    p_organization_id, 'organization', p_organization_id, 'organization_approved',
    jsonb_build_object('status', 'under_review'),
    jsonb_build_object('status', 'active')
  );

  for v_member in
    select user_id from public.organization_members
    where organization_id = p_organization_id and status = 'active'
  loop
    perform public.notify_organization_event(v_member.user_id, 'approved', v_org.display_name, null);
  end loop;

  return v_org;
end;
$$;

create or replace function public.reject_organization(
  p_organization_id uuid,
  p_reason text
)
returns public.organizations
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org public.organizations;
  v_reason text := nullif(trim(coalesce(p_reason, '')), '');
  v_member record;
begin
  if auth.uid() is null then raise exception 'NOT_AUTHENTICATED'; end if;
  if not public.is_platform_admin('platform_super_admin') then
    raise exception 'NOT_AUTHORIZED';
  end if;
  if v_reason is null or char_length(v_reason) < 1 then
    raise exception 'REASON_REQUIRED';
  end if;
  if char_length(v_reason) > 2000 then raise exception 'REASON_TOO_LONG'; end if;

  select * into v_org from public.organizations where id = p_organization_id for update;
  if not found then raise exception 'ORG_NOT_FOUND'; end if;
  if v_org.status <> 'under_review' then raise exception 'INVALID_TRANSITION'; end if;

  perform set_config('bridgehive.allow_org_lifecycle', 'on', true);
  update public.organizations
  set
    status = 'rejected',
    reviewed_at = now(),
    reviewed_by = auth.uid(),
    status_reason = left(v_reason, 2000),
    updated_at = now()
  where id = p_organization_id
  returning * into v_org;
  perform set_config('bridgehive.allow_org_lifecycle', 'off', true);

  perform public.create_audit_event(
    p_organization_id, 'organization', p_organization_id, 'organization_rejected',
    jsonb_build_object('status', 'under_review'),
    jsonb_build_object('status', 'rejected')
  );

  for v_member in
    select user_id from public.organization_members
    where organization_id = p_organization_id and status = 'active'
  loop
    perform public.notify_organization_event(
      v_member.user_id, 'rejected', v_org.display_name, left(v_reason, 200)
    );
  end loop;

  return v_org;
end;
$$;

create or replace function public.suspend_organization(
  p_organization_id uuid,
  p_reason text
)
returns public.organizations
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org public.organizations;
  v_reason text := nullif(trim(coalesce(p_reason, '')), '');
  v_member record;
begin
  if auth.uid() is null then raise exception 'NOT_AUTHENTICATED'; end if;
  if not public.is_platform_admin('platform_super_admin') then
    raise exception 'NOT_AUTHORIZED';
  end if;
  if v_reason is null then raise exception 'REASON_REQUIRED'; end if;
  if char_length(v_reason) > 2000 then raise exception 'REASON_TOO_LONG'; end if;

  select * into v_org from public.organizations where id = p_organization_id for update;
  if not found then raise exception 'ORG_NOT_FOUND'; end if;
  if v_org.status <> 'active' then raise exception 'INVALID_TRANSITION'; end if;

  perform set_config('bridgehive.allow_org_lifecycle', 'on', true);
  update public.organizations
  set
    status = 'suspended',
    reviewed_at = now(),
    reviewed_by = auth.uid(),
    status_reason = left(v_reason, 2000),
    updated_at = now()
  where id = p_organization_id
  returning * into v_org;
  perform set_config('bridgehive.allow_org_lifecycle', 'off', true);

  perform public.create_audit_event(
    p_organization_id, 'organization', p_organization_id, 'organization_suspended',
    jsonb_build_object('status', 'active'),
    jsonb_build_object('status', 'suspended')
  );

  for v_member in
    select user_id from public.organization_members
    where organization_id = p_organization_id and status = 'active'
  loop
    perform public.notify_organization_event(
      v_member.user_id, 'suspended', v_org.display_name, left(v_reason, 200)
    );
  end loop;

  return v_org;
end;
$$;

create or replace function public.reactivate_organization(
  p_organization_id uuid,
  p_reason text
)
returns public.organizations
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org public.organizations;
  v_reason text := nullif(trim(coalesce(p_reason, '')), '');
  v_member record;
begin
  if auth.uid() is null then raise exception 'NOT_AUTHENTICATED'; end if;
  if not public.is_platform_admin('platform_super_admin') then
    raise exception 'NOT_AUTHORIZED';
  end if;
  if v_reason is null then raise exception 'REASON_REQUIRED'; end if;
  if char_length(v_reason) > 2000 then raise exception 'REASON_TOO_LONG'; end if;

  select * into v_org from public.organizations where id = p_organization_id for update;
  if not found then raise exception 'ORG_NOT_FOUND'; end if;
  if v_org.status <> 'suspended' then raise exception 'INVALID_TRANSITION'; end if;

  perform set_config('bridgehive.allow_org_lifecycle', 'on', true);
  update public.organizations
  set
    status = 'active',
    reviewed_at = now(),
    reviewed_by = auth.uid(),
    status_reason = left(v_reason, 2000),
    updated_at = now()
  where id = p_organization_id
  returning * into v_org;
  perform set_config('bridgehive.allow_org_lifecycle', 'off', true);

  perform public.create_audit_event(
    p_organization_id, 'organization', p_organization_id, 'organization_reactivated',
    jsonb_build_object('status', 'suspended'),
    jsonb_build_object('status', 'active')
  );

  for v_member in
    select user_id from public.organization_members
    where organization_id = p_organization_id and status = 'active'
  loop
    perform public.notify_organization_event(
      v_member.user_id, 'reactivated', v_org.display_name, null
    );
  end loop;

  return v_org;
end;
$$;

revoke all on function public.approve_organization(uuid) from public;
revoke all on function public.reject_organization(uuid, text) from public;
revoke all on function public.suspend_organization(uuid, text) from public;
revoke all on function public.reactivate_organization(uuid, text) from public;
grant execute on function public.approve_organization(uuid) to authenticated;
grant execute on function public.reject_organization(uuid, text) to authenticated;
grant execute on function public.suspend_organization(uuid, text) to authenticated;
grant execute on function public.reactivate_organization(uuid, text) to authenticated;


-- ---------------------------------------------------------------------------
-- 13. Platform admin list + detail (no tax/registration in list)
-- ---------------------------------------------------------------------------

create or replace function public.list_admin_organizations(
  p_search text default null,
  p_status public.org_status default null,
  p_organization_type public.organization_type default null,
  p_sort text default 'newest',
  p_limit integer default 20,
  p_offset integer default 0
)
returns table (
  id uuid,
  display_name text,
  legal_name text,
  short_reference text,
  organization_type public.organization_type,
  status public.org_status,
  member_count bigint,
  location_count bigint,
  published_shift_count bigint,
  created_at timestamptz,
  last_activity timestamptz,
  total_count bigint
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_q text := nullif(lower(trim(coalesce(p_search, ''))), '');
  v_limit integer := greatest(1, least(coalesce(p_limit, 20), 100));
  v_offset integer := greatest(0, coalesce(p_offset, 0));
  v_sort text := coalesce(nullif(trim(p_sort), ''), 'newest');
begin
  if auth.uid() is null then raise exception 'NOT_AUTHENTICATED'; end if;
  if not public.is_platform_admin('platform_super_admin') then
    raise exception 'NOT_AUTHORIZED';
  end if;

  return query
  with base as (
    select
      o.id,
      o.display_name,
      o.legal_name,
      upper(substr(replace(o.id::text, '-', ''), 1, 8)) as short_reference,
      o.organization_type,
      o.status,
      o.created_at,
      greatest(
        o.updated_at,
        coalesce(o.submitted_at, o.created_at),
        coalesce(o.reviewed_at, o.created_at)
      ) as last_activity,
      (select count(*) from public.organization_members m
        where m.organization_id = o.id and m.status = 'active') as member_count,
      (select count(*) from public.locations l where l.organization_id = o.id) as location_count,
      (select count(*) from public.shifts s
        where s.organization_id = o.id and s.status = 'published') as published_shift_count
    from public.organizations o
    where (p_status is null or o.status = p_status)
      and (p_organization_type is null or o.organization_type = p_organization_type)
      and (
        v_q is null
        or lower(o.display_name) like '%' || v_q || '%'
        or lower(o.legal_name) like '%' || v_q || '%'
        or lower(o.slug) like '%' || v_q || '%'
        or lower(o.id::text) like '%' || v_q || '%'
      )
  ),
  counted as (
    select b.*, (select count(*) from base) as total_count from base b
  )
  select
    c.id,
    c.display_name,
    c.legal_name,
    c.short_reference,
    c.organization_type,
    c.status,
    c.member_count,
    c.location_count,
    c.published_shift_count,
    c.created_at,
    c.last_activity,
    c.total_count
  from counted c
  order by
    case when v_sort = 'oldest' then c.created_at end asc nulls last,
    case when v_sort = 'oldest' then null else c.created_at end desc nulls last
  limit v_limit
  offset v_offset;
end;
$$;

revoke all on function public.list_admin_organizations(
  text, public.org_status, public.organization_type, text, integer, integer
) from public;
grant execute on function public.list_admin_organizations(
  text, public.org_status, public.organization_type, text, integer, integer
) to authenticated;

create or replace function public.get_admin_organization_detail(p_organization_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org public.organizations;
  v_result jsonb;
begin
  if auth.uid() is null then raise exception 'NOT_AUTHENTICATED'; end if;
  if not public.is_platform_admin('platform_super_admin') then
    raise exception 'NOT_AUTHORIZED';
  end if;

  select * into v_org from public.organizations where id = p_organization_id;
  if not found then raise exception 'ORG_NOT_FOUND'; end if;

  select jsonb_build_object(
    'organization', jsonb_build_object(
      'id', v_org.id,
      'legal_name', v_org.legal_name,
      'display_name', v_org.display_name,
      'slug', v_org.slug,
      'organization_type', v_org.organization_type,
      'status', v_org.status,
      'timezone', v_org.timezone,
      'billing_email', v_org.billing_email,
      'primary_contact_name', v_org.primary_contact_name,
      'primary_contact_email', v_org.primary_contact_email,
      'address_line1', v_org.address_line1,
      'address_line2', v_org.address_line2,
      'city', v_org.city,
      'postal_code', v_org.postal_code,
      'country_code', v_org.country_code,
      'registration_number', v_org.registration_number,
      'tax_vat_number', v_org.tax_vat_number,
      'submitted_at', v_org.submitted_at,
      'reviewed_at', v_org.reviewed_at,
      'reviewed_by', v_org.reviewed_by,
      'status_reason', v_org.status_reason,
      'created_at', v_org.created_at,
      'updated_at', v_org.updated_at,
      'short_reference', upper(substr(replace(v_org.id::text, '-', ''), 1, 8))
    ),
    'members', coalesce((
      select jsonb_agg(jsonb_build_object(
        'user_id', m.user_id,
        'role', m.role,
        'status', m.status,
        'full_name', p.full_name,
        'accepted_at', m.accepted_at
      ) order by m.created_at)
      from public.organization_members m
      left join public.profiles p on p.id = m.user_id
      where m.organization_id = v_org.id
    ), '[]'::jsonb),
    'invitations', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', i.id,
        'role', i.role,
        'email_hint', left(i.email_normalized, 2) || '•••@' || split_part(i.email_normalized, '@', 2),
        'expires_at', i.expires_at,
        'accepted_at', i.accepted_at,
        'revoked_at', i.revoked_at,
        'created_at', i.created_at,
        'status', case
          when i.revoked_at is not null then 'revoked'
          when i.accepted_at is not null then 'accepted'
          when i.expires_at <= now() then 'expired'
          else 'open'
        end
      ) order by i.created_at desc)
      from public.organization_invitations i
      where i.organization_id = v_org.id
    ), '[]'::jsonb),
    'counts', jsonb_build_object(
      'locations', (select count(*) from public.locations l where l.organization_id = v_org.id),
      'wards', (
        select count(*) from public.wards w
        join public.locations l on l.id = w.location_id
        where l.organization_id = v_org.id
      ),
      'shifts_published', (
        select count(*) from public.shifts s
        where s.organization_id = v_org.id and s.status = 'published'
      ),
      'shifts_total', (select count(*) from public.shifts s where s.organization_id = v_org.id)
    ),
    'audit', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', a.id,
        'action', a.action,
        'entity_type', a.entity_type,
        'created_at', a.created_at,
        'actor_user_id', a.actor_user_id
      ) order by a.created_at desc)
      from (
        select * from public.audit_events ae
        where ae.organization_id = v_org.id
        order by ae.created_at desc
        limit 50
      ) a
    ), '[]'::jsonb)
  ) into v_result;

  return v_result;
end;
$$;

revoke all on function public.get_admin_organization_detail(uuid) from public;
grant execute on function public.get_admin_organization_detail(uuid) to authenticated;

-- Org admin safe self-detail (no other tenants)
create or replace function public.get_my_organization_setup(p_organization_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org public.organizations;
begin
  if auth.uid() is null then raise exception 'NOT_AUTHENTICATED'; end if;
  if not public.is_org_member(p_organization_id) then
    raise exception 'NOT_AUTHORIZED';
  end if;

  select * into v_org from public.organizations where id = p_organization_id;
  if not found then raise exception 'ORG_NOT_FOUND'; end if;

  return jsonb_build_object(
    'id', v_org.id,
    'legal_name', v_org.legal_name,
    'display_name', v_org.display_name,
    'slug', v_org.slug,
    'organization_type', v_org.organization_type,
    'status', v_org.status,
    'timezone', v_org.timezone,
    'billing_email', v_org.billing_email,
    'primary_contact_name', v_org.primary_contact_name,
    'primary_contact_email', v_org.primary_contact_email,
    'address_line1', v_org.address_line1,
    'address_line2', v_org.address_line2,
    'city', v_org.city,
    'postal_code', v_org.postal_code,
    'country_code', v_org.country_code,
    'registration_number', case
      when public.has_org_role(p_organization_id, array['org_admin'::public.org_role])
      then v_org.registration_number else null end,
    'tax_vat_number', case
      when public.has_org_role(p_organization_id, array['org_admin'::public.org_role])
      then v_org.tax_vat_number else null end,
    'status_reason', v_org.status_reason,
    'submitted_at', v_org.submitted_at,
    'reviewed_at', v_org.reviewed_at
  );
end;
$$;

revoke all on function public.get_my_organization_setup(uuid) from public;
grant execute on function public.get_my_organization_setup(uuid) to authenticated;


-- ---------------------------------------------------------------------------
-- 18. Claim + marketplace require active organization; lock required_role
-- ---------------------------------------------------------------------------

drop policy if exists "shifts_select_eligible_worker" on public.shifts;
create policy "shifts_select_eligible_worker"
on public.shifts
for select
to authenticated
using (
  status = 'published'
  and public.organization_is_operational(organization_id)
  and (acceptance_deadline is null or acceptance_deadline > now())
  and exists (
    select 1
    from public.worker_profiles wp
    where wp.user_id = auth.uid()
      and wp.worker_role = shifts.required_role
      and wp.verification_status = 'verified'
  )
);

create or replace function public.shifts_guard_required_role()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'UPDATE'
     and new.required_role is distinct from old.required_role then
    if old.status <> 'draft' then
      raise exception 'SHIFT_ROLE_LOCKED';
    end if;

    if exists (
      select 1
      from public.shift_assignments a
      where a.shift_id = old.id
        and a.status in (
          'accepted',
          'checked_in',
          'checked_out',
          'submitted',
          'approved'
        )
    ) then
      raise exception 'SHIFT_ROLE_LOCKED';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists shifts_guard_required_role on public.shifts;
create trigger shifts_guard_required_role
before update on public.shifts
for each row
execute function public.shifts_guard_required_role();

create or replace function public.claim_shift(p_shift_id uuid)
returns public.shift_assignments
language plpgsql
security definer
set search_path = public
as $$
declare
  v_shift public.shifts;
  v_assignment public.shift_assignments;
  v_eligibility text;
  v_worker_id uuid := auth.uid();
begin
  if v_worker_id is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  select * into v_shift
  from public.shifts
  where id = p_shift_id
  for update;

  if not found then
    raise exception 'SHIFT_NOT_FOUND';
  end if;

  if not public.organization_is_operational(v_shift.organization_id) then
    raise exception 'ORG_NOT_ACTIVE';
  end if;

  if v_shift.status <> 'published' then
    raise exception 'SHIFT_NOT_AVAILABLE';
  end if;

  if v_shift.starts_at <= now() then
    raise exception 'SHIFT_STARTED';
  end if;

  if v_shift.acceptance_deadline is not null
     and v_shift.acceptance_deadline <= now() then
    raise exception 'SHIFT_DEADLINE_PASSED';
  end if;

  -- Idempotent: if this worker already has an active assignment, return it.
  select * into v_assignment
  from public.shift_assignments
  where shift_id = p_shift_id
    and worker_id = v_worker_id
    and status in (
      'accepted',
      'checked_in',
      'checked_out',
      'submitted',
      'approved'
    );

  if found then
    return v_assignment;
  end if;

  -- Another worker already holds capacity (pilot capacity = 1).
  if exists (
    select 1
    from public.shift_assignments a
    where a.shift_id = p_shift_id
      and a.status in (
        'accepted',
        'checked_in',
        'checked_out',
        'submitted',
        'approved'
      )
  ) then
    raise exception 'SHIFT_ALREADY_FILLED';
  end if;

  v_eligibility := public.check_worker_eligibility(v_worker_id, p_shift_id);

  if v_eligibility = 'schedule_conflict' then
    raise exception 'SCHEDULE_CONFLICT';
  elsif v_eligibility <> 'eligible' then
    raise exception 'NOT_ELIGIBLE:%', v_eligibility;
  end if;

  perform set_config('bridgehive.allow_assignment_write', 'on', true);

  insert into public.shift_assignments (shift_id, worker_id, status, accepted_at)
  values (v_shift.id, v_worker_id, 'accepted', now())
  returning * into v_assignment;

  update public.shifts
  set status = 'filled', updated_at = now()
  where id = v_shift.id;

  perform set_config('bridgehive.allow_assignment_write', 'off', true);

  perform public.create_audit_event(
    v_shift.organization_id,
    'shift_assignment',
    v_assignment.id,
    'claim_shift',
    null,
    to_jsonb(v_assignment)
  );

  insert into public.notifications (user_id, type, title, body, data)
  values (
    v_worker_id,
    'shift_claimed',
    'Shift claimed',
    'You successfully claimed a shift.',
    jsonb_build_object(
      'shift_id', v_shift.id,
      'assignment_id', v_assignment.id
    )
  );

  return v_assignment;
exception
  when unique_violation then
    raise exception 'SHIFT_ALREADY_FILLED';
end;
$$;

revoke all on function public.claim_shift(uuid) from public;
grant execute on function public.claim_shift(uuid) to authenticated;
