-- organization_account_activation.test.sql
-- Delivery columns, mark/resend guards, accept_by_id, cross-tenant denial.

begin;
select plan(15);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  (
    '00000000-0000-0000-0000-000000000000',
    'd1000001-0000-4000-8000-000000000001',
    'authenticated', 'authenticated', 'act-super@test.local', 'x',
    now(), '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Act Super"}'::jsonb, now(), now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'd1000001-0000-4000-8000-000000000002',
    'authenticated', 'authenticated', 'invitee@hospital.test', 'x',
    now(), '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Invitee Admin"}'::jsonb, now(), now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'd1000001-0000-4000-8000-000000000003',
    'authenticated', 'authenticated', 'wrong@hospital.test', 'x',
    now(), '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Wrong Email"}'::jsonb, now(), now()
  )
on conflict (id) do nothing;

insert into public.profiles (id, full_name)
values
  ('d1000001-0000-4000-8000-000000000001', 'Act Super'),
  ('d1000001-0000-4000-8000-000000000002', 'Invitee Admin'),
  ('d1000001-0000-4000-8000-000000000003', 'Wrong Email')
on conflict (id) do update set full_name = excluded.full_name;

insert into public.platform_admin_roles (user_id, role)
values ('d1000001-0000-4000-8000-000000000001', 'platform_super_admin')
on conflict (user_id) do nothing;

insert into public.organizations (id, legal_name, display_name, slug, status, timezone)
values (
  'd0d0d0d0-d0d0-40d0-80d0-d0d0d0d0d0d0',
  'Activation Org Ltd', 'Activation Org', 'activation-org', 'pending', 'Europe/Nicosia'
)
on conflict (id) do nothing;

insert into public.organization_invitations (
  id, organization_id, email_normalized, role, token_hash, expires_at, created_by,
  delivery_status
) values (
  'd1d1d1d1-d1d1-41d1-81d1-d1d1d1d1d1d1',
  'd0d0d0d0-d0d0-40d0-80d0-d0d0d0d0d0d0',
  'invitee@hospital.test',
  'org_admin',
  encode(extensions.digest('activation-test-token', 'sha256'), 'hex'),
  now() + interval '48 hours',
  'd1000001-0000-4000-8000-000000000001',
  'pending'
)
on conflict (id) do nothing;

select ok(
  exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'organization_invitations'
      and column_name = 'delivery_status'
  ),
  'delivery_status column exists'
);

select ok(
  exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'accept_organization_invitation_by_id'
      and p.prosecdef
  ),
  'accept_organization_invitation_by_id is security definer'
);

select is(
  (
    select count(*)::integer
    from information_schema.routine_privileges
    where routine_schema = 'public'
      and routine_name in (
        'mark_organization_invitation_delivery',
        'accept_organization_invitation_by_id',
        'assert_invitation_resend_allowed'
      )
      and grantee = 'anon'
      and privilege_type = 'EXECUTE'
  ),
  0,
  'anon cannot execute activation RPCs'
);

