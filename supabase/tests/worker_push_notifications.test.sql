-- worker_push_notifications.test.sql
-- Token ownership, publication outbox, role matching, and deduplication.

begin;

select plan(43);

create extension if not exists pgtap with schema extensions;

create or replace function pg_temp.auth_as(p_uid uuid)
returns void
language plpgsql
as $$
begin
  perform set_config(
    'request.jwt.claims',
    json_build_object(
      'sub', p_uid::text,
      'role', 'authenticated',
      'aud', 'authenticated'
    )::text,
    true
  );
  perform set_config('request.jwt.claim.sub', p_uid::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  execute 'set local role authenticated';
end;
$$;

select ok(
  (select relrowsecurity from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = 'worker_push_devices'),
  'RLS enabled on worker push devices'
);
select ok(
  (select relrowsecurity from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = 'worker_notification_events'),
  'RLS enabled on notification events'
);
select ok(
  (select relrowsecurity from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = 'worker_notification_deliveries'),
  'RLS enabled on notification deliveries'
);

select ok(
  not has_table_privilege('anon', 'public.worker_push_devices', 'SELECT'),
  'anon cannot read push tokens'
);
select ok(
  not has_table_privilege('anon', 'public.worker_notification_events', 'SELECT'),
  'anon cannot read notification events'
);
select ok(
  not has_table_privilege('authenticated', 'public.worker_notification_deliveries', 'SELECT'),
  'authenticated cannot read push deliveries'
);
select ok(
  not has_table_privilege('authenticated', 'public.worker_push_devices', 'INSERT'),
  'authenticated cannot insert tokens directly'
);

select ok(
  not has_function_privilege('anon', 'public.register_worker_push_device(text, text, text)', 'EXECUTE'),
  'anon cannot register push tokens'
);
select ok(
  not has_function_privilege('anon', 'public.claim_worker_push_deliveries(integer)', 'EXECUTE'),
  'anon cannot claim push deliveries'
);
select ok(
  not has_function_privilege('authenticated', 'public.claim_worker_push_deliveries(integer)', 'EXECUTE'),
  'authenticated cannot claim push deliveries'
);
select ok(
  not has_function_privilege('authenticated', 'public.apply_worker_push_send_results(jsonb)', 'EXECUTE'),
  'authenticated cannot record push send results'
);
select ok(
  not has_function_privilege('authenticated', 'public.apply_worker_push_receipts(jsonb)', 'EXECUTE'),
  'authenticated cannot record push receipts'
);
select ok(
  not has_function_privilege('authenticated', 'public.enqueue_shift_published_notification(uuid)', 'EXECUTE'),
  'authenticated cannot enqueue shift notifications directly'
);
select ok(
  has_function_privilege('service_role', 'public.claim_worker_push_deliveries(integer)', 'EXECUTE'),
  'service role can claim push deliveries'
);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('00000000-0000-0000-0000-000000000000', 'c0340001-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'push-admin@test.local', 'x', now(), '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name":"Push Admin"}'::jsonb, now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'c0340001-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'push-rn@test.local', 'x', now(), '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name":"Push RN"}'::jsonb, now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'c0340001-0000-4000-8000-000000000003', 'authenticated', 'authenticated', 'push-wa@test.local', 'x', now(), '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name":"Push WA"}'::jsonb, now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'c0340001-0000-4000-8000-000000000004', 'authenticated', 'authenticated', 'push-pt@test.local', 'x', now(), '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name":"Push PT"}'::jsonb, now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'c0340001-0000-4000-8000-000000000005', 'authenticated', 'authenticated', 'push-unverified@test.local', 'x', now(), '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name":"Push Unverified"}'::jsonb, now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'c0340001-0000-4000-8000-000000000006', 'authenticated', 'authenticated', 'push-suspended@test.local', 'x', now(), '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name":"Push Suspended"}'::jsonb, now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'c0340001-0000-4000-8000-000000000007', 'authenticated', 'authenticated', 'push-nodevice@test.local', 'x', now(), '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name":"Push No Device"}'::jsonb, now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'c0340001-0000-4000-8000-000000000008', 'authenticated', 'authenticated', 'push-optout@test.local', 'x', now(), '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name":"Push Opt Out"}'::jsonb, now(), now())
on conflict (id) do nothing;

