-- bulk_shift_creation.test.sql
-- Auth, cross-tenant, bounds, rollback, idempotency, draft not worker-visible.

begin;
select plan(28);

-- ---------------------------------------------------------------------------
-- Seed: Org A (active) + Org B (active) + suspended org + users
-- ---------------------------------------------------------------------------

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  (
    '00000000-0000-0000-0000-000000000000',
    'c1000001-0000-4000-8000-000000000001',
    'authenticated', 'authenticated', 'bulk-admin-a@test.local', 'x',
    now(), '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Bulk Admin A"}'::jsonb, now(), now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'c1000001-0000-4000-8000-000000000002',
    'authenticated', 'authenticated', 'bulk-sched-a@test.local', 'x',
    now(), '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Bulk Scheduler A"}'::jsonb, now(), now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'c1000001-0000-4000-8000-000000000003',
    'authenticated', 'authenticated', 'bulk-bill-a@test.local', 'x',
    now(), '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Bulk Billing A"}'::jsonb, now(), now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'c1000001-0000-4000-8000-000000000004',
    'authenticated', 'authenticated', 'bulk-admin-b@test.local', 'x',
    now(), '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Bulk Admin B"}'::jsonb, now(), now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'c1000001-0000-4000-8000-000000000005',
    'authenticated', 'authenticated', 'bulk-worker@test.local', 'x',
    now(), '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Bulk Worker"}'::jsonb, now(), now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'c1000001-0000-4000-8000-000000000006',
    'authenticated', 'authenticated', 'bulk-admin-susp@test.local', 'x',
    now(), '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Bulk Suspended Admin"}'::jsonb, now(), now()
  )
on conflict (id) do nothing;

insert into public.profiles (id, full_name)
values
  ('c1000001-0000-4000-8000-000000000001', 'Bulk Admin A'),
  ('c1000001-0000-4000-8000-000000000002', 'Bulk Scheduler A'),
  ('c1000001-0000-4000-8000-000000000003', 'Bulk Billing A'),
  ('c1000001-0000-4000-8000-000000000004', 'Bulk Admin B'),
  ('c1000001-0000-4000-8000-000000000005', 'Bulk Worker'),
  ('c1000001-0000-4000-8000-000000000006', 'Bulk Suspended Admin')
on conflict (id) do update set full_name = excluded.full_name;

insert into public.organizations (id, legal_name, display_name, slug, status, timezone)
values
  (
    'c0c0c0c0-c0c0-40c0-80c0-c0c0c0c0c0c0',
    'Bulk Org A Ltd', 'Bulk Org A', 'bulk-org-a', 'active', 'Europe/Nicosia'
  ),
  (
    'c1c1c1c1-c1c1-41c1-81c1-c1c1c1c1c1c1',
    'Bulk Org B Ltd', 'Bulk Org B', 'bulk-org-b', 'active', 'Europe/Nicosia'
  ),
  (
    'c2c2c2c2-c2c2-42c2-82c2-c2c2c2c2c2c2',
    'Bulk Org Susp Ltd', 'Bulk Org Susp', 'bulk-org-susp', 'suspended', 'Europe/Nicosia'
  )
on conflict (id) do nothing;

insert into public.organization_members (organization_id, user_id, role, status, accepted_at)
values
  (
    'c0c0c0c0-c0c0-40c0-80c0-c0c0c0c0c0c0',
    'c1000001-0000-4000-8000-000000000001',
    'org_admin', 'active', now()
  ),
  (
    'c0c0c0c0-c0c0-40c0-80c0-c0c0c0c0c0c0',
    'c1000001-0000-4000-8000-000000000002',
    'org_scheduler', 'active', now()
  ),
  (
    'c0c0c0c0-c0c0-40c0-80c0-c0c0c0c0c0c0',
    'c1000001-0000-4000-8000-000000000003',
    'org_billing', 'active', now()
  ),
  (
    'c1c1c1c1-c1c1-41c1-81c1-c1c1c1c1c1c1',
    'c1000001-0000-4000-8000-000000000004',
    'org_admin', 'active', now()
  ),
  (
    'c2c2c2c2-c2c2-42c2-82c2-c2c2c2c2c2c2',
    'c1000001-0000-4000-8000-000000000006',
    'org_admin', 'active', now()
  )
on conflict (organization_id, user_id) do nothing;

