-- 029_recruitment_core.sql
-- Bridge Hive Recruitment: candidates, consents, private docs, org pipeline,
-- org enablement. Separate from marketplace worker verification.
-- Do NOT apply to production until Preview + security review are approved.

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

do $$ begin
  create type public.recruitment_candidate_path as enum ('professional');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.recruitment_platform_status as enum (
    'received',
    'under_review',
    'available',
    'archived',
    'withdrawn'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.recruitment_employment_type as enum (
    'full_time',
    'part_time',
    'locum',
    'flexible'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.recruitment_org_pipeline_status as enum (
    'viewed',
    'shortlisted',
    'contacted',
    'interviewing',
    'offered',
    'hired',
    'not_suitable',
    'archived'
  );
exception when duplicate_object then null;
end $$;

-- ---------------------------------------------------------------------------
-- Organization enablement
-- ---------------------------------------------------------------------------

alter table public.organizations
  add column if not exists recruitment_enabled boolean not null default false;

comment on column public.organizations.recruitment_enabled is
  'When true and org is active, eligible org_admin members may access recruitment.';

-- ---------------------------------------------------------------------------
-- Candidates (platform-owned PII)
-- ---------------------------------------------------------------------------

create table if not exists public.recruitment_candidates (
  id uuid primary key default gen_random_uuid(),
  candidate_path public.recruitment_candidate_path not null default 'professional',
  full_name text not null,
  email_normalized text not null,
  phone text not null,
  current_location text not null,
  country_of_residence text not null,
  preferred_cyprus_location text,
  role public.worker_role not null,
  years_experience text not null,
  registration_state text not null,
  platform_status public.recruitment_platform_status not null default 'received',
  submitted_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint recruitment_candidates_email_format check (
    email_normalized ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
  ),
  constraint recruitment_candidates_name_nonempty check (
    char_length(trim(full_name)) > 0
  )
);

create unique index if not exists recruitment_candidates_email_unique
  on public.recruitment_candidates (email_normalized);

create index if not exists recruitment_candidates_status_role_idx
  on public.recruitment_candidates (platform_status, role, submitted_at desc);

create trigger recruitment_candidates_set_updated_at
before update on public.recruitment_candidates
for each row
execute function public.set_updated_at();

create table if not exists public.recruitment_candidate_preferences (
  candidate_id uuid primary key
    references public.recruitment_candidates (id) on delete cascade,
  employment_type public.recruitment_employment_type not null,
  preferred_environments text,
  areas_of_interest text,
  availability text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger recruitment_candidate_preferences_set_updated_at
before update on public.recruitment_candidate_preferences
for each row
execute function public.set_updated_at();

create table if not exists public.recruitment_consents (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null
    references public.recruitment_candidates (id) on delete cascade,
  privacy_notice_version text not null,
  consented_at timestamptz not null default now(),
  user_agent text,
  created_at timestamptz not null default now(),
  constraint recruitment_consents_version_nonempty check (
    char_length(trim(privacy_notice_version)) > 0
  )
);

create unique index if not exists recruitment_consents_one_per_candidate
  on public.recruitment_consents (candidate_id);

create table if not exists public.recruitment_documents (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null
    references public.recruitment_candidates (id) on delete cascade,
  document_type text not null,
  storage_path text not null,
  mime_type text not null,
  byte_size integer not null check (byte_size > 0 and byte_size <= 10485760),
  original_filename text,
  expires_at date,
  created_at timestamptz not null default now(),
  constraint recruitment_documents_type_nonempty check (
    char_length(trim(document_type)) > 0
  ),
  constraint recruitment_documents_path_nonempty check (
    char_length(trim(storage_path)) > 0
  )
);

create index if not exists recruitment_documents_candidate_idx
  on public.recruitment_documents (candidate_id);

create table if not exists public.recruitment_platform_reviews (
  candidate_id uuid primary key
    references public.recruitment_candidates (id) on delete cascade,
  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  review_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger recruitment_platform_reviews_set_updated_at
before update on public.recruitment_platform_reviews
for each row
execute function public.set_updated_at();

create table if not exists public.recruitment_org_pipeline (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null
    references public.organizations (id) on delete cascade,
  candidate_id uuid not null
    references public.recruitment_candidates (id) on delete cascade,
  status public.recruitment_org_pipeline_status not null default 'viewed',
  updated_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, candidate_id)
);

create index if not exists recruitment_org_pipeline_org_idx
  on public.recruitment_org_pipeline (organization_id, status, updated_at desc);

create trigger recruitment_org_pipeline_set_updated_at
before update on public.recruitment_org_pipeline
for each row
execute function public.set_updated_at();

create table if not exists public.recruitment_org_notes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null
    references public.organizations (id) on delete cascade,
  candidate_id uuid not null
    references public.recruitment_candidates (id) on delete cascade,
  author_user_id uuid not null references public.profiles (id) on delete restrict,
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint recruitment_org_notes_body_nonempty check (
    char_length(trim(body)) > 0
  )
);

create index if not exists recruitment_org_notes_org_candidate_idx
  on public.recruitment_org_notes (organization_id, candidate_id, created_at desc);

create trigger recruitment_org_notes_set_updated_at
before update on public.recruitment_org_notes
for each row
execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Anonymous submit throttle (service-role RPC only; no client policies)
-- ---------------------------------------------------------------------------

create table if not exists public.recruitment_submit_throttle (
  id uuid primary key default gen_random_uuid(),
  client_ip_hash text not null,
  created_at timestamptz not null default now(),
  constraint recruitment_submit_throttle_hash_nonempty check (
    char_length(trim(client_ip_hash)) > 0
  )
);

create index if not exists recruitment_submit_throttle_hash_created_idx
  on public.recruitment_submit_throttle (client_ip_hash, created_at desc);

comment on table public.recruitment_submit_throttle is
  'Hashed client IP timestamps for recruitment submit rate limits. No SELECT policies.';

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create or replace function public.org_has_recruitment_access(p_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organizations o
    where o.id = p_organization_id
      and o.status = 'active'
      and o.recruitment_enabled = true
      and public.has_org_role(p_organization_id, array['org_admin']::public.org_role[])
  );
$$;

revoke all on function public.org_has_recruitment_access(uuid) from public;
grant execute on function public.org_has_recruitment_access(uuid) to authenticated;

-- Shared availability rule for org pipeline writes and org notes.
create or replace function public.recruitment_org_may_write_candidate(
  p_organization_id uuid,
  p_candidate_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.recruitment_candidates c
    where c.id = p_candidate_id
      and (
        c.platform_status = 'available'
        or exists (
          select 1
          from public.recruitment_org_pipeline p
          where p.organization_id = p_organization_id
            and p.candidate_id = p_candidate_id
        )
      )
  );
$$;

revoke all on function public.recruitment_org_may_write_candidate(uuid, uuid) from public;
grant execute on function public.recruitment_org_may_write_candidate(uuid, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Submit RPC (service_role only; public form uses Next.js server action)
-- ---------------------------------------------------------------------------

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

  begin
    v_role := (p_payload->>'role')::public.worker_role;
  exception when others then
    raise exception 'RECRUITMENT_ROLE_INVALID';
  end;

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
      trim(p_payload->>'years_experience'),
      trim(p_payload->>'registration_state'),
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

-- ---------------------------------------------------------------------------
-- Admin: set platform status / org enablement
-- ---------------------------------------------------------------------------

create or replace function public.set_recruitment_candidate_platform_status(
  p_candidate_id uuid,
  p_status public.recruitment_platform_status,
  p_review_note text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_before public.recruitment_platform_status;
begin
  if not (public.is_platform_admin('platform_verifier') or public.is_platform_admin('platform_super_admin')) then
    raise exception 'RECRUITMENT_ADMIN_REQUIRED';
  end if;

  select platform_status into v_before
  from public.recruitment_candidates
  where id = p_candidate_id
  for update;

  if not found then
    raise exception 'RECRUITMENT_CANDIDATE_NOT_FOUND';
  end if;

  update public.recruitment_candidates
  set platform_status = p_status
  where id = p_candidate_id;

  update public.recruitment_platform_reviews
  set
    reviewed_by = auth.uid(),
    reviewed_at = now(),
    review_note = nullif(trim(coalesce(p_review_note, '')), '')
  where candidate_id = p_candidate_id;

  perform public.create_audit_event(
    null,
    'recruitment_candidate',
    p_candidate_id,
    'recruitment_status_change',
    jsonb_build_object('platform_status', v_before::text),
    jsonb_build_object('platform_status', p_status::text)
  );
end;
$$;

revoke all on function public.set_recruitment_candidate_platform_status(uuid, public.recruitment_platform_status, text) from public;
grant execute on function public.set_recruitment_candidate_platform_status(uuid, public.recruitment_platform_status, text) to authenticated;

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

  update public.organizations
  set recruitment_enabled = p_enabled
  where id = p_organization_id;

  if not found then
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
end;
$$;

revoke all on function public.set_organization_recruitment_enabled(uuid, boolean) from public;
grant execute on function public.set_organization_recruitment_enabled(uuid, boolean) to authenticated;

create or replace function public.upsert_recruitment_org_pipeline(
  p_organization_id uuid,
  p_candidate_id uuid,
  p_status public.recruitment_org_pipeline_status
)
returns public.recruitment_org_pipeline
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.recruitment_org_pipeline;
begin
  if not public.org_has_recruitment_access(p_organization_id) then
    raise exception 'RECRUITMENT_ORG_ACCESS_DENIED';
  end if;

  if not public.recruitment_org_may_write_candidate(p_organization_id, p_candidate_id) then
    raise exception 'RECRUITMENT_CANDIDATE_UNAVAILABLE';
  end if;

  insert into public.recruitment_org_pipeline (
    organization_id, candidate_id, status, updated_by
  )
  values (p_organization_id, p_candidate_id, p_status, auth.uid())
  on conflict (organization_id, candidate_id) do update
    set status = excluded.status,
        updated_by = auth.uid(),
        updated_at = now()
  returning * into v_row;

  perform public.create_audit_event(
    p_organization_id,
    'recruitment_org_pipeline',
    v_row.id,
    'recruitment_status_change',
    null,
    jsonb_build_object(
      'candidate_id', p_candidate_id,
      'status', p_status::text
    )
  );

  return v_row;
end;
$$;

revoke all on function public.upsert_recruitment_org_pipeline(uuid, uuid, public.recruitment_org_pipeline_status) from public;
grant execute on function public.upsert_recruitment_org_pipeline(uuid, uuid, public.recruitment_org_pipeline_status) to authenticated;

create or replace function public.add_recruitment_org_note(
  p_organization_id uuid,
  p_candidate_id uuid,
  p_body text
)
returns public.recruitment_org_notes
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.recruitment_org_notes;
begin
  if not public.org_has_recruitment_access(p_organization_id) then
    raise exception 'RECRUITMENT_ORG_ACCESS_DENIED';
  end if;

  if not public.recruitment_org_may_write_candidate(p_organization_id, p_candidate_id) then
    raise exception 'RECRUITMENT_CANDIDATE_UNAVAILABLE';
  end if;

  insert into public.recruitment_org_notes (
    organization_id, candidate_id, author_user_id, body
  )
  values (
    p_organization_id,
    p_candidate_id,
    auth.uid(),
    trim(p_body)
  )
  returning * into v_row;

  perform public.create_audit_event(
    p_organization_id,
    'recruitment_org_note',
    v_row.id,
    'recruitment_note_add',
    null,
    jsonb_build_object('candidate_id', p_candidate_id)
  );

  return v_row;
end;
$$;

revoke all on function public.add_recruitment_org_note(uuid, uuid, text) from public;
grant execute on function public.add_recruitment_org_note(uuid, uuid, text) to authenticated;

create or replace function public.audit_recruitment_document_view(
  p_document_id uuid,
  p_organization_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_candidate uuid;
begin
  select d.candidate_id into v_candidate
  from public.recruitment_documents d
  where d.id = p_document_id;

  if not found then
    raise exception 'RECRUITMENT_DOCUMENT_NOT_FOUND';
  end if;

  if p_organization_id is not null then
    if not public.org_has_recruitment_access(p_organization_id) then
      raise exception 'RECRUITMENT_ORG_ACCESS_DENIED';
    end if;
  elsif not (public.is_platform_admin('platform_verifier') or public.is_platform_admin('platform_super_admin')) then
    raise exception 'RECRUITMENT_ADMIN_REQUIRED';
  end if;

  perform public.create_audit_event(
    p_organization_id,
    'recruitment_document',
    p_document_id,
    'recruitment_document_view',
    null,
    jsonb_build_object('viewed_at', now(), 'candidate_id', v_candidate)
  );
end;
$$;

revoke all on function public.audit_recruitment_document_view(uuid, uuid) from public;
grant execute on function public.audit_recruitment_document_view(uuid, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.recruitment_candidates enable row level security;
alter table public.recruitment_candidate_preferences enable row level security;
alter table public.recruitment_consents enable row level security;
alter table public.recruitment_documents enable row level security;
alter table public.recruitment_platform_reviews enable row level security;
alter table public.recruitment_org_pipeline enable row level security;
alter table public.recruitment_org_notes enable row level security;
alter table public.recruitment_submit_throttle enable row level security;

-- No anon SELECT on any table. Submit is service_role SECURITY DEFINER only.

create policy recruitment_candidates_select_admin
on public.recruitment_candidates for select to authenticated
using (
  (public.is_platform_admin('platform_verifier') or public.is_platform_admin('platform_super_admin'))
);

create policy recruitment_candidates_select_org
on public.recruitment_candidates for select to authenticated
using (
  platform_status = 'available'
  and exists (
    select 1
    from public.organizations o
    where o.recruitment_enabled = true
      and o.status = 'active'
      and public.has_org_role(o.id, array['org_admin']::public.org_role[])
  )
);

create policy recruitment_preferences_select_admin
on public.recruitment_candidate_preferences for select to authenticated
using (
  (public.is_platform_admin('platform_verifier') or public.is_platform_admin('platform_super_admin'))
);

create policy recruitment_preferences_select_org
on public.recruitment_candidate_preferences for select to authenticated
using (
  exists (
    select 1
    from public.recruitment_candidates c
    where c.id = candidate_id
      and c.platform_status = 'available'
      and exists (
        select 1 from public.organizations o
        where o.recruitment_enabled = true
          and o.status = 'active'
          and public.has_org_role(o.id, array['org_admin']::public.org_role[])
      )
  )
);

create policy recruitment_consents_select_admin
on public.recruitment_consents for select to authenticated
using (
  (public.is_platform_admin('platform_verifier') or public.is_platform_admin('platform_super_admin'))
);

create policy recruitment_documents_select_admin
on public.recruitment_documents for select to authenticated
using (
  (public.is_platform_admin('platform_verifier') or public.is_platform_admin('platform_super_admin'))
);

create policy recruitment_documents_select_org
on public.recruitment_documents for select to authenticated
using (
  exists (
    select 1
    from public.recruitment_candidates c
    join public.organizations o on o.recruitment_enabled = true and o.status = 'active'
    where c.id = candidate_id
      and c.platform_status = 'available'
      and public.has_org_role(o.id, array['org_admin']::public.org_role[])
  )
);

create policy recruitment_documents_insert_service
on public.recruitment_documents for insert to authenticated
with check (false);

-- Service role bypasses RLS for inserts from server action.

create policy recruitment_reviews_select_admin
on public.recruitment_platform_reviews for select to authenticated
using (
  (public.is_platform_admin('platform_verifier') or public.is_platform_admin('platform_super_admin'))
);

create policy recruitment_pipeline_select_org
on public.recruitment_org_pipeline for select to authenticated
using (public.org_has_recruitment_access(organization_id));

create policy recruitment_pipeline_select_admin
on public.recruitment_org_pipeline for select to authenticated
using (
  (public.is_platform_admin('platform_verifier') or public.is_platform_admin('platform_super_admin'))
);

create policy recruitment_notes_select_org
on public.recruitment_org_notes for select to authenticated
using (public.org_has_recruitment_access(organization_id));

create policy recruitment_notes_select_admin
on public.recruitment_org_notes for select to authenticated
using (
  (public.is_platform_admin('platform_verifier') or public.is_platform_admin('platform_super_admin'))
);

-- ---------------------------------------------------------------------------
-- Storage bucket (private)
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'recruitment-documents',
  'recruitment-documents',
  false,
  10485760,
  array['application/pdf', 'image/jpeg', 'image/png']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- No direct client storage policies for anon. Service role uploads server-side.
-- Authenticated org/admin read via signed URLs after audit (server action).

create policy recruitment_storage_select_admin
on storage.objects for select to authenticated
using (
  bucket_id = 'recruitment-documents'
  and (public.is_platform_admin('platform_verifier') or public.is_platform_admin('platform_super_admin'))
);

create policy recruitment_storage_select_org
on storage.objects for select to authenticated
using (
  bucket_id = 'recruitment-documents'
  and exists (
    select 1
    from public.recruitment_documents d
    join public.recruitment_candidates c on c.id = d.candidate_id
    join public.organizations o
      on o.recruitment_enabled = true and o.status = 'active'
    where d.storage_path = name
      and c.platform_status = 'available'
      and public.has_org_role(o.id, array['org_admin']::public.org_role[])
  )
);
