-- 016_admin_account_oversight.sql
-- Platform admin account suspension, credential review intake, eligibility
-- enforcement, admin profile visibility, and audit data sanitization.

-- ---------------------------------------------------------------------------
-- 1. Revoke direct create_audit_event execution from clients.
-- Audit events must be created only by protected RPCs.
-- ---------------------------------------------------------------------------

revoke execute on function public.create_audit_event(uuid, text, uuid, text, jsonb, jsonb) from authenticated;

-- ---------------------------------------------------------------------------
-- 2. Sanitize existing audit_events: remove sensitive keys from before/after.
-- Preserve action, actor, target, timestamp. Do not delete audit records.
-- ---------------------------------------------------------------------------

update public.audit_events
set
  before = case
    when before is not null then
      before - 'storage_path' - 'signed_url' - 'masked_iban' - 'iban'
             - 'token' - 'access_token' - 'refresh_token' - 'password'
    else before
  end,
  after = case
    when after is not null then
      after - 'storage_path' - 'signed_url' - 'masked_iban' - 'iban'
            - 'token' - 'access_token' - 'refresh_token' - 'password'
    else after
  end
where
  (before ?| array['storage_path','signed_url','masked_iban','iban','token','access_token','refresh_token','password'])
  or (after ?| array['storage_path','signed_url','masked_iban','iban','token','access_token','refresh_token','password']);

-- ---------------------------------------------------------------------------
-- 3. Replace is_platform_admin to require active account_status.
-- ---------------------------------------------------------------------------

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
    join public.profiles p on p.id = r.user_id
    where r.user_id = auth.uid()
      and p.account_status = 'active'
      and (
        p_required_role is null
        or r.role = p_required_role
        or r.role = 'platform_super_admin'
      )
  );
$$;

-- ---------------------------------------------------------------------------
-- 4. Replace overly broad RLS policies with role-specific policies.
-- ---------------------------------------------------------------------------

drop policy if exists "credentials_select_platform_verifier" on public.credentials;

create policy "credentials_select_verifier_super"
on public.credentials
for select
to authenticated
using (
  public.is_platform_admin('platform_verifier')
  or public.is_platform_admin('platform_super_admin')
);

drop policy if exists "worker_profiles_select_platform_admin" on public.worker_profiles;

create policy "worker_profiles_select_verifier_super"
on public.worker_profiles
for select
to authenticated
using (
  public.is_platform_admin('platform_verifier')
  or public.is_platform_admin('platform_super_admin')
);

-- Allow verifier and super_admin to read all profiles for oversight
create policy "profiles_select_verifier_super"
on public.profiles
for select
to authenticated
using (
  public.is_platform_admin('platform_verifier')
  or public.is_platform_admin('platform_super_admin')
);

-- ---------------------------------------------------------------------------
-- 5. Support-specific narrowly scoped views implemented as SECURITY DEFINER functions.
-- No storage_path, no credential documents, no IBAN, no auth data.
-- Functions bypass RLS to return only approved fields when role predicate passes.
-- ---------------------------------------------------------------------------

create or replace function public.worker_support_view()
returns table (
  user_id uuid,
  full_name text,
  account_status public.account_status,
  worker_role public.worker_role,
  onboarding_status public.onboarding_status,
  verification_status public.verification_status,
  created_at timestamptz,
  updated_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    wp.user_id,
    p.full_name,
    p.account_status,
    wp.worker_role,
    wp.onboarding_status,
    wp.verification_status,
    wp.created_at,
    wp.updated_at
  from public.worker_profiles wp
  join public.profiles p on p.id = wp.user_id
  where public.is_platform_admin('platform_support')
     or public.is_platform_admin('platform_verifier')
     or public.is_platform_admin('platform_super_admin');
$$;

revoke all on function public.worker_support_view() from public;
grant execute on function public.worker_support_view() to authenticated;

create or replace function public.credential_support_view()
returns table (
  id uuid,
  worker_id uuid,
  credential_type text,
  status public.credential_status,
  expires_at timestamptz,
  verified_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    c.id,
    c.worker_id,
    c.credential_type,
    c.status,
    c.expires_at,
    c.verified_at,
    c.created_at,
    c.updated_at
  from public.credentials c
  where public.is_platform_admin('platform_support')
     or public.is_platform_admin('platform_verifier')
     or public.is_platform_admin('platform_super_admin');
$$;

revoke all on function public.credential_support_view() from public;
grant execute on function public.credential_support_view() to authenticated;

-- ---------------------------------------------------------------------------
-- 6. Multi-file path support + tighten storage policies.
-- ---------------------------------------------------------------------------

alter table public.credentials
  add column if not exists storage_paths jsonb not null default '[]'::jsonb;

comment on column public.credentials.storage_paths is
  'Allow-listed storage object names for this credential. Prefer over storage_path for new uploads.';

update public.credentials
set storage_paths = jsonb_build_array(storage_path)
where storage_path is not null
  and (storage_paths is null or storage_paths = '[]'::jsonb);

-- Prevent silent file replacement after submission/review.
create or replace function public.credentials_guard_client_status()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    if new.status is distinct from 'pending' then
      raise exception 'CREDENTIAL_STATUS_LOCKED';
    end if;
    if new.verified_by is not null or new.verified_at is not null then
      raise exception 'CREDENTIAL_VERIFY_LOCKED';
    end if;
    return new;
  end if;

  if auth.uid() is not null and auth.role() = 'authenticated'
     and current_setting('bridgehive.allow_platform_verify', true) is distinct from 'on' then
    if new.status is distinct from old.status
       or new.verified_by is distinct from old.verified_by
       or new.verified_at is distinct from old.verified_at then
      raise exception 'CREDENTIAL_STATUS_LOCKED';
    end if;

    if (
         new.storage_path is distinct from old.storage_path
         or new.storage_paths is distinct from old.storage_paths
       )
       and old.status is distinct from 'pending' then
      raise exception 'CREDENTIAL_FILE_LOCKED';
    end if;
  end if;

  return new;
end;
$$;

drop policy if exists "credentials_storage_select_platform_verifier" on storage.objects;

create policy "credentials_storage_select_verifier_super"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'credentials'
  and (
    public.is_platform_admin('platform_verifier')
    or public.is_platform_admin('platform_super_admin')
  )
);

-- Workers may replace/delete only objects tied to their pending credentials,
-- or objects in their folder that are not referenced by a submitted/reviewed row.
drop policy if exists "credentials_storage_update_own" on storage.objects;
create policy "credentials_storage_update_own"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'credentials'
  and (storage.foldername(name))[1] = auth.uid()::text
  and not exists (
    select 1
    from public.credentials c
    where c.worker_id = auth.uid()
      and c.status <> 'pending'
      and (
        c.storage_path = name
        or c.storage_paths @> jsonb_build_array(name)
      )
  )
)
with check (
  bucket_id = 'credentials'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "credentials_storage_delete_own" on storage.objects;
create policy "credentials_storage_delete_own"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'credentials'
  and (storage.foldername(name))[1] = auth.uid()::text
  and not exists (
    select 1
    from public.credentials c
    where c.worker_id = auth.uid()
      and c.status <> 'pending'
      and (
        c.storage_path = name
        or c.storage_paths @> jsonb_build_array(name)
      )
  )
);

-- ---------------------------------------------------------------------------
-- 7. Role-specific credential requirements (authoritative backend mapping).
-- Identity front/back are distinct credential types. Payout is separate.
-- Tax/social insurance are proof documents only (raw ID collection deferred).
-- ---------------------------------------------------------------------------

create or replace function public.worker_credential_requirements(
  p_worker_role public.worker_role
)
returns table (
  credential_type text,
  is_required boolean,
  sort_order integer
)
language sql
immutable
set search_path = public
as $$
  select credential_type, is_required, sort_order
  from (
    select * from (
      values
        ('identity_document_front'::text, true, 1),
        ('identity_document_back', true, 2),
        ('nursing_licence', true, 3),
        ('nursing_degree', true, 4),
        ('tax_identification_proof', true, 5),
        ('social_insurance_proof', true, 6),
        ('cv', false, 7)
    ) as t(credential_type, is_required, sort_order)
    where p_worker_role = 'registered_nurse'

    union all

    select * from (
      values
        ('identity_document_front'::text, true, 1),
        ('identity_document_back', true, 2),
        ('employment_certificate', true, 3),
        ('tax_identification_proof', true, 4),
        ('social_insurance_proof', true, 5)
    ) as t(credential_type, is_required, sort_order)
    where p_worker_role = 'ward_assistant'
  ) req
  order by sort_order;
$$;

revoke all on function public.worker_credential_requirements(public.worker_role) from public;
grant execute on function public.worker_credential_requirements(public.worker_role) to authenticated;

-- Required types only (used by set_worker_verification).
create or replace function public.worker_required_credential_types(
  p_worker_role public.worker_role
)
returns text[]
language sql
immutable
set search_path = public
as $$
  select coalesce(
    array_agg(r.credential_type order by r.sort_order),
    array[]::text[]
  )
  from public.worker_credential_requirements(p_worker_role) r
  where r.is_required;
$$;

revoke all on function public.worker_required_credential_types(public.worker_role) from public;
grant execute on function public.worker_required_credential_types(public.worker_role) to authenticated;

-- Payout account is required for final verification but is not a credential document.
-- Phase 4: status must be exactly 'verified' (super-admin approved for platform use).
-- Pending/submitted is not sufficient. Provider-backed bank ownership verification is deferred.
create or replace function public.worker_has_satisfied_payout_account(p_worker_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.payout_accounts pa
    where pa.worker_id = p_worker_id
      and pa.status = 'verified'
  );
$$;

revoke all on function public.worker_has_satisfied_payout_account(uuid) from public;
grant execute on function public.worker_has_satisfied_payout_account(uuid) to authenticated;

