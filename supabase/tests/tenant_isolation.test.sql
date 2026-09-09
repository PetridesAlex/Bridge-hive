-- tenant_isolation.test.sql
-- Org A members cannot read or mutate Org B tenant data.

begin;

select plan(4);

-- Seed identities (privileged role — before SET ROLE)
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  (
    '00000000-0000-0000-0000-000000000000',
    '11111111-1111-1111-1111-111111111111',
    'authenticated', 'authenticated', 'orga@test.local', 'x',
    now(), '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Org A Admin"}'::jsonb, now(), now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '22222222-2222-2222-2222-222222222222',
    'authenticated', 'authenticated', 'orgb@test.local', 'x',
    now(), '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Org B Admin"}'::jsonb, now(), now()
  )
on conflict (id) do nothing;

insert into public.profiles (id, full_name) values
  ('11111111-1111-1111-1111-111111111111', 'Org A Admin'),
  ('22222222-2222-2222-2222-222222222222', 'Org B Admin')
on conflict (id) do nothing;

insert into public.organizations (id, legal_name, display_name, slug, status)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Org A Ltd', 'Org A', 'org-a-iso', 'active'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Org B Ltd', 'Org B', 'org-b-iso', 'active')
on conflict (id) do nothing;

insert into public.organization_members (organization_id, user_id, role, status, accepted_at)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'org_admin', 'active', now()),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '22222222-2222-2222-2222-222222222222', 'org_admin', 'active', now())
on conflict (organization_id, user_id) do nothing;

insert into public.locations (id, organization_id, name)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaa0001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Site A'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbb0001', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Site B')
on conflict (id) do nothing;

insert into public.shifts (
  id, organization_id, location_id, required_role,
  starts_at, ends_at, break_minutes, rate_minor, currency, status, acceptance_deadline
) values
  (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaa0002',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaa0001',
    'registered_nurse',
    now() + interval '2 days', now() + interval '2 days 8 hours',
    30, 2500, 'EUR', 'published', now() + interval '1 day'
  ),
  (
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbb0002',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbb0001',
    'registered_nurse',
    now() + interval '3 days', now() + interval '3 days 8 hours',
    30, 2600, 'EUR', 'published', now() + interval '2 days'
  )
on conflict (id) do nothing;

-- Authenticate as Org A admin
select set_config(
  'request.jwt.claims',
  '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated","aud":"authenticated"}',
  true
);
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;

select isnt_empty(
  $$ select 1 from public.shifts where organization_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' $$,
  'Org A can see own shifts'
);

select is_empty(
  $$ select 1 from public.shifts where organization_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb' $$,
  'Org A cannot see Org B shifts'
);

select is_empty(
  $$ select 1 from public.organizations where id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb' $$,
  'Org A cannot see Org B organization row'
);

select is(
  (
    select count(*)::integer
    from public.shifts
    where id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbb0002'
  ),
  0,
  'Org A update target Org B shift is invisible under RLS'
);

select * from finish();
rollback;