insert into public.profiles (id, full_name, account_status) values
  ('c0340001-0000-4000-8000-000000000001', 'Push Admin', 'active'),
  ('c0340001-0000-4000-8000-000000000002', 'Push RN', 'active'),
  ('c0340001-0000-4000-8000-000000000003', 'Push WA', 'active'),
  ('c0340001-0000-4000-8000-000000000004', 'Push PT', 'active'),
  ('c0340001-0000-4000-8000-000000000005', 'Push Unverified', 'active'),
  ('c0340001-0000-4000-8000-000000000006', 'Push Suspended', 'suspended'),
  ('c0340001-0000-4000-8000-000000000007', 'Push No Device', 'active'),
  ('c0340001-0000-4000-8000-000000000008', 'Push Opt Out', 'active')
on conflict (id) do update set account_status = excluded.account_status, full_name = excluded.full_name;

insert into public.organizations (id, legal_name, display_name, slug, status, timezone)
values (
  'c0340001-cccc-4000-8000-0000000000a1',
  'Push Org Ltd', 'Push Org', 'push-notify-org', 'active', 'Europe/Nicosia'
)
on conflict (id) do nothing;

insert into public.organization_members (organization_id, user_id, role, status, accepted_at)
values (
  'c0340001-cccc-4000-8000-0000000000a1',
  'c0340001-0000-4000-8000-000000000001',
  'org_admin', 'active', now()
)
on conflict (organization_id, user_id) do nothing;

insert into public.locations (id, organization_id, name, timezone)
values (
  'c0340001-cccc-4000-8000-0000000000c1',
  'c0340001-cccc-4000-8000-0000000000a1',
  'Push Hospital',
  'Europe/Nicosia'
)
on conflict (id) do nothing;

insert into public.wards (id, location_id, name)
values (
  'c0340001-cccc-4000-8000-0000000000b1',
  'c0340001-cccc-4000-8000-0000000000c1',
  'ICU'
)
on conflict (id) do nothing;

insert into public.worker_profiles (user_id, worker_role, onboarding_status)
values
  ('c0340001-0000-4000-8000-000000000002', 'registered_nurse', 'completed'),
  ('c0340001-0000-4000-8000-000000000003', 'ward_assistant', 'completed'),
  ('c0340001-0000-4000-8000-000000000004', 'physiotherapist', 'completed'),
  ('c0340001-0000-4000-8000-000000000005', 'registered_nurse', 'completed'),
  ('c0340001-0000-4000-8000-000000000006', 'registered_nurse', 'completed'),
  ('c0340001-0000-4000-8000-000000000007', 'registered_nurse', 'completed'),
  ('c0340001-0000-4000-8000-000000000008', 'registered_nurse', 'completed')
on conflict (user_id) do update set worker_role = excluded.worker_role;

select set_config('bridgehive.allow_platform_verify', 'on', true);
update public.worker_profiles
set verification_status = 'verified'
where user_id in (
  'c0340001-0000-4000-8000-000000000002',
  'c0340001-0000-4000-8000-000000000003',
  'c0340001-0000-4000-8000-000000000004',
  'c0340001-0000-4000-8000-000000000006',
  'c0340001-0000-4000-8000-000000000007',
  'c0340001-0000-4000-8000-000000000008'
);
select set_config('bridgehive.allow_platform_verify', 'off', true);

select pg_temp.auth_as('c0340001-0000-4000-8000-000000000002');
select public.register_worker_push_device('ExponentPushToken[rniosdevice0000001]', 'ios', '0.1.0');
select public.register_worker_push_device('ExponentPushToken[rniosdevice0000001]', 'ios', '0.1.0');

select is(
  (select count(*)::integer from public.worker_push_devices
    where worker_id = 'c0340001-0000-4000-8000-000000000002'
      and expo_push_token = 'ExponentPushToken[rniosdevice0000001]'),
  1,
  'token registration is idempotent'
);

