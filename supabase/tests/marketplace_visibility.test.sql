-- marketplace_visibility.test.sql
-- Worker marketplace RLS visibility for role match, deadlines, and org status.

begin;

select plan(8);

create extension if not exists pgtap with schema extensions;

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  (
    '00000000-0000-0000-0000-000000000000',
    'b4000001-0000-4000-8000-000000000401',
    'authenticated', 'authenticated', 'mkt-admin@test.local', 'x',
    now(), '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Mkt Admin"}'::jsonb, now(), now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'b4000001-0000-4000-8000-000000000402',
    'authenticated', 'authenticated', 'mkt-ward@test.local', 'x',
    now(), '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Mkt Ward"}'::jsonb, now(), now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'b4000001-0000-4000-8000-000000000403',
    'authenticated', 'authenticated', 'mkt-nurse@test.local', 'x',
    now(), '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Mkt Nurse"}'::jsonb, now(), now()
  )
on conflict (id) do nothing;

insert into public.profiles (id, full_name, account_status) values
  ('b4000001-0000-4000-8000-000000000401', 'Mkt Admin', 'active'),
  ('b4000001-0000-4000-8000-000000000402', 'Mkt Ward', 'active'),
  ('b4000001-0000-4000-8000-000000000403', 'Mkt Nurse', 'active')
on conflict (id) do update set account_status = excluded.account_status;

insert into public.organizations (id, legal_name, display_name, slug, status)
values (
  'b4000001-cccc-4000-8000-0000000000a1',
  'Mkt Org Ltd', 'Mkt Org', 'mkt-vis-org', 'active'
)
on conflict (id) do nothing;

insert into public.organization_members (organization_id, user_id, role, status, accepted_at)
values (
  'b4000001-cccc-4000-8000-0000000000a1',
  'b4000001-0000-4000-8000-000000000401',
  'org_admin', 'active', now()
)
on conflict (organization_id, user_id) do nothing;

insert into public.locations (id, organization_id, name)
values (
  'b4000001-cccc-4000-8000-0000000000c1',
  'b4000001-cccc-4000-8000-0000000000a1',
  'Mkt Site'
)
on conflict (id) do nothing;

insert into public.worker_profiles (user_id, worker_role, onboarding_status)
values
  ('b4000001-0000-4000-8000-000000000402', 'ward_assistant', 'completed'),
  ('b4000001-0000-4000-8000-000000000403', 'registered_nurse', 'completed')
on conflict (user_id) do update
set worker_role = excluded.worker_role;

select set_config('bridgehive.allow_platform_verify', 'on', true);
update public.worker_profiles
set verification_status = 'verified'
where user_id in (
  'b4000001-0000-4000-8000-000000000402',
  'b4000001-0000-4000-8000-000000000403'
);
select set_config('bridgehive.allow_platform_verify', 'off', true);

-- Workers are NOT org members (marketplace must not require membership)
select is(
  (
    select count(*)::integer
    from public.organization_members
    where user_id in (
      'b4000001-0000-4000-8000-000000000402',
      'b4000001-0000-4000-8000-000000000403'
    )
  ),
  0,
  'marketplace workers are not organization members'
);

insert into public.shifts (
  id, organization_id, location_id, required_role,
  starts_at, ends_at, break_minutes, rate_minor, currency, status, acceptance_deadline, title
) values
  (
    'b4000001-cccc-4000-8000-0000000000d1',
    'b4000001-cccc-4000-8000-0000000000a1',
    'b4000001-cccc-4000-8000-0000000000c1',
    'ward_assistant',
    now() + interval '3 days', now() + interval '3 days 8 hours',
    30, 2500, 'EUR', 'published', now() + interval '2 days',
    'Open WA shift'
  ),
  (
    'b4000001-cccc-4000-8000-0000000000d2',
    'b4000001-cccc-4000-8000-0000000000a1',
    'b4000001-cccc-4000-8000-0000000000c1',
    'ward_assistant',
    now() + interval '4 days', now() + interval '4 days 8 hours',
    30, 2500, 'EUR', 'published', now() - interval '1 hour',
    'Expired deadline WA shift'
  ),
  (
    'b4000001-cccc-4000-8000-0000000000d3',
    'b4000001-cccc-4000-8000-0000000000a1',
    'b4000001-cccc-4000-8000-0000000000c1',
    'registered_nurse',
    now() + interval '5 days', now() + interval '5 days 8 hours',
    30, 2800, 'EUR', 'published', now() + interval '4 days',
    'Open RN shift'
  ),
  (
    'b4000001-cccc-4000-8000-0000000000d4',
    'b4000001-cccc-4000-8000-0000000000a1',
    'b4000001-cccc-4000-8000-0000000000c1',
    'ward_assistant',
    now() + interval '6 days', now() + interval '6 days 8 hours',
    30, 2500, 'EUR', 'draft', now() + interval '5 days',
    'Draft WA shift'
  )
on conflict (id) do nothing;

create or replace function pg_temp.auth_as(p_uid uuid)
returns void
language plpgsql
as $$
begin
  perform set_config(
    'request.jwt.claims',
    json_build_object('sub', p_uid::text, 'role', 'authenticated', 'aud', 'authenticated')::text,
    true
  );
  perform set_config('request.jwt.claim.sub', p_uid::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  execute 'set local role authenticated';
end;
$$;

-- Ward sees open WA, not expired, not RN, not draft
reset role;
select pg_temp.auth_as('b4000001-0000-4000-8000-000000000402');

select is(
  (
    select count(*)::integer
    from public.shifts
    where status = 'published'
      and id = 'b4000001-cccc-4000-8000-0000000000d1'
  ),
  1,
  'eligible ward assistant sees published open WA shift'
);

select is(
  (
    select count(*)::integer
    from public.shifts
    where status = 'published'
      and id = 'b4000001-cccc-4000-8000-0000000000d2'
  ),
  0,
  'expired acceptance deadline hides WA shift from marketplace'
);

select is(
  (
    select count(*)::integer
    from public.shifts
    where status = 'published'
      and id = 'b4000001-cccc-4000-8000-0000000000d3'
  ),
  0,
  'ward assistant does not see nurse shift'
);

select is(
  (
    select count(*)::integer
    from public.shifts
    where id = 'b4000001-cccc-4000-8000-0000000000d4'
  ),
  0,
  'draft shift hidden from marketplace worker'
);

-- Nurse sees RN only
reset role;
select pg_temp.auth_as('b4000001-0000-4000-8000-000000000403');

select is(
  (
    select count(*)::integer
    from public.shifts
    where status = 'published'
      and id = 'b4000001-cccc-4000-8000-0000000000d3'
  ),
  1,
  'eligible nurse sees published open RN shift'
);

select is(
  (
    select count(*)::integer
    from public.shifts
    where status = 'published'
      and id = 'b4000001-cccc-4000-8000-0000000000d1'
  ),
  0,
  'nurse does not see ward-assistant shift'
);

-- Extending deadline restores visibility
reset role;
set local role postgres;
update public.shifts
set acceptance_deadline = now() + interval '1 day'
where id = 'b4000001-cccc-4000-8000-0000000000d2';

reset role;
select pg_temp.auth_as('b4000001-0000-4000-8000-000000000402');

select is(
  (
    select count(*)::integer
    from public.shifts
    where status = 'published'
      and id = 'b4000001-cccc-4000-8000-0000000000d2'
  ),
  1,
  'extending acceptance deadline restores marketplace visibility'
);

select * from finish();
rollback;