-- Super admin marks sent
select set_config(
  'request.jwt.claims',
  '{"sub":"d1000001-0000-4000-8000-000000000001","role":"authenticated","aud":"authenticated"}',
  true
);
select set_config('request.jwt.claim.sub', 'd1000001-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;

select is(
  (
    select delivery_status
    from public.mark_organization_invitation_delivery(
      'd1d1d1d1-d1d1-41d1-81d1-d1d1d1d1d1d1',
      'sent',
      null
    )
  ),
  'sent',
  'super admin can mark delivery sent'
);

-- Clear cooldown so assert can pass once
reset role;
select set_config('request.jwt.claims', '', true);
select set_config('request.jwt.claim.sub', '', true);
select set_config('request.jwt.claim.role', '', true);
update public.organization_invitations
set last_send_attempt_at = now() - interval '5 minutes'
where id = 'd1d1d1d1-d1d1-41d1-81d1-d1d1d1d1d1d1';

select set_config(
  'request.jwt.claims',
  '{"sub":"d1000001-0000-4000-8000-000000000001","role":"authenticated","aud":"authenticated"}',
  true
);
select set_config('request.jwt.claim.sub', 'd1000001-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;

select lives_ok(
  $$
    select public.assert_invitation_resend_allowed(
      'd1d1d1d1-d1d1-41d1-81d1-d1d1d1d1d1d1'
    )
  $$,
  'resend allowed when cooldown elapsed'
);

-- Force recent attempt for rate limit
reset role;
select set_config('request.jwt.claims', '', true);
select set_config('request.jwt.claim.sub', '', true);
select set_config('request.jwt.claim.role', '', true);
update public.organization_invitations
set last_send_attempt_at = now()
where id = 'd1d1d1d1-d1d1-41d1-81d1-d1d1d1d1d1d1';

select set_config(
  'request.jwt.claims',
  '{"sub":"d1000001-0000-4000-8000-000000000001","role":"authenticated","aud":"authenticated"}',
  true
);
select set_config('request.jwt.claim.sub', 'd1000001-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;

select throws_ok(
  $$
    select public.assert_invitation_resend_allowed(
      'd1d1d1d1-d1d1-41d1-81d1-d1d1d1d1d1d1'
    )
  $$,
  'RATE_LIMITED',
  'resend within cooldown is rate limited'
);

-- Wrong email cannot accept
reset role;
select set_config('request.jwt.claims', '', true);
select set_config('request.jwt.claim.sub', '', true);
select set_config('request.jwt.claim.role', '', true);
update public.organization_invitations
set last_send_attempt_at = now() - interval '5 minutes'
where id = 'd1d1d1d1-d1d1-41d1-81d1-d1d1d1d1d1d1';

select set_config(
  'request.jwt.claims',
  '{"sub":"d1000001-0000-4000-8000-000000000003","role":"authenticated","aud":"authenticated"}',
  true
);
select set_config('request.jwt.claim.sub', 'd1000001-0000-4000-8000-000000000003', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;

select throws_ok(
  $$
    select public.accept_organization_invitation_by_id(
      'd1d1d1d1-d1d1-41d1-81d1-d1d1d1d1d1d1'
    )
  $$,
  'EMAIL_MISMATCH',
  'wrong email cannot accept by id'
);

-- Matching invitee accepts
reset role;
select set_config(
  'request.jwt.claims',
  '{"sub":"d1000001-0000-4000-8000-000000000002","role":"authenticated","aud":"authenticated"}',
  true
);
select set_config('request.jwt.claim.sub', 'd1000001-0000-4000-8000-000000000002', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;

select ok(
  (
    select (public.accept_organization_invitation_by_id(
      'd1d1d1d1-d1d1-41d1-81d1-d1d1d1d1d1d1'
    ) ->> 'slug') = 'activation-org'
  ),
  'matching email accepts invitation by id'
);

-- Privileged reads after accept (not as invitee JWT)
reset role;
select set_config('request.jwt.claims', '', true);
select set_config('request.jwt.claim.sub', '', true);
select set_config('request.jwt.claim.role', '', true);

select is(
  (
    select delivery_status
    from public.organization_invitations
    where id = 'd1d1d1d1-d1d1-41d1-81d1-d1d1d1d1d1d1'
  ),
  'accepted',
  'accept sets delivery_status accepted'
);

select ok(
  exists (
    select 1 from public.organization_members
    where organization_id = 'd0d0d0d0-d0d0-40d0-80d0-d0d0d0d0d0d0'
      and user_id = 'd1000001-0000-4000-8000-000000000002'
      and status = 'active'
      and role = 'org_admin'
  ),
  'membership created on accept_by_id'
);

-- Reuse rejected (re-auth as invitee)
select set_config(
  'request.jwt.claims',
  '{"sub":"d1000001-0000-4000-8000-000000000002","role":"authenticated","aud":"authenticated"}',
  true
);
select set_config('request.jwt.claim.sub', 'd1000001-0000-4000-8000-000000000002', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;

select throws_ok(
  $$
    select public.accept_organization_invitation_by_id(
      'd1d1d1d1-d1d1-41d1-81d1-d1d1d1d1d1d1'
    )
  $$,
  'INVITATION_ALREADY_USED',
  'reused invitation rejected'
);

-- Non-admin cannot mark delivery
reset role;
select set_config(
  'request.jwt.claims',
  '{"sub":"d1000001-0000-4000-8000-000000000002","role":"authenticated","aud":"authenticated"}',
  true
);
select set_config('request.jwt.claim.sub', 'd1000001-0000-4000-8000-000000000002', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;

select throws_ok(
  $$
    select public.mark_organization_invitation_delivery(
      'd1d1d1d1-d1d1-41d1-81d1-d1d1d1d1d1d1',
      'sent',
      null
    )
  $$,
  'NOT_AUTHORIZED',
  'non-platform-admin cannot mark delivery'
);

-- Detail includes delivery fields for super admin
reset role;
select set_config(
  'request.jwt.claims',
  '{"sub":"d1000001-0000-4000-8000-000000000001","role":"authenticated","aud":"authenticated"}',
  true
);
select set_config('request.jwt.claim.sub', 'd1000001-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;

select ok(
  (
    select (public.get_admin_organization_detail(
      'd0d0d0d0-d0d0-40d0-80d0-d0d0d0d0d0d0'
    ) -> 'invitations' -> 0 ? 'delivery_status')
  ),
  'admin detail exposes invitation delivery_status'
);

select ok(
  exists (
    select 1 from public.audit_events
    where organization_id = 'd0d0d0d0-d0d0-40d0-80d0-d0d0d0d0d0d0'
      and action = 'organization_admin_activation_email_sent'
      and not (coalesce(after, '{}'::jsonb) ? 'token')
      and not (coalesce(after, '{}'::jsonb) ? 'raw_token')
  ),
  'activation email audit is sanitized'
);

-- Revoked invite cannot be accepted (fresh invite)
reset role;
select set_config('request.jwt.claims', '', true);
select set_config('request.jwt.claim.sub', '', true);
select set_config('request.jwt.claim.role', '', true);
insert into public.organization_invitations (
  id, organization_id, email_normalized, role, token_hash, expires_at, created_by,
  delivery_status, revoked_at, revoked_by
) values (
  'd2d2d2d2-d2d2-42d2-82d2-d2d2d2d2d2d2',
  'd0d0d0d0-d0d0-40d0-80d0-d0d0d0d0d0d0',
  'invitee@hospital.test',
  'org_admin',
  encode(extensions.digest('activation-revoked-token', 'sha256'), 'hex'),
  now() + interval '48 hours',
  'd1000001-0000-4000-8000-000000000001',
  'revoked',
  now(),
  'd1000001-0000-4000-8000-000000000001'
)
on conflict (id) do nothing;

select set_config(
  'request.jwt.claims',
  '{"sub":"d1000001-0000-4000-8000-000000000002","role":"authenticated","aud":"authenticated"}',
  true
);
select set_config('request.jwt.claim.sub', 'd1000001-0000-4000-8000-000000000002', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;

select throws_ok(
  $$
    select public.accept_organization_invitation_by_id(
      'd2d2d2d2-d2d2-42d2-82d2-d2d2d2d2d2d2'
    )
  $$,
  'INVITATION_REVOKED',
  'revoked invitation rejected by id'
);

select * from finish();
rollback;
