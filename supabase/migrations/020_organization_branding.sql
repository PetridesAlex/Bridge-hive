-- 020_organization_branding.sql
-- Organization logo_path + private organization-logos bucket + narrow RPCs.
-- Does not alter migrations 001–019.
-- Display-name presentation update for active org admins (does not unlock legal fields).

-- ---------------------------------------------------------------------------
-- organizations.logo_path (object path only — never a signed/public URL)
-- ---------------------------------------------------------------------------
alter table public.organizations
  add column if not exists logo_path text;

comment on column public.organizations.logo_path is
  'Private Storage object path in organization-logos bucket (<org-uuid>/version.jpg). Never store signed URLs.';

-- ---------------------------------------------------------------------------
-- Private bucket
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'organization-logos',
  'organization-logos',
  false,
  2097152, -- 2 MiB processed JPEG/PNG
  array['image/jpeg', 'image/png']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Active org members may read logos for their organization folder only.
drop policy if exists "org_logos_storage_select_member" on storage.objects;
create policy "org_logos_storage_select_member"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'organization-logos'
  and (storage.foldername(name))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  and public.has_org_role(
    ((storage.foldername(name))[1])::uuid,
    array[
      'org_admin'::public.org_role,
      'org_scheduler'::public.org_role,
      'org_billing'::public.org_role
    ]
  )
);

-- Only org_admin may insert into their organization UUID folder.
drop policy if exists "org_logos_storage_insert_admin" on storage.objects;
create policy "org_logos_storage_insert_admin"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'organization-logos'
  and (storage.foldername(name))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  and public.has_org_role(
    ((storage.foldername(name))[1])::uuid,
    array['org_admin'::public.org_role]
  )
);

drop policy if exists "org_logos_storage_update_admin" on storage.objects;
create policy "org_logos_storage_update_admin"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'organization-logos'
  and (storage.foldername(name))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  and public.has_org_role(
    ((storage.foldername(name))[1])::uuid,
    array['org_admin'::public.org_role]
  )
)
with check (
  bucket_id = 'organization-logos'
  and (storage.foldername(name))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  and public.has_org_role(
    ((storage.foldername(name))[1])::uuid,
    array['org_admin'::public.org_role]
  )
);

drop policy if exists "org_logos_storage_delete_admin" on storage.objects;
create policy "org_logos_storage_delete_admin"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'organization-logos'
  and (storage.foldername(name))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  and public.has_org_role(
    ((storage.foldername(name))[1])::uuid,
    array['org_admin'::public.org_role]
  )
);

-- ---------------------------------------------------------------------------
-- Narrow RPC: set or clear organization logo_path (org_admin only)
-- ---------------------------------------------------------------------------
create or replace function public.set_organization_logo_path(
  p_organization_id uuid,
  p_path text
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_path text;
  v_prev text;
begin
  if v_uid is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  if p_organization_id is null then
    raise exception 'ORG_NOT_FOUND';
  end if;

  if not public.has_org_role(p_organization_id, array['org_admin'::public.org_role]) then
    raise exception 'NOT_AUTHORIZED';
  end if;

  if not exists (select 1 from public.organizations o where o.id = p_organization_id) then
    raise exception 'ORG_NOT_FOUND';
  end if;

  select logo_path into v_prev
  from public.organizations
  where id = p_organization_id
  for update;

  if p_path is null or btrim(p_path) = '' then
    update public.organizations
    set logo_path = null,
        updated_at = now()
    where id = p_organization_id;

    perform public.create_audit_event(
      p_organization_id,
      'organization',
      p_organization_id,
      'organization_logo_cleared',
      jsonb_build_object('field', 'logo_path'),
      jsonb_build_object('field', 'logo_path')
    );

    return null;
  end if;

  v_path := btrim(p_path);

  -- Must be exactly: <organization-uuid>/<safe-filename>.jpg|jpeg|png
  if v_path !~ (
    '^' || p_organization_id::text || '/[A-Za-z0-9._-]+\.(jpg|jpeg|png)$'
  ) then
    raise exception 'INVALID_LOGO_PATH';
  end if;

  update public.organizations
  set logo_path = v_path,
      updated_at = now()
  where id = p_organization_id;

  perform public.create_audit_event(
    p_organization_id,
    'organization',
    p_organization_id,
    'organization_logo_updated',
    jsonb_build_object('field', 'logo_path'),
    jsonb_build_object('field', 'logo_path')
  );

  return v_path;
end;
$$;

revoke all on function public.set_organization_logo_path(uuid, text) from public;
revoke all on function public.set_organization_logo_path(uuid, text) from anon;
grant execute on function public.set_organization_logo_path(uuid, text) to authenticated;

comment on function public.set_organization_logo_path(uuid, text) is
  'Sets or clears organizations.logo_path for an active org_admin. Path first folder must equal organization UUID.';

-- ---------------------------------------------------------------------------
-- Narrow RPC: display_name only (presentation field; does not unlock legal edit)
-- ---------------------------------------------------------------------------
create or replace function public.set_organization_display_name(
  p_organization_id uuid,
  p_display_name text
)
returns public.organizations
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_org public.organizations;
  v_name text;
begin
  if v_uid is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  if not public.has_org_role(p_organization_id, array['org_admin'::public.org_role]) then
    raise exception 'NOT_AUTHORIZED';
  end if;

  select * into v_org from public.organizations where id = p_organization_id for update;
  if not found then
    raise exception 'ORG_NOT_FOUND';
  end if;

  -- Closed orgs cannot change presentation branding.
  if v_org.status = 'closed' then
    raise exception 'ORG_PROFILE_LOCKED';
  end if;

  v_name := btrim(coalesce(p_display_name, ''));
  -- Strip control characters
  v_name := regexp_replace(v_name, '[[:cntrl:]]', '', 'g');
  v_name := btrim(v_name);

  if v_name = '' then
    raise exception 'INVALID_DISPLAY_NAME';
  end if;

  if char_length(v_name) > 120 then
    raise exception 'INVALID_DISPLAY_NAME';
  end if;

  if v_name = v_org.display_name then
    return v_org;
  end if;

  update public.organizations
  set display_name = v_name,
      updated_at = now()
  where id = p_organization_id
  returning * into v_org;

  -- Sanitized audit: field name only (no before/after content).
  perform public.create_audit_event(
    p_organization_id,
    'organization',
    p_organization_id,
    'organization_display_name_updated',
    jsonb_build_object('field', 'display_name'),
    jsonb_build_object('field', 'display_name')
  );

  return v_org;
end;
$$;

revoke all on function public.set_organization_display_name(uuid, text) from public;
revoke all on function public.set_organization_display_name(uuid, text) from anon;
grant execute on function public.set_organization_display_name(uuid, text) to authenticated;

comment on function public.set_organization_display_name(uuid, text) is
  'Updates organizations.display_name only for org_admin. Does not change UUID, slug, legal_name, status, or tax fields.';

-- ---------------------------------------------------------------------------
-- Include logo_path in get_my_organization_setup
-- ---------------------------------------------------------------------------
create or replace function public.get_my_organization_setup(
  p_organization_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org public.organizations;
begin
  if auth.uid() is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

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
    'logo_path', v_org.logo_path,
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
