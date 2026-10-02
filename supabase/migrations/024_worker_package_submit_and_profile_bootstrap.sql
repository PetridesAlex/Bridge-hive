-- 024_worker_package_submit_and_profile_bootstrap.sql
-- Worker self-service: bootstrap profile after email confirmation,
-- and submit a verification package into the admin ready/review queue.
-- Additive only. Does not alter Stripe / commission accounting.

-- ---------------------------------------------------------------------------
-- 1. Ensure worker profile exists for the authenticated user
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
    if v_meta_role in ('registered_nurse', 'ward_assistant') then
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
-- 2. Submit verification package (worker → admin queue)
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

  foreach v_cred_type in array v_required
  loop
    select
      c.id,
      c.status,
      (
        coalesce(nullif(trim(coalesce(c.storage_path, '')), ''), '') <> ''
        or (
          jsonb_typeof(coalesce(c.storage_paths, '[]'::jsonb)) = 'array'
          and jsonb_array_length(coalesce(c.storage_paths, '[]'::jsonb)) > 0
        )
      )
    into v_cred_id, v_status, v_has_file
    from public.credentials c
    where c.worker_id = v_uid
      and c.credential_type = v_cred_type
    order by c.updated_at desc nulls last
    limit 1;

    if v_cred_id is null or not v_has_file then
      raise exception 'MISSING_REQUIRED_CREDENTIAL:%', v_cred_type;
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

comment on function public.ensure_my_worker_profile(public.worker_role, text) is
  'Creates the authenticated worker profile from role metadata after email confirmation when missing.';

comment on function public.submit_worker_verification_package() is
  'Worker package submit: requires role documents with files, moves pending docs to under_review, sets verification_status=submitted, notifies verifiers once per 24h.';