-- True when all role-required credentials are verified and payout is verified.
create or replace function public.worker_is_ready_for_final_approval(p_worker_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_worker public.worker_profiles;
  v_missing text;
begin
  select * into v_worker from public.worker_profiles where user_id = p_worker_id;
  if not found or v_worker.worker_role is null then
    return false;
  end if;

  if not exists (
    select 1 from public.profiles
    where id = p_worker_id and account_status = 'active'
  ) then
    return false;
  end if;

  if not public.worker_has_satisfied_payout_account(p_worker_id) then
    return false;
  end if;

  select t.cred_type into v_missing
  from unnest(public.worker_required_credential_types(v_worker.worker_role)) as t(cred_type)
  where not exists (
    select 1
    from public.credentials c
    where c.worker_id = p_worker_id
      and c.credential_type = t.cred_type
      and c.status = 'verified'
      and (c.expires_at is null or c.expires_at > now())
  )
  limit 1;

  return v_missing is null;
end;
$$;

revoke all on function public.worker_is_ready_for_final_approval(uuid) from public;
grant execute on function public.worker_is_ready_for_final_approval(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 8. Eligibility: suspended / deleted accounts cannot claim shifts.
-- ---------------------------------------------------------------------------

create or replace function public.check_worker_eligibility(
  p_worker_id uuid,
  p_shift_id uuid
)
returns text
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_shift public.shifts;
  v_worker public.worker_profiles;
  v_account_status public.account_status;
  v_req record;
  v_missing text;
begin
  select * into v_shift from public.shifts where id = p_shift_id;
  if not found then
    return 'shift_not_found';
  end if;

  select account_status into v_account_status
  from public.profiles
  where id = p_worker_id;

  if not found then
    return 'profile_missing';
  end if;

  if v_account_status <> 'active' then
    return 'account_not_active';
  end if;

  select * into v_worker from public.worker_profiles where user_id = p_worker_id;
  if not found then
    return 'worker_profile_missing';
  end if;

  if v_worker.verification_status <> 'verified' then
    return 'not_verified';
  end if;

  if not public.worker_has_satisfied_payout_account(p_worker_id) then
    return 'payout_account_required';
  end if;

  if v_worker.worker_role is distinct from v_shift.required_role then
    return 'role_mismatch';
  end if;

  -- Platform role-required credentials must remain verified and non-expired.
  if v_worker.worker_role is not null then
    select t.cred_type into v_missing
    from unnest(public.worker_required_credential_types(v_worker.worker_role)) as t(cred_type)
    where not exists (
      select 1
      from public.credentials c
      where c.worker_id = p_worker_id
        and c.credential_type = t.cred_type
        and c.status = 'verified'
        and (c.expires_at is null or c.expires_at > now())
    )
    limit 1;

    if v_missing is not null then
      return 'missing_credential:' || v_missing;
    end if;
  end if;

  for v_req in
    select requirement_type
    from public.shift_requirements
    where shift_id = p_shift_id
      and required = true
  loop
    if not exists (
      select 1
      from public.credentials c
      where c.worker_id = p_worker_id
        and c.credential_type = v_req.requirement_type
        and c.status = 'verified'
        and (c.expires_at is null or c.expires_at > now())
    ) then
      return 'missing_credential:' || v_req.requirement_type;
    end if;
  end loop;

  if public.check_schedule_conflict(p_worker_id, v_shift.starts_at, v_shift.ends_at) then
    return 'schedule_conflict';
  end if;

  return 'eligible';
end;
$$;

-- ---------------------------------------------------------------------------
-- 9. Replace check_in_assignment with account_status check and safe audit.
-- ---------------------------------------------------------------------------

create or replace function public.check_in_assignment(p_assignment_id uuid)
returns public.shift_assignments
language plpgsql
security definer
set search_path = public
as $$
declare
  v_worker_id uuid := auth.uid();
  v_assignment public.shift_assignments;
  v_shift public.shifts;
  v_account_status public.account_status;
begin
  if v_worker_id is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  select account_status into v_account_status
  from public.profiles
  where id = v_worker_id;

  if not found or v_account_status <> 'active' then
    raise exception 'ACCOUNT_NOT_ACTIVE';
  end if;

  select * into v_assignment
  from public.shift_assignments
  where id = p_assignment_id
  for update;

  if not found then
    raise exception 'ASSIGNMENT_NOT_FOUND';
  end if;

  if v_assignment.worker_id <> v_worker_id then
    raise exception 'NOT_AUTHORIZED';
  end if;

  if v_assignment.status = 'checked_in' then
    return v_assignment;
  end if;

  if v_assignment.status <> 'accepted' then
    raise exception 'ASSIGNMENT_NOT_ACCEPTED';
  end if;

  select * into v_shift
  from public.shifts
  where id = v_assignment.shift_id
  for update;

  if not found then
    raise exception 'SHIFT_NOT_FOUND';
  end if;

  if now() < (v_shift.starts_at - interval '30 minutes') then
    raise exception 'CHECK_IN_TOO_EARLY';
  end if;

  if now() > v_shift.ends_at then
    raise exception 'CHECK_IN_TOO_LATE';
  end if;

  perform set_config('bridgehive.allow_assignment_write', 'on', true);

  update public.shift_assignments
  set
    status = 'checked_in',
    check_in_at = now(),
    updated_at = now()
  where id = v_assignment.id
  returning * into v_assignment;

  if v_shift.status = 'filled' then
    update public.shifts
    set status = 'in_progress', updated_at = now()
    where id = v_shift.id;
  end if;

  perform set_config('bridgehive.allow_assignment_write', 'off', true);

  perform public.create_audit_event(
    v_shift.organization_id,
    'assignment',
    v_assignment.id,
    'check_in_assignment',
    jsonb_build_object('status', 'accepted'),
    jsonb_build_object(
      'status', v_assignment.status,
      'check_in_at', v_assignment.check_in_at,
      'shift_id', v_assignment.shift_id
    )
  );

  return v_assignment;
end;
$$;

-- ---------------------------------------------------------------------------
-- 10. Replace check_out_assignment with account_status check and safe audit.
-- ---------------------------------------------------------------------------

create or replace function public.check_out_assignment(p_assignment_id uuid)
returns public.shift_assignments
language plpgsql
security definer
set search_path = public
as $$
declare
  v_worker_id uuid := auth.uid();
  v_assignment public.shift_assignments;
  v_shift public.shifts;
  v_account_status public.account_status;
begin
  if v_worker_id is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  select account_status into v_account_status
  from public.profiles
  where id = v_worker_id;

  if not found or v_account_status <> 'active' then
    raise exception 'ACCOUNT_NOT_ACTIVE';
  end if;

  select * into v_assignment
  from public.shift_assignments
  where id = p_assignment_id
  for update;

  if not found then
    raise exception 'ASSIGNMENT_NOT_FOUND';
  end if;

  if v_assignment.worker_id <> v_worker_id then
    raise exception 'NOT_AUTHORIZED';
  end if;

  if v_assignment.status in ('checked_out', 'submitted', 'approved') then
    return v_assignment;
  end if;

  if v_assignment.status <> 'checked_in' then
    raise exception 'ASSIGNMENT_NOT_CHECKED_IN';
  end if;

  if v_assignment.check_in_at is null then
    raise exception 'CHECK_IN_REQUIRED';
  end if;

  select * into v_shift
  from public.shifts
  where id = v_assignment.shift_id;

  if not found then
    raise exception 'SHIFT_NOT_FOUND';
  end if;

  perform set_config('bridgehive.allow_assignment_write', 'on', true);

  update public.shift_assignments
  set
    status = 'checked_out',
    check_out_at = now(),
    updated_at = now()
  where id = v_assignment.id
  returning * into v_assignment;

  perform set_config('bridgehive.allow_assignment_write', 'off', true);

  perform public.create_audit_event(
    v_shift.organization_id,
    'assignment',
    v_assignment.id,
    'check_out_assignment',
    jsonb_build_object('status', 'checked_in'),
    jsonb_build_object(
      'status', v_assignment.status,
      'check_in_at', v_assignment.check_in_at,
      'check_out_at', v_assignment.check_out_at,
      'shift_id', v_assignment.shift_id
    )
  );

  return v_assignment;
end;
$$;

-- ---------------------------------------------------------------------------
-- 11. Replace submit_timesheet with account_status check and safe audit.
-- ---------------------------------------------------------------------------

create or replace function public.submit_timesheet(p_assignment_id uuid)
returns public.timesheets
language plpgsql
security definer
set search_path = public
as $$
declare
  v_worker_id uuid := auth.uid();
  v_assignment public.shift_assignments;
  v_shift public.shifts;
  v_ts public.timesheets;
  v_minutes integer;
  v_has_timesheet boolean := false;
  v_account_status public.account_status;
begin
  if v_worker_id is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  select account_status into v_account_status
  from public.profiles
  where id = v_worker_id;

  if not found or v_account_status <> 'active' then
    raise exception 'ACCOUNT_NOT_ACTIVE';
  end if;

  select * into v_assignment
  from public.shift_assignments
  where id = p_assignment_id
  for update;

  if not found then
    raise exception 'ASSIGNMENT_NOT_FOUND';
  end if;

  if v_assignment.worker_id <> v_worker_id then
    raise exception 'NOT_AUTHORIZED';
  end if;

  select * into v_ts
  from public.timesheets
  where assignment_id = p_assignment_id
  for update;

  v_has_timesheet := found;

  if v_has_timesheet and v_ts.status in ('submitted', 'approved') then
    return v_ts;
  end if;

  if v_assignment.status = 'submitted' and v_has_timesheet then
    return v_ts;
  end if;

  if v_assignment.status <> 'checked_out' then
    raise exception 'ASSIGNMENT_NOT_CHECKED_OUT';
  end if;

  if v_assignment.check_in_at is null or v_assignment.check_out_at is null then
    raise exception 'CHECK_TIMESTAMPS_REQUIRED';
  end if;

  if v_assignment.check_out_at <= v_assignment.check_in_at then
    raise exception 'INVALID_CHECK_TIMESTAMPS';
  end if;

  select * into v_shift
  from public.shifts
  where id = v_assignment.shift_id
  for update;

  if not found then
    raise exception 'SHIFT_NOT_FOUND';
  end if;

  v_minutes := greatest(
    0,
    (extract(epoch from (v_assignment.check_out_at - v_assignment.check_in_at)) / 60.0)::integer
      - coalesce(v_shift.break_minutes, 0)
  );

  perform set_config('bridgehive.allow_timesheet_submit', 'on', true);
  perform set_config('bridgehive.allow_assignment_write', 'on', true);

  if v_has_timesheet then
    update public.timesheets
    set
      submitted_minutes = v_minutes,
      break_minutes = coalesce(v_shift.break_minutes, 0),
      status = 'submitted',
      submitted_at = now(),
      approved_minutes = null,
      reviewed_by = null,
      reviewed_at = null,
      review_note = null,
      updated_at = now()
    where id = v_ts.id
    returning * into v_ts;
  else
    insert into public.timesheets (
      assignment_id,
      submitted_minutes,
      break_minutes,
      status,
      submitted_at
    ) values (
      v_assignment.id,
      v_minutes,
      coalesce(v_shift.break_minutes, 0),
      'submitted',
      now()
    )
    returning * into v_ts;
  end if;

  update public.shift_assignments
  set status = 'submitted', updated_at = now()
  where id = v_assignment.id;

  update public.shifts
  set status = 'awaiting_approval', updated_at = now()
  where id = v_shift.id
    and status in ('filled', 'in_progress');

  perform set_config('bridgehive.allow_timesheet_submit', 'off', true);
  perform set_config('bridgehive.allow_assignment_write', 'off', true);

  perform public.create_audit_event(
    v_shift.organization_id,
    'timesheet',
    v_ts.id,
    'submit_timesheet',
    jsonb_build_object('assignment_id', v_assignment.id),
    jsonb_build_object(
      'status', v_ts.status,
      'submitted_minutes', v_ts.submitted_minutes,
      'break_minutes', v_ts.break_minutes,
      'submitted_at', v_ts.submitted_at
    )
  );

  return v_ts;
end;
$$;

-- ---------------------------------------------------------------------------
-- 12. Replace submit_credential_for_review with account_status check.
-- ---------------------------------------------------------------------------

create or replace function public.submit_credential_for_review(
  p_credential_id uuid
)
returns public.credentials
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cred public.credentials;
  v_is_owner boolean;
  v_is_verifier boolean;
  v_old_status public.credential_status;
  v_account_status public.account_status;
begin
  if auth.uid() is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  select account_status into v_account_status
  from public.profiles
  where id = auth.uid();

  if not found or v_account_status <> 'active' then
    raise exception 'ACCOUNT_NOT_ACTIVE';
  end if;

  select * into v_cred
  from public.credentials
  where id = p_credential_id
  for update;

  if not found then
    raise exception 'CREDENTIAL_NOT_FOUND';
  end if;

  v_old_status := v_cred.status;
  v_is_owner := v_cred.worker_id = auth.uid();
  v_is_verifier := public.is_platform_admin('platform_verifier');

  if not v_is_owner and not v_is_verifier then
    raise exception 'NOT_AUTHORIZED';
  end if;

  if v_cred.status <> 'pending' then
    raise exception 'INVALID_TRANSITION';
  end if;

  if v_cred.storage_path is null
     and (v_cred.storage_paths is null or jsonb_array_length(v_cred.storage_paths) = 0) then
    raise exception 'CREDENTIAL_FILE_REQUIRED';
  end if;

  perform set_config('bridgehive.allow_platform_verify', 'on', true);

  update public.credentials
  set
    status = 'under_review',
    updated_at = now()
  where id = v_cred.id
  returning * into v_cred;

  perform set_config('bridgehive.allow_platform_verify', 'off', true);

  perform public.create_audit_event(
    null,
    'credential',
    v_cred.id,
    'submit_credential',
    jsonb_build_object('status', v_old_status),
    jsonb_build_object(
      'credential_type', v_cred.credential_type,
      'status', v_cred.status,
      'expires_at', v_cred.expires_at
    )
  );

  perform public.notify_credential_event(
    v_cred.worker_id,
    v_cred.credential_type,
    'submitted',
    null
  );

  return v_cred;
end;
$$;

revoke all on function public.submit_credential_for_review(uuid) from public;
grant execute on function public.submit_credential_for_review(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 13. Enhanced verify_credential: safe audit metadata + reason limit.
-- ---------------------------------------------------------------------------

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
  v_old_status public.credential_status;
  v_trimmed_reason text;
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

  v_old_status := v_cred.status;

  if v_cred.worker_id = auth.uid() then
    raise exception 'CANNOT_SELF_VERIFY';
  end if;

  if v_cred.status not in ('pending', 'under_review') then
    raise exception 'INVALID_TRANSITION';
  end if;

  if v_decision = 'reject' then
    if p_rejection_reason is null or char_length(trim(p_rejection_reason)) = 0 then
      raise exception 'REJECTION_REASON_REQUIRED';
    end if;
    v_trimmed_reason := trim(p_rejection_reason);
    if char_length(v_trimmed_reason) > 2000 then
      raise exception 'REASON_TOO_LONG';
    end if;
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
    update public.credentials
    set
      status = 'rejected',
      verified_by = auth.uid(),
      verified_at = now(),
      rejection_reason = v_trimmed_reason,
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
    jsonb_build_object('status', v_old_status),
    jsonb_build_object(
      'credential_type', v_cred.credential_type,
      'status', v_cred.status,
      'expires_at', v_cred.expires_at,
      'verified_at', v_cred.verified_at,
      'rejection_reason', case when v_decision = 'reject' then left(v_trimmed_reason, 200) else null end
    )
  );

  perform public.notify_credential_event(
    v_cred.worker_id,
    v_cred.credential_type,
    case when v_decision = 'approve' then 'verified' else 'rejected' end,
    case when v_decision = 'reject' then left(v_trimmed_reason, 200) else null end
  );

  -- Never auto-verify the worker. Notify admins when checklist + payout are complete.
  if v_decision = 'approve'
     and public.worker_is_ready_for_final_approval(v_cred.worker_id) then
    perform public.notify_platform_admin_task(
      'admin_worker_ready_for_final_approval',
      'Worker ready for final approval',
      'All required documents and the payout account are approved.',
      jsonb_build_object('worker_id', v_cred.worker_id)
    );
  end if;

  return v_cred;
end;
$$;

-- ---------------------------------------------------------------------------
-- 14. Enhanced set_worker_verification: safe audit + reason limits.
-- ---------------------------------------------------------------------------

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
  v_account_status public.account_status;
  v_required text[];
  v_missing text;
  v_old_verification_status public.verification_status;
  v_trimmed_reason text;
begin
  if auth.uid() is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  if not public.is_platform_admin('platform_verifier') then
    raise exception 'NOT_AUTHORIZED';
  end if;

  if p_worker_id = auth.uid() then
    raise exception 'CANNOT_SELF_VERIFY';
  end if;

  if p_status in ('rejected', 'suspended') then
    if p_reason is null or char_length(trim(p_reason)) = 0 then
      raise exception 'REASON_REQUIRED';
    end if;
    v_trimmed_reason := trim(p_reason);
    if char_length(v_trimmed_reason) > 2000 then
      raise exception 'REASON_TOO_LONG';
    end if;
  end if;

  select * into v_worker
  from public.worker_profiles
  where user_id = p_worker_id
  for update;

  if not found then
    raise exception 'WORKER_NOT_FOUND';
  end if;

  v_old_verification_status := v_worker.verification_status;

  if p_status = 'verified' then
    select account_status into v_account_status
    from public.profiles
    where id = p_worker_id;

    if v_account_status is distinct from 'active' then
      raise exception 'ACCOUNT_NOT_ACTIVE';
    end if;

    if v_worker.worker_role is null then
      raise exception 'WORKER_ROLE_REQUIRED';
    end if;

    v_required := public.worker_required_credential_types(v_worker.worker_role);

    select t.cred_type into v_missing
    from unnest(v_required) as t(cred_type)
    where not exists (
      select 1
      from public.credentials c
      where c.worker_id = p_worker_id
        and c.credential_type = t.cred_type
        and c.status = 'verified'
        and (c.expires_at is null or c.expires_at > now())
    )
    limit 1;

    if v_missing is not null then
      raise exception 'MISSING_REQUIRED_CREDENTIAL:%', v_missing;
    end if;

    if not public.worker_has_satisfied_payout_account(p_worker_id) then
      raise exception 'PAYOUT_ACCOUNT_REQUIRED';
    end if;
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
    jsonb_build_object(
      'old_status', v_old_verification_status,
      'reason', case when v_trimmed_reason is not null then left(v_trimmed_reason, 200) else null end
    ),
    jsonb_build_object(
      'worker_role', v_worker.worker_role,
      'verification_status', v_worker.verification_status
    )
  );

  if p_status in ('verified', 'rejected', 'suspended') then
    perform public.notify_credential_event(
      p_worker_id,
      'worker_profile',
      p_status::text,
      case when v_trimmed_reason is not null then left(v_trimmed_reason, 200) else null end
    );
  end if;

  return v_worker;
end;
$$;

-- ---------------------------------------------------------------------------
-- 15. Suspend / reactivate with self-checks and reason limits.
-- ---------------------------------------------------------------------------

create or replace function public.suspend_worker_account(
  p_worker_id uuid,
  p_reason text
)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile public.profiles;
  v_before jsonb;
  v_trimmed_reason text;
begin
  if auth.uid() is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  if p_worker_id = auth.uid() then
    raise exception 'CANNOT_SUSPEND_SELF';
  end if;

  if not public.is_platform_admin('platform_super_admin') then
    raise exception 'NOT_AUTHORIZED';
  end if;

  if p_reason is null or char_length(trim(p_reason)) = 0 then
    raise exception 'REASON_REQUIRED';
  end if;

  v_trimmed_reason := trim(p_reason);
  if char_length(v_trimmed_reason) > 2000 then
    raise exception 'REASON_TOO_LONG';
  end if;

  select * into v_profile
  from public.profiles
  where id = p_worker_id
  for update;

  if not found then
    raise exception 'PROFILE_NOT_FOUND';
  end if;

  if v_profile.account_status = 'suspended' then
    raise exception 'ALREADY_SUSPENDED';
  end if;

  if v_profile.account_status = 'deleted' then
    raise exception 'ACCOUNT_DELETED';
  end if;

  v_before := to_jsonb(v_profile);

  update public.profiles
  set
    account_status = 'suspended',
    updated_at = now()
  where id = p_worker_id
  returning * into v_profile;

  perform public.create_audit_event(
    null,
    'profile',
    p_worker_id,
    'suspend_account',
    jsonb_build_object(
      'reason', left(v_trimmed_reason, 200),
      'account_status', v_before ->> 'account_status'
    ),
    jsonb_build_object('account_status', v_profile.account_status)
  );

  return v_profile;
end;
$$;

create or replace function public.reactivate_worker_account(
  p_worker_id uuid,
  p_reason text
)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile public.profiles;
  v_before jsonb;
  v_trimmed_reason text;
begin
  if auth.uid() is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  if p_worker_id = auth.uid() then
    raise exception 'CANNOT_REACTIVATE_SELF';
  end if;

  if not public.is_platform_admin('platform_super_admin') then
    raise exception 'NOT_AUTHORIZED';
  end if;

  if p_reason is null or char_length(trim(p_reason)) = 0 then
    raise exception 'REASON_REQUIRED';
  end if;

  v_trimmed_reason := trim(p_reason);
  if char_length(v_trimmed_reason) > 2000 then
    raise exception 'REASON_TOO_LONG';
  end if;

  select * into v_profile
  from public.profiles
  where id = p_worker_id
  for update;

  if not found then
    raise exception 'PROFILE_NOT_FOUND';
  end if;

  if v_profile.account_status = 'active' then
    raise exception 'ALREADY_ACTIVE';
  end if;

  if v_profile.account_status = 'deleted' then
    raise exception 'ACCOUNT_DELETED';
  end if;

  v_before := to_jsonb(v_profile);

  update public.profiles
  set
    account_status = 'active',
    updated_at = now()
  where id = p_worker_id
  returning * into v_profile;

  perform public.create_audit_event(
    null,
    'profile',
    p_worker_id,
    'reactivate_account',
    jsonb_build_object(
      'reason', left(v_trimmed_reason, 200),
      'account_status', v_before ->> 'account_status'
    ),
    jsonb_build_object('account_status', v_profile.account_status)
  );

  return v_profile;
end;
$$;

revoke all on function public.suspend_worker_account(uuid, text) from public;
grant execute on function public.suspend_worker_account(uuid, text) to authenticated;

revoke all on function public.reactivate_worker_account(uuid, text) from public;
grant execute on function public.reactivate_worker_account(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 16. Credential document viewing audit RPC.
-- Only platform_verifier and platform_super_admin may call.
-- Browser never supplies storage_path; server loads it from credential row.
-- Audit metadata must not contain storage_path or signed URL.
-- ---------------------------------------------------------------------------

create or replace function public.audit_credential_document_view(
  p_credential_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  if not (public.is_platform_admin('platform_verifier') or public.is_platform_admin('platform_super_admin')) then
    raise exception 'NOT_AUTHORIZED';
  end if;

  if not exists (select 1 from public.credentials where id = p_credential_id) then
    raise exception 'CREDENTIAL_NOT_FOUND';
  end if;

  perform public.create_audit_event(
    null,
    'credential',
    p_credential_id,
    'view_credential_document',
    null,
    jsonb_build_object('viewed_at', now())
  );
end;
$$;

revoke all on function public.audit_credential_document_view(uuid) from public;
grant execute on function public.audit_credential_document_view(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 17. Credential / verification notifications (safe metadata only).
-- Recipients and timestamps are server-derived. No paths, URLs, IBANs, or IDs.
-- ---------------------------------------------------------------------------

create or replace function public.notify_credential_event(
  p_worker_id uuid,
  p_credential_type text,
  p_event_type text,
  p_reason text default null
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
  v_safe_reason text := nullif(left(trim(coalesce(p_reason, '')), 200), '');
  v_label text := replace(coalesce(p_credential_type, 'document'), '_', ' ');
begin
  if p_worker_id is null or p_event_type is null then
    return;
  end if;

  case p_event_type
    when 'submitted' then
      v_type := 'credential_submitted';
      v_title := 'Document submitted';
      v_body := format('Your %s has been submitted for review.', v_label);
    when 'under_review' then
      v_type := 'credential_under_review';
      v_title := 'Review started';
      v_body := format('Your %s is now under review.', v_label);
    when 'verified' then
      if p_credential_type = 'worker_profile' then
        v_type := 'worker_verified';
        v_title := 'Worker verified';
        v_body := 'Your worker profile has been verified. You can claim eligible shifts.';
      else
        v_type := 'credential_verified';
        v_title := 'Document verified';
        v_body := format('Your %s has been verified.', v_label);
      end if;
    when 'rejected' then
      if p_credential_type = 'worker_profile' then
        v_type := 'worker_rejected';
        v_title := 'Worker verification rejected';
        v_body := coalesce(v_safe_reason, 'Please update your documents and try again.');
      else
        v_type := 'credential_rejected';
        v_title := 'Document rejected';
        v_body := format(
          'Your %s was rejected. %s',
          v_label,
          coalesce(v_safe_reason, 'Please resubmit a clearer document.')
        );
      end if;
    when 'suspended' then
      v_type := 'worker_suspended';
      v_title := 'Account suspended';
      v_body := coalesce(v_safe_reason, 'Your account has been suspended.');
    when 'reactivated' then
      v_type := 'worker_reactivated';
      v_title := 'Account reactivated';
      v_body := coalesce(v_safe_reason, 'Your account has been reactivated.');
    when 'payout_approved' then
      v_type := 'payout_account_approved';
      v_title := 'Payout account approved';
      v_body := 'Your payout account was approved for platform use.';
    when 'payout_rejected' then
      v_type := 'payout_account_rejected';
      v_title := 'Payout account rejected';
      v_body := coalesce(
        v_safe_reason,
        'Your payout account was rejected. Please resubmit with corrected details.'
      );
    when 'payout_submitted' then
      v_type := 'payout_account_submitted';
      v_title := 'Payout account submitted';
      v_body := 'Your payout account was submitted for administrative approval.';
    when 'payout_resubmission_required' then
      v_type := 'payout_account_resubmission_required';
      v_title := 'Payout account resubmission required';
      v_body := coalesce(
        v_safe_reason,
        'Please correct and resubmit your payout account details.'
      );
    else
      return;
  end case;

  insert into public.notifications (user_id, type, title, body, data)
  values (
    p_worker_id,
    v_type,
    v_title,
    v_body,
    jsonb_build_object(
      'event', p_event_type,
      'credential_type', case
        when p_credential_type = 'worker_profile' then null
        else p_credential_type
      end
    )
  );
end;
$$;

revoke all on function public.notify_credential_event(uuid, text, text, text) from public;

create or replace function public.notify_platform_admin_task(
  p_type text,
  p_title text,
  p_body text,
  p_data jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin record;
  v_safe jsonb;
begin
  -- Strip sensitive keys if callers pass them accidentally.
  v_safe := coalesce(p_data, '{}'::jsonb)
    - 'storage_path'
    - 'proof_storage_path'
    - 'signed_url'
    - 'masked_iban'
    - 'iban'
    - 'account_holder_name'
    - 'token'
    - 'access_token'
    - 'refresh_token'
    - 'password'
    - 'tax_id'
    - 'social_insurance_number'
    - 'filename';

  for v_admin in
    select r.user_id
    from public.platform_admin_roles r
    join public.profiles p on p.id = r.user_id
    where p.account_status = 'active'
      and r.role in ('platform_verifier', 'platform_super_admin')
  loop
    insert into public.notifications (user_id, type, title, body, data)
    values (v_admin.user_id, p_type, p_title, p_body, v_safe);
  end loop;
end;
$$;

revoke all on function public.notify_platform_admin_task(text, text, text, jsonb) from public;

-- Super-admin-only task notifications (payout review queue).
create or replace function public.notify_super_admin_task(
  p_type text,
  p_title text,
  p_body text,
  p_data jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin record;
  v_safe jsonb;
begin
  v_safe := coalesce(p_data, '{}'::jsonb)
    - 'storage_path'
    - 'proof_storage_path'
    - 'signed_url'
    - 'masked_iban'
    - 'iban'
    - 'account_holder_name'
    - 'token'
    - 'access_token'
    - 'refresh_token'
    - 'password'
    - 'tax_id'
    - 'social_insurance_number'
    - 'filename';

  for v_admin in
    select r.user_id
    from public.platform_admin_roles r
    join public.profiles p on p.id = r.user_id
    where p.account_status = 'active'
      and r.role = 'platform_super_admin'
  loop
    insert into public.notifications (user_id, type, title, body, data)
    values (v_admin.user_id, p_type, p_title, p_body, v_safe);
  end loop;
end;
$$;

revoke all on function public.notify_super_admin_task(text, text, text, jsonb) from public;

-- Notify admins after a worker submits a credential for review.
create or replace function public.submit_credential_for_review(
  p_credential_id uuid
)
returns public.credentials
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cred public.credentials;
  v_is_owner boolean;
  v_is_verifier boolean;
  v_old_status public.credential_status;
  v_account_status public.account_status;
begin
  if auth.uid() is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  select account_status into v_account_status
  from public.profiles
  where id = auth.uid();

  if not found or v_account_status <> 'active' then
    raise exception 'ACCOUNT_NOT_ACTIVE';
  end if;

  select * into v_cred
  from public.credentials
  where id = p_credential_id
  for update;

  if not found then
    raise exception 'CREDENTIAL_NOT_FOUND';
  end if;

  v_old_status := v_cred.status;
  v_is_owner := v_cred.worker_id = auth.uid();
  v_is_verifier := public.is_platform_admin('platform_verifier');

  if not v_is_owner and not v_is_verifier then
    raise exception 'NOT_AUTHORIZED';
  end if;

  if v_cred.status <> 'pending' then
    raise exception 'INVALID_TRANSITION';
  end if;

  if v_cred.storage_path is null
     and (v_cred.storage_paths is null or jsonb_array_length(v_cred.storage_paths) = 0) then
    raise exception 'CREDENTIAL_FILE_REQUIRED';
  end if;

  perform set_config('bridgehive.allow_platform_verify', 'on', true);

  update public.credentials
  set
    status = 'under_review',
    updated_at = now()
  where id = v_cred.id
  returning * into v_cred;

  perform set_config('bridgehive.allow_platform_verify', 'off', true);

  perform public.create_audit_event(
    null,
    'credential',
    v_cred.id,
    'submit_credential',
    jsonb_build_object('status', v_old_status),
    jsonb_build_object(
      'credential_type', v_cred.credential_type,
      'status', v_cred.status,
      'expires_at', v_cred.expires_at
    )
  );

  perform public.notify_credential_event(
    v_cred.worker_id,
    v_cred.credential_type,
    'submitted',
    null
  );

  if v_is_owner then
    perform public.notify_platform_admin_task(
      'admin_credential_ready_for_review',
      'Credential ready for review',
      'A worker submitted a credential package item for review.',
      jsonb_build_object(
        'credential_id', v_cred.id,
        'credential_type', v_cred.credential_type,
        'worker_id', v_cred.worker_id
      )
    );
  end if;

  return v_cred;
end;
$$;

revoke all on function public.submit_credential_for_review(uuid) from public;
grant execute on function public.submit_credential_for_review(uuid) to authenticated;

-- Suspend / reactivate notifications for the affected worker.
create or replace function public.suspend_worker_account(
  p_worker_id uuid,
  p_reason text
)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile public.profiles;
  v_before jsonb;
  v_trimmed_reason text;
begin
  if auth.uid() is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  if p_worker_id = auth.uid() then
    raise exception 'CANNOT_SUSPEND_SELF';
  end if;

  if not public.is_platform_admin('platform_super_admin') then
    raise exception 'NOT_AUTHORIZED';
  end if;

  if p_reason is null or char_length(trim(p_reason)) = 0 then
    raise exception 'REASON_REQUIRED';
  end if;

  v_trimmed_reason := trim(p_reason);
  if char_length(v_trimmed_reason) > 2000 then
    raise exception 'REASON_TOO_LONG';
  end if;

  select * into v_profile
  from public.profiles
  where id = p_worker_id
  for update;

  if not found then
    raise exception 'PROFILE_NOT_FOUND';
  end if;

  if v_profile.account_status = 'suspended' then
    raise exception 'ALREADY_SUSPENDED';
  end if;

  if v_profile.account_status = 'deleted' then
    raise exception 'ACCOUNT_DELETED';
  end if;

  v_before := jsonb_build_object('account_status', v_profile.account_status);

  update public.profiles
  set
    account_status = 'suspended',
    updated_at = now()
  where id = p_worker_id
  returning * into v_profile;

  perform public.create_audit_event(
    null,
    'profile',
    p_worker_id,
    'suspend_account',
    jsonb_build_object(
      'reason', left(v_trimmed_reason, 200),
      'account_status', v_before ->> 'account_status'
    ),
    jsonb_build_object('account_status', v_profile.account_status)
  );

  perform public.notify_credential_event(
    p_worker_id,
    'worker_profile',
    'suspended',
    left(v_trimmed_reason, 200)
  );

  return v_profile;
end;
$$;

create or replace function public.reactivate_worker_account(
  p_worker_id uuid,
  p_reason text
)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile public.profiles;
  v_before jsonb;
  v_trimmed_reason text;
begin
  if auth.uid() is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  if p_worker_id = auth.uid() then
    raise exception 'CANNOT_REACTIVATE_SELF';
  end if;

  if not public.is_platform_admin('platform_super_admin') then
    raise exception 'NOT_AUTHORIZED';
  end if;

  if p_reason is null or char_length(trim(p_reason)) = 0 then
    raise exception 'REASON_REQUIRED';
  end if;

  v_trimmed_reason := trim(p_reason);
  if char_length(v_trimmed_reason) > 2000 then
    raise exception 'REASON_TOO_LONG';
  end if;

  select * into v_profile
  from public.profiles
  where id = p_worker_id
  for update;

  if not found then
    raise exception 'PROFILE_NOT_FOUND';
  end if;

  if v_profile.account_status = 'active' then
    raise exception 'ALREADY_ACTIVE';
  end if;

  if v_profile.account_status = 'deleted' then
    raise exception 'ACCOUNT_DELETED';
  end if;

  v_before := jsonb_build_object('account_status', v_profile.account_status);

  update public.profiles
  set
    account_status = 'active',
    updated_at = now()
  where id = p_worker_id
  returning * into v_profile;

  perform public.create_audit_event(
    null,
    'profile',
    p_worker_id,
    'reactivate_account',
    jsonb_build_object(
      'reason', left(v_trimmed_reason, 200),
      'account_status', v_before ->> 'account_status'
    ),
    jsonb_build_object('account_status', v_profile.account_status)
  );

  perform public.notify_credential_event(
    p_worker_id,
    'worker_profile',
    'reactivated',
    left(v_trimmed_reason, 200)
  );

  return v_profile;
end;
$$;

revoke all on function public.suspend_worker_account(uuid, text) from public;
grant execute on function public.suspend_worker_account(uuid, text) to authenticated;

revoke all on function public.reactivate_worker_account(uuid, text) from public;
grant execute on function public.reactivate_worker_account(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 18. Payout-account approval: platform_super_admin only (Phase 4).
-- Internal administrative approval for platform use — not bank ownership proof.
-- Sanitize audit metadata: never store IBAN / masked_iban.
-- ---------------------------------------------------------------------------

create or replace function public.worker_is_ready_for_final_approval(p_worker_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_worker public.worker_profiles;
  v_missing text;
begin
  select * into v_worker from public.worker_profiles where user_id = p_worker_id;
  if not found or v_worker.worker_role is null then
    return false;
  end if;

  if not exists (
    select 1 from public.profiles
    where id = p_worker_id and account_status = 'active'
  ) then
    return false;
  end if;

  if not public.worker_has_satisfied_payout_account(p_worker_id) then
    return false;
  end if;

  select t.cred_type into v_missing
  from unnest(public.worker_required_credential_types(v_worker.worker_role)) as t(cred_type)
  where not exists (
    select 1
    from public.credentials c
    where c.worker_id = p_worker_id
      and c.credential_type = t.cred_type
      and c.status = 'verified'
      and (c.expires_at is null or c.expires_at > now())
  )
  limit 1;

  return v_missing is null;
end;
$$;

revoke all on function public.worker_is_ready_for_final_approval(uuid) from public;
grant execute on function public.worker_is_ready_for_final_approval(uuid) to authenticated;

create or replace function public.verify_payout_account(
  p_payout_account_id uuid,
  p_decision text,
  p_reason_code text default null
)
returns public.payout_accounts
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.payout_accounts;
  v_decision text := lower(trim(p_decision));
  v_trimmed_reason text;
begin
  if auth.uid() is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  -- Phase 4: only platform_super_admin may approve/reject payout accounts.
  if not public.is_platform_admin('platform_super_admin') then
    raise exception 'NOT_AUTHORIZED';
  end if;

  if v_decision not in ('approve', 'reject') then
    raise exception 'INVALID_DECISION';
  end if;

  if p_reason_code is null or char_length(trim(p_reason_code)) = 0 then
    raise exception 'REASON_REQUIRED';
  end if;

  v_trimmed_reason := trim(p_reason_code);
  if char_length(v_trimmed_reason) > 2000 then
    raise exception 'REASON_TOO_LONG';
  end if;

  select * into v_row
  from public.payout_accounts
  where id = p_payout_account_id
  for update;

  if not found then
    raise exception 'PAYOUT_ACCOUNT_NOT_FOUND';
  end if;

  if v_decision = 'approve' then
    update public.payout_accounts
    set
      status = 'verified',
      verified_at = now(),
      last_verified_at = now(),
      updated_at = now()
    where id = v_row.id
    returning * into v_row;

    update public.payouts
    set
      payout_account_id = v_row.id,
      status = 'payment_instruction_ready',
      updated_at = now()
    where worker_id = v_row.worker_id
      and status = 'approved'
      and payout_account_id is null;
  else
    update public.payout_accounts
    set status = 'rejected', updated_at = now()
    where id = v_row.id
    returning * into v_row;
  end if;

  insert into public.payout_account_events (
    payout_account_id, event_type, reason_code, actor_user_id
  )
  values (
    v_row.id,
    'verify_' || v_decision,
    left(v_trimmed_reason, 200),
    auth.uid()
  );

  perform public.create_audit_event(
    null,
    'payout_account',
    v_row.id,
    'verify_payout_account_' || v_decision,
    jsonb_build_object('status', 'pending'),
    jsonb_build_object(
      'status', v_row.status,
      'decision', v_decision,
      'reason', left(v_trimmed_reason, 200)
    )
  );

  perform public.notify_credential_event(
    v_row.worker_id,
    'payout_account',
    case when v_decision = 'approve' then 'payout_approved' else 'payout_rejected' end,
    left(v_trimmed_reason, 200)
  );

  if v_decision = 'approve'
     and public.worker_is_ready_for_final_approval(v_row.worker_id) then
    perform public.notify_platform_admin_task(
      'admin_worker_ready_for_final_approval',
      'Worker ready for final approval',
      'All required documents and the payout account are approved.',
      jsonb_build_object('worker_id', v_row.worker_id)
    );
  end if;

  return v_row;
end;
$$;

revoke all on function public.verify_payout_account(uuid, text, text) from public;
grant execute on function public.verify_payout_account(uuid, text, text) to authenticated;

-- Sanitize submit_payout_account audit (no masked_iban in metadata).
create or replace function public.submit_payout_account(
  p_country text,
  p_currency text,
  p_masked_iban text
)
returns public.payout_accounts
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.payout_accounts;
begin
  if auth.uid() is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  if not exists (
    select 1 from public.worker_profiles where user_id = auth.uid()
  ) then
    raise exception 'WORKER_PROFILE_REQUIRED';
  end if;

  insert into public.payout_accounts (
    worker_id, country, currency, masked_iban, status
  )
  values (
    auth.uid(),
    upper(p_country),
    upper(p_currency),
    p_masked_iban,
    'pending'
  )
  on conflict (worker_id) do update
  set
    country = excluded.country,
    currency = excluded.currency,
    masked_iban = excluded.masked_iban,
    status = 'pending',
    verified_at = null,
    updated_at = now()
  where public.payout_accounts.status in ('pending', 'failed', 'rejected')
  returning * into v_row;

  if v_row.id is null then
    raise exception 'PAYOUT_ACCOUNT_LOCKED';
  end if;

  insert into public.payout_account_events (payout_account_id, event_type, actor_user_id)
  values (v_row.id, 'submitted', auth.uid());

  perform public.create_audit_event(
    null,
    'payout_account',
    v_row.id,
    'submit_payout_account',
    null,
    jsonb_build_object(
      'status', v_row.status,
      'country', v_row.country,
      'currency', v_row.currency
    )
  );

  return v_row;
end;
$$;

revoke all on function public.submit_payout_account(text, text, text) from public;
grant execute on function public.submit_payout_account(text, text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 19. Payout proof documents + IBAN validation (Phase 4).
-- Full IBAN is validated transiently and never persisted.
-- Proof lives in private bucket payout-proofs; only super_admin may review.
-- ---------------------------------------------------------------------------

alter table public.payout_accounts
  add column if not exists account_holder_name text,
  add column if not exists proof_storage_path text,
  add column if not exists proof_mime_type text,
  add column if not exists rejection_reason text;

alter table public.payout_accounts
  drop constraint if exists payout_accounts_holder_name_len;
alter table public.payout_accounts
  add constraint payout_accounts_holder_name_len
  check (
    account_holder_name is null
    or (
      char_length(trim(account_holder_name)) between 2 and 120
    )
  );

alter table public.payout_accounts
  drop constraint if exists payout_accounts_proof_mime;
alter table public.payout_accounts
  add constraint payout_accounts_proof_mime
  check (
    proof_mime_type is null
    or proof_mime_type in (
      'application/pdf',
      'image/jpeg',
      'image/png'
    )
  );

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'payout-proofs',
  'payout-proofs',
  false,
  10485760,
  array['application/pdf', 'image/jpeg', 'image/png']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Phase 4 RLS: worker own + platform_super_admin only (finance denied).
drop policy if exists "payout_accounts_select_own" on public.payout_accounts;
create policy "payout_accounts_select_own"
on public.payout_accounts for select to authenticated
using (
  worker_id = auth.uid()
  or public.is_platform_admin('platform_super_admin')
);

drop policy if exists "payout_accounts_update_platform_finance" on public.payout_accounts;
-- Direct client updates of protected review fields are blocked by trigger below.
-- Super-admin mutates via SECURITY DEFINER RPCs only.

drop policy if exists "payout_account_events_select_own" on public.payout_account_events;
create policy "payout_account_events_select_own"
on public.payout_account_events for select to authenticated
using (
  exists (
    select 1 from public.payout_accounts pa
    where pa.id = payout_account_events.payout_account_id
      and (
        pa.worker_id = auth.uid()
        or public.is_platform_admin('platform_super_admin')
      )
  )
);

-- Storage policies for payout-proofs
drop policy if exists "payout_proofs_storage_select_own" on storage.objects;
create policy "payout_proofs_storage_select_own"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'payout-proofs'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "payout_proofs_storage_select_super" on storage.objects;
create policy "payout_proofs_storage_select_super"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'payout-proofs'
  and public.is_platform_admin('platform_super_admin')
);

drop policy if exists "payout_proofs_storage_insert_own" on storage.objects;
create policy "payout_proofs_storage_insert_own"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'payout-proofs'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "payout_proofs_storage_update_own" on storage.objects;
create policy "payout_proofs_storage_update_own"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'payout-proofs'
  and (storage.foldername(name))[1] = auth.uid()::text
  and not exists (
    select 1
    from public.payout_accounts pa
    where pa.worker_id = auth.uid()
      and pa.proof_storage_path = name
      and pa.status not in ('pending', 'failed', 'rejected')
  )
)
with check (
  bucket_id = 'payout-proofs'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "payout_proofs_storage_delete_own" on storage.objects;
create policy "payout_proofs_storage_delete_own"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'payout-proofs'
  and (storage.foldername(name))[1] = auth.uid()::text
  and not exists (
    select 1
    from public.payout_accounts pa
    where pa.worker_id = auth.uid()
      and pa.proof_storage_path = name
      and pa.status not in ('pending', 'failed', 'rejected')
  )
);

-- IBAN normalize + mod-97 checksum. Never log or return the IBAN.
create or replace function public.normalize_iban(p_iban text)
returns text
language sql
immutable
as $$
  select upper(regexp_replace(coalesce(p_iban, ''), '\s+', '', 'g'));
$$;

create or replace function public.is_valid_iban(p_iban text)
returns boolean
language plpgsql
immutable
as $$
declare
  v_iban text := public.normalize_iban(p_iban);
  v_rearranged text;
  v_expanded text := '';
  v_ch text;
  v_code int;
  v_i int;
  v_mod numeric := 0;
begin
  if v_iban is null or char_length(v_iban) < 15 or char_length(v_iban) > 34 then
    return false;
  end if;
  if v_iban !~ '^[A-Z]{2}[0-9]{2}[A-Z0-9]+$' then
    return false;
  end if;

  v_rearranged := substr(v_iban, 5) || substr(v_iban, 1, 4);

  for v_i in 1..char_length(v_rearranged) loop
    v_ch := substr(v_rearranged, v_i, 1);
    if v_ch ~ '[0-9]' then
      v_expanded := v_expanded || v_ch;
    else
      v_code := ascii(v_ch) - 55; -- A=10
      v_expanded := v_expanded || v_code::text;
    end if;
  end loop;

  -- Incremental mod 97 to avoid oversized numerics on long IBANs.
  for v_i in 1..char_length(v_expanded) loop
    v_mod := (v_mod * 10 + substr(v_expanded, v_i, 1)::int) % 97;
  end loop;

  return v_mod = 1;
end;
$$;

create or replace function public.mask_iban(p_iban text)
returns text
language plpgsql
immutable
as $$
declare
  v_iban text := public.normalize_iban(p_iban);
begin
  if v_iban is null or char_length(v_iban) < 8 then
    raise exception 'INVALID_IBAN';
  end if;
  return substr(v_iban, 1, 2) || '••••' || right(v_iban, 4);
end;
$$;

revoke all on function public.normalize_iban(text) from public;
revoke all on function public.is_valid_iban(text) from public;
revoke all on function public.mask_iban(text) from public;
grant execute on function public.normalize_iban(text) to authenticated;
grant execute on function public.is_valid_iban(text) to authenticated;
grant execute on function public.mask_iban(text) to authenticated;

-- Prevent workers from forging verified status / reviewer fields.
create or replace function public.payout_accounts_guard_client_write()
returns trigger
language plpgsql
as $$
begin
  -- Seed/admin paths (no authenticated JWT) and SECURITY DEFINER RPCs may set verified.
  if auth.uid() is null
     or auth.role() is distinct from 'authenticated' then
    return new;
  end if;

  if current_setting('bridgehive.allow_payout_verify', true) = 'on'
     or current_setting('bridgehive.allow_payout_submit', true) = 'on' then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if new.status is distinct from 'pending' then
      raise exception 'PAYOUT_STATUS_LOCKED';
    end if;
    if new.verified_at is not null or new.last_verified_at is not null then
      raise exception 'PAYOUT_VERIFY_LOCKED';
    end if;
    return new;
  end if;

  if new.status is distinct from old.status
     or new.verified_at is distinct from old.verified_at
     or new.last_verified_at is distinct from old.last_verified_at
     or new.rejection_reason is distinct from old.rejection_reason then
    raise exception 'PAYOUT_STATUS_LOCKED';
  end if;

  -- Submitted (pending) or verified proofs cannot be silently replaced by clients.
  if new.proof_storage_path is distinct from old.proof_storage_path
     and old.status = 'verified' then
    raise exception 'PAYOUT_PROOF_LOCKED';
  end if;
  if new.proof_storage_path is distinct from old.proof_storage_path
     and old.status = 'pending'
     and old.proof_storage_path is not null then
    raise exception 'PAYOUT_PROOF_LOCKED';
  end if;

  return new;
end;
$$;

drop trigger if exists payout_accounts_guard_client_write on public.payout_accounts;
create trigger payout_accounts_guard_client_write
before insert or update on public.payout_accounts
for each row
execute function public.payout_accounts_guard_client_write();

-- Drop legacy masked-only submit signature; replace with full-IBAN validation submit.
drop function if exists public.submit_payout_account(text, text, text);

create or replace function public.submit_payout_account(
  p_country text,
  p_currency text,
  p_iban text,
  p_account_holder_name text,
  p_proof_storage_path text,
  p_proof_mime_type text
)
returns public.payout_accounts
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.payout_accounts;
  v_iban text;
  v_masked text;
  v_holder text;
  v_path text;
  v_mime text;
  v_was_rejected boolean := false;
begin
  if auth.uid() is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  if not exists (
    select 1 from public.worker_profiles where user_id = auth.uid()
  ) then
    raise exception 'WORKER_PROFILE_REQUIRED';
  end if;

  v_holder := trim(coalesce(p_account_holder_name, ''));
  if char_length(v_holder) < 2 or char_length(v_holder) > 120 then
    raise exception 'ACCOUNT_HOLDER_NAME_REQUIRED';
  end if;

  v_iban := public.normalize_iban(p_iban);
  if not public.is_valid_iban(v_iban) then
    raise exception 'INVALID_IBAN';
  end if;
  v_masked := public.mask_iban(v_iban);

  v_path := trim(coalesce(p_proof_storage_path, ''));
  v_mime := lower(trim(coalesce(p_proof_mime_type, '')));
  if v_path = '' or v_mime = '' then
    raise exception 'PAYOUT_PROOF_REQUIRED';
  end if;
  if v_mime not in ('application/pdf', 'image/jpeg', 'image/png') then
    raise exception 'PAYOUT_PROOF_INVALID_TYPE';
  end if;
  -- Path must be worker-owned relative object name (no bucket prefix).
  if split_part(v_path, '/', 1) is distinct from auth.uid()::text then
    raise exception 'PAYOUT_PROOF_PATH_INVALID';
  end if;
  if not exists (
    select 1 from storage.objects o
    where o.bucket_id = 'payout-proofs'
      and o.name = v_path
  ) then
    raise exception 'PAYOUT_PROOF_NOT_FOUND';
  end if;

  select status = 'rejected' into v_was_rejected
  from public.payout_accounts
  where worker_id = auth.uid();

  perform set_config('bridgehive.allow_payout_submit', 'on', true);

  insert into public.payout_accounts (
    worker_id,
    country,
    currency,
    masked_iban,
    account_holder_name,
    proof_storage_path,
    proof_mime_type,
    status,
    rejection_reason,
    verified_at,
    last_verified_at
  )
  values (
    auth.uid(),
    upper(trim(p_country)),
    upper(trim(p_currency)),
    v_masked,
    v_holder,
    v_path,
    v_mime,
    'pending',
    null,
    null,
    null
  )
  on conflict (worker_id) do update
  set
    country = excluded.country,
    currency = excluded.currency,
    masked_iban = excluded.masked_iban,
    account_holder_name = excluded.account_holder_name,
    proof_storage_path = excluded.proof_storage_path,
    proof_mime_type = excluded.proof_mime_type,
    status = 'pending',
    rejection_reason = null,
    verified_at = null,
    last_verified_at = null,
    updated_at = now()
  where public.payout_accounts.status in ('pending', 'failed', 'rejected')
  returning * into v_row;

  perform set_config('bridgehive.allow_payout_submit', 'off', true);

  if v_row.id is null then
    raise exception 'PAYOUT_ACCOUNT_LOCKED';
  end if;

  insert into public.payout_account_events (payout_account_id, event_type, actor_user_id)
  values (v_row.id, 'submitted', auth.uid());

  perform public.create_audit_event(
    null,
    'payout_account',
    v_row.id,
    'submit_payout_account',
    null,
    jsonb_build_object(
      'status', v_row.status,
      'country', v_row.country,
      'currency', v_row.currency,
      'has_proof', true
    )
  );

  perform public.notify_credential_event(
    v_row.worker_id,
    'payout_account',
    'payout_submitted',
    null
  );

  perform public.notify_super_admin_task(
    case
      when coalesce(v_was_rejected, false) then 'admin_payout_account_resubmitted'
      else 'admin_payout_account_pending'
    end,
    case
      when coalesce(v_was_rejected, false) then 'Resubmitted payout account awaiting approval'
      else 'Payout account awaiting approval'
    end,
    'A worker submitted a payout account for platform use approval.',
    jsonb_build_object('worker_id', v_row.worker_id)
  );

  return v_row;
end;
$$;

revoke all on function public.submit_payout_account(text, text, text, text, text, text) from public;
grant execute on function public.submit_payout_account(text, text, text, text, text, text) to authenticated;

-- Replace verify to persist rejection_reason and clear it on approve.
create or replace function public.verify_payout_account(
  p_payout_account_id uuid,
  p_decision text,
  p_reason_code text default null
)
returns public.payout_accounts
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.payout_accounts;
  v_decision text := lower(trim(p_decision));
  v_trimmed_reason text;
begin
  if auth.uid() is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  if not public.is_platform_admin('platform_super_admin') then
    raise exception 'NOT_AUTHORIZED';
  end if;

  if v_decision not in ('approve', 'reject') then
    raise exception 'INVALID_DECISION';
  end if;

  if p_reason_code is null or char_length(trim(p_reason_code)) = 0 then
    raise exception 'REASON_REQUIRED';
  end if;

  v_trimmed_reason := trim(p_reason_code);
  if char_length(v_trimmed_reason) > 2000 then
    raise exception 'REASON_TOO_LONG';
  end if;

  select * into v_row
  from public.payout_accounts
  where id = p_payout_account_id
  for update;

  if not found then
    raise exception 'PAYOUT_ACCOUNT_NOT_FOUND';
  end if;

  perform set_config('bridgehive.allow_payout_verify', 'on', true);

  if v_decision = 'approve' then
    update public.payout_accounts
    set
      status = 'verified',
      verified_at = now(),
      last_verified_at = now(),
      rejection_reason = null,
      updated_at = now()
    where id = v_row.id
    returning * into v_row;

    update public.payouts
    set
      payout_account_id = v_row.id,
      status = 'payment_instruction_ready',
      updated_at = now()
    where worker_id = v_row.worker_id
      and status = 'approved'
      and payout_account_id is null;
  else
    update public.payout_accounts
    set
      status = 'rejected',
      rejection_reason = left(v_trimmed_reason, 2000),
      updated_at = now()
    where id = v_row.id
    returning * into v_row;
  end if;

  perform set_config('bridgehive.allow_payout_verify', 'off', true);

  insert into public.payout_account_events (
    payout_account_id, event_type, reason_code, actor_user_id
  )
  values (
    v_row.id,
    'verify_' || v_decision,
    left(v_trimmed_reason, 200),
    auth.uid()
  );

  perform public.create_audit_event(
    null,
    'payout_account',
    v_row.id,
    'verify_payout_account_' || v_decision,
    jsonb_build_object('status', 'pending'),
    jsonb_build_object(
      'status', v_row.status,
      'decision', v_decision,
      'reason', left(v_trimmed_reason, 200)
    )
  );

  perform public.notify_credential_event(
    v_row.worker_id,
    'payout_account',
    case when v_decision = 'approve' then 'payout_approved' else 'payout_rejected' end,
    left(v_trimmed_reason, 200)
  );

  if v_decision = 'reject' then
    perform public.notify_credential_event(
      v_row.worker_id,
      'payout_account',
      'payout_resubmission_required',
      left(v_trimmed_reason, 200)
    );
  end if;

  if v_decision = 'approve'
     and public.worker_is_ready_for_final_approval(v_row.worker_id) then
    perform public.notify_platform_admin_task(
      'admin_worker_ready_for_final_approval',
      'Worker ready for final approval',
      'All required documents and the payout account are approved.',
      jsonb_build_object('worker_id', v_row.worker_id)
    );
  end if;

  return v_row;
end;
$$;

revoke all on function public.verify_payout_account(uuid, text, text) from public;
grant execute on function public.verify_payout_account(uuid, text, text) to authenticated;

-- Super-admin audited payout-proof view (no path/URL in metadata).
create or replace function public.audit_payout_proof_document_view(
  p_payout_account_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.payout_accounts;
begin
  if auth.uid() is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  if not public.is_platform_admin('platform_super_admin') then
    raise exception 'NOT_AUTHORIZED';
  end if;

  select * into v_row
  from public.payout_accounts
  where id = p_payout_account_id;

  if not found or v_row.proof_storage_path is null then
    raise exception 'PAYOUT_PROOF_NOT_FOUND';
  end if;

  perform public.create_audit_event(
    null,
    'payout_account',
    v_row.id,
    'view_payout_proof_document',
    null,
    jsonb_build_object('viewed_at', now())
  );
end;
$$;

revoke all on function public.audit_payout_proof_document_view(uuid) from public;
grant execute on function public.audit_payout_proof_document_view(uuid) to authenticated;

-- Notify only super admins for payout-review queue tasks.
create or replace function public.notify_super_admin_task(
  p_type text,
  p_title text,
  p_body text,
  p_data jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin record;
  v_safe jsonb;
begin
  v_safe := coalesce(p_data, '{}'::jsonb)
    - 'storage_path'
    - 'proof_storage_path'
    - 'signed_url'
    - 'masked_iban'
    - 'iban'
    - 'account_holder_name'
    - 'token'
    - 'access_token'
    - 'refresh_token'
    - 'password'
    - 'tax_id'
    - 'social_insurance_number'
    - 'filename';

  for v_admin in
    select r.user_id
    from public.platform_admin_roles r
    join public.profiles p on p.id = r.user_id
    where p.account_status = 'active'
      and r.role = 'platform_super_admin'
  loop
    insert into public.notifications (user_id, type, title, body, data)
    values (v_admin.user_id, p_type, p_title, p_body, v_safe);
  end loop;
end;
$$;

revoke all on function public.notify_super_admin_task(text, text, text, jsonb) from public;

-- Status-only payout view for verifiers (no IBAN / holder / proof path).
create or replace view public.payout_account_status_view
with (security_invoker = true)
as
select
  id,
  worker_id,
  status,
  created_at,
  updated_at,
  verified_at,
  rejection_reason,
  (proof_storage_path is not null) as has_proof
from public.payout_accounts;

revoke all on public.payout_account_status_view from public;
grant select on public.payout_account_status_view to authenticated;

drop policy if exists "payout_account_status_view_select" on public.payout_accounts;
-- View uses security_invoker against payout_accounts; grant verifier read of status
-- columns via SECURITY DEFINER helper instead.
create or replace function public.get_worker_payout_status(p_worker_id uuid)
returns table (
  id uuid,
  worker_id uuid,
  status public.payout_account_status,
  created_at timestamptz,
  updated_at timestamptz,
  verified_at timestamptz,
  rejection_reason text,
  has_proof boolean
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  if auth.uid() is distinct from p_worker_id
     and not public.is_platform_admin('platform_verifier')
     and not public.is_platform_admin('platform_super_admin') then
    raise exception 'NOT_AUTHORIZED';
  end if;

  return query
  select
    pa.id,
    pa.worker_id,
    pa.status,
    pa.created_at,
    pa.updated_at,
    pa.verified_at,
    pa.rejection_reason,
    (pa.proof_storage_path is not null) as has_proof
  from public.payout_accounts pa
  where pa.worker_id = p_worker_id;
end;
$$;

revoke all on function public.get_worker_payout_status(uuid) from public;
grant execute on function public.get_worker_payout_status(uuid) to authenticated;

create or replace function public.list_worker_payout_statuses()
returns table (
  worker_id uuid,
  status public.payout_account_status
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  if not public.is_platform_admin('platform_verifier')
     and not public.is_platform_admin('platform_super_admin') then
    raise exception 'NOT_AUTHORIZED';
  end if;

  return query
  select pa.worker_id, pa.status
  from public.payout_accounts pa;
end;
$$;

revoke all on function public.list_worker_payout_statuses() from public;
grant execute on function public.list_worker_payout_statuses() to authenticated;

-- ---------------------------------------------------------------------------
-- 40. Worker-centric verification applications (queue + package approve)
-- ---------------------------------------------------------------------------

create or replace function public.credential_has_uploaded_file(p_cred public.credentials)
returns boolean
language sql
immutable
as $$
  select p_cred.storage_path is not null
    or (
      p_cred.storage_paths is not null
      and jsonb_typeof(p_cred.storage_paths) = 'array'
      and jsonb_array_length(p_cred.storage_paths) > 0
    );
$$;

revoke all on function public.credential_has_uploaded_file(public.credentials) from public;
grant execute on function public.credential_has_uploaded_file(public.credentials) to authenticated;

-- Server-derived application status code (authoritative for admin queue).
create or replace function public.worker_verification_application_status(p_worker_id uuid)
returns text
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_worker public.worker_profiles;
  v_account public.account_status;
  v_required text[];
  v_cred_type text;
  v_best public.credentials;
  v_any_file boolean := false;
  v_all_files boolean := true;
  v_any_rejected boolean := false;
  v_any_under_review boolean := false;
  v_any_pending boolean := false;
  v_all_verified boolean := true;
  v_required_count int := 0;
  v_payout_status public.payout_account_status;
begin
  select * into v_worker from public.worker_profiles where user_id = p_worker_id;
  if not found then
    return null;
  end if;

  select account_status into v_account from public.profiles where id = p_worker_id;
  if v_account = 'suspended' or v_worker.verification_status = 'suspended' then
    return 'suspended';
  end if;

  if v_worker.verification_status = 'verified' then
    return 'approved_marketplace';
  end if;

  if v_worker.worker_role is null then
    if v_worker.onboarding_status = 'not_started' then
      return 'account_created';
    end if;
    return 'awaiting_documents';
  end if;

  v_required := public.worker_required_credential_types(v_worker.worker_role);
  v_required_count := coalesce(cardinality(v_required), 0);

  if v_required_count = 0 then
    return 'awaiting_documents';
  end if;

  foreach v_cred_type in array v_required loop
    select c.* into v_best
    from public.credentials c
    where c.worker_id = p_worker_id
      and c.credential_type = v_cred_type
    order by
      case c.status
        when 'verified' then 5
        when 'under_review' then 4
        when 'pending' then 3
        when 'rejected' then 2
        else 1
      end desc,
      c.updated_at desc nulls last
    limit 1;

    if not found or not public.credential_has_uploaded_file(v_best) then
      v_all_files := false;
      v_all_verified := false;
      continue;
    end if;

    v_any_file := true;

    if v_best.status = 'rejected' then
      v_any_rejected := true;
      v_all_verified := false;
    elsif v_best.status = 'under_review' then
      v_any_under_review := true;
      v_all_verified := false;
    elsif v_best.status = 'pending' then
      v_any_pending := true;
      v_all_verified := false;
    elsif v_best.status = 'verified'
          and (v_best.expires_at is null or v_best.expires_at > now()) then
      null;
    else
      v_all_verified := false;
    end if;
  end loop;

  if v_any_rejected then
    return 'corrections_required';
  end if;

  if not v_any_file then
    if v_worker.onboarding_status in ('not_started', 'in_progress') then
      return 'account_created';
    end if;
    return 'awaiting_documents';
  end if;

  if not v_all_files then
    return 'partially_uploaded';
  end if;

  -- All required files present.
  if v_all_verified then
    select pa.status into v_payout_status
    from public.payout_accounts pa
    where pa.worker_id = p_worker_id
    order by pa.updated_at desc nulls last
    limit 1;

    if v_payout_status = 'verified' then
      return 'ready_for_final_approval';
    end if;
    if v_payout_status = 'pending' then
      return 'payout_approval_pending';
    end if;
    if v_payout_status in ('rejected', 'failed') then
      return 'corrections_required';
    end if;
    return 'documents_approved_payout_required';
  end if;

  if v_any_under_review then
    return 'under_review';
  end if;

  if v_any_pending then
    if v_worker.verification_status = 'under_review' then
      return 'under_review';
    end if;
    if v_worker.verification_status = 'submitted' then
      return 'ready_for_review';
    end if;
    if v_worker.onboarding_status = 'completed' then
      return 'submitted';
    end if;
    return 'ready_to_submit';
  end if;

  return 'partially_uploaded';
end;
$$;

revoke all on function public.worker_verification_application_status(uuid) from public;
grant execute on function public.worker_verification_application_status(uuid) to authenticated;

create or replace function public.worker_application_last_activity(p_worker_id uuid)
returns timestamptz
language sql
stable
security definer
set search_path = public
as $$
  select greatest(
    coalesce((select updated_at from public.profiles where id = p_worker_id), '-infinity'::timestamptz),
    coalesce((select updated_at from public.worker_profiles where user_id = p_worker_id), '-infinity'::timestamptz),
    coalesce((select max(updated_at) from public.credentials where worker_id = p_worker_id), '-infinity'::timestamptz),
    coalesce((select max(updated_at) from public.payout_accounts where worker_id = p_worker_id), '-infinity'::timestamptz)
  );
$$;

revoke all on function public.worker_application_last_activity(uuid) from public;
grant execute on function public.worker_application_last_activity(uuid) to authenticated;

create or replace function public.list_verification_applications(
  p_search text default null,
  p_role public.worker_role default null,
  p_application_status text default null,
  p_payout_status public.payout_account_status default null,
  p_sort text default 'last_activity',
  p_limit int default 20,
  p_offset int default 0
)
returns table (
  worker_id uuid,
  application_ref text,
  full_name text,
  email text,
  phone text,
  worker_role public.worker_role,
  account_status public.account_status,
  onboarding_status public.onboarding_status,
  verification_status public.verification_status,
  application_status text,
  required_total int,
  awaiting_review_count int,
  approved_count int,
  rejected_count int,
  submitted_file_count int,
  payout_status public.payout_account_status,
  submitted_at timestamptz,
  last_activity_at timestamptz,
  total_count bigint
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_limit int := greatest(1, least(coalesce(p_limit, 20), 100));
  v_offset int := greatest(0, coalesce(p_offset, 0));
  v_sort text := lower(coalesce(nullif(trim(p_sort), ''), 'last_activity'));
  v_search text := nullif(trim(p_search), '');
begin
  if auth.uid() is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  if not (
    public.is_platform_admin('platform_support')
    or public.is_platform_admin('platform_verifier')
    or public.is_platform_admin('platform_super_admin')
  ) then
    raise exception 'NOT_AUTHORIZED';
  end if;

  if v_sort not in ('submitted_at', 'oldest_waiting', 'last_activity') then
    raise exception 'INVALID_SORT';
  end if;

  return query
  with base as (
    select
      wp.user_id as wid,
      left(replace(wp.user_id::text, '-', ''), 8) as app_ref,
      p.full_name as fname,
      u.email::text as em,
      p.phone as ph,
      wp.worker_role as wrole,
      p.account_status as astatus,
      wp.onboarding_status as ostatus,
      wp.verification_status as vstatus,
      public.worker_verification_application_status(wp.user_id) as app_status,
      coalesce(array_length(public.worker_required_credential_types(wp.worker_role), 1), 0) as req_total,
      (
        select count(*)::int
        from public.credentials c
        where c.worker_id = wp.user_id
          and public.credential_has_uploaded_file(c)
          and c.status in ('pending', 'under_review')
          and (
            wp.worker_role is null
            or c.credential_type = any (public.worker_required_credential_types(wp.worker_role))
          )
      ) as awaiting_cnt,
      (
        select count(*)::int
        from public.credentials c
        where c.worker_id = wp.user_id
          and c.status = 'verified'
          and (
            wp.worker_role is null
            or c.credential_type = any (public.worker_required_credential_types(wp.worker_role))
          )
      ) as approved_cnt,
      (
        select count(*)::int
        from public.credentials c
        where c.worker_id = wp.user_id
          and c.status = 'rejected'
          and (
            wp.worker_role is null
            or c.credential_type = any (public.worker_required_credential_types(wp.worker_role))
          )
      ) as rejected_cnt,
      (
        select count(*)::int
        from public.credentials c
        where c.worker_id = wp.user_id
          and public.credential_has_uploaded_file(c)
          and (
            wp.worker_role is null
            or c.credential_type = any (public.worker_required_credential_types(wp.worker_role))
          )
      ) as submitted_cnt,
      (
        select pa.status
        from public.payout_accounts pa
        where pa.worker_id = wp.user_id
        order by pa.updated_at desc nulls last
        limit 1
      ) as pay_status,
      coalesce(
        (
          select min(c.created_at)
          from public.credentials c
          where c.worker_id = wp.user_id
            and public.credential_has_uploaded_file(c)
        ),
        wp.created_at
      ) as sub_at,
      public.worker_application_last_activity(wp.user_id) as last_at
    from public.worker_profiles wp
    join public.profiles p on p.id = wp.user_id
    join auth.users u on u.id = wp.user_id
  ),
  filtered as (
    select *
    from base b
    where (p_role is null or b.wrole = p_role)
      and (p_application_status is null or b.app_status = p_application_status)
      and (p_payout_status is null or b.pay_status = p_payout_status)
      and (
        v_search is null
        or b.fname ilike '%' || v_search || '%'
        or b.em ilike '%' || v_search || '%'
        or coalesce(b.ph, '') ilike '%' || v_search || '%'
        or b.app_ref ilike '%' || v_search || '%'
        or b.wid::text ilike '%' || v_search || '%'
      )
  ),
  counted as (
    select f.*, count(*) over () as total
    from filtered f
  ),
  ordered as (
    select *
    from counted c
    order by
      case when v_sort = 'submitted_at' then c.sub_at end desc nulls last,
      case when v_sort = 'oldest_waiting' then c.sub_at end asc nulls last,
      case when v_sort = 'last_activity' then c.last_at end desc nulls last,
      c.wid
  )
  select
    o.wid,
    o.app_ref,
    o.fname,
    o.em,
    o.ph,
    o.wrole,
    o.astatus,
    o.ostatus,
    o.vstatus,
    o.app_status,
    o.req_total,
    o.awaiting_cnt,
    o.approved_cnt,
    o.rejected_cnt,
    o.submitted_cnt,
    o.pay_status,
    o.sub_at,
    o.last_at,
    o.total
  from ordered o
  limit v_limit
  offset v_offset;
end;
$$;

revoke all on function public.list_verification_applications(
  text, public.worker_role, text, public.payout_account_status, text, int, int
) from public;
grant execute on function public.list_verification_applications(
  text, public.worker_role, text, public.payout_account_status, text, int, int
) to authenticated;

create or replace function public.verification_application_dashboard_counts()
returns table (
  awaiting_documents bigint,
  ready_for_review bigint,
  under_review bigint,
  corrections_required bigint,
  payout_approval_pending bigint,
  ready_for_final_approval bigint,
  suspended bigint
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  if not (
    public.is_platform_admin('platform_support')
    or public.is_platform_admin('platform_verifier')
    or public.is_platform_admin('platform_super_admin')
  ) then
    raise exception 'NOT_AUTHORIZED';
  end if;

  return query
  with statuses as (
    select public.worker_verification_application_status(wp.user_id) as app_status
    from public.worker_profiles wp
  )
  select
    count(*) filter (where s.app_status in ('account_created', 'awaiting_documents'))::bigint,
    count(*) filter (where s.app_status in ('ready_for_review', 'submitted', 'ready_to_submit'))::bigint,
    count(*) filter (where s.app_status = 'under_review')::bigint,
    count(*) filter (where s.app_status = 'corrections_required')::bigint,
    count(*) filter (where s.app_status = 'payout_approval_pending')::bigint,
    count(*) filter (where s.app_status = 'ready_for_final_approval')::bigint,
    count(*) filter (where s.app_status = 'suspended')::bigint
  from statuses s;
end;
$$;

revoke all on function public.verification_application_dashboard_counts() from public;
grant execute on function public.verification_application_dashboard_counts() to authenticated;

-- Transactional package approve for selected eligible credentials of one worker.
create or replace function public.approve_reviewed_worker_credentials(
  p_worker_id uuid,
  p_credential_ids uuid[],
  p_confirm_reviewed boolean,
  p_expected_last_activity timestamptz default null
)
returns setof public.credentials
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_cred public.credentials;
  v_old_status public.credential_status;
  v_current_activity timestamptz;
  v_ids uuid[];
  v_seen uuid[] := '{}';
begin
  if auth.uid() is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  if not public.is_platform_admin('platform_verifier') then
    raise exception 'NOT_AUTHORIZED';
  end if;

  if p_worker_id is null then
    raise exception 'WORKER_REQUIRED';
  end if;

  if p_worker_id = auth.uid() then
    raise exception 'CANNOT_SELF_VERIFY';
  end if;

  if coalesce(p_confirm_reviewed, false) is not true then
    raise exception 'CONFIRMATION_REQUIRED';
  end if;

  v_ids := coalesce(p_credential_ids, '{}');
  if cardinality(v_ids) = 0 then
    raise exception 'NO_CREDENTIALS_SELECTED';
  end if;

  v_current_activity := public.worker_application_last_activity(p_worker_id);
  if p_expected_last_activity is not null
     and v_current_activity is distinct from p_expected_last_activity then
    raise exception 'APPLICATION_CHANGED';
  end if;

  -- Lock all target rows first; fail closed if any ID is invalid.
  foreach v_id in array v_ids loop
    if v_id = any (v_seen) then
      continue;
    end if;
    v_seen := array_append(v_seen, v_id);

    select * into v_cred
    from public.credentials
    where id = v_id
    for update;

    if not found then
      raise exception 'CREDENTIAL_NOT_FOUND:%', v_id;
    end if;

    if v_cred.worker_id is distinct from p_worker_id then
      raise exception 'CREDENTIAL_WORKER_MISMATCH';
    end if;

    if v_cred.worker_id = auth.uid() then
      raise exception 'CANNOT_SELF_VERIFY';
    end if;

    if v_cred.status not in ('pending', 'under_review') then
      raise exception 'INELIGIBLE_CREDENTIAL:%', v_cred.id;
    end if;

    if not public.credential_has_uploaded_file(v_cred) then
      raise exception 'FILE_REQUIRED:%', v_cred.id;
    end if;

    if v_cred.expires_at is not null and v_cred.expires_at <= now() then
      raise exception 'CREDENTIAL_EXPIRED:%', v_cred.id;
    end if;
  end loop;

  foreach v_id in array v_seen loop
    select * into v_cred
    from public.credentials
    where id = v_id
    for update;

    v_old_status := v_cred.status;

    perform set_config('bridgehive.allow_platform_verify', 'on', true);

    update public.credentials
    set
      status = 'verified',
      verified_by = auth.uid(),
      verified_at = now(),
      rejection_reason = null,
      updated_at = now()
    where id = v_cred.id
    returning * into v_cred;

    perform set_config('bridgehive.allow_platform_verify', 'off', true);

    perform public.create_audit_event(
      null,
      'credential',
      v_cred.id,
      'verify_credential_approve',
      jsonb_build_object('status', v_old_status, 'package_approve', true),
      jsonb_build_object(
        'credential_type', v_cred.credential_type,
        'status', v_cred.status,
        'expires_at', v_cred.expires_at,
        'verified_at', v_cred.verified_at,
        'worker_id', p_worker_id
      )
    );

    perform public.notify_credential_event(
      v_cred.worker_id,
      v_cred.credential_type,
      'verified',
      null
    );

    return next v_cred;
  end loop;

  -- Never auto-verify the worker.
  if public.worker_is_ready_for_final_approval(p_worker_id) then
    perform public.notify_platform_admin_task(
      'admin_worker_ready_for_final_approval',
      'Worker ready for final approval',
      'All required documents and the payout account are approved.',
      jsonb_build_object('worker_id', p_worker_id)
    );
  end if;

  return;
end;
$$;

revoke all on function public.approve_reviewed_worker_credentials(
  uuid, uuid[], boolean, timestamptz
) from public;
grant execute on function public.approve_reviewed_worker_credentials(
  uuid, uuid[], boolean, timestamptz
) to authenticated;

create or replace function public.mark_credentials_under_review(
  p_worker_id uuid,
  p_credential_ids uuid[]
)
returns setof public.credentials
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_cred public.credentials;
begin
  if auth.uid() is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  if not public.is_platform_admin('platform_verifier') then
    raise exception 'NOT_AUTHORIZED';
  end if;

  if p_worker_id = auth.uid() then
    raise exception 'CANNOT_SELF_VERIFY';
  end if;

  foreach v_id in array coalesce(p_credential_ids, '{}') loop
    select * into v_cred
    from public.credentials
    where id = v_id
    for update;

    if not found then
      raise exception 'CREDENTIAL_NOT_FOUND';
    end if;

    if v_cred.worker_id is distinct from p_worker_id then
      raise exception 'CREDENTIAL_WORKER_MISMATCH';
    end if;

    if v_cred.status <> 'pending' then
      continue;
    end if;

    if not public.credential_has_uploaded_file(v_cred) then
      raise exception 'FILE_REQUIRED';
    end if;

    perform set_config('bridgehive.allow_platform_verify', 'on', true);
    update public.credentials
    set status = 'under_review', updated_at = now()
    where id = v_cred.id
    returning * into v_cred;
    perform set_config('bridgehive.allow_platform_verify', 'off', true);

    perform public.create_audit_event(
      null,
      'credential',
      v_cred.id,
      'submit_credential_for_review',
      jsonb_build_object('status', 'pending'),
      jsonb_build_object(
        'credential_type', v_cred.credential_type,
        'status', v_cred.status,
        'worker_id', p_worker_id
      )
    );

    return next v_cred;
  end loop;

  return;
end;
$$;

revoke all on function public.mark_credentials_under_review(uuid, uuid[]) from public;
grant execute on function public.mark_credentials_under_review(uuid, uuid[]) to authenticated;
