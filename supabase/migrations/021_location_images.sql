-- 021_location_images.sql
-- locations.image_path + private location-images bucket + narrow RPC.
-- Does not alter migrations 001–020.

-- ---------------------------------------------------------------------------
-- locations.image_path (object path only — never a signed/public URL)
-- ---------------------------------------------------------------------------
alter table public.locations
  add column if not exists image_path text;

comment on column public.locations.image_path is
  'Private Storage object path in location-images bucket (<org-uuid>/<location-uuid>/version.jpg). Never store signed URLs.';

-- ---------------------------------------------------------------------------
-- Private bucket
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'location-images',
  'location-images',
  false,
  2097152, -- 2 MiB processed JPEG
  array['image/jpeg', 'image/png']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Active org members may read location images for their organization folder.
drop policy if exists "location_images_storage_select_member" on storage.objects;
create policy "location_images_storage_select_member"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'location-images'
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

-- org_admin + org_scheduler may write (canManageLocations)
drop policy if exists "location_images_storage_insert_manager" on storage.objects;
create policy "location_images_storage_insert_manager"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'location-images'
  and (storage.foldername(name))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  and public.has_org_role(
    ((storage.foldername(name))[1])::uuid,
    array[
      'org_admin'::public.org_role,
      'org_scheduler'::public.org_role
    ]
  )
);

drop policy if exists "location_images_storage_update_manager" on storage.objects;
create policy "location_images_storage_update_manager"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'location-images'
  and (storage.foldername(name))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  and public.has_org_role(
    ((storage.foldername(name))[1])::uuid,
    array[
      'org_admin'::public.org_role,
      'org_scheduler'::public.org_role
    ]
  )
)
with check (
  bucket_id = 'location-images'
  and (storage.foldername(name))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  and public.has_org_role(
    ((storage.foldername(name))[1])::uuid,
    array[
      'org_admin'::public.org_role,
      'org_scheduler'::public.org_role
    ]
  )
);

drop policy if exists "location_images_storage_delete_manager" on storage.objects;
create policy "location_images_storage_delete_manager"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'location-images'
  and (storage.foldername(name))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  and public.has_org_role(
    ((storage.foldername(name))[1])::uuid,
    array[
      'org_admin'::public.org_role,
      'org_scheduler'::public.org_role
    ]
  )
);

-- ---------------------------------------------------------------------------
-- Narrow RPC: set or clear locations.image_path
-- ---------------------------------------------------------------------------
create or replace function public.set_location_image_path(
  p_organization_id uuid,
  p_location_id uuid,
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
  v_org uuid;
begin
  if v_uid is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  if not public.has_org_role(
    p_organization_id,
    array[
      'org_admin'::public.org_role,
      'org_scheduler'::public.org_role
    ]
  ) then
    raise exception 'FORBIDDEN';
  end if;

  select organization_id into v_org
  from public.locations
  where id = p_location_id;

  if v_org is null or v_org <> p_organization_id then
    raise exception 'LOCATION_NOT_FOUND';
  end if;

  select image_path into v_prev
  from public.locations
  where id = p_location_id;

  if p_path is null or btrim(p_path) = '' then
    update public.locations
    set image_path = null,
        updated_at = now()
    where id = p_location_id;

    return null;
  end if;

  v_path := btrim(p_path);

  -- Must be <org>/<location>/<file>.jpg under this org+location
  if v_path !~ (
    '^' || p_organization_id::text || '/' || p_location_id::text ||
    '/[A-Za-z0-9._-]+\.(jpg|jpeg|png)$'
  ) then
    raise exception 'INVALID_IMAGE_PATH';
  end if;

  update public.locations
  set image_path = v_path,
      updated_at = now()
  where id = p_location_id;

  return v_path;
end;
$$;

revoke all on function public.set_location_image_path(uuid, uuid, text) from public;
revoke all on function public.set_location_image_path(uuid, uuid, text) from anon;
grant execute on function public.set_location_image_path(uuid, uuid, text) to authenticated;

comment on function public.set_location_image_path(uuid, uuid, text) is
  'Sets or clears locations.image_path for org_admin/org_scheduler. Path must be <org>/<location>/<file>.jpg';
