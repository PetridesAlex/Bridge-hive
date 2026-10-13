-- 030_recruitment_org_enable_fix.sql
-- Fix platform-admin recruitment enable/disable:
-- 1) honor organizations_guard_client_write via bridgehive.allow_org_lifecycle
-- 2) expose recruitment_enabled on get_admin_organization_detail (RLS-safe)

create or replace function public.set_organization_recruitment_enabled(
  p_organization_id uuid,
  p_enabled boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_platform_admin('platform_super_admin') then
    raise exception 'RECRUITMENT_SUPER_ADMIN_REQUIRED';
  end if;

  -- Required by organizations_guard_client_write (same pattern as org lifecycle RPCs).
  perform set_config('bridgehive.allow_org_lifecycle', 'on', true);

  update public.organizations
  set recruitment_enabled = p_enabled
  where id = p_organization_id;

  if not found then
    perform set_config('bridgehive.allow_org_lifecycle', 'off', true);
    raise exception 'ORG_NOT_FOUND';
  end if;

  perform public.create_audit_event(
    p_organization_id,
    'organization',
    p_organization_id,
    'recruitment_org_enable',
    null,
    jsonb_build_object('recruitment_enabled', p_enabled)
  );

  perform set_config('bridgehive.allow_org_lifecycle', 'off', true);
end;
$$;

revoke all on function public.set_organization_recruitment_enabled(uuid, boolean) from public;
revoke all on function public.set_organization_recruitment_enabled(uuid, boolean) from anon;
grant execute on function public.set_organization_recruitment_enabled(uuid, boolean) to authenticated;

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
      'short_reference', upper(substr(replace(v_org.id::text, '-', ''), 1, 8)),
      'recruitment_enabled', v_org.recruitment_enabled
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
revoke all on function public.get_admin_organization_detail(uuid) from anon;
grant execute on function public.get_admin_organization_detail(uuid) to authenticated;
