-- shift_positions_last_seat_race.test.sql
-- True concurrent last-seat race via two dblink sessions.
--
-- IMPORTANT:
-- - Does NOT use begin/rollback around fixtures — dblink sessions only see
--   committed rows. Cleanup is explicit.
-- - Targets the disposable local Supabase database only.
-- - Requires extension dblink (available on local Supabase Postgres).
--
-- Run (after Docker + `npx supabase start` + migrations applied):
--   npx supabase test db --file supabase/tests/shift_positions_last_seat_race.test.sql
-- or:
--   npm run test:db

create extension if not exists pgtap with schema extensions;
create extension if not exists dblink with schema extensions;

-- Bound runaway waits
set statement_timeout = '15s';
set lock_timeout = '10s';

select plan(6);

-- ---------------------------------------------------------------------------
-- Cleanup any leftover fixtures from a prior interrupted run
-- ---------------------------------------------------------------------------
delete from public.worker_commission_invoices
where assignment_id in (
  select id from public.shift_assignments
  where shift_id = 'd3150001-cccc-4000-8000-0000000000s1'
);
delete from public.shift_assignments
where shift_id = 'd3150001-cccc-4000-8000-0000000000s1';
delete from public.shifts
where id = 'd3150001-cccc-4000-8000-0000000000s1';

-- ---------------------------------------------------------------------------
-- Seed (committed so dblink sessions can see it)
-- ---------------------------------------------------------------------------
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  (
    '00000000-0000-0000-0000-000000000000',
    'd3150001-0000-4000-8000-000000000001',
    'authenticated', 'authenticated', 'race-admin@test.local', 'x',
    now(), '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Race Admin"}'::jsonb, now(), now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'd3150001-0000-4000-8000-000000000002',
    'authenticated', 'authenticated', 'race-nurse-a@test.local', 'x',
    now(), '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Race Nurse A"}'::jsonb, now(), now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'd3150001-0000-4000-8000-000000000003',
    'authenticated', 'authenticated', 'race-nurse-b@test.local', 'x',
    now(), '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Race Nurse B"}'::jsonb, now(), now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'd3150001-0000-4000-8000-000000000004',
    'authenticated', 'authenticated', 'race-nurse-c@test.local', 'x',
    now(), '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Race Nurse C"}'::jsonb, now(), now()
  )
on conflict (id) do nothing;

insert into public.profiles (id, full_name, account_status) values
  ('d3150001-0000-4000-8000-000000000001', 'Race Admin', 'active'),
  ('d3150001-0000-4000-8000-000000000002', 'Race Nurse A', 'active'),
  ('d3150001-0000-4000-8000-000000000003', 'Race Nurse B', 'active'),
  ('d3150001-0000-4000-8000-000000000004', 'Race Nurse C', 'active')
on conflict (id) do update set account_status = excluded.account_status;

insert into public.organizations (id, legal_name, display_name, slug, status)
values (
  'd3150001-cccc-4000-8000-0000000000a1',
  'Race Org Ltd', 'Race Org', 'race-cap-org', 'active'
)
on conflict (id) do nothing;

insert into public.organization_members (organization_id, user_id, role, status, accepted_at)
values (
  'd3150001-cccc-4000-8000-0000000000a1',
  'd3150001-0000-4000-8000-000000000001',
  'org_admin', 'active', now()
)
on conflict (organization_id, user_id) do nothing;

insert into public.locations (id, organization_id, name)
values (
  'd3150001-cccc-4000-8000-0000000000c1',
  'd3150001-cccc-4000-8000-0000000000a1',
  'Race Site'
)
on conflict (id) do nothing;

insert into public.worker_profiles (user_id, worker_role, onboarding_status)
values
  ('d3150001-0000-4000-8000-000000000002', 'registered_nurse', 'completed'),
  ('d3150001-0000-4000-8000-000000000003', 'registered_nurse', 'completed'),
  ('d3150001-0000-4000-8000-000000000004', 'registered_nurse', 'completed')
on conflict (user_id) do update
set worker_role = excluded.worker_role,
    onboarding_status = excluded.onboarding_status;

select set_config('bridgehive.allow_platform_verify', 'on', true);
update public.worker_profiles
set verification_status = 'verified'
where user_id in (
  'd3150001-0000-4000-8000-000000000002',
  'd3150001-0000-4000-8000-000000000003',
  'd3150001-0000-4000-8000-000000000004'
);

insert into public.payout_accounts (
  worker_id, country, currency, masked_iban, status, verified_at, last_verified_at
)
select
  u.id, 'CY', 'EUR', 'CY••••' || right(u.id::text, 4), 'verified', now(), now()
from (
  values
    ('d3150001-0000-4000-8000-000000000002'::uuid),
    ('d3150001-0000-4000-8000-000000000003'::uuid),
    ('d3150001-0000-4000-8000-000000000004'::uuid)
) as u(id)
on conflict (worker_id) do update
set status = 'verified', verified_at = now(), last_verified_at = now();

delete from public.credentials
where worker_id in (
  'd3150001-0000-4000-8000-000000000002',
  'd3150001-0000-4000-8000-000000000003',
  'd3150001-0000-4000-8000-000000000004'
);

insert into public.credentials (
  worker_id, credential_type, status, expires_at, storage_path, storage_paths, verified_at
)
select
  w.id,
  t.cred_type,
  'verified',
  now() + interval '1 year',
  w.id::text || '/' || t.cred_type || '/seed.pdf',
  jsonb_build_array(w.id::text || '/' || t.cred_type || '/seed.pdf'),
  now()
