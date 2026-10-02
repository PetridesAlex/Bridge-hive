-- 019_worker_profile_avatar.sql
-- Private worker profile photos: avatar_path + worker-avatars bucket + narrow RPC.
-- Does not alter migrations 001–018. Does not grant org/admin access to photos.

-- ---------------------------------------------------------------------------
-- profiles.avatar_path (object path only — never a signed/public URL)
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column if not exists avatar_path text;

comment on column public.profiles.avatar_path is
  'Private Storage object path in worker-avatars bucket (auth.uid()/version.jpg). Never store signed URLs.';

-- ---------------------------------------------------------------------------
-- Private bucket
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'worker-avatars',
  'worker-avatars',
  false,
  2097152, -- 2 MiB processed JPEG
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Own-folder only. No anon. No organization access in this phase.
drop policy if exists "worker_avatars_storage_select_own" on storage.objects;
create policy "worker_avatars_storage_select_own"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'worker-avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "worker_avatars_storage_insert_own" on storage.objects;
create policy "worker_avatars_storage_insert_own"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'worker-avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "worker_avatars_storage_update_own" on storage.objects;
create policy "worker_avatars_storage_update_own"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'worker-avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'worker-avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "worker_avatars_storage_delete_own" on storage.objects;
create policy "worker_avatars_storage_delete_own"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'worker-avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- ---------------------------------------------------------------------------
-- Narrow RPC: set or clear own avatar_path only
-- ---------------------------------------------------------------------------
create or replace function public.set_my_avatar_path(p_path text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_path text;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  if p_path is null or btrim(p_path) = '' then
    update public.profiles
    set avatar_path = null,
        updated_at = now()
    where id = v_uid;
    return null;
  end if;

  v_path := btrim(p_path);

  -- Must be exactly: <auth.uid()>/<safe-filename>.jpg|jpeg
  if v_path !~ (
    '^' || v_uid::text || '/[A-Za-z0-9._-]+\.(jpg|jpeg)$'
  ) then
    raise exception 'Invalid avatar path';
  end if;

  update public.profiles
  set avatar_path = v_path,
      updated_at = now()
  where id = v_uid;

  if not found then
    raise exception 'Profile not found';
  end if;

  return v_path;
end;
$$;

revoke all on function public.set_my_avatar_path(text) from public;
revoke all on function public.set_my_avatar_path(text) from anon;
grant execute on function public.set_my_avatar_path(text) to authenticated;

comment on function public.set_my_avatar_path(text) is
  'Sets or clears profiles.avatar_path for auth.uid() only. Path must live under the caller UUID folder.';