select public.register_worker_push_device('ExponentPushToken[rniosdevice0000002]', 'ios', '0.1.0');
select public.register_worker_push_device('ExponentPushToken[rnandroiddevice0001]', 'android', '0.1.0');

select is(
  (select count(*)::integer from public.worker_push_devices
    where expo_push_token = 'ExponentPushToken[rniosdevice0000001]'
      and invalidated_at is not null),
  1,
  'a replacement iOS token invalidates the previous one'
);

reset role;
insert into public.worker_push_devices (worker_id, expo_push_token, platform, notification_enabled, last_seen_at)
values
  ('c0340001-0000-4000-8000-000000000003', 'ExponentPushToken[waactivedevice00001]', 'ios', true, now()),
  ('c0340001-0000-4000-8000-000000000004', 'ExponentPushToken[ptactivedevice00001]', 'ios', true, now()),
  ('c0340001-0000-4000-8000-000000000005', 'ExponentPushToken[unverifieddevice0001]', 'ios', true, now()),
  ('c0340001-0000-4000-8000-000000000006', 'ExponentPushToken[suspendeddevice00001]', 'ios', true, now()),
  ('c0340001-0000-4000-8000-000000000008', 'ExponentPushToken[optedoutdevice00001]', 'ios', false, now());

select pg_temp.auth_as('c0340001-0000-4000-8000-000000000003');
select is(
  (select count(*)::integer from public.worker_push_devices
    where expo_push_token = 'ExponentPushToken[rnandroiddevice0001]'),
  0,
  'one worker cannot read another worker token'
);

reset role;
select pg_temp.auth_as('c0340001-0000-4000-8000-000000000001');
select is(
  (select count(*)::integer from public.worker_push_devices),
  0,
  'organization admin cannot read worker push tokens'
);

reset role;
insert into public.shifts (
  id, organization_id, location_id, ward_id, required_role,
  starts_at, ends_at, break_minutes, rate_minor, currency, status,
  acceptance_deadline, notes, required_positions
) values (
  'c0340001-cccc-4000-8000-0000000000d9',
  'c0340001-cccc-4000-8000-0000000000a1',
  'c0340001-cccc-4000-8000-0000000000c1',
  'c0340001-cccc-4000-8000-0000000000b1',
  'physiotherapist',
  '2026-10-23 16:00:00+00',
  '2026-10-24 04:30:00+00',
  30, 2500, 'EUR', 'draft',
  '2026-10-23 12:00:00+00',
  'SECRET-WARD-NOTE-991',
  3
);

select is(
  (select count(*)::integer from public.worker_notification_events
    where shift_id = 'c0340001-cccc-4000-8000-0000000000d9'),
  0,
  'draft shift creates no notification event'
);

update public.shifts
set notes = 'SECRET-WARD-NOTE-991 still draft'
where id = 'c0340001-cccc-4000-8000-0000000000d9';

select is(
  (select count(*)::integer from public.worker_notification_events
    where shift_id = 'c0340001-cccc-4000-8000-0000000000d9'),
  0,
  'editing a draft creates no notification event'
);

update public.shifts
set
  starts_at = now() + interval '12 days',
  ends_at = now() + interval '12 days 8 hours',
  acceptance_deadline = now() + interval '11 days'
where id = 'c0340001-cccc-4000-8000-0000000000d9';

select pg_temp.auth_as('c0340001-0000-4000-8000-000000000001');
select public.publish_shift('c0340001-cccc-4000-8000-0000000000d9');

select is(
  (select count(*)::integer from public.worker_notification_events
    where shift_id = 'c0340001-cccc-4000-8000-0000000000d9'),
  1,
  'publishing a shift creates one notification event'
);

reset role;
insert into public.shifts (
  id, organization_id, location_id, ward_id, required_role,
  starts_at, ends_at, break_minutes, rate_minor, currency, status,
  required_positions, notes
) values (
  'c0340001-cccc-4000-8000-0000000000d1',
  'c0340001-cccc-4000-8000-0000000000a1',
  'c0340001-cccc-4000-8000-0000000000c1',
  'c0340001-cccc-4000-8000-0000000000b1',
  'physiotherapist',
  '2026-10-23 16:00:00+00',
  '2026-10-24 04:30:00+00',
  30, 2500, 'EUR', 'published',
  3, 'SECRET-WARD-NOTE-991'
);

