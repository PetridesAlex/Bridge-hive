-- 026_physiotherapist_requirements.sql
-- Physiotherapist checklist (owner-confirmed product requirement: seven documents —
-- not a statutory claim), role allowlists, expiry helper, empty-set fail-closed,
-- and worker_role freeze on client updates.
-- Depends on 025 having committed the physiotherapist enum value.

-- ---------------------------------------------------------------------------
-- 1. Expiry helper (annual practising licence requires known future expires_at)
-- ---------------------------------------------------------------------------

create or replace function public.credential_expiry_is_valid(
  p_credential_type text,
  p_expires_at timestamptz,
  p_now timestamptz default now()
)
returns boolean
language sql
immutable
set search_path = public
as $$
  select case
    when p_credential_type = 'physiotherapy_practising_licence' then
      p_expires_at is not null and p_expires_at > p_now
    else
      p_expires_at is null or p_expires_at > p_now
  end;
$$;

revoke all on function public.credential_expiry_is_valid(text, timestamptz, timestamptz) from public;
grant execute on function public.credential_expiry_is_valid(text, timestamptz, timestamptz) to authenticated;

comment on function public.credential_expiry_is_valid(text, timestamptz, timestamptz) is
  'True when credential expiry metadata satisfies role rules. physiotherapy_practising_licence requires a known future expires_at (Europe/Nicosia end-of-day stored by clients).';

-- ---------------------------------------------------------------------------
-- 2. Role credential checklists (RN/Ward unchanged; physiotherapist added)
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

    union all

    select * from (
      values
        ('identity_document_front'::text, true, 1),
        ('identity_document_back', true, 2),
        ('physiotherapy_degree', true, 3),
        ('physiotherapist_registration_certificate', true, 4),
        ('physiotherapy_practising_licence', true, 5),
        ('tax_identification_proof', true, 6),
        ('social_insurance_proof', true, 7)
    ) as t(credential_type, is_required, sort_order)
    where p_worker_role = 'physiotherapist'
  ) req
  order by sort_order;
$$;

revoke all on function public.worker_credential_requirements(public.worker_role) from public;
grant execute on function public.worker_credential_requirements(public.worker_role) to authenticated;

-- ---------------------------------------------------------------------------
-- 3. Freeze worker_role after insert (no self-service conversion)
-- ---------------------------------------------------------------------------

create or replace function public.worker_profiles_guard_role()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'UPDATE'
     and new.worker_role is distinct from old.worker_role
     and current_setting('bridgehive.allow_platform_verify', true) is distinct from 'on' then
    raise exception 'WORKER_ROLE_LOCKED';
  end if;
  return new;
end;
$$;

drop trigger if exists worker_profiles_guard_role on public.worker_profiles;
create trigger worker_profiles_guard_role
before update on public.worker_profiles
for each row
execute function public.worker_profiles_guard_role();

-- ---------------------------------------------------------------------------
-- 4. ensure_my_worker_profile — accept physiotherapist metadata
-- ---------------------------------------------------------------------------

create or replace function public.ensure_my_worker_profile(
  p_worker_role public.worker_role default null,
  p_bio text default null
)
returns public.worker_profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_role public.worker_role;
  v_meta_role text;
  v_row public.worker_profiles;
begin
  if v_uid is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  select * into v_row
  from public.worker_profiles
  where user_id = v_uid;

  if found then
    return v_row;
  end if;

  v_role := p_worker_role;
  if v_role is null then
    v_meta_role := coalesce(
      auth.jwt() -> 'user_metadata' ->> 'worker_role',
      auth.jwt() -> 'app_metadata' ->> 'worker_role'
    );
    if v_meta_role in ('registered_nurse', 'ward_assistant', 'physiotherapist') then
      v_role := v_meta_role::public.worker_role;
    end if;
  end if;

  if v_role is null then
    raise exception 'WORKER_ROLE_REQUIRED';
  end if;

  insert into public.worker_profiles (
    user_id,
    worker_role,
    bio,
    onboarding_status,
    verification_status
  )
  values (
    v_uid,
    v_role,
    nullif(trim(coalesce(p_bio, '')), ''),
    'in_progress',
    'draft'
  )
  returning * into v_row;

  return v_row;
end;
$$;

