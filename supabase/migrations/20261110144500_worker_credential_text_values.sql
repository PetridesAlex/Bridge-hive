-- 20261110144500_worker_credential_text_values.sql
-- Convert tax_identification_proof / social_insurance_proof into text credentials.
-- Forward-only. Does not delete or rewrite legacy Storage objects or credential rows.
-- Raw values live on credentials.text_value (not worker_profiles) so org RLS cannot read them.

-- ---------------------------------------------------------------------------
-- 1. Schema
-- ---------------------------------------------------------------------------

alter table public.credentials
  add column if not exists text_value text;

comment on column public.credentials.text_value is
  'Sensitive text credential value (tax/social). Readable by owning worker and platform verifier/super via credentials RLS. Never put on worker_profiles.';

alter table public.credentials
  add column if not exists has_text_value boolean
  generated always as (
    text_value is not null and length(btrim(text_value)) > 0
  ) stored;

comment on column public.credentials.has_text_value is
  'Non-secret flag for completion/list queries. Prefer this over selecting text_value.';

-- ---------------------------------------------------------------------------
-- 2. Helpers (keep credential_has_uploaded_file file-only)
-- ---------------------------------------------------------------------------

create or replace function public.credential_is_text_type(p_credential_type text)
returns boolean
language sql
immutable
as $$
  select p_credential_type in (
    'tax_identification_proof',
    'social_insurance_proof'
  );
$$;

revoke all on function public.credential_is_text_type(text) from public;
grant execute on function public.credential_is_text_type(text) to authenticated;

create or replace function public.credential_has_text_value(p_cred public.credentials)
returns boolean
language sql
immutable
as $$
  select p_cred.text_value is not null and length(btrim(p_cred.text_value)) > 0;
$$;

revoke all on function public.credential_has_text_value(public.credentials) from public;
grant execute on function public.credential_has_text_value(public.credentials) to authenticated;

create or replace function public.credential_requirement_satisfied(p_cred public.credentials)
returns boolean
language sql
immutable
as $$
  select case
    when public.credential_is_text_type(p_cred.credential_type) then
      public.credential_has_text_value(p_cred)
      or public.credential_has_uploaded_file(p_cred)
    else
      public.credential_has_uploaded_file(p_cred)
  end;
$$;

revoke all on function public.credential_requirement_satisfied(public.credentials) from public;
grant execute on function public.credential_requirement_satisfied(public.credentials) to authenticated;

create or replace function public.normalize_credential_text_value(p_value text)
returns text
language plpgsql
immutable
as $$
declare
  v text;
begin
  v := btrim(coalesce(p_value, ''));
  if v = '' then
    raise exception 'CREDENTIAL_TEXT_REQUIRED';
  end if;
  if char_length(v) > 64 then
    raise exception 'CREDENTIAL_TEXT_TOO_LONG';
  end if;
  if v ~ E'[\\x00-\\x1F\\x7F]' then
    raise exception 'CREDENTIAL_TEXT_INVALID_CHARS';
  end if;
  if lower(v) in ('uploaded', 'verified', 'n/a', 'na', 'none', 'null', 'undefined') then
    raise exception 'CREDENTIAL_TEXT_PLACEHOLDER';
  end if;
  return v;
end;
$$;

revoke all on function public.normalize_credential_text_value(text) from public;
grant execute on function public.normalize_credential_text_value(text) to authenticated;

-- ---------------------------------------------------------------------------
-- 3. Worker save RPC (no Storage, no value in audit/notifications)
-- ---------------------------------------------------------------------------

create or replace function public.save_my_credential_text_value(
  p_credential_type text,
  p_value text
)
returns public.credentials
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_account public.account_status;
  v_existing public.credentials;
  v_normalized text;
  v_cred public.credentials;