select is(
  (select title from public.format_shift_published_notification('c0340001-cccc-4000-8000-0000000000d1')),
  'New Physiotherapist shift',
  'notification title uses the role label'
);
select is(
  (select body from public.format_shift_published_notification('c0340001-cccc-4000-8000-0000000000d1')),
  '23 Oct · 19:00–07:30 · ICU · 3 positions open · €25/hour',
  'notification body uses location time, ward, capacity, and hourly rate'
);

select is(
  (select data from public.notifications
    where user_id = 'c0340001-0000-4000-8000-000000000004'
      and type = 'shift_published'
      and data ->> 'shiftId' = 'c0340001-cccc-4000-8000-0000000000d9'),
  jsonb_build_object(
    'type', 'shift_published',
    'shiftId', 'c0340001-cccc-4000-8000-0000000000d9',
    'url', 'bridgehive://shifts/c0340001-cccc-4000-8000-0000000000d9'
  ),
  'notification payload contains only the shift route'
);

select ok(
  not exists (
    select 1 from public.notifications
    where type = 'shift_published'
      and (body like '%SECRET-WARD-NOTE%' or data::text like '%SECRET-WARD-NOTE%' or data::text like '%@%')
  ),
  'notification rows omit private notes and contact data'
);

reset role;
insert into public.shifts (
  id, organization_id, location_id, ward_id, required_role,
  starts_at, ends_at, break_minutes, rate_minor, currency, status,
  acceptance_deadline, required_positions
) values (
  'c0340001-cccc-4000-8000-0000000000d2',
  'c0340001-cccc-4000-8000-0000000000a1',
  'c0340001-cccc-4000-8000-0000000000c1',
  'c0340001-cccc-4000-8000-0000000000b1',
  'registered_nurse',
  now() + interval '14 days',
  now() + interval '14 days 8 hours',
  0, 2500, 'EUR', 'draft',
  now() + interval '13 days',
  3
);

select pg_temp.auth_as('c0340001-0000-4000-8000-000000000001');
select public.publish_shift('c0340001-cccc-4000-8000-0000000000d2');

select is(
  (select count(*)::integer from public.notifications
    where type = 'shift_published'
      and data ->> 'shiftId' = 'c0340001-cccc-4000-8000-0000000000d2'
      and user_id in (
        'c0340001-0000-4000-8000-000000000002',
        'c0340001-0000-4000-8000-000000000007'
      )),
  2,
  'registered nurses with an active preference are notified'
);
select is(
  (select count(*)::integer from public.notifications
    where type = 'shift_published'
      and data ->> 'shiftId' = 'c0340001-cccc-4000-8000-0000000000d2'
      and user_id in (
        'c0340001-0000-4000-8000-000000000003',
        'c0340001-0000-4000-8000-000000000004',
        'c0340001-0000-4000-8000-000000000005',
        'c0340001-0000-4000-8000-000000000006',
        'c0340001-0000-4000-8000-000000000008'
      )),
  0,
  'other roles, unverified, suspended, and opted-out workers are excluded'
);
select is(
  (select count(*)::integer from public.worker_notification_deliveries d
    join public.worker_notification_events e on e.id = d.event_id
    where e.shift_id = 'c0340001-cccc-4000-8000-0000000000d2'),
  2,
  'only live opted-in tokens receive a delivery'
);
select is(
  (select count(*)::integer from public.worker_notification_deliveries d
    join public.worker_push_devices dev on dev.id = d.device_id
    where dev.invalidated_at is not null or dev.notification_enabled = false),
  0,
  'disabled and invalid tokens are excluded'
);

select is(
  (select count(*)::integer from public.worker_notification_events
    where shift_id = 'c0340001-cccc-4000-8000-0000000000d2'),
  1,
  'one publication event exists before replay'
);

reset role;
select public.enqueue_shift_published_notification('c0340001-cccc-4000-8000-0000000000d2');

