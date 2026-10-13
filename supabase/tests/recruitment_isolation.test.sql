-- recruitment_isolation.test.sql
-- Anon deny, org pipeline isolation, doc gate, admin access, enablement,
-- note availability rule, service_role-only submit execute.

begin;

select plan(23);

-- ---------------------------------------------------------------------------
-- Seed users
-- ---------------------------------------------------------------------------

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  (
    '00000000-0000-0000-0000-000000000000',
    'c1000001-0000-4000-8000-000000000001',
    'authenticated', 'authenticated', 'rec-orga@test.local', 'x',
    now(), '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Rec Org A Admin"}'::jsonb, now(), now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'c1000001-0000-4000-8000-000000000002',
    'authenticated', 'authenticated', 'rec-orgb@test.local', 'x',
    now(), '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Rec Org B Admin"}'::jsonb, now(), now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'c1000001-0000-4000-8000-000000000003',
    'authenticated', 'authenticated', 'rec-scheduler@test.local', 'x',
    now(), '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Rec Scheduler"}'::jsonb, now(), now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'c1000001-0000-4000-8000-000000000004',
    'authenticated', 'authenticated', 'rec-super@test.local', 'x',
    now(), '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Rec Super Admin"}'::jsonb, now(), now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'c1000001-0000-4000-8000-000000000005',
    'authenticated', 'authenticated', 'rec-verifier@test.local', 'x',
    now(), '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Rec Verifier"}'::jsonb, now(), now()
  )
on conflict (id) do nothing;

insert into public.profiles (id, full_name) values
  ('c1000001-0000-4000-8000-000000000001', 'Rec Org A Admin'),
  ('c1000001-0000-4000-8000-000000000002', 'Rec Org B Admin'),
  ('c1000001-0000-4000-8000-000000000003', 'Rec Scheduler'),
  ('c1000001-0000-4000-8000-000000000004', 'Rec Super Admin'),
  ('c1000001-0000-4000-8000-000000000005', 'Rec Verifier')
on conflict (id) do nothing;

insert into public.platform_admin_roles (user_id, role) values
  ('c1000001-0000-4000-8000-000000000004', 'platform_super_admin'),
  ('c1000001-0000-4000-8000-000000000005', 'platform_verifier')
on conflict (user_id) do update set role = excluded.role;

insert into public.organizations (id, legal_name, display_name, slug, status, recruitment_enabled)
values
  (
    'c1000001-aaaa-4000-8000-0000000000a1',
    'Rec Org A Ltd', 'Rec Org A', 'rec-org-a', 'active', true
  ),
  (
    'c1000001-bbbb-4000-8000-0000000000b1',
    'Rec Org B Ltd', 'Rec Org B', 'rec-org-b', 'active', true
  ),
  (
    'c1000001-cccc-4000-8000-0000000000c1',
    'Rec Org Disabled Ltd', 'Rec Org Disabled', 'rec-org-disabled', 'active', false
  )
on conflict (id) do nothing;

insert into public.organization_members (organization_id, user_id, role, status, accepted_at)
values
  (
    'c1000001-aaaa-4000-8000-0000000000a1',
    'c1000001-0000-4000-8000-000000000001',
    'org_admin', 'active', now()
  ),
  (
    'c1000001-bbbb-4000-8000-0000000000b1',
    'c1000001-0000-4000-8000-000000000002',
    'org_admin', 'active', now()
  ),
  (
    'c1000001-aaaa-4000-8000-0000000000a1',
    'c1000001-0000-4000-8000-000000000003',
    'org_scheduler', 'active', now()
  ),
  (
    'c1000001-cccc-4000-8000-0000000000c1',
    'c1000001-0000-4000-8000-000000000001',
    'org_admin', 'active', now()
  )
on conflict (organization_id, user_id) do nothing;

insert into public.recruitment_candidates (
  id, full_name, email_normalized, phone, current_location, country_of_residence,
  role, years_experience, registration_state, platform_status
) values
  (
    'c1000001-dddd-4000-8000-0000000000d1',
    'Available Candidate',
    'available.candidate@test.local',
    '+35799000001',
    'Nicosia',
    'Cyprus',
    'registered_nurse',
    '5 years',
    'Registered',
    'available'
  ),
  (
    'c1000001-dddd-4000-8000-0000000000d2',
    'Received Candidate',
    'received.candidate@test.local',
    '+35799000002',
    'Limassol',
    'Cyprus',
    'ward_assistant',
    '2 years',
    'N/A',
    'received'
  ),
  (
    'c1000001-dddd-4000-8000-0000000000d3',
    'Under Review Candidate',
    'under.review.candidate@test.local',
    '+35799000003',
    'Larnaca',
    'Cyprus',
    'registered_nurse',
    '3 years',
    'Registered',
    'under_review'
  ),
  (
    'c1000001-dddd-4000-8000-0000000000d4',
    'Sticky Pipeline Candidate',
    'sticky.pipeline.candidate@test.local',
    '+35799000004',
    'Paphos',
    'Cyprus',
    'registered_nurse',
    '4 years',
    'Registered',
    'archived'
  )