begin
  if v_uid is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  if not public.credential_is_text_type(p_credential_type) then
    raise exception 'CREDENTIAL_NOT_TEXT_TYPE';
  end if;

  select account_status into v_account
  from public.profiles
  where id = v_uid;

  if not found or v_account <> 'active' then
    raise exception 'ACCOUNT_NOT_ACTIVE';
  end if;

  if not exists (
    select 1 from public.worker_profiles wp where wp.user_id = v_uid
  ) then
    raise exception 'WORKER_PROFILE_REQUIRED';
  end if;

  v_normalized := public.normalize_credential_text_value(p_value);

  select c.* into v_existing
  from public.credentials c
  where c.worker_id = v_uid
    and c.credential_type = p_credential_type
  order by
    case c.status
      when 'pending' then 4
      when 'rejected' then 3
      when 'under_review' then 2
      when 'verified' then 1
      else 0
    end desc,
    c.updated_at desc nulls last
  limit 1
  for update;

  if found then
    if v_existing.status not in ('pending', 'rejected') then
      raise exception 'CREDENTIAL_TEXT_LOCKED';
    end if;

    if v_existing.status = 'pending' then
      update public.credentials
      set
        text_value = v_normalized,
        updated_at = now()
      where id = v_existing.id
      returning * into v_cred;
    else
      insert into public.credentials (
        worker_id,
        credential_type,
        status,
        text_value,
        storage_path,
        storage_paths
      ) values (
        v_uid,
        p_credential_type,
        'pending',
        v_normalized,
        null,
        '[]'::jsonb
      )
      returning * into v_cred;
    end if;
  else
    insert into public.credentials (
      worker_id,
      credential_type,
      status,
      text_value,
      storage_path,
      storage_paths
    ) values (
      v_uid,
      p_credential_type,
      'pending',
      v_normalized,
      null,
      '[]'::jsonb
    )
    returning * into v_cred;
  end if;

  perform public.create_audit_event(
    null,
    'credential',
    v_cred.id,
    'save_credential_text_value',
    null,
    jsonb_build_object(
      'credential_type', v_cred.credential_type,
      'status', v_cred.status,
      'has_text_value', true
    )
  );

  return v_cred;
end;
$$;

revoke all on function public.save_my_credential_text_value(text, text) from public;
grant execute on function public.save_my_credential_text_value(text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 4. Client status guard
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
    if public.credential_is_text_type(new.credential_type)
       and (
         new.storage_path is not null
         or (
           new.storage_paths is not null
           and jsonb_typeof(new.storage_paths) = 'array'
           and jsonb_array_length(new.storage_paths) > 0
         )
       ) then
      raise exception 'CREDENTIAL_TEXT_TYPE_NO_UPLOAD';
    end if;
    if not public.credential_is_text_type(new.credential_type)
       and new.text_value is not null then
      raise exception 'CREDENTIAL_TEXT_VALUE_NOT_ALLOWED';
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

    if new.text_value is distinct from old.text_value
       and old.status is distinct from 'pending' then
      raise exception 'CREDENTIAL_TEXT_LOCKED';
    end if;

    if public.credential_is_text_type(new.credential_type) then
      if (
           (old.storage_path is null or btrim(coalesce(old.storage_path, '')) = '')
           and (
             old.storage_paths is null
             or jsonb_typeof(old.storage_paths) <> 'array'
             or jsonb_array_length(old.storage_paths) = 0
           )
           and (
             new.storage_path is not null
             or (
               new.storage_paths is not null
               and jsonb_typeof(new.storage_paths) = 'array'
               and jsonb_array_length(new.storage_paths) > 0
             )
           )
         ) then
        raise exception 'CREDENTIAL_TEXT_TYPE_NO_UPLOAD';
      end if;
    end if;

    if not public.credential_is_text_type(new.credential_type)
       and new.text_value is distinct from old.text_value then
      raise exception 'CREDENTIAL_TEXT_VALUE_NOT_ALLOWED';
    end if;

    if new.expires_at is distinct from old.expires_at
       and not public.credential_expiry_is_valid(new.credential_type, new.expires_at) then
      raise exception 'CREDENTIAL_EXPIRY_REQUIRED:%', new.credential_type;
    end if;
  end if;

  return new;
end;
$$;

-- Patched from latest definition: public.notify_credential_event
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
grant execute on function public.notify_credential_event(uuid, text, text, text) to authenticated;

-- Patched from latest definition: public.notify_platform_admin_task
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
    - 'text_value'
    - 'tax_identification'
    - 'social_insurance'
    - 'tax_identification_proof_value'
    - 'social_insurance_proof_value'
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
grant execute on function public.notify_platform_admin_task(text, text, text, jsonb) to authenticated;

-- Patched from latest definition: public.notify_super_admin_task
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
    - 'text_value'
    - 'tax_identification'
    - 'social_insurance'
    - 'tax_identification_proof_value'
    - 'social_insurance_proof_value'
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
grant execute on function public.notify_super_admin_task(text, text, text, jsonb) to authenticated;

-- Patched from latest definition: public.submit_credential_for_review
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

  if not public.credential_requirement_satisfied(v_cred) then
    raise exception 'CREDENTIAL_PAYLOAD_REQUIRED';
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

-- Patched from latest definition: public.submit_worker_verification_package
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
      public.credential_requirement_satisfied(c)
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

-- Patched from latest definition: public.verify_credential
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
    if not public.credential_requirement_satisfied(v_cred) then
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

-- Patched from latest definition: public.approve_reviewed_worker_credentials
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

    if not public.credential_requirement_satisfied(v_cred) then
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

-- Patched from latest definition: public.worker_verification_application_status
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

    if not found or not public.credential_requirement_satisfied(v_best) then
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

-- Patched from latest definition: public.list_verification_applications
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