select is(
  (select count(*)::integer from public.worker_notification_events
    where shift_id = 'c0340001-cccc-4000-8000-0000000000d2'),
  1,
  'replaying enqueue does not create a duplicate event'
);
select is(
  (select count(*)::integer from public.worker_notification_deliveries d
    join public.worker_notification_events e on e.id = d.event_id
    where e.shift_id = 'c0340001-cccc-4000-8000-0000000000d2'),
  2,
  'replaying enqueue does not create duplicate deliveries'
);

select pg_temp.auth_as('c0340001-0000-4000-8000-000000000001');
select throws_ok(
  $$ select public.publish_shift('c0340001-cccc-4000-8000-0000000000d2') $$,
  'P0001',
  'SHIFT_NOT_DRAFT',
  'publishing the same shift again does not notify again'
);

reset role;
insert into public.shifts (
  id, organization_id, location_id, required_role,
  starts_at, ends_at, break_minutes, rate_minor, currency, status, required_positions
) values (
  'c0340001-cccc-4000-8000-0000000000d4',
  'c0340001-cccc-4000-8000-0000000000a1',
  'c0340001-cccc-4000-8000-0000000000c1',
  'registered_nurse',
  now() + interval '16 days',
  now() + interval '16 days 8 hours',
  0, 2500, 'EUR', 'published', 1
);
insert into public.shift_assignments (shift_id, worker_id, status)
values (
  'c0340001-cccc-4000-8000-0000000000d4',
  'c0340001-0000-4000-8000-000000000002',
  'accepted'
);

select ok(
  public.enqueue_shift_published_notification('c0340001-cccc-4000-8000-0000000000d4') is null,
  'a full shift does not create a notification event'
);
select is(
  (select count(*)::integer from public.worker_notification_events
    where shift_id = 'c0340001-cccc-4000-8000-0000000000d4'),
  0,
  'full shifts stay out of the outbox'
);

insert into public.shifts (
  id, organization_id, location_id, ward_id, required_role,
  starts_at, ends_at, break_minutes, rate_minor, currency, status, required_positions
) values (
  'c0340001-cccc-4000-8000-0000000000d3',
  'c0340001-cccc-4000-8000-0000000000a1',
  'c0340001-cccc-4000-8000-0000000000c1',
  'c0340001-cccc-4000-8000-0000000000b1',
  'ward_assistant',
  '2026-10-23 16:00:00+00',
  '2026-10-24 04:30:00+00',
  0, 1800, 'EUR', 'published', 1
);

select ok(
  (select body from public.format_shift_published_notification('c0340001-cccc-4000-8000-0000000000d3'))
    like '%1 position open%',
  'one open position uses the singular wording'
);
select ok(
  (select body from public.format_shift_published_notification('c0340001-cccc-4000-8000-0000000000d3'))
    not like '%1 positions%',
  'singular capacity does not use the plural word'
);

create temp table push_clock as
select
  now() + interval '21 days' as s1,
  now() + interval '21 days 8 hours' as e1,
  now() + interval '20 days' as dl1,
  now() + interval '22 days' as s2,
  now() + interval '22 days 8 hours' as e2,
  now() + interval '21 days' as dl2;

select pg_temp.auth_as('c0340001-0000-4000-8000-000000000001');
select public.create_shifts_batch(
  'c0340001-cccc-4000-8000-0000000000a1',
  'push-batch-published',
  'published',
  'individual',
  jsonb_build_array(
    jsonb_build_object(
      'location_id', 'c0340001-cccc-4000-8000-0000000000c1',
      'ward_id', 'c0340001-cccc-4000-8000-0000000000b1',
      'required_role', 'registered_nurse',
      'starts_at', (select s1 from push_clock),
      'ends_at', (select e1 from push_clock),
      'break_minutes', 0,
      'rate_minor', 2500,
      'currency', 'EUR',
      'required_positions', 2,
      'acceptance_deadline', (select dl1 from push_clock)
    ),
    jsonb_build_object(
      'location_id', 'c0340001-cccc-4000-8000-0000000000c1',
      'required_role', 'ward_assistant',
      'starts_at', (select s2 from push_clock),
      'ends_at', (select e2 from push_clock),
      'break_minutes', 0,
      'rate_minor', 1800,
      'currency', 'EUR',
      'required_positions', 1,
      'acceptance_deadline', (select dl2 from push_clock)
    )
  )
);