on conflict (id) do nothing;

insert into public.recruitment_candidate_preferences (
  candidate_id, employment_type, availability
) values
  ('c1000001-dddd-4000-8000-0000000000d1', 'full_time', 'Immediate'),
  ('c1000001-dddd-4000-8000-0000000000d2', 'part_time', 'Evenings'),
  ('c1000001-dddd-4000-8000-0000000000d3', 'full_time', 'Weekdays'),
  ('c1000001-dddd-4000-8000-0000000000d4', 'flexible', 'Flexible')
on conflict (candidate_id) do nothing;

insert into public.recruitment_documents (
  id, candidate_id, document_type, storage_path, mime_type, byte_size
) values (
  'c1000001-eeee-4000-8000-0000000000e1',
  'c1000001-dddd-4000-8000-0000000000d1',
  'cv',
  'c1000001-dddd-4000-8000-0000000000d1/cv/doc.pdf',
  'application/pdf',
  1024
)
on conflict (id) do nothing;

insert into public.recruitment_org_pipeline (
  id, organization_id, candidate_id, status, updated_by
) values
  (
    'c1000001-ffff-4000-8000-0000000000f1',
    'c1000001-aaaa-4000-8000-0000000000a1',
    'c1000001-dddd-4000-8000-0000000000d1',
    'shortlisted',
    'c1000001-0000-4000-8000-000000000001'
  ),
  (
    'c1000001-ffff-4000-8000-0000000000f3',
    'c1000001-aaaa-4000-8000-0000000000a1',
    'c1000001-dddd-4000-8000-0000000000d4',
    'contacted',
    'c1000001-0000-4000-8000-000000000001'
  )
on conflict (organization_id, candidate_id) do nothing;

insert into public.recruitment_org_notes (
  id, organization_id, candidate_id, author_user_id, body
) values (
  'c1000001-ffff-4000-8000-0000000000f2',
  'c1000001-aaaa-4000-8000-0000000000a1',
  'c1000001-dddd-4000-8000-0000000000d1',
  'c1000001-0000-4000-8000-000000000001',
  'Org A private note'
)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- 1. Anon cannot SELECT candidates / documents / pipeline / notes
-- ---------------------------------------------------------------------------

select set_config('request.jwt.claims', '{"role":"anon","aud":"authenticated"}', true);
select set_config('request.jwt.claim.role', 'anon', true);
set local role anon;

select is_empty(
  $$ select 1 from public.recruitment_candidates $$,
  'Anon cannot select recruitment_candidates'
);

select is_empty(
  $$ select 1 from public.recruitment_documents $$,
  'Anon cannot select recruitment_documents'
);

select is_empty(
  $$ select 1 from public.recruitment_org_pipeline $$,
  'Anon cannot select recruitment_org_pipeline'
);

select is_empty(
  $$ select 1 from public.recruitment_org_notes $$,
  'Anon cannot select recruitment_org_notes'
);

select is(
  (
    select count(*)::integer
    from information_schema.routine_privileges
    where routine_schema = 'public'
      and routine_name = 'submit_recruitment_application'
      and grantee = 'anon'
      and privilege_type = 'EXECUTE'
  ),
  0,
  'Anon cannot execute submit_recruitment_application'
);

-- ---------------------------------------------------------------------------
-- 2. Org A admin: sees available candidates + own pipeline/notes only
-- ---------------------------------------------------------------------------

