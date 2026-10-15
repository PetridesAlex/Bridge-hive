-- The public application no longer collects a professional profile.
-- Role, experience, and registration may be omitted on new submissions.

alter table public.recruitment_candidates
  alter column role drop not null;

comment on column public.recruitment_candidates.role is
  'Optional worker role. Null when the applicant did not supply a professional profile.';

create or replace function public.submit_recruitment_application(p_payload jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_email text;
  v_role public.worker_role;
  v_role_text text;
  v_employment public.recruitment_employment_type;
  v_ip_hash text;
  v_recent_count integer;
begin
  if p_payload is null then
    raise exception 'RECRUITMENT_PAYLOAD_REQUIRED';
  end if;

  v_email := lower(trim(coalesce(p_payload->>'email', '')));
  if v_email = '' or v_email !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'RECRUITMENT_EMAIL_INVALID';
  end if;

  v_role_text := nullif(trim(coalesce(p_payload->>'role', '')), '');
  if v_role_text is null then
    v_role := null;
  else
    begin
      v_role := v_role_text::public.worker_role;
    exception when others then
      raise exception 'RECRUITMENT_ROLE_INVALID';
    end;
  end if;

  begin
    v_employment := (p_payload->>'employment_type')::public.recruitment_employment_type;
  exception when others then
    raise exception 'RECRUITMENT_EMPLOYMENT_INVALID';
  end;

  if coalesce(p_payload->>'privacy_notice_version', '') = '' then
    raise exception 'RECRUITMENT_CONSENT_REQUIRED';
  end if;

  v_ip_hash := nullif(trim(coalesce(p_payload->>'client_ip_hash', '')), '');
  if v_ip_hash is not null then
    select count(*)::integer into v_recent_count
    from public.recruitment_submit_throttle t
    where t.client_ip_hash = v_ip_hash
      and t.created_at > now() - interval '60 minutes';

    if v_recent_count >= 5 then
      raise exception 'RECRUITMENT_SUBMIT_REJECTED';
    end if;
  end if;

  begin
    insert into public.recruitment_candidates (
      candidate_path,
      full_name,
      email_normalized,
      phone,
      current_location,
      country_of_residence,
      preferred_cyprus_location,
      role,
      years_experience,
      registration_state,
      platform_status
    )
    values (
      'professional',
      trim(p_payload->>'full_name'),
      v_email,
      trim(p_payload->>'phone'),
      trim(p_payload->>'current_location'),
      trim(p_payload->>'country_of_residence'),
      nullif(trim(coalesce(p_payload->>'preferred_cyprus_location', '')), ''),
      v_role,
      coalesce(trim(p_payload->>'years_experience'), ''),
      coalesce(trim(p_payload->>'registration_state'), ''),
      'received'
    )
    returning id into v_id;
  exception
    when unique_violation then
      raise exception 'RECRUITMENT_SUBMIT_REJECTED';
  end;

  insert into public.recruitment_candidate_preferences (
    candidate_id,
    employment_type,
    preferred_environments,
    areas_of_interest,
    availability
  )
  values (
    v_id,
    v_employment,
    nullif(trim(coalesce(p_payload->>'preferred_environments', '')), ''),
    nullif(trim(coalesce(p_payload->>'areas_of_interest', '')), ''),
    trim(p_payload->>'availability')
  );

  insert into public.recruitment_consents (
    candidate_id,
    privacy_notice_version,
    user_agent
  )
  values (
    v_id,
    trim(p_payload->>'privacy_notice_version'),
    nullif(trim(coalesce(p_payload->>'user_agent', '')), '')
  );

  insert into public.recruitment_platform_reviews (candidate_id)
  values (v_id);

  if v_ip_hash is not null then
    insert into public.recruitment_submit_throttle (client_ip_hash)
    values (v_ip_hash);
  end if;

  perform public.create_audit_event(
    null,
    'recruitment_candidate',
    v_id,
    'recruitment_application_submit',
    null,
    jsonb_build_object(
      'role', v_role::text,
      'privacy_notice_version', trim(p_payload->>'privacy_notice_version')
    )
  );

  return v_id;
end;
$$;

revoke all on function public.submit_recruitment_application(jsonb) from public;
revoke all on function public.submit_recruitment_application(jsonb) from anon, authenticated;
grant execute on function public.submit_recruitment_application(jsonb) to service_role;
