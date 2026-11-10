-- DRAFT ONLY — do not apply without explicit approval.
-- Patch list/mark helpers so text credentials (tax/social) count as satisfied payloads.
-- Depends on live helpers: credential_requirement_satisfied, credential_is_text_type,
-- credential_has_text_value, credential_has_uploaded_file.

begin;

-- ---------------------------------------------------------------------------
-- 1) mark_credentials_under_review: accept text OR file via requirement helper
-- ---------------------------------------------------------------------------
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

    if not public.credential_requirement_satisfied(v_cred) then
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
        'worker_id', p_worker_id,
        'has_text_value', public.credential_has_text_value(v_cred)
      )
    );

    return next v_cred;
  end loop;

  return;
end;
$$;

revoke all on function public.mark_credentials_under_review(uuid, uuid[]) from public;
grant execute on function public.mark_credentials_under_review(uuid, uuid[]) to authenticated;

-- ---------------------------------------------------------------------------
-- 2) list_verification_applications: count satisfied payloads (file or text)
--    + optional p_expiring filter + worker_name / urgency sorts
-- ---------------------------------------------------------------------------
create or replace function public.list_verification_applications(
  p_search text default null,
  p_role public.worker_role default null,
  p_application_status text default null,
  p_payout_status public.payout_account_status default null,
  p_sort text default 'last_activity',
  p_limit int default 20,
  p_offset int default 0,
  p_expiring boolean default null
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
  v_expiring_until timestamptz := now() + interval '30 days';
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

  if v_sort not in (
    'submitted_at',
    'oldest_waiting',
    'last_activity',
    'worker_name',
    'urgency'
  ) then
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
          and public.credential_requirement_satisfied(c)
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
          and public.credential_requirement_satisfied(c)
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
            and public.credential_requirement_satisfied(c)
        ),
        wp.created_at
      ) as sub_at,
      public.worker_application_last_activity(wp.user_id) as last_at,
      (
        select min(c.expires_at)
        from public.credentials c
        where c.worker_id = wp.user_id
          and c.expires_at is not null
          and c.status in ('pending', 'under_review', 'verified')
          and c.expires_at > now()
          and c.expires_at < v_expiring_until
      ) as next_expiry
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
        p_expiring is null
        or p_expiring is false
        or b.next_expiry is not null
      )
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
      case when v_sort = 'worker_name' then lower(coalesce(c.fname, '')) end asc nulls last,
      case when v_sort = 'urgency' then c.next_expiry end asc nulls last,
      case when v_sort = 'urgency' then c.sub_at end asc nulls last,
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

-- Drop prior 7-arg overload if present so callers resolve cleanly.
drop function if exists public.list_verification_applications(
  text, public.worker_role, text, public.payout_account_status, text, int, int
);

revoke all on function public.list_verification_applications(
  text, public.worker_role, text, public.payout_account_status, text, int, int, boolean
) from public;
grant execute on function public.list_verification_applications(
  text, public.worker_role, text, public.payout_account_status, text, int, int, boolean
) to authenticated;

commit;