from (
  values
    ('d3150001-0000-4000-8000-000000000002'::uuid),
    ('d3150001-0000-4000-8000-000000000003'::uuid),
    ('d3150001-0000-4000-8000-000000000004'::uuid)
) as w(id)
cross join unnest(public.worker_required_credential_types('registered_nurse')) as t(cred_type);
select set_config('bridgehive.allow_platform_verify', 'off', true);

insert into public.shifts (
  id, organization_id, location_id, required_role, required_positions,
  starts_at, ends_at, break_minutes, rate_minor, currency, status, acceptance_deadline
) values (
  'd3150001-cccc-4000-8000-0000000000s1',
  'd3150001-cccc-4000-8000-0000000000a1',
  'd3150001-cccc-4000-8000-0000000000c1',
  'registered_nurse',
  2,
  now() + interval '9 days', now() + interval '9 days 8 hours',
  0, 2500, 'EUR', 'published', now() + interval '8 days'
)
on conflict (id) do update
set required_positions = 2,
    status = 'published',
    starts_at = excluded.starts_at,
    ends_at = excluded.ends_at,
    acceptance_deadline = excluded.acceptance_deadline;

-- Fill one seat so only the last position remains
select set_config('bridgehive.allow_assignment_write', 'on', true);
delete from public.shift_assignments
where shift_id = 'd3150001-cccc-4000-8000-0000000000s1';
insert into public.shift_assignments (shift_id, worker_id, status, accepted_at)
values (
  'd3150001-cccc-4000-8000-0000000000s1',
  'd3150001-0000-4000-8000-000000000002',
  'accepted',
  now()
);
select set_config('bridgehive.allow_assignment_write', 'off', true);

select is(
  public.shift_open_positions('d3150001-cccc-4000-8000-0000000000s1'),
  1,
  'fixture leaves exactly one open position before the race'
);

-- ---------------------------------------------------------------------------
-- Two independent sessions race the final seat
-- ---------------------------------------------------------------------------
select dblink_connect(
  'race_a',
  format('dbname=%s user=%s', current_database(), session_user)
);
select dblink_connect(
  'race_b',
  format('dbname=%s user=%s', current_database(), session_user)
);

-- Prepare auth on each remote session (session-level set_config, not local)
select dblink_exec(
  'race_a',
  $q$
    select set_config(
      'request.jwt.claims',
      '{"sub":"d3150001-0000-4000-8000-000000000003","role":"authenticated","aud":"authenticated"}',
      false
    );
    select set_config('request.jwt.claim.sub', 'd3150001-0000-4000-8000-000000000003', false);
    select set_config('request.jwt.claim.role', 'authenticated', false);
  $q$
);
select dblink_exec(
  'race_b',
  $q$
    select set_config(
      'request.jwt.claims',
      '{"sub":"d3150001-0000-4000-8000-000000000004","role":"authenticated","aud":"authenticated"}',
      false
    );
    select set_config('request.jwt.claim.sub', 'd3150001-0000-4000-8000-000000000004', false);
    select set_config('request.jwt.claim.role', 'authenticated', false);
  $q$
);

-- Fire both claims without waiting (overlap)
select is(
  dblink_send_query(
    'race_a',
    $q$
      set role authenticated;
      select (public.claim_shift('d3150001-cccc-4000-8000-0000000000s1')).id::text;
    $q$
  ),
  1,
  'session A claim query dispatched'
);

select is(
  dblink_send_query(
    'race_b',
    $q$
      set role authenticated;
      select (public.claim_shift('d3150001-cccc-4000-8000-0000000000s1')).id::text;
    $q$
  ),
  1,
  'session B claim query dispatched'
);

-- Collect results (one success UUID, one error expected)
create temporary table race_results (
  session_key text primary key,
  ok boolean not null,
  payload text
) on commit drop;

do $$
declare
  v_a text;
  v_b text;
  v_a_ok boolean := false;
  v_b_ok boolean := false;
begin
  begin
    select res into v_a
    from dblink_get_result('race_a') as t(res text);
    v_a_ok := v_a is not null;
  exception when others then
    v_a := sqlerrm;
    v_a_ok := false;
  end;

  begin
    select res into v_b
    from dblink_get_result('race_b') as t(res text);
    v_b_ok := v_b is not null;
  exception when others then
    v_b := sqlerrm;
    v_b_ok := false;
  end;

  insert into race_results(session_key, ok, payload) values
    ('a', v_a_ok, v_a),
    ('b', v_b_ok, v_b);
end;
$$;

select is(
  (select count(*)::integer from race_results where ok),
  1,
  'exactly one of the concurrent last-seat claims succeeds'
);

select is(
  public.shift_active_assignment_count('d3150001-cccc-4000-8000-0000000000s1'),
  2,
  'final occupancy never exceeds required_positions (2)'
);

select is(
  (select status::text from public.shifts where id = 'd3150001-cccc-4000-8000-0000000000s1'),
  'filled',
  'shift is filled after the race'
);

-- Disconnect and cleanup fixtures
select dblink_disconnect('race_a');
select dblink_disconnect('race_b');

delete from public.worker_commission_invoices
where assignment_id in (
  select id from public.shift_assignments
  where shift_id = 'd3150001-cccc-4000-8000-0000000000s1'
);
delete from public.notifications
where data ->> 'shift_id' = 'd3150001-cccc-4000-8000-0000000000s1';
delete from public.shift_assignments
where shift_id = 'd3150001-cccc-4000-8000-0000000000s1';
delete from public.shifts
where id = 'd3150001-cccc-4000-8000-0000000000s1';

select * from finish();
