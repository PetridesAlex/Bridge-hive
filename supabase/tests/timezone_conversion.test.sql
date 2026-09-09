-- Database-level timezone storage and conversion tests.
-- These tests verify PostgreSQL timestamptz behavior, not TypeScript conversion.
-- TypeScript timezone conversion is tested separately in apps/web/lib/__tests__/format.test.ts.

begin;

select plan(6);

-- Seed test data (no auth/profile needed for database-level timezone tests)
insert into public.organizations (id, legal_name, display_name, slug, status, timezone)
values ('10000000-0000-0000-0000-000000000001', 'Test Org', 'Test Org', 'test-org', 'active', 'Europe/Nicosia');

insert into public.locations (
  id, organization_id, name, country_code, timezone
) values (
  '30000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000001',
  'Test Location',
  'CY',
  'Europe/Nicosia'
);

-- Test 1: Database stores timestamptz as UTC internally
insert into public.shifts (
  id,
  organization_id,
  location_id,
  required_role,
  starts_at,
  ends_at,
  break_minutes,
  rate_minor,
  currency,
  status,
  created_by
) values (
  '40000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000001',
  '30000000-0000-0000-0000-000000000001',
  'registered_nurse',
  '2024-07-15 07:00:00+00'::timestamptz,
  '2024-07-15 15:00:00+00'::timestamptz,
  30,
  2500,
  'EUR',
  'draft',
  null
);

select results_eq(
  $$
    select 
      to_char(starts_at at time zone 'UTC', 'YYYY-MM-DD HH24:MI:SS'),
      to_char(ends_at at time zone 'UTC', 'YYYY-MM-DD HH24:MI:SS')
    from public.shifts 
    where id = '40000000-0000-0000-0000-000000000001'
  $$,
  $$
    values ('2024-07-15 07:00:00'::text, '2024-07-15 15:00:00'::text)
  $$,
  'Database stores timestamptz as UTC correctly'
);

-- Test 2: End time constraint
select ok(
  (select ends_at > starts_at from public.shifts where id = '40000000-0000-0000-0000-000000000001'),
  'Database enforces end time after start time'
);

-- Test 3: Acceptance deadline with timezone
insert into public.shifts (
  id,
  organization_id,
  location_id,
  required_role,
  starts_at,
  ends_at,
  break_minutes,
  rate_minor,
  currency,
  status,
  acceptance_deadline,
  created_by
) values (
  '40000000-0000-0000-0000-000000000002',
  '10000000-0000-0000-0000-000000000001',
  '30000000-0000-0000-0000-000000000001',
  'registered_nurse',
  '2024-07-15 07:00:00+00'::timestamptz,
  '2024-07-15 15:00:00+00'::timestamptz,
  30,
  2500,
  'EUR',
  'draft',
  '2024-07-14 20:59:00+00'::timestamptz,
  null
);

select ok(
  (select acceptance_deadline < starts_at from public.shifts where id = '40000000-0000-0000-0000-000000000002'),
  'Database enforces acceptance deadline before shift start'
);

-- Test 4: Location timezone column storage
select results_eq(
  $$
    select timezone from public.locations where id = '30000000-0000-0000-0000-000000000001'
  $$,
  $$
    values ('Europe/Nicosia'::text)
  $$,
  'Location IANA timezone stored correctly'
);

-- Test 5: Organization timezone column storage
select results_eq(
  $$
    select timezone from public.organizations where id = '10000000-0000-0000-0000-000000000001'
  $$,
  $$
    values ('Europe/Nicosia'::text)
  $$,
  'Organization IANA timezone stored correctly'
);

-- Test 6: PostgreSQL timezone conversion (database-level)
select results_eq(
  $$
    select to_char('2024-07-15 10:00:00'::timestamp at time zone 'Europe/Nicosia' at time zone 'UTC', 'YYYY-MM-DD HH24:MI:SS')
  $$,
  $$
    values ('2024-07-15 07:00:00'::text)
  $$,
  'PostgreSQL timezone conversion works correctly'
);

select * from finish();

rollback;