insert into public.locations (id, organization_id, name, timezone, address_line1, city, country_code)
values
  (
    'c0a00001-0000-4000-8000-000000000001',
    'c0c0c0c0-c0c0-40c0-80c0-c0c0c0c0c0c0',
    'Bulk Clinic A', 'Europe/Nicosia', '1 Bulk St', 'Nicosia', 'CY'
  ),
  (
    'c0b00001-0000-4000-8000-000000000001',
    'c1c1c1c1-c1c1-41c1-81c1-c1c1c1c1c1c1',
    'Bulk Clinic B', 'Europe/Nicosia', '2 Bulk St', 'Limassol', 'CY'
  ),
  (
    'c0s00001-0000-4000-8000-000000000001',
    'c2c2c2c2-c2c2-42c2-82c2-c2c2c2c2c2c2',
    'Bulk Clinic Susp', 'Europe/Nicosia', '3 Bulk St', 'Nicosia', 'CY'
  )
on conflict (id) do nothing;

insert into public.wards (id, location_id, name)
values
  (
    'c0a10001-0000-4000-8000-000000000001',
    'c0a00001-0000-4000-8000-000000000001',
    'Ward A1'
  )
on conflict (id) do nothing;

insert into public.worker_profiles (
  user_id, worker_role, verification_status, onboarding_status
)
values (
  'c1000001-0000-4000-8000-000000000005',
  'registered_nurse',
  'verified',
  'completed'
)
on conflict (user_id) do update
set worker_role = excluded.worker_role,
    verification_status = excluded.verification_status;

-- Schema / grants
select ok(
  exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'shift_creation_batches'
  ),
  'shift_creation_batches table exists'
);

select ok(
  exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'shifts'
      and column_name = 'creation_batch_id'
  ),
  'shifts.creation_batch_id column exists'
);

select ok(
  exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'create_shifts_batch'
      and p.prosecdef
      and coalesce(p.proconfig::text, '') like '%search_path%'
  ),
  'create_shifts_batch is security definer with search_path'
);

select is(
  (
    select count(*)::integer
    from information_schema.routine_privileges
    where routine_schema = 'public'
      and routine_name = 'create_shifts_batch'
      and grantee = 'anon'
      and privilege_type = 'EXECUTE'
  ),
  0,
  'anon cannot execute create_shifts_batch'
);

-- Helper shift payload (2 future shifts)
create or replace function pg_temp.bulk_payload(
  p_location_id uuid,
  p_ward_id uuid default null,
  p_bad_end boolean default false
)
returns jsonb
language sql
as $$
  select jsonb_build_array(
    jsonb_build_object(
      'location_id', p_location_id,
      'ward_id', p_ward_id,
      'required_role', 'registered_nurse',
      'starts_at', (now() + interval '2 days')::text,
      'ends_at', case
        when p_bad_end then (now() + interval '1 day')::text
        else (now() + interval '2 days' + interval '8 hours')::text
      end,
      'break_minutes', 30,
      'rate_minor', 2500,
      'currency', 'EUR',
      'acceptance_deadline', (now() + interval '1 day')::text,
      'title', 'Bulk morning'
    ),
    jsonb_build_object(
      'location_id', p_location_id,
      'ward_id', p_ward_id,
      'required_role', 'ward_assistant',
      'starts_at', (now() + interval '3 days')::text,
      'ends_at', (now() + interval '3 days' + interval '8 hours')::text,
      'break_minutes', 0,
      'rate_minor', 1800,
      'currency', 'EUR',
      'title', 'Bulk afternoon'
    )
  );
$$;

-- Unauthenticated rejected
reset role;
select set_config('request.jwt.claims', '', true);
select set_config('request.jwt.claim.sub', '', true);
select set_config('request.jwt.claim.role', '', true);

select throws_ok(
  $$
    select public.create_shifts_batch(
      'c0c0c0c0-c0c0-40c0-80c0-c0c0c0c0c0c0',
      'req-unauth',
      'draft',
      'individual',
      pg_temp.bulk_payload('c0a00001-0000-4000-8000-000000000001')
    )
  $$,
  'NOT_AUTHENTICATED',
  'unauthenticated create_shifts_batch rejected'
);

-- Billing cannot create
select set_config(
  'request.jwt.claims',
  '{"sub":"c1000001-0000-4000-8000-000000000003","role":"authenticated","aud":"authenticated"}',
  true
);
select set_config('request.jwt.claim.sub', 'c1000001-0000-4000-8000-000000000003', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;

select throws_ok(
  $$
    select public.create_shifts_batch(
      'c0c0c0c0-c0c0-40c0-80c0-c0c0c0c0c0c0',
      'req-billing',
      'draft',
      'individual',
      pg_temp.bulk_payload('c0a00001-0000-4000-8000-000000000001')
    )
  $$,
  'NOT_AUTHORIZED',
  'billing member cannot create batch'
);

-- Cross-tenant location rejected
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
  $$
    select public.create_shifts_batch(
      'c0c0c0c0-c0c0-40c0-80c0-c0c0c0c0c0c0',
      'req-xtenant',
      'draft',
      'individual',
      pg_temp.bulk_payload('c0b00001-0000-4000-8000-000000000001')
    )
  $$,
  'BULK_ROW_ERROR',
  'cross-tenant location rejected'
);