create temp table push_batch as
select public.create_shifts_batch(
  'c0340001-cccc-4000-8000-0000000000a1',
  'push-batch-published',
  'published',
  'individual',
  jsonb_build_array(
    jsonb_build_object(
      'location_id', 'c0340001-cccc-4000-8000-0000000000c1',
      'ward_id', 'c0340001-cccc-4000-8000-0000000000b1',
      'required_role', 'registered_nurse',
      'starts_at', (select s1 from push_clock),
      'ends_at', (select e1 from push_clock),
      'break_minutes', 0,
      'rate_minor', 2500,
      'currency', 'EUR',
      'required_positions', 2,
      'acceptance_deadline', (select dl1 from push_clock)
    ),
    jsonb_build_object(
      'location_id', 'c0340001-cccc-4000-8000-0000000000c1',
      'required_role', 'ward_assistant',
      'starts_at', (select s2 from push_clock),
      'ends_at', (select e2 from push_clock),
      'break_minutes', 0,
      'rate_minor', 1800,
      'currency', 'EUR',
      'required_positions', 1,
      'acceptance_deadline', (select dl2 from push_clock)
    )
  )
) as payload;

select is(
  (select count(*)::integer from public.worker_notification_events e
    where e.shift_id in (
      select value::uuid from push_batch, lateral jsonb_array_elements_text(payload -> 'shift_ids') as value
    )),
  2,
  'bulk publish creates one event per shift'
);
select is(
  (select payload ->> 'idempotent_replay' from push_batch),
  'true',
  'replaying the same bulk request is idempotent'
);

select public.create_shifts_batch(
  'c0340001-cccc-4000-8000-0000000000a1',
  'push-batch-draft',
  'draft',
  'individual',
  jsonb_build_array(
    jsonb_build_object(
      'location_id', 'c0340001-cccc-4000-8000-0000000000c1',
      'required_role', 'registered_nurse',
      'starts_at', (now() + interval '23 days'),
      'ends_at', (now() + interval '23 days 8 hours'),
      'break_minutes', 0,
      'rate_minor', 2500,
      'currency', 'EUR',
      'required_positions', 1
    ),
    jsonb_build_object(
      'location_id', 'c0340001-cccc-4000-8000-0000000000c1',
      'required_role', 'ward_assistant',
      'starts_at', (now() + interval '24 days'),
      'ends_at', (now() + interval '24 days 8 hours'),
      'break_minutes', 0,
      'rate_minor', 1800,
      'currency', 'EUR',
      'required_positions', 1
    )
  )
);

select is(
  (select count(*)::integer from public.worker_notification_events e
    join public.shifts s on s.id = e.shift_id
    where s.creation_batch_id is not null
      and s.status = 'draft'
      and s.organization_id = 'c0340001-cccc-4000-8000-0000000000a1'),
  0,
  'bulk draft creation sends no notifications'
);

reset role;
update public.shifts
set status = 'filled'
where id = 'c0340001-cccc-4000-8000-0000000000d9';
update public.shifts
set status = 'published'
where id = 'c0340001-cccc-4000-8000-0000000000d9';

select is(
  (select count(*)::integer from public.worker_notification_events
    where shift_id = 'c0340001-cccc-4000-8000-0000000000d9'),
  1,
  'reopening capacity does not create another publication event'
);

select pg_temp.auth_as('c0340001-0000-4000-8000-000000000004');
select is(
  (select available from public.get_my_shift_alert_availability(array['c0340001-cccc-4000-8000-0000000000d1']::uuid[])),
  true,
  'a matching verified worker can see an open shift alert'
);

select pg_temp.auth_as('c0340001-0000-4000-8000-000000000003');
select is(
  (select available from public.get_my_shift_alert_availability(array['c0340001-cccc-4000-8000-0000000000d1']::uuid[])),
  false,
  'a different role does not see the shift as available'
);

select * from finish();
rollback;