reset role;
select set_config(
  'request.jwt.claims',
  '{"sub":"c1000001-0000-4000-8000-000000000001","role":"authenticated","aud":"authenticated"}',
  true
);
select set_config('request.jwt.claim.sub', 'c1000001-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;

select isnt_empty(
  $$ select 1 from public.recruitment_candidates where id = 'c1000001-dddd-4000-8000-0000000000d1' $$,
  'Org A admin can see available candidate'
);

select is_empty(
  $$ select 1 from public.recruitment_candidates where id = 'c1000001-dddd-4000-8000-0000000000d2' $$,
  'Org A admin cannot see received (not available) candidate'
);

select isnt_empty(
  $$ select 1 from public.recruitment_documents where id = 'c1000001-eeee-4000-8000-0000000000e1' $$,
  'Org A admin can see docs for available candidate'
);

select isnt_empty(
  $$ select 1 from public.recruitment_org_pipeline
     where organization_id = 'c1000001-aaaa-4000-8000-0000000000a1' $$,
  'Org A admin can see own pipeline'
);

select is_empty(
  $$ select 1 from public.recruitment_org_pipeline
     where organization_id = 'c1000001-bbbb-4000-8000-0000000000b1' $$,
  'Org A admin cannot see Org B pipeline rows'
);

select isnt_empty(
  $$ select 1 from public.recruitment_org_notes
     where organization_id = 'c1000001-aaaa-4000-8000-0000000000a1' $$,
  'Org A admin can see own notes'
);

select is(
  public.org_has_recruitment_access('c1000001-aaaa-4000-8000-0000000000a1'),
  true,
  'Org A admin has recruitment access when enabled'
);

select is(
  public.org_has_recruitment_access('c1000001-cccc-4000-8000-0000000000c1'),
  false,
  'Org A admin lacks recruitment access on disabled org'
);

select is(
  (
    select count(*)::integer
    from information_schema.routine_privileges
    where routine_schema = 'public'
      and routine_name = 'submit_recruitment_application'
      and grantee = 'authenticated'
      and privilege_type = 'EXECUTE'
  ),
  0,
  'Authenticated cannot execute submit_recruitment_application'
);

select is(
  (
    select count(*)::integer
    from information_schema.routine_privileges
    where routine_schema = 'public'
      and routine_name = 'submit_recruitment_application'
      and grantee = 'service_role'
      and privilege_type = 'EXECUTE'
  ),
  1,
  'service_role can execute submit_recruitment_application'
);

-- ---------------------------------------------------------------------------
-- 3. Scheduler cannot use recruitment access helper
-- ---------------------------------------------------------------------------

reset role;
select set_config(
  'request.jwt.claims',
  '{"sub":"c1000001-0000-4000-8000-000000000003","role":"authenticated","aud":"authenticated"}',
  true
);
select set_config('request.jwt.claim.sub', 'c1000001-0000-4000-8000-000000000003', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;

select is(
  public.org_has_recruitment_access('c1000001-aaaa-4000-8000-0000000000a1'),
  false,
  'Org scheduler does not get recruitment access'
);

-- ---------------------------------------------------------------------------
-- 4. Org B cannot see Org A notes
-- ---------------------------------------------------------------------------

reset role;
select set_config(
  'request.jwt.claims',
  '{"sub":"c1000001-0000-4000-8000-000000000002","role":"authenticated","aud":"authenticated"}',
  true
);
select set_config('request.jwt.claim.sub', 'c1000001-0000-4000-8000-000000000002', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;

select is_empty(
  $$ select 1 from public.recruitment_org_notes
     where organization_id = 'c1000001-aaaa-4000-8000-0000000000a1' $$,
  'Org B cannot see Org A recruitment notes'
);

select throws_ok(
  $$ select public.add_recruitment_org_note(
       'c1000001-bbbb-4000-8000-0000000000b1',
       'c1000001-dddd-4000-8000-0000000000d4',
       'Org B must not use Org A pipeline relationship'
     ) $$,
  'RECRUITMENT_CANDIDATE_UNAVAILABLE',
  'Org B cannot note candidate via Org A relationship'
);

-- ---------------------------------------------------------------------------
-- 5. Verifier can select candidates including received
-- ---------------------------------------------------------------------------

reset role;
select set_config(
  'request.jwt.claims',
  '{"sub":"c1000001-0000-4000-8000-000000000005","role":"authenticated","aud":"authenticated"}',
  true
);
select set_config('request.jwt.claim.sub', 'c1000001-0000-4000-8000-000000000005', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;

select isnt_empty(
  $$ select 1 from public.recruitment_candidates where platform_status = 'received' $$,
  'Platform verifier can see received candidates'
);

-- ---------------------------------------------------------------------------
-- 6. Org A note write gates (available / relationship / unreleased)
-- ---------------------------------------------------------------------------

reset role;
select set_config(
  'request.jwt.claims',
  '{"sub":"c1000001-0000-4000-8000-000000000001","role":"authenticated","aud":"authenticated"}',
  true
);
select set_config('request.jwt.claim.sub', 'c1000001-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;

select throws_ok(
  $$ select public.add_recruitment_org_note(
       'c1000001-aaaa-4000-8000-0000000000a1',
       'c1000001-dddd-4000-8000-0000000000d2',
       'Should not attach to received candidate'
     ) $$,
  'RECRUITMENT_CANDIDATE_UNAVAILABLE',
  'Org admin cannot note unreleased received candidates'
);

select throws_ok(
  $$ select public.add_recruitment_org_note(
       'c1000001-aaaa-4000-8000-0000000000a1',
       'c1000001-dddd-4000-8000-0000000000d3',
       'Should not attach to under_review candidate'
     ) $$,
  'RECRUITMENT_CANDIDATE_UNAVAILABLE',
  'Org admin cannot note under_review candidates without pipeline'
);

select lives_ok(
  $$ select public.add_recruitment_org_note(
       'c1000001-aaaa-4000-8000-0000000000a1',
       'c1000001-dddd-4000-8000-0000000000d1',
       'Allowed note on available candidate'
     ) $$,
  'Org admin can note available candidate'
);

select lives_ok(
  $$ select public.add_recruitment_org_note(
       'c1000001-aaaa-4000-8000-0000000000a1',
       'c1000001-dddd-4000-8000-0000000000d4',
       'Allowed note via existing pipeline relationship'
     ) $$,
  'Org admin can note candidate with existing pipeline even if not available'
);

select * from finish();
rollback;
