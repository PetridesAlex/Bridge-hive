-- 003_workers.sql
-- Worker profiles, credentials, and private Storage bucket policies.

-- ---------------------------------------------------------------------------
-- Worker profiles
-- ---------------------------------------------------------------------------

create table public.worker_profiles (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  worker_role public.worker_role,
  bio text,
  onboarding_status public.onboarding_status not null default 'not_started',
  verification_status public.verification_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger worker_profiles_set_updated_at
before update on public.worker_profiles
for each row
execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Credentials (metadata; files live in Storage)
-- ---------------------------------------------------------------------------

create table public.credentials (
  id uuid primary key default gen_random_uuid(),
  worker_id uuid not null references public.worker_profiles (user_id) on delete cascade,
  credential_type text not null,
  expires_at timestamptz,
  status public.credential_status not null default 'pending',
  storage_path text,
  verified_by uuid references public.profiles (id) on delete set null,
  verified_at timestamptz,
  rejection_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint credentials_type_nonempty check (char_length(trim(credential_type)) > 0)
);

-- At most one non-expired, non-rejected credential per type per worker.
create unique index credentials_one_active_per_type
on public.credentials (worker_id, credential_type)
where status in ('pending', 'under_review', 'verified');

create trigger credentials_set_updated_at
before update on public.credentials
for each row
execute function public.set_updated_at();

-- Prevent workers from self-verifying.
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
    return new;
  end if;

  if auth.uid() is not null and auth.role() = 'authenticated' then
    if new.status is distinct from old.status
       or new.verified_by is distinct from old.verified_by
       or new.verified_at is distinct from old.verified_at then
      raise exception 'CREDENTIAL_STATUS_LOCKED';
    end if;
  end if;

  return new;
end;
$$;

create trigger credentials_guard_client_status
before insert or update on public.credentials
for each row
execute function public.credentials_guard_client_status();

-- Prevent workers from self-setting verification_status to verified.
create or replace function public.worker_profiles_guard_verification()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    if new.verification_status is distinct from 'draft' then
      raise exception 'WORKER_VERIFICATION_LOCKED';
    end if;
    return new;
  end if;

  if auth.uid() is not null and auth.role() = 'authenticated' then
    if new.verification_status is distinct from old.verification_status then
      raise exception 'WORKER_VERIFICATION_LOCKED';
    end if;
  end if;

  return new;
end;
$$;

create trigger worker_profiles_guard_verification
before insert or update on public.worker_profiles
for each row
execute function public.worker_profiles_guard_verification();

-- ---------------------------------------------------------------------------
-- RLS: worker_profiles
-- ---------------------------------------------------------------------------

alter table public.worker_profiles enable row level security;

create policy "worker_profiles_select_own"
on public.worker_profiles
for select
to authenticated
using (user_id = auth.uid());

-- Org visibility for assigned workers is added in 005_assignments.sql
-- after shifts and shift_assignments exist.

create policy "worker_profiles_insert_own"
on public.worker_profiles
for insert
to authenticated
with check (user_id = auth.uid());

create policy "worker_profiles_update_own"
on public.worker_profiles
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

revoke all on table public.worker_profiles from anon;
grant select, insert, update on table public.worker_profiles to authenticated;

-- ---------------------------------------------------------------------------
-- RLS: credentials
-- ---------------------------------------------------------------------------

alter table public.credentials enable row level security;

create policy "credentials_select_own"
on public.credentials
for select
to authenticated
using (worker_id = auth.uid());

create policy "credentials_insert_own"
on public.credentials
for insert
to authenticated
with check (worker_id = auth.uid());

create policy "credentials_update_own"
on public.credentials
for update
to authenticated
using (worker_id = auth.uid())
with check (worker_id = auth.uid());

create policy "credentials_delete_own_pending"
on public.credentials
for delete
to authenticated
using (worker_id = auth.uid() and status = 'pending');

revoke all on table public.credentials from anon;
grant select, insert, update, delete on table public.credentials to authenticated;

-- ---------------------------------------------------------------------------
-- Storage buckets
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  (
    'credentials',
    'credentials',
    false,
    10485760,
    array['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
  ),
  (
    'profile-avatars',
    'profile-avatars',
    true,
    5242880,
    array['image/jpeg', 'image/png', 'image/webp']
  )
on conflict (id) do nothing;

-- Credentials: path must start with the user's id.
create policy "credentials_storage_select_own"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'credentials'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "credentials_storage_insert_own"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'credentials'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "credentials_storage_update_own"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'credentials'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'credentials'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "credentials_storage_delete_own"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'credentials'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- Avatars: own folder; public read via public bucket.
create policy "avatars_storage_select_public"
on storage.objects
for select
to public
using (bucket_id = 'profile-avatars');

create policy "avatars_storage_insert_own"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'profile-avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "avatars_storage_update_own"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'profile-avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'profile-avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "avatars_storage_delete_own"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'profile-avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);
