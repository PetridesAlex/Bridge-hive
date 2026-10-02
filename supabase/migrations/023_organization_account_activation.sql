-- 023_organization_account_activation.sql
-- Invitation delivery/activation state + session-bound accept + resend guards.
-- Migrations 001–022 unchanged.

-- ---------------------------------------------------------------------------
-- 1. Delivery columns on organization_invitations
-- ---------------------------------------------------------------------------

alter table public.organization_invitations
  add column if not exists delivery_status text not null default 'pending',
  add column if not exists last_sent_at timestamptz,
  add column if not exists last_send_attempt_at timestamptz,
  add column if not exists send_attempt_count integer not null default 0,
  add column if not exists last_delivery_error_category text;

alter table public.organization_invitations
  drop constraint if exists organization_invitations_delivery_status_check;

alter table public.organization_invitations
  add constraint organization_invitations_delivery_status_check
  check (
    delivery_status in (
      'pending',
      'sent',
      'failed',
      'accepted',
      'revoked',
      'expired'
    )
  );

alter table public.organization_invitations
  drop constraint if exists organization_invitations_error_category_check;

alter table public.organization_invitations
  add constraint organization_invitations_error_category_check
  check (
    last_delivery_error_category is null
    or last_delivery_error_category in (
      'auth_error',
      'rate_limited',
      'unknown'
    )
  );

alter table public.organization_invitations
  drop constraint if exists organization_invitations_send_attempt_nonneg;

alter table public.organization_invitations
  add constraint organization_invitations_send_attempt_nonneg
  check (send_attempt_count >= 0);

-- ---------------------------------------------------------------------------
-- 2. mark_organization_invitation_delivery (super_admin)
-- ---------------------------------------------------------------------------

create or replace function public.mark_organization_invitation_delivery(
  p_invitation_id uuid,
  p_delivery_status text,
  p_error_category text default null
)
returns public.organization_invitations
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inv public.organization_invitations;
  v_status text := lower(trim(coalesce(p_delivery_status, '')));
  v_category text := nullif(lower(trim(coalesce(p_error_category, ''))), '');
begin
  if auth.uid() is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  if not public.is_platform_admin('platform_super_admin') then
    raise exception 'NOT_AUTHORIZED';
  end if;

  if v_status not in ('pending', 'sent', 'failed', 'accepted', 'revoked', 'expired') then
    raise exception 'INVALID_DELIVERY_STATUS';
  end if;

  if v_category is not null
     and v_category not in ('auth_error', 'rate_limited', 'unknown') then
    raise exception 'INVALID_ERROR_CATEGORY';
  end if;

  select * into v_inv
  from public.organization_invitations
  where id = p_invitation_id
  for update;

  if not found then
    raise exception 'INVITATION_NOT_FOUND';
  end if;

  update public.organization_invitations
  set
    delivery_status = v_status,
    last_send_attempt_at = case
      when v_status in ('sent', 'failed') then now()
      else last_send_attempt_at
    end,
    last_sent_at = case
      when v_status = 'sent' then now()
      else last_sent_at
    end,
    send_attempt_count = case
      when v_status in ('sent', 'failed') then send_attempt_count + 1
      else send_attempt_count
    end,
    last_delivery_error_category = case
      when v_status = 'failed' then coalesce(v_category, 'unknown')
      when v_status = 'sent' then null
      else last_delivery_error_category
    end
  where id = v_inv.id
  returning * into v_inv;

  perform public.create_audit_event(
    v_inv.organization_id,
    'organization_invitation',
    v_inv.id,
    case
      when v_status = 'sent' then 'organization_admin_activation_email_sent'
      when v_status = 'failed' then 'organization_admin_activation_email_failed'
      else 'organization_admin_activation_requested'
    end,
    null,
    jsonb_build_object(
      'delivery_status', v_status,
      'error_category', v_inv.last_delivery_error_category,
      'send_attempt_count', v_inv.send_attempt_count
    )
  );

  return v_inv;
end;
$$;