-- Bounds: single row rejected
select throws_ok(
  $$
    select public.create_shifts_batch(
      'c0c0c0c0-c0c0-40c0-80c0-c0c0c0c0c0c0',
      'req-small',
      'draft',
      'individual',
      jsonb_build_array(
        (pg_temp.bulk_payload('c0a00001-0000-4000-8000-000000000001'))->0
      )
    )
  $$,
  'BATCH_TOO_SMALL',
  'single-row batch rejected'
);

-- Bounds: empty rejected
select throws_ok(
  $$
    select public.create_shifts_batch(
      'c0c0c0c0-c0c0-40c0-80c0-c0c0c0c0c0c0',
      'req-empty',
      'draft',
      'individual',
      '[]'::jsonb
    )
  $$,
  'BATCH_TOO_SMALL',
  'empty batch rejected'
);

-- Validation rollback: bad ends_at prevents any insert
select throws_ok(
  $$
    select public.create_shifts_batch(
      'c0c0c0c0-c0c0-40c0-80c0-c0c0c0c0c0c0',
      'req-rollback',
      'draft',
      'custom',
      pg_temp.bulk_payload(
        'c0a00001-0000-4000-8000-000000000001',
        'c0a10001-0000-4000-8000-000000000001',
        true
      )
    )
  $$,
  'BULK_ROW_ERROR',
  'invalid row rejected before insert'
);

select is(
  (
    select count(*)::integer
    from public.shifts
    where organization_id = 'c0c0c0c0-c0c0-40c0-80c0-c0c0c0c0c0c0'
      and title like 'Bulk%'
  ),
  0,
  'failed batch left no shift rows'
);

select is(
  (
    select count(*)::integer
    from public.shift_creation_batches
    where organization_id = 'c0c0c0c0-c0c0-40c0-80c0-c0c0c0c0c0c0'
      and request_key = 'req-rollback'
  ),
  0,
  'failed batch left no batch row'
);

-- Happy path: draft batch
select ok(
  (
    select (public.create_shifts_batch(
      'c0c0c0c0-c0c0-40c0-80c0-c0c0c0c0c0c0',
      'req-draft-1',
      'draft',
      'individual',
      pg_temp.bulk_payload(
        'c0a00001-0000-4000-8000-000000000001',
        'c0a10001-0000-4000-8000-000000000001'
      )
    ) ->> 'idempotent_replay')::boolean = false
  ),
  'draft batch creates successfully'
);

select is(
  (
    select count(*)::integer
    from public.shifts
    where creation_batch_id = (
      select id from public.shift_creation_batches
      where request_key = 'req-draft-1'
        and organization_id = 'c0c0c0c0-c0c0-40c0-80c0-c0c0c0c0c0c0'
    )
      and status = 'draft'
  ),
  2,
  'draft batch inserts two draft shifts'
);

-- Idempotent replay
select is(
  (
    select (public.create_shifts_batch(
      'c0c0c0c0-c0c0-40c0-80c0-c0c0c0c0c0c0',
      'req-draft-1',
      'draft',
      'individual',
      pg_temp.bulk_payload(
        'c0a00001-0000-4000-8000-000000000001',
        'c0a10001-0000-4000-8000-000000000001'
      )
    ) ->> 'idempotent_replay')::boolean
  ),
  true,
  'same request_key returns idempotent replay'
);

select is(
  (
    select count(*)::integer
    from public.shifts
    where organization_id = 'c0c0c0c0-c0c0-40c0-80c0-c0c0c0c0c0c0'
      and creation_batch_id is not null
  ),
  2,
  'idempotent replay does not duplicate shifts'
);

-- Changed payload with same key rejected
select throws_ok(
  $$
    select public.create_shifts_batch(
      'c0c0c0c0-c0c0-40c0-80c0-c0c0c0c0c0c0',
      'req-draft-1',
      'draft',
      'repeat',
      pg_temp.bulk_payload(
        'c0a00001-0000-4000-8000-000000000001',
        'c0a10001-0000-4000-8000-000000000001'
      )
    )
  $$,
  'REQUEST_KEY_CONFLICT',
  'changed payload with same request_key rejected'
);