revoke all on function public.ensure_my_worker_profile(public.worker_role, text) from public;
grant execute on function public.ensure_my_worker_profile(public.worker_role, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 5. submit_worker_verification_package — empty set fail-closed + expiry
-- ---------------------------------------------------------------------------

create or replace function public.submit_worker_verification_package()
returns public.worker_profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_worker public.worker_profiles;
  v_required text[];
  v_cred_type text;
  v_has_file boolean;
  v_status public.credential_status;
  v_cred_id uuid;
  v_expires_at timestamptz;
  v_already_notified boolean;
begin
  if v_uid is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  select * into v_worker
  from public.worker_profiles
  where user_id = v_uid
  for update;

  if not found then
    raise exception 'WORKER_PROFILE_REQUIRED';
  end if;

  if v_worker.worker_role is null then
    raise exception 'WORKER_ROLE_REQUIRED';
  end if;

  if v_worker.verification_status in ('verified', 'suspended') then
    raise exception 'PACKAGE_NOT_SUBMITTABLE';
  end if;

  if not exists (
    select 1 from public.profiles p
    where p.id = v_uid and p.account_status = 'active'
  ) then
    raise exception 'ACCOUNT_NOT_ACTIVE';
  end if;

  v_required := public.worker_required_credential_types(v_worker.worker_role);

  if coalesce(cardinality(v_required), 0) = 0 then
    raise exception 'CREDENTIAL_REQUIREMENTS_MISSING';
  end if;

  foreach v_cred_type in array v_required
  loop
    select
      c.id,
      c.status,
      c.expires_at,
      (
        coalesce(nullif(trim(coalesce(c.storage_path, '')), ''), '') <> ''
        or (
          jsonb_typeof(coalesce(c.storage_paths, '[]'::jsonb)) = 'array'
          and jsonb_array_length(coalesce(c.storage_paths, '[]'::jsonb)) > 0
        )
      )
    into v_cred_id, v_status, v_expires_at, v_has_file
    from public.credentials c
    where c.worker_id = v_uid
      and c.credential_type = v_cred_type
    order by c.updated_at desc nulls last
    limit 1;

    if v_cred_id is null or not v_has_file then
      raise exception 'MISSING_REQUIRED_CREDENTIAL:%', v_cred_type;
    end if;

    if not public.credential_expiry_is_valid(v_cred_type, v_expires_at) then
      raise exception 'CREDENTIAL_EXPIRY_REQUIRED:%', v_cred_type;
    end if;

    if v_status = 'pending' then
      perform public.submit_credential_for_review(v_cred_id);
    elsif v_status not in ('under_review', 'verified') then
      raise exception 'CREDENTIAL_NOT_READY:%', v_cred_type;
    end if;
  end loop;

  perform set_config('bridgehive.allow_platform_verify', 'on', true);

  update public.worker_profiles
  set
    onboarding_status = 'completed',
    verification_status = case
      when verification_status in ('draft', 'rejected', 'submitted', 'under_review')
        then 'submitted'::public.verification_status
      else verification_status
    end,
    updated_at = now()
  where user_id = v_uid
  returning * into v_worker;

  perform set_config('bridgehive.allow_platform_verify', 'off', true);

  select exists (
    select 1
    from public.notifications n
    where n.type = 'admin_worker_package_submitted'
      and n.data->>'worker_id' = v_uid::text
      and n.created_at > now() - interval '24 hours'
  )
  into v_already_notified;

  if not v_already_notified then
    perform public.notify_platform_admin_task(
      'admin_worker_package_submitted',
      'Worker package ready for review',
      'A worker submitted their verification package for platform review.',
      jsonb_build_object(
        'worker_id', v_uid,
        'worker_role', v_worker.worker_role,
        'verification_status', v_worker.verification_status
      )
    );
  end if;

  perform public.create_audit_event(
    null,
    'worker_profile',
    v_uid,
    'verification_package_submitted',
    null,
    jsonb_build_object(
      'verification_status', v_worker.verification_status,
      'worker_role', v_worker.worker_role
    )
  );

  return v_worker;
end;
$$;

revoke all on function public.submit_worker_verification_package() from public;
grant execute on function public.submit_worker_verification_package() to authenticated;

-- ---------------------------------------------------------------------------
-- 6. Eligibility / final approval / verification — use expiry helper + fail-closed
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
  v_required text[];
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

  if public.worker_has_overdue_commission(p_worker_id) then
    return 'billing_restricted';
  end if;

  if v_worker.worker_role is distinct from v_shift.required_role then
    return 'role_mismatch';
  end if;

  if v_worker.worker_role is not null then
    v_required := public.worker_required_credential_types(v_worker.worker_role);
    if coalesce(cardinality(v_required), 0) = 0 then
      return 'missing_credential:requirements';
    end if;

    select t.cred_type into v_missing
    from unnest(v_required) as t(cred_type)
    where not exists (
      select 1
      from public.credentials c
      where c.worker_id = p_worker_id
        and c.credential_type = t.cred_type
        and c.status = 'verified'
        and public.credential_expiry_is_valid(c.credential_type, c.expires_at)
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
        and public.credential_expiry_is_valid(c.credential_type, c.expires_at)
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

revoke all on function public.check_worker_eligibility(uuid, uuid) from public;
grant execute on function public.check_worker_eligibility(uuid, uuid) to authenticated;

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
  v_required text[];
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

  v_required := public.worker_required_credential_types(v_worker.worker_role);
  if coalesce(cardinality(v_required), 0) = 0 then
    return false;
  end if;

  select t.cred_type into v_missing
  from unnest(v_required) as t(cred_type)
  where not exists (
    select 1
    from public.credentials c
    where c.worker_id = p_worker_id
      and c.credential_type = t.cred_type
      and c.status = 'verified'
      and public.credential_expiry_is_valid(c.credential_type, c.expires_at)
  )
  limit 1;

  return v_missing is null;
end;
$$;

revoke all on function public.worker_is_ready_for_final_approval(uuid) from public;
grant execute on function public.worker_is_ready_for_final_approval(uuid) to authenticated;


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

    if coalesce(cardinality(v_required), 0) = 0 then
      raise exception 'CREDENTIAL_REQUIREMENTS_MISSING';
    end if;

    select t.cred_type into v_missing
    from unnest(v_required) as t(cred_type)
    where not exists (
      select 1
      from public.credentials c
      where c.worker_id = p_worker_id
        and c.credential_type = t.cred_type
        and c.status = 'verified'
        and public.credential_expiry_is_valid(c.credential_type, c.expires_at)
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

revoke all on function public.set_worker_verification(uuid, public.verification_status, text) from public;
grant execute on function public.set_worker_verification(uuid, public.verification_status, text) to authenticated;

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
    if not public.credential_has_uploaded_file(v_cred) then
      raise exception 'FILE_REQUIRED';
    end if;
    if not public.credential_expiry_is_valid(v_cred.credential_type, v_cred.expires_at) then
      raise exception 'CREDENTIAL_EXPIRED';
    end if;
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

revoke all on function public.verify_credential(uuid, text, text) from public;
grant execute on function public.verify_credential(uuid, text, text) to authenticated;

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

    if not public.credential_expiry_is_valid(v_cred.credential_type, v_cred.expires_at) then
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
          and public.credential_expiry_is_valid(v_best.credential_type, v_best.expires_at) then
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

-- ---------------------------------------------------------------------------
-- 7. Bulk shift creation — allow physiotherapist required_role
-- ---------------------------------------------------------------------------

create or replace function public.create_shifts_batch(
  p_organization_id uuid,
  p_request_key text,
  p_requested_status text,
  p_creation_mode text,
  p_shifts jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_status text := lower(trim(coalesce(p_requested_status, '')));
  v_mode text := lower(trim(coalesce(p_creation_mode, '')));
  v_key text := trim(coalesce(p_request_key, ''));
  v_count integer;
  v_payload_hash text;
  v_existing public.shift_creation_batches;
  v_batch_id uuid;
  v_shift_ids uuid[] := array[]::uuid[];
  v_row jsonb;
  v_idx integer;
  v_location_id uuid;
  v_ward_id uuid;
  v_required_role text;
  v_starts_at timestamptz;
  v_ends_at timestamptz;
  v_break_minutes integer;
  v_rate_minor integer;
  v_currency text;
  v_deadline timestamptz;
  v_title text;
  v_notes text;
  v_requirements jsonb;
  v_shift_id uuid;
  v_req jsonb;
  v_loc_org uuid;
begin
  if v_uid is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  if p_organization_id is null then
    raise exception 'ORG_REQUIRED';
  end if;

  if not public.has_org_role(
    p_organization_id,
    array['org_admin'::public.org_role, 'org_scheduler'::public.org_role]
  ) then
    raise exception 'NOT_AUTHORIZED';
  end if;

  if v_status not in ('draft', 'published') then
    raise exception 'INVALID_REQUESTED_STATUS';
  end if;

  if v_mode not in ('repeat', 'individual', 'custom') then
    raise exception 'INVALID_CREATION_MODE';
  end if;

  if char_length(v_key) = 0 or char_length(v_key) > 128 then
    raise exception 'INVALID_REQUEST_KEY';
  end if;

  if p_shifts is null or jsonb_typeof(p_shifts) <> 'array' then
    raise exception 'SHIFTS_REQUIRED';
  end if;

  -- Cap payload size (~256 KiB) to bound memory/CPU.
  if octet_length(p_shifts::text) > 262144 then
    raise exception 'PAYLOAD_TOO_LARGE';
  end if;

  v_count := jsonb_array_length(p_shifts);
  if v_count < 2 then
    raise exception 'BATCH_TOO_SMALL';
  end if;
  if v_count > 100 then
    raise exception 'BATCH_TOO_LARGE';
  end if;

  if v_status = 'published'
     and not public.organization_is_operational(p_organization_id) then
    raise exception 'ORG_NOT_ACTIVE';
  end if;

  v_payload_hash := md5(
    p_organization_id::text
    || '|' || v_status
    || '|' || v_mode
    || '|' || p_shifts::text
  );

  select * into v_existing
  from public.shift_creation_batches
  where organization_id = p_organization_id
    and request_key = v_key;

  if found then
    if v_existing.payload_hash is distinct from v_payload_hash then
      raise exception 'REQUEST_KEY_CONFLICT';
    end if;

    select coalesce(array_agg(s.id order by s.created_at, s.id), array[]::uuid[])
    into v_shift_ids
    from public.shifts s
    where s.creation_batch_id = v_existing.id;

    return jsonb_build_object(
      'batch_id', v_existing.id,
      'shift_ids', to_jsonb(v_shift_ids),
      'shift_count', v_existing.shift_count,
      'requested_status', v_existing.requested_status,
      'creation_mode', v_existing.creation_mode,
      'idempotent_replay', true
    );
  end if;

  -- Validate every row before any insert (all-or-nothing).
  for v_idx in 0 .. (v_count - 1) loop
    v_row := p_shifts -> v_idx;

    if v_row is null or jsonb_typeof(v_row) <> 'object' then
      raise exception 'BULK_ROW_ERROR' using
        detail = format('rowIndex=%s field=row message=Invalid shift row', v_idx);
    end if;

    begin
      v_location_id := (v_row ->> 'location_id')::uuid;
    exception when others then
      raise exception 'BULK_ROW_ERROR' using
        detail = format('rowIndex=%s field=location_id message=Invalid location', v_idx);
    end;

    if v_location_id is null then
      raise exception 'BULK_ROW_ERROR' using
        detail = format('rowIndex=%s field=location_id message=Location is required', v_idx);
    end if;

    select organization_id into v_loc_org
    from public.locations
    where id = v_location_id;

    if v_loc_org is null or v_loc_org <> p_organization_id then
      raise exception 'BULK_ROW_ERROR' using
        detail = format(
          'rowIndex=%s field=location_id message=Location not found in this organization',
          v_idx
        );
    end if;

    v_ward_id := null;
    if v_row ? 'ward_id'
       and v_row ->> 'ward_id' is not null
       and trim(v_row ->> 'ward_id') <> ''
       and lower(v_row ->> 'ward_id') <> 'null' then
      begin
        v_ward_id := (v_row ->> 'ward_id')::uuid;
      exception when others then
        raise exception 'BULK_ROW_ERROR' using
          detail = format('rowIndex=%s field=ward_id message=Invalid ward', v_idx);
      end;

      if not exists (
        select 1
        from public.wards w
        join public.locations l on l.id = w.location_id
        where w.id = v_ward_id
          and l.id = v_location_id
          and l.organization_id = p_organization_id
      ) then
        raise exception 'BULK_ROW_ERROR' using
          detail = format(
            'rowIndex=%s field=ward_id message=Ward does not belong to this location',
            v_idx
          );
      end if;
    end if;

    v_required_role := trim(coalesce(v_row ->> 'required_role', ''));
    if v_required_role not in ('registered_nurse', 'ward_assistant', 'physiotherapist') then
      raise exception 'BULK_ROW_ERROR' using
        detail = format(
          'rowIndex=%s field=required_role message=Select a valid worker role',
          v_idx
        );
    end if;

    begin
      v_starts_at := (v_row ->> 'starts_at')::timestamptz;
      v_ends_at := (v_row ->> 'ends_at')::timestamptz;
    exception when others then
      raise exception 'BULK_ROW_ERROR' using
        detail = format('rowIndex=%s field=starts_at message=Invalid start or end time', v_idx);
    end;

    if v_starts_at is null or v_ends_at is null then
      raise exception 'BULK_ROW_ERROR' using
        detail = format('rowIndex=%s field=starts_at message=Start and end times are required', v_idx);
    end if;

    if v_ends_at <= v_starts_at then
      raise exception 'BULK_ROW_ERROR' using
        detail = format('rowIndex=%s field=ends_at message=End must be after start', v_idx);
    end if;

    begin
      v_break_minutes := coalesce((v_row ->> 'break_minutes')::integer, 0);
    exception when others then
      raise exception 'BULK_ROW_ERROR' using
        detail = format('rowIndex=%s field=break_minutes message=Invalid break minutes', v_idx);
    end;

    if v_break_minutes < 0 then
      raise exception 'BULK_ROW_ERROR' using
        detail = format('rowIndex=%s field=break_minutes message=Break minutes cannot be negative', v_idx);
    end if;

    begin
      v_rate_minor := (v_row ->> 'rate_minor')::integer;
    exception when others then
      raise exception 'BULK_ROW_ERROR' using
        detail = format('rowIndex=%s field=rate_minor message=Invalid hourly rate', v_idx);
    end;

    if v_rate_minor is null or v_rate_minor <= 0 then
      raise exception 'BULK_ROW_ERROR' using
        detail = format('rowIndex=%s field=rate_minor message=Hourly rate must be positive', v_idx);
    end if;

    v_currency := upper(trim(coalesce(nullif(v_row ->> 'currency', ''), 'EUR')));
    if char_length(v_currency) <> 3 then
      raise exception 'BULK_ROW_ERROR' using
        detail = format('rowIndex=%s field=currency message=Invalid currency', v_idx);
    end if;

    v_deadline := null;
    if v_row ? 'acceptance_deadline'
       and v_row ->> 'acceptance_deadline' is not null
       and trim(v_row ->> 'acceptance_deadline') <> ''
       and lower(v_row ->> 'acceptance_deadline') <> 'null' then
      begin
        v_deadline := (v_row ->> 'acceptance_deadline')::timestamptz;
      exception when others then
        raise exception 'BULK_ROW_ERROR' using
          detail = format(
            'rowIndex=%s field=acceptance_deadline message=Invalid acceptance deadline',
            v_idx
          );
      end;

      if v_deadline >= v_starts_at then
        raise exception 'BULK_ROW_ERROR' using
          detail = format(
            'rowIndex=%s field=acceptance_deadline message=Deadline must be before shift start',
            v_idx
          );
      end if;

      if v_status = 'published' and v_deadline <= now() then
        raise exception 'BULK_ROW_ERROR' using
          detail = format(
            'rowIndex=%s field=acceptance_deadline message=Deadline must be in the future to publish',
            v_idx
          );
      end if;
    end if;

    if v_status = 'published' and v_ends_at <= now() then
      raise exception 'BULK_ROW_ERROR' using
        detail = format(
          'rowIndex=%s field=ends_at message=Cannot publish a shift that has already ended',
          v_idx
        );
    end if;

    v_title := nullif(trim(coalesce(v_row ->> 'title', '')), '');
    if v_title is not null and char_length(v_title) > 200 then
      raise exception 'BULK_ROW_ERROR' using
        detail = format('rowIndex=%s field=title message=Title is too long', v_idx);
    end if;

    v_notes := nullif(trim(coalesce(v_row ->> 'notes', '')), '');
    if v_notes is not null and char_length(v_notes) > 4000 then
      raise exception 'BULK_ROW_ERROR' using
        detail = format('rowIndex=%s field=notes message=Notes are too long', v_idx);
    end if;
  end loop;

  insert into public.shift_creation_batches (
    organization_id,
    created_by,
    request_key,
    creation_mode,
    requested_status,
    shift_count,
    payload_hash
  )
  values (
    p_organization_id,
    v_uid,
    v_key,
    v_mode,
    v_status,
    v_count,
    v_payload_hash
  )
  returning id into v_batch_id;

  for v_idx in 0 .. (v_count - 1) loop
    v_row := p_shifts -> v_idx;
    v_location_id := (v_row ->> 'location_id')::uuid;
    v_ward_id := null;
    if v_row ? 'ward_id'
       and v_row ->> 'ward_id' is not null
       and trim(v_row ->> 'ward_id') <> ''
       and lower(v_row ->> 'ward_id') <> 'null' then
      v_ward_id := (v_row ->> 'ward_id')::uuid;
    end if;
    v_required_role := trim(v_row ->> 'required_role');
    v_starts_at := (v_row ->> 'starts_at')::timestamptz;
    v_ends_at := (v_row ->> 'ends_at')::timestamptz;
    v_break_minutes := coalesce((v_row ->> 'break_minutes')::integer, 0);
    v_rate_minor := (v_row ->> 'rate_minor')::integer;
    v_currency := upper(trim(coalesce(nullif(v_row ->> 'currency', ''), 'EUR')));
    v_deadline := null;
    if v_row ? 'acceptance_deadline'
       and v_row ->> 'acceptance_deadline' is not null
       and trim(v_row ->> 'acceptance_deadline') <> ''
       and lower(v_row ->> 'acceptance_deadline') <> 'null' then
      v_deadline := (v_row ->> 'acceptance_deadline')::timestamptz;
    end if;
    v_title := nullif(trim(coalesce(v_row ->> 'title', '')), '');
    v_notes := nullif(trim(coalesce(v_row ->> 'notes', '')), '');
    v_requirements := case
      when jsonb_typeof(v_row -> 'requirements') = 'array' then v_row -> 'requirements'
      else '[]'::jsonb
    end;

    insert into public.shifts (
      organization_id,
      location_id,
      ward_id,
      required_role,
      starts_at,
      ends_at,
      break_minutes,
      rate_minor,
      currency,
      status,
      acceptance_deadline,
      title,
      notes,
      created_by,
      creation_batch_id
    )
    values (
      p_organization_id,
      v_location_id,
      v_ward_id,
      v_required_role::public.worker_role,
      v_starts_at,
      v_ends_at,
      v_break_minutes,
      v_rate_minor,
      v_currency,
      'draft',
      v_deadline,
      v_title,
      v_notes,
      v_uid,
      v_batch_id
    )
    returning id into v_shift_id;

    for v_req in select * from jsonb_array_elements(v_requirements)
    loop
      if jsonb_typeof(v_req) = 'object'
         and nullif(trim(coalesce(v_req ->> 'requirement_type', '')), '') is not null then
        insert into public.shift_requirements (shift_id, requirement_type, required)
        values (
          v_shift_id,
          trim(v_req ->> 'requirement_type'),
          coalesce((v_req ->> 'required')::boolean, true)
        )
        on conflict (shift_id, requirement_type) do nothing;
      end if;
    end loop;

    if v_status = 'published' then
      perform public.publish_shift(v_shift_id);
    end if;

    v_shift_ids := array_append(v_shift_ids, v_shift_id);
  end loop;

  perform public.create_audit_event(
    p_organization_id,
    'shift_creation_batch',
    v_batch_id,
    'bulk_shifts_created',
    null,
    jsonb_build_object(
      'shift_count', v_count,
      'requested_status', v_status,
      'creation_mode', v_mode
    )
  );

  return jsonb_build_object(
    'batch_id', v_batch_id,
    'shift_ids', to_jsonb(v_shift_ids),
    'shift_count', v_count,
    'requested_status', v_status,
    'creation_mode', v_mode,
    'idempotent_replay', false
  );
end;
$$;

revoke all on function public.create_shifts_batch(uuid, text, text, text, jsonb) from public;
grant execute on function public.create_shifts_batch(uuid, text, text, text, jsonb) to authenticated;

-- ---------------------------------------------------------------------------
-- 8. Credential insert/update — enforce known future expiry for annual licence
-- ---------------------------------------------------------------------------

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
    if not public.credential_expiry_is_valid(new.credential_type, new.expires_at) then
      raise exception 'CREDENTIAL_EXPIRY_REQUIRED:%', new.credential_type;
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

    -- Client-owned expiry edits must still satisfy the type rule.
    if new.expires_at is distinct from old.expires_at
       and not public.credential_expiry_is_valid(new.credential_type, new.expires_at) then
      raise exception 'CREDENTIAL_EXPIRY_REQUIRED:%', new.credential_type;
    end if;
  end if;

  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 9. Verifier-only expiry metadata correction (does not approve the credential)
-- ---------------------------------------------------------------------------

create or replace function public.correct_credential_expires_at(
  p_credential_id uuid,
  p_expires_at timestamptz
)
returns public.credentials
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cred public.credentials;
  v_old_expires timestamptz;
begin
  if auth.uid() is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  if not public.is_platform_admin('platform_verifier') then
    raise exception 'NOT_AUTHORIZED';
  end if;

  if p_credential_id is null then
    raise exception 'CREDENTIAL_REQUIRED';
  end if;

  select * into v_cred
  from public.credentials
  where id = p_credential_id
  for update;

  if not found then
    raise exception 'CREDENTIAL_NOT_FOUND';
  end if;

  if not public.credential_expiry_is_valid(v_cred.credential_type, p_expires_at) then
    raise exception 'CREDENTIAL_EXPIRY_REQUIRED:%', v_cred.credential_type;
  end if;

  v_old_expires := v_cred.expires_at;

  perform set_config('bridgehive.allow_platform_verify', 'on', true);

  update public.credentials
  set
    expires_at = p_expires_at,
    updated_at = now()
  where id = v_cred.id
  returning * into v_cred;

  perform set_config('bridgehive.allow_platform_verify', 'off', true);

  perform public.create_audit_event(
    null,
    'credential',
    v_cred.id,
    'correct_credential_expires_at',
    jsonb_build_object(
      'expires_at', v_old_expires,
      'credential_type', v_cred.credential_type,
      'status', v_cred.status
    ),
    jsonb_build_object(
      'expires_at', v_cred.expires_at,
      'credential_type', v_cred.credential_type,
      'status', v_cred.status
    )
  );

  return v_cred;
end;
$$;

revoke all on function public.correct_credential_expires_at(uuid, timestamptz) from public;
grant execute on function public.correct_credential_expires_at(uuid, timestamptz) to authenticated;

comment on function public.correct_credential_expires_at(uuid, timestamptz) is
  'Platform verifier may correct expires_at after reviewing the private document. Does not change status or auto-verify the worker.';

-- ---------------------------------------------------------------------------
-- 10. Worker shift details — exact role match for published marketplace rows
-- ---------------------------------------------------------------------------

create or replace function public.get_worker_shift_details(p_shift_id uuid)
returns table (
  shift_id uuid,
  organization_name text,
  location_name text,
  ward_name text,
  title text,
  starts_at timestamptz,
  ends_at timestamptz,
  rate_minor integer,
  currency text,
  required_role public.worker_role,
  status public.shift_status,
  notes text,
  break_minutes integer,
  acceptance_deadline timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_worker_role public.worker_role;
begin
  if auth.uid() is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  select wp.worker_role into v_worker_role
  from public.worker_profiles wp
  where wp.user_id = auth.uid();

  return query
  select
    s.id as shift_id,
    o.display_name as organization_name,
    l.name as location_name,
    w.name as ward_name,
    s.title,
    s.starts_at,
    s.ends_at,
    s.rate_minor,
    s.currency,
    s.required_role,
    s.status,
    s.notes,
    s.break_minutes,
    s.acceptance_deadline
  from public.shifts s
  join public.organizations o on o.id = s.organization_id
  join public.locations l on l.id = s.location_id
  left join public.wards w on w.id = s.ward_id
  where s.id = p_shift_id
    and (
      exists (
        select 1
        from public.shift_assignments sa
        where sa.shift_id = s.id
          and sa.worker_id = auth.uid()
      )
      or (
        s.status = 'published'
        and v_worker_role is not null
        and v_worker_role = s.required_role
        and (
          s.acceptance_deadline is null
          or s.acceptance_deadline > now()
        )
      )
    );
end;
$$;

revoke all on function public.get_worker_shift_details(uuid) from public;
grant execute on function public.get_worker_shift_details(uuid) to authenticated;