revoke all on function public.mark_organization_invitation_delivery(uuid, text, text) from public;
grant execute on function public.mark_organization_invitation_delivery(uuid, text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 3. assert_invitation_resend_allowed (super_admin)
-- ---------------------------------------------------------------------------

create or replace function public.assert_invitation_resend_allowed(
  p_invitation_id uuid
)
returns public.organization_invitations
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inv public.organization_invitations;
  v_window_start timestamptz := now() - interval '24 hours';
begin
  if auth.uid() is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  if not public.is_platform_admin('platform_super_admin') then
    raise exception 'NOT_AUTHORIZED';
  end if;

  select * into v_inv
  from public.organization_invitations
  where id = p_invitation_id
  for update;

  if not found then
    raise exception 'INVITATION_NOT_FOUND';
  end if;

  if v_inv.accepted_at is not null then
    raise exception 'INVITATION_ALREADY_ACCEPTED';
  end if;

  if v_inv.revoked_at is not null then
    raise exception 'INVITATION_REVOKED';
  end if;

  if v_inv.expires_at <= now() then
    raise exception 'INVITATION_EXPIRED';
  end if;

  if v_inv.last_send_attempt_at is not null
     and v_inv.last_send_attempt_at > now() - interval '60 seconds' then
    raise exception 'RATE_LIMITED';
  end if;

  if v_inv.send_attempt_count >= 10
     and v_inv.last_send_attempt_at is not null
     and v_inv.last_send_attempt_at >= v_window_start then
    raise exception 'MAX_RESEND_ATTEMPTS';
  end if;

  return v_inv;
end;
$$;

revoke all on function public.assert_invitation_resend_allowed(uuid) from public;
grant execute on function public.assert_invitation_resend_allowed(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 4. accept_organization_invitation_by_id (authenticated, email match)
-- ---------------------------------------------------------------------------

create or replace function public.accept_organization_invitation_by_id(
  p_invitation_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inv public.organization_invitations;
  v_org public.organizations;
  v_email text;
  v_member_id uuid;
begin
  if auth.uid() is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  if p_invitation_id is null then
    raise exception 'INVITATION_REQUIRED';
  end if;

  select * into v_inv
  from public.organization_invitations
  where id = p_invitation_id
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

  if v_org.status in ('suspended', 'closed') then
    raise exception 'ORG_NOT_ACCEPTING';
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
  set
    accepted_at = now(),
    accepted_by = auth.uid(),
    delivery_status = 'accepted',
    last_delivery_error_category = null
  where id = v_inv.id;

  perform public.create_audit_event(
    v_inv.organization_id,
    'organization_invitation',
    v_inv.id,
    'organization_admin_invitation_accepted',
    null,
    jsonb_build_object('role', v_inv.role::text, 'membership_id', v_member_id)
  );

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
    'membership_id', v_member_id,
    'display_name', v_org.display_name
  );
end;
$$;

revoke all on function public.accept_organization_invitation_by_id(uuid) from public;
grant execute on function public.accept_organization_invitation_by_id(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 5. Preview by invitation id (authenticated; email must match for full detail)
-- ---------------------------------------------------------------------------

create or replace function public.get_organization_invitation_preview_by_id(
  p_invitation_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inv public.organization_invitations;
  v_org public.organizations;
  v_email text;
  v_status text;
begin
  if auth.uid() is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  if p_invitation_id is null then
    raise exception 'INVITATION_REQUIRED';
  end if;

  select * into v_inv
  from public.organization_invitations
  where id = p_invitation_id;

  if not found then
    raise exception 'INVITATION_INVALID';
  end if;

  select lower(email) into v_email from auth.users where id = auth.uid();
  if v_email is null or v_email <> v_inv.email_normalized then
    raise exception 'EMAIL_MISMATCH';
  end if;

  select * into v_org from public.organizations where id = v_inv.organization_id;
  if not found then
    raise exception 'ORG_NOT_FOUND';
  end if;

  v_status := case
    when v_inv.revoked_at is not null then 'revoked'
    when v_inv.accepted_at is not null then 'accepted'
    when v_inv.expires_at <= now() then 'expired'
    else 'open'
  end;

  return jsonb_build_object(
    'invitation_id', v_inv.id,
    'organization_id', v_org.id,
    'display_name', v_org.display_name,
    'slug', v_org.slug,
    'organization_status', v_org.status,
    'role', v_inv.role,
    'email_hint', left(v_inv.email_normalized, 2) || '•••@' || split_part(v_inv.email_normalized, '@', 2),
    'email_normalized', v_inv.email_normalized,
    'expires_at', v_inv.expires_at,
    'status', v_status,
    'delivery_status', v_inv.delivery_status
  );
end;
$$;

revoke all on function public.get_organization_invitation_preview_by_id(uuid) from public;
grant execute on function public.get_organization_invitation_preview_by_id(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 6. Patch revoke + raw-token accept to update delivery_status
-- ---------------------------------------------------------------------------

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
  set
    revoked_at = now(),
    revoked_by = auth.uid(),
    delivery_status = 'revoked'
  where id = v_inv.id;

  perform public.create_audit_event(
    v_inv.organization_id,
    'organization_invitation',
    v_inv.id,
    'organization_admin_invitation_revoked',
    null,
    jsonb_build_object('role', v_inv.role::text)
  );
end;
$$;

revoke all on function public.revoke_organization_invitation(uuid) from public;
grant execute on function public.revoke_organization_invitation(uuid) to authenticated;

-- Keep raw-token accept; also mark delivery accepted
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
  set
    accepted_at = now(),
    accepted_by = auth.uid(),
    delivery_status = 'accepted',
    last_delivery_error_category = null
  where id = v_inv.id;

  perform public.create_audit_event(
    v_inv.organization_id,
    'organization_invitation',
    v_inv.id,
    'invitation_accepted',
    null,
    jsonb_build_object('role', v_inv.role::text, 'membership_id', v_member_id)
  );

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

-- ---------------------------------------------------------------------------
-- 7. Admin detail includes delivery fields
-- ---------------------------------------------------------------------------

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
        'delivery_status', i.delivery_status,
        'last_sent_at', i.last_sent_at,
        'last_send_attempt_at', i.last_send_attempt_at,
        'send_attempt_count', i.send_attempt_count,
        'last_delivery_error_category', i.last_delivery_error_category,
        'status', case
          when i.revoked_at is not null then 'revoked'
          when i.accepted_at is not null then 'accepted'
          when i.expires_at <= now() then 'expired'
          else 'open'
        end,
        'access_status', case
          when i.revoked_at is not null then 'revoked'
          when i.accepted_at is not null then 'accepted'
          when i.expires_at <= now() then 'expired'
          when i.delivery_status = 'failed' then 'delivery_failed'
          when i.delivery_status = 'sent' then 'sent'
          when i.delivery_status = 'pending' then 'pending'
          else i.delivery_status
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