-- Drafts not visible to workers
reset role;
select set_config(
  'request.jwt.claims',
  '{"sub":"c1000001-0000-4000-8000-000000000005","role":"authenticated","aud":"authenticated"}',
  true
);
select set_config('request.jwt.claim.sub', 'c1000001-0000-4000-8000-000000000005', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;

select is(
  (
    select count(*)::integer
    from public.shifts
    where organization_id = 'c0c0c0c0-c0c0-40c0-80c0-c0c0c0c0c0c0'
      and status = 'draft'
  ),
  0,
  'verified worker cannot see draft batch shifts'
);

-- Publish path (scheduler)
reset role;
select set_config(
  'request.jwt.claims',
  '{"sub":"c1000001-0000-4000-8000-000000000002","role":"authenticated","aud":"authenticated"}',
  true
);
select set_config('request.jwt.claim.sub', 'c1000001-0000-4000-8000-000000000002', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;

select ok(
  (
    select (public.create_shifts_batch(
      'c0c0c0c0-c0c0-40c0-80c0-c0c0c0c0c0c0',
      'req-pub-1',
      'published',
      'custom',
      pg_temp.bulk_payload(
        'c0a00001-0000-4000-8000-000000000001',
        'c0a10001-0000-4000-8000-000000000001'
      )
    ) ->> 'requested_status') = 'published'
  ),
  'scheduler can publish batch'
);

select is(
  (
    select count(*)::integer
    from public.shifts
    where creation_batch_id = (
      select id from public.shift_creation_batches
      where request_key = 'req-pub-1'
    )
      and status = 'published'
  ),
  2,
  'published batch yields published shifts'
);

-- Worker can see published
reset role;
select set_config(
  'request.jwt.claims',
  '{"sub":"c1000001-0000-4000-8000-000000000005","role":"authenticated","aud":"authenticated"}',
  true
);
select set_config('request.jwt.claim.sub', 'c1000001-0000-4000-8000-000000000005', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;

select ok(
  (
    select count(*)::integer
    from public.shifts
    where creation_batch_id = (
      select id from public.shift_creation_batches
      where request_key = 'req-pub-1'
    )
      and status = 'published'
      and required_role = 'registered_nurse'
  ) >= 1,
  'verified worker can see matching published batch shift'
);

-- Suspended org cannot publish
reset role;
select set_config(
  'request.jwt.claims',
  '{"sub":"c1000001-0000-4000-8000-000000000006","role":"authenticated","aud":"authenticated"}',
  true
);
select set_config('request.jwt.claim.sub', 'c1000001-0000-4000-8000-000000000006', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;

select throws_ok(
  $$
    select public.create_shifts_batch(
      'c2c2c2c2-c2c2-42c2-82c2-c2c2c2c2c2c2',
      'req-susp-pub',
      'published',
      'individual',
      pg_temp.bulk_payload('c0s00001-0000-4000-8000-000000000001')
    )
  $$,
  'ORG_NOT_ACTIVE',
  'suspended org cannot publish batch'
);

-- Suspended org can still create drafts (plan: active required only for publish)
select lives_ok(
  $$
    select public.create_shifts_batch(
      'c2c2c2c2-c2c2-42c2-82c2-c2c2c2c2c2c2',
      'req-susp-draft',
      'draft',
      'individual',
      pg_temp.bulk_payload('c0s00001-0000-4000-8000-000000000001')
    )
  $$,
  'suspended org can create draft batch'
);

-- Audit sanitized (counts/status/mode only)
reset role;
select ok(
  exists (
    select 1
    from public.audit_events
    where action = 'bulk_shifts_created'
      and organization_id = 'c0c0c0c0-c0c0-40c0-80c0-c0c0c0c0c0c0'
      and (after ? 'shift_count')
      and (after ? 'requested_status')
      and (after ? 'creation_mode')
      and not (after ? 'rate_minor')
      and not (after ? 'notes')
      and not (after ? 'title')
  ),
  'bulk_shifts_created audit is sanitized'
);

-- Org B cannot read Org A batches
select set_config(
  'request.jwt.claims',
  '{"sub":"c1000001-0000-4000-8000-000000000004","role":"authenticated","aud":"authenticated"}',
  true
);
select set_config('request.jwt.claim.sub', 'c1000001-0000-4000-8000-000000000004', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;

select is(
  (
    select count(*)::integer
    from public.shift_creation_batches
    where organization_id = 'c0c0c0c0-c0c0-40c0-80c0-c0c0c0c0c0c0'
  ),
  0,
  'cross-tenant cannot read other org batches'
);

-- >100 rejected
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
  $$
    select public.create_shifts_batch(
      'c0c0c0c0-c0c0-40c0-80c0-c0c0c0c0c0c0',
      'req-too-large',
      'draft',
      'custom',
      (
        select jsonb_agg(
          jsonb_build_object(
            'location_id', 'c0a00001-0000-4000-8000-000000000001',
            'required_role', 'registered_nurse',
            'starts_at', (now() + (g || ' days')::interval)::text,
            'ends_at', (now() + (g || ' days')::interval + interval '8 hours')::text,
            'break_minutes', 0,
            'rate_minor', 2000,
            'currency', 'EUR'
          )
        )
        from generate_series(1, 101) g
      )
    )
  $$,
  'BATCH_TOO_LARGE',
  'batch over 100 shifts rejected'
);

select * from finish();
rollback;
