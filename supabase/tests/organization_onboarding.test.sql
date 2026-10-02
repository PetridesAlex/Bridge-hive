-- organization_onboarding.test.sql
-- Platform provisioning, invitations, lifecycle gates, tenant isolation,
-- list sanitization, and audit metadata for organization onboarding.

begin;

select plan(66);

-- ---------------------------------------------------------------------------
-- Seed users
-- ---------------------------------------------------------------------------

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  (
    '00000000-0000-0000-0000-000000000000',
    'b2000001-0000-4000-8000-000000000201',
    'authenticated', 'authenticated', 'org-onboard-super@test.local', 'x',
    now(), '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Onboard Super"}'::jsonb, now(), now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'b2000001-0000-4000-8000-000000000202',
    'authenticated', 'authenticated', 'org-onboard-support@test.local', 'x',
    now(), '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Onboard Support"}'::jsonb, now(), now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'b2000001-0000-4000-8000-000000000203',
    'authenticated', 'authenticated', 'org-onboard-verifier@test.local', 'x',
    now(), '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Onboard Verifier"}'::jsonb, now(), now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'b2000001-0000-4000-8000-000000000204',
    'authenticated', 'authenticated', 'org-onboard-finance@test.local', 'x',
    now(), '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Onboard Finance"}'::jsonb, now(), now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'b2000001-0000-4000-8000-000000000205',
    'authenticated', 'authenticated', 'org-onboard-worker@test.local', 'x',
    now(), '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Onboard Worker"}'::jsonb, now(), now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'b2000001-0000-4000-8000-000000000206',
    'authenticated', 'authenticated', 'invitee@test.local', 'x',
    now(), '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Invitee Admin"}'::jsonb, now(), now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'b2000001-0000-4000-8000-000000000207',
    'authenticated', 'authenticated', 'other@test.local', 'x',
    now(), '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Other User"}'::jsonb, now(), now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'b2000001-0000-4000-8000-000000000208',
    'authenticated', 'authenticated', 'org-onboard-orgb@test.local', 'x',
    now(), '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Org B Member"}'::jsonb, now(), now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'b2000001-0000-4000-8000-000000000209',
    'authenticated', 'authenticated', 'org-onboard-orguser@test.local', 'x',
    now(), '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Existing Org User"}'::jsonb, now(), now()
  )
on conflict (id) do nothing;

insert into public.profiles (id, full_name) values
  ('b2000001-0000-4000-8000-000000000201', 'Onboard Super'),
  ('b2000001-0000-4000-8000-000000000202', 'Onboard Support'),
  ('b2000001-0000-4000-8000-000000000203', 'Onboard Verifier'),
  ('b2000001-0000-4000-8000-000000000204', 'Onboard Finance'),
  ('b2000001-0000-4000-8000-000000000205', 'Onboard Worker'),
  ('b2000001-0000-4000-8000-000000000206', 'Invitee Admin'),
  ('b2000001-0000-4000-8000-000000000207', 'Other User'),
  ('b2000001-0000-4000-8000-000000000208', 'Org B Member'),
  ('b2000001-0000-4000-8000-000000000209', 'Existing Org User')
on conflict (id) do nothing;

insert into public.platform_admin_roles (user_id, role) values
  ('b2000001-0000-4000-8000-000000000201', 'platform_super_admin'),
  ('b2000001-0000-4000-8000-000000000202', 'platform_support'),
  ('b2000001-0000-4000-8000-000000000203', 'platform_verifier'),
  ('b2000001-0000-4000-8000-000000000204', 'platform_finance')
on conflict (user_id) do update set role = excluded.role;

insert into public.worker_profiles (user_id, worker_role, onboarding_status)
values ('b2000001-0000-4000-8000-000000000205', 'registered_nurse', 'completed')
on conflict (user_id) do nothing;

-- Cross-tenant Org B + existing org user membership (active)
insert into public.organizations (id, legal_name, display_name, slug, status)
values (
  'b2000001-cccc-4000-8000-0000000000b1',
  'Onboard Org B Ltd', 'Onboard Org B', 'onboard-org-b', 'active'
)
on conflict (id) do nothing;

insert into public.organization_members (organization_id, user_id, role, status, accepted_at)
values
  (
    'b2000001-cccc-4000-8000-0000000000b1',
    'b2000001-0000-4000-8000-000000000208',
    'org_admin', 'active', now()
  ),
  (
    'b2000001-cccc-4000-8000-0000000000b1',
    'b2000001-0000-4000-8000-000000000209',
    'org_scheduler', 'active', now()
  )
on conflict (organization_id, user_id) do nothing;

create temporary table oo_create (
  organization_id uuid,
  invitation_id uuid,
  raw_token text,
  expires_at timestamptz,
  slug text
);
grant all on table oo_create to authenticated;

create temporary table oo_aux (
  label text primary key,
  organization_id uuid,
  invitation_id uuid,
  raw_token text
);
grant all on table oo_aux to authenticated;

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

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

-- ---------------------------------------------------------------------------
-- 1–3. Authorization: only platform_super_admin can create
-- ---------------------------------------------------------------------------

reset role;
select set_config('request.jwt.claims', '', true);
select set_config('request.jwt.claim.sub', '', true);
set local role anon;

select throws_ok(
  $$ select public.create_organization_with_admin_invite(
       p_legal_name := 'Anon Org Ltd',
       p_display_name := 'Anon Org',
       p_slug := 'anon-org-onboard',
       p_organization_type := 'clinic'::public.organization_type,
       p_admin_email := 'invitee@test.local'
     ) $$,
  'P0001',
  'NOT_AUTHENTICATED',
  'anonymous cannot create organization'
);

reset role;
select pg_temp.auth_as('b2000001-0000-4000-8000-000000000202');

select throws_ok(
  $$ select public.create_organization_with_admin_invite(
       p_legal_name := 'Support Org Ltd',
       p_display_name := 'Support Org',
       p_slug := 'support-org-onboard',
       p_organization_type := 'clinic'::public.organization_type,
       p_admin_email := 'invitee@test.local'
     ) $$,
  'P0001',
  'NOT_AUTHORIZED',
  'platform_support cannot create organization'
);

reset role;
select pg_temp.auth_as('b2000001-0000-4000-8000-000000000203');

select throws_ok(
  $$ select public.create_organization_with_admin_invite(
       p_legal_name := 'Verifier Org Ltd',
       p_display_name := 'Verifier Org',
       p_slug := 'verifier-org-onboard',
       p_organization_type := 'hospital'::public.organization_type,
       p_admin_email := 'invitee@test.local'
     ) $$,
  'P0001',
  'NOT_AUTHORIZED',
  'platform_verifier cannot create organization'
);

reset role;
select pg_temp.auth_as('b2000001-0000-4000-8000-000000000204');

select throws_ok(
  $$ select public.create_organization_with_admin_invite(
       p_legal_name := 'Finance Org Ltd',
       p_display_name := 'Finance Org',
       p_slug := 'finance-org-onboard',
       p_organization_type := 'clinic'::public.organization_type,
       p_admin_email := 'invitee@test.local'
     ) $$,
  'P0001',
  'NOT_AUTHORIZED',
  'platform_finance cannot create organization'
);

reset role;
select pg_temp.auth_as('b2000001-0000-4000-8000-000000000205');

select throws_ok(
  $$ select public.create_organization_with_admin_invite(
       p_legal_name := 'Worker Org Ltd',
       p_display_name := 'Worker Org',
       p_slug := 'worker-org-onboard',
       p_organization_type := 'clinic'::public.organization_type,
       p_admin_email := 'invitee@test.local'
     ) $$,
  'P0001',
  'NOT_AUTHORIZED',
  'worker cannot create organization'
);

reset role;
select pg_temp.auth_as('b2000001-0000-4000-8000-000000000209');

select throws_ok(
  $$ select public.create_organization_with_admin_invite(
       p_legal_name := 'Org User Org Ltd',
       p_display_name := 'Org User Org',
       p_slug := 'org-user-org-onboard',
       p_organization_type := 'clinic'::public.organization_type,
       p_admin_email := 'invitee@test.local'
     ) $$,
  'P0001',
  'NOT_AUTHORIZED',
  'org user cannot create organization'
);

reset role;
select pg_temp.auth_as('b2000001-0000-4000-8000-000000000201');

select lives_ok(
  $$ insert into oo_create (organization_id, invitation_id, raw_token, expires_at, slug)
     select
       (j->>'organization_id')::uuid,
       (j->>'invitation_id')::uuid,
       j->>'raw_token',
       (j->>'expires_at')::timestamptz,
       j->>'slug'
     from (
       select public.create_organization_with_admin_invite(
         p_legal_name := 'Onboard Clinic Ltd',
         p_display_name := 'Onboard Clinic',
         p_slug := 'onboard-clinic',
         p_organization_type := 'clinic'::public.organization_type,
         p_admin_email := 'invitee@test.local',
         p_billing_email := 'billing-onboard@test.local',
         p_timezone := 'Europe/Nicosia',
         p_primary_contact_name := null,
         p_primary_contact_email := null,
         p_address_line1 := '1 Test Street',
         p_address_line2 := null,
         p_city := 'Nicosia',
         p_postal_code := '1000',
         p_country_code := 'CY',
         p_registration_number := 'HE900001',
         p_tax_vat_number := 'CY90000111X'
       ) as j
     ) s $$,
  'platform_super_admin can create_organization_with_admin_invite'
);

-- ---------------------------------------------------------------------------
-- 4. Slug uniqueness
-- ---------------------------------------------------------------------------

select throws_ok(
  $$ select public.create_organization_with_admin_invite(
       p_legal_name := 'Onboard Clinic Dup Ltd',
       p_display_name := 'Onboard Clinic Dup',
       p_slug := 'onboard-clinic',
       p_organization_type := 'clinic'::public.organization_type,
       p_admin_email := 'other@test.local'
     ) $$,
  'P0001',
  'SLUG_TAKEN',
  'second create with same slug fails SLUG_TAKEN'
);

-- ---------------------------------------------------------------------------
-- 5. Token returned once; hash stored; raw token not in table
-- ---------------------------------------------------------------------------

select ok(
  (
    select raw_token is not null and length(raw_token) >= 32
    from oo_create
  ),
  'create returns raw_token'
);

reset role;
set local role postgres;

select ok(
  (
    select i.token_hash = public.hash_invitation_token(c.raw_token)
    from public.organization_invitations i
    join oo_create c on c.invitation_id = i.id
  ),
  'token_hash in DB equals hash_invitation_token(raw_token)'
);

select ok(
  not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'organization_invitations'
      and column_name = 'raw_token'
  )
  and (
    select i.token_hash is distinct from c.raw_token
    from public.organization_invitations i
    join oo_create c on c.invitation_id = i.id
  ),
  'raw_token is not stored in organization_invitations'
);

-- ---------------------------------------------------------------------------
-- 6. Accept with matching email
-- ---------------------------------------------------------------------------

reset role;
select pg_temp.auth_as('b2000001-0000-4000-8000-000000000206');

select lives_ok(
  $$ select public.accept_organization_invitation(
       (select raw_token from oo_create)
     ) $$,
  'accept with matching email works'
);

select is(
  (
    select count(*)::int
    from public.organization_members
    where organization_id = (select organization_id from oo_create)
      and status = 'active'
  ),
  1,
  'accept creates one membership'
);

select ok(
  not exists (
    select 1
    from public.organization_members
    where organization_id = (select organization_id from oo_create)
      and user_id = 'b2000001-0000-4000-8000-000000000201'
  ),
  'platform admin is not a member of the created organization'
);

select is(
  (
    select user_id
    from public.organization_members
    where organization_id = (select organization_id from oo_create)
      and status = 'active'
  ),
  'b2000001-0000-4000-8000-000000000206'::uuid,
  'invitee is the sole active member'
);

-- ---------------------------------------------------------------------------
-- 7. Wrong email EMAIL_MISMATCH
-- ---------------------------------------------------------------------------

reset role;
select pg_temp.auth_as('b2000001-0000-4000-8000-000000000201');

insert into oo_aux (label, organization_id, invitation_id, raw_token)
select
  'mismatch',
  (j->>'organization_id')::uuid,
  (j->>'invitation_id')::uuid,
  j->>'raw_token'
from (
  select public.create_organization_with_admin_invite(
    p_legal_name := 'Mismatch Org Ltd',
    p_display_name := 'Mismatch Org',
    p_slug := 'onboard-mismatch',
    p_organization_type := 'clinic'::public.organization_type,
    p_admin_email := 'invitee@test.local'
  ) as j
) s;

reset role;
select pg_temp.auth_as('b2000001-0000-4000-8000-000000000207');

select throws_ok(
  $$ select public.accept_organization_invitation(
       (select raw_token from oo_aux where label = 'mismatch')
     ) $$,
  'P0001',
  'EMAIL_MISMATCH',
  'wrong email cannot accept invitation'
);

-- ---------------------------------------------------------------------------
-- 8. Expired invitation
-- ---------------------------------------------------------------------------

reset role;
select pg_temp.auth_as('b2000001-0000-4000-8000-000000000201');

insert into oo_aux (label, organization_id, invitation_id, raw_token)
select
  'expired',
  (j->>'organization_id')::uuid,
  (j->>'invitation_id')::uuid,
  j->>'raw_token'
from (
  select public.create_organization_with_admin_invite(
    p_legal_name := 'Expired Org Ltd',
    p_display_name := 'Expired Org',
    p_slug := 'onboard-expired',
    p_organization_type := 'hospital'::public.organization_type,
    p_admin_email := 'invitee@test.local'
  ) as j
) s;

reset role;
set local role postgres;
update public.organization_invitations
set expires_at = now() - interval '1 hour'
where id = (select invitation_id from oo_aux where label = 'expired');

reset role;
select pg_temp.auth_as('b2000001-0000-4000-8000-000000000206');

select throws_ok(
  $$ select public.accept_organization_invitation(
       (select raw_token from oo_aux where label = 'expired')
     ) $$,
  'P0001',
  'INVITATION_EXPIRED',
  'expired invitation is denied'
);

-- ---------------------------------------------------------------------------
-- 9. Revoked invitation
-- ---------------------------------------------------------------------------

reset role;
select pg_temp.auth_as('b2000001-0000-4000-8000-000000000201');

insert into oo_aux (label, organization_id, invitation_id, raw_token)
select
  'revoked',
  (j->>'organization_id')::uuid,
  (j->>'invitation_id')::uuid,
  j->>'raw_token'
from (
  select public.create_organization_with_admin_invite(
    p_legal_name := 'Revoked Org Ltd',
    p_display_name := 'Revoked Org',
    p_slug := 'onboard-revoked',
    p_organization_type := 'nursing_home'::public.organization_type,
    p_admin_email := 'invitee@test.local'
  ) as j
) s;

select lives_ok(
  $$ select public.revoke_organization_invitation(
       (select invitation_id from oo_aux where label = 'revoked')
     ) $$,
  'super admin can revoke invitation'
);

reset role;
select pg_temp.auth_as('b2000001-0000-4000-8000-000000000206');

select throws_ok(
  $$ select public.accept_organization_invitation(
       (select raw_token from oo_aux where label = 'revoked')
     ) $$,
  'P0001',
  'INVITATION_REVOKED',
  'revoked invitation is denied'
);

-- ---------------------------------------------------------------------------
-- 10. Reuse after accept
-- ---------------------------------------------------------------------------

select throws_ok(
  $$ select public.accept_organization_invitation(
       (select raw_token from oo_create)
     ) $$,
  'P0001',
  'INVITATION_ALREADY_USED',
  'reuse after accept fails INVITATION_ALREADY_USED'
);

-- ---------------------------------------------------------------------------
-- 11. Pending org: cannot insert location / publish_shift
-- ---------------------------------------------------------------------------

select throws_ok(
  $$ insert into public.locations (organization_id, name)
     values ((select organization_id from oo_create), 'Pending Site') $$,
  '42501',
  'new row violates row-level security policy for table "locations"',
  'pending org_admin cannot insert location'
);

-- Seed location + draft shift as postgres for publish gate tests
reset role;
set local role postgres;
insert into public.locations (id, organization_id, name)
values (
  'b2000001-cccc-4000-8000-0000000000c1',
  (select organization_id from oo_create),
  'Seeded Pending Site'
)
on conflict (id) do nothing;

insert into public.shifts (
  id, organization_id, location_id, required_role,
  starts_at, ends_at, break_minutes, rate_minor, currency, status, acceptance_deadline
) values (
  'b2000001-cccc-4000-8000-0000000000d1',
  (select organization_id from oo_create),
  'b2000001-cccc-4000-8000-0000000000c1',
  'registered_nurse',
  now() + interval '5 days', now() + interval '5 days 8 hours',
  30, 2700, 'EUR', 'draft', now() + interval '4 days'
)
on conflict (id) do nothing;

reset role;
select pg_temp.auth_as('b2000001-0000-4000-8000-000000000206');

select throws_ok(
  $$ select public.publish_shift('b2000001-cccc-4000-8000-0000000000d1') $$,
  'P0001',
  'ORG_NOT_ACTIVE',
  'pending org cannot publish_shift'
);

-- ---------------------------------------------------------------------------
-- 12. Profile completeness gates submit; optional fields do not
-- ---------------------------------------------------------------------------

select throws_ok(
  $$ select public.submit_organization_for_review(
       (select organization_id from oo_create)
     ) $$,
  'P0001',
  'ORG_PROFILE_INCOMPLETE:primary_contact_name,primary_contact_email',
  'missing contact name and email blocks submission'
);

select lives_ok(
  $$ select public.update_organization_profile(
       p_organization_id := (select organization_id from oo_create),
       p_primary_contact_name := 'Invitee Admin',
       p_primary_contact_email := null,
       p_address_line1 := '1 Test Street',
       p_city := 'Nicosia',
       p_postal_code := '1000',
       p_country_code := 'CY'
     ) $$,
  'org_admin can set contact name without email'
);

select throws_ok(
  $$ select public.submit_organization_for_review(
       (select organization_id from oo_create)
     ) $$,
  'P0001',
  'ORG_PROFILE_INCOMPLETE:primary_contact_email',
  'missing contact email blocks submission'
);

select lives_ok(
  $$ select public.update_organization_profile(
       p_organization_id := (select organization_id from oo_create),
       p_primary_contact_name := '',
       p_primary_contact_email := 'invitee@test.local'
     ) $$,
  'org_admin can clear contact name and set email'
);

select throws_ok(
  $$ select public.submit_organization_for_review(
       (select organization_id from oo_create)
     ) $$,
  'P0001',
  'ORG_PROFILE_INCOMPLETE:primary_contact_name',
  'missing contact name blocks submission'
);

-- Restore required contact fields; leave optional address_line2 / tax / billing null
select lives_ok(
  $$ select public.update_organization_profile(
       p_organization_id := (select organization_id from oo_create),
       p_primary_contact_name := 'Invitee Admin',
       p_primary_contact_email := 'invitee@test.local',
       p_address_line1 := '1 Test Street',
       p_address_line2 := '',
       p_city := 'Nicosia',
       p_postal_code := '1000',
       p_country_code := 'CY',
       p_billing_email := '',
       p_tax_vat_number := '',
       p_organization_type := 'clinic'::public.organization_type
     ) $$,
  'org_admin can complete required profile with optional fields empty'
);

reset role;
set local role postgres;
update public.organizations
set legal_name = '   '
where id = (select organization_id from oo_create);

reset role;
select pg_temp.auth_as('b2000001-0000-4000-8000-000000000206');

select throws_ok(
  $$ select public.submit_organization_for_review(
       (select organization_id from oo_create)
     ) $$,
  'P0001',
  'ORG_PROFILE_INCOMPLETE:legal_name',
  'missing legal name blocks submission'
);

reset role;
set local role postgres;
update public.organizations
set
  legal_name = 'Onboard Clinic Ltd',
  display_name = '   '
where id = (select organization_id from oo_create);

reset role;
select pg_temp.auth_as('b2000001-0000-4000-8000-000000000206');

select throws_ok(
  $$ select public.submit_organization_for_review(
       (select organization_id from oo_create)
     ) $$,
  'P0001',
  'ORG_PROFILE_INCOMPLETE:display_name',
  'missing display name blocks submission'
);

reset role;
set local role postgres;
update public.organizations
set display_name = 'Onboard Clinic'
where id = (select organization_id from oo_create);

reset role;
select pg_temp.auth_as('b2000001-0000-4000-8000-000000000206');

select is(
  (
    select organization_type::text
    from public.organizations
    where id = (select organization_id from oo_create)
  ),
  'clinic',
  'update_organization_profile persists organization_type'
);

select is(
  (
    select
      address_line2 is null
      and tax_vat_number is null
      and billing_email is null
    from public.organizations
    where id = (select organization_id from oo_create)
  ),
  true,
  'empty optional address_line2, tax_vat, billing_email become null'
);

select lives_ok(
  $$ select public.submit_organization_for_review(
       (select organization_id from oo_create)
     ) $$,
  'org_admin can submit_organization_for_review with optional fields null'
);

select is(
  (
    select status::text
    from public.organizations
    where id = (select organization_id from oo_create)
  ),
  'under_review',
  'submitted organization status is under_review'
);

select throws_ok(
  $$ update public.organizations
     set status = 'active'
     where id = (select organization_id from oo_create) $$,
  '42501',
  'permission denied for table organizations',
  'client cannot set organization status directly'
);

select throws_ok(
  $$ select public.publish_shift('b2000001-cccc-4000-8000-0000000000d1') $$,
  'P0001',
  'ORG_NOT_ACTIVE',
  'under_review org still cannot publish_shift'
);

select throws_ok(
  $$ select public.update_organization_profile(
       p_organization_id := 'b2000001-cccc-4000-8000-0000000000b1',
       p_primary_contact_name := 'Cross Tenant',
       p_primary_contact_email := 'cross@test.local'
     ) $$,
  'P0001',
  'NOT_AUTHORIZED',
  'org_admin cannot update another organization profile'
);

select throws_ok(
  $$ select public.submit_organization_for_review(
       'b2000001-cccc-4000-8000-0000000000b1'
     ) $$,
  'P0001',
  'NOT_AUTHORIZED',
  'org_admin cannot submit another organization for review'
);

-- ---------------------------------------------------------------------------
-- 13. Approve → active; draft + publish succeed
-- ---------------------------------------------------------------------------

reset role;
select pg_temp.auth_as('b2000001-0000-4000-8000-000000000201');

select lives_ok(
  $$ select public.approve_organization(
       (select organization_id from oo_create)
     ) $$,
  'super admin can approve_organization'
);

reset role;
set local role postgres;

select is(
  (
    select status::text
    from public.organizations
    where id = (select organization_id from oo_create)
  ),
  'active',
  'approved organization is active'
);

reset role;
select pg_temp.auth_as('b2000001-0000-4000-8000-000000000206');

select lives_ok(
  $$ insert into public.shifts (
       id, organization_id, location_id, required_role,
       starts_at, ends_at, break_minutes, rate_minor, currency, status, acceptance_deadline
     ) values (
       'b2000001-cccc-4000-8000-0000000000d2',
       (select organization_id from oo_create),
       'b2000001-cccc-4000-8000-0000000000c1',
       'registered_nurse',
       now() + interval '6 days', now() + interval '6 days 8 hours',
       30, 2800, 'EUR', 'draft', now() + interval '5 days'
     ) $$,
  'active org_admin can create draft shift'
);

select lives_ok(
  $$ select public.publish_shift('b2000001-cccc-4000-8000-0000000000d2') $$,
  'active org_admin can publish_shift'
);

select is(
  (
    select status::text
    from public.shifts
    where id = 'b2000001-cccc-4000-8000-0000000000d2'
  ),
  'published',
  'published shift has published status'
);

-- ---------------------------------------------------------------------------
-- 14. Cross-tenant isolation
-- ---------------------------------------------------------------------------

select is_empty(
  $$ select id from public.organizations
     where id = 'b2000001-cccc-4000-8000-0000000000b1' $$,
  'Org A member cannot select Org B row'
);

select is_empty(
  $$ select user_id from public.organization_members
     where organization_id = 'b2000001-cccc-4000-8000-0000000000b1' $$,
  'Org A member cannot select Org B members'
);

select throws_ok(
  $$ select id from public.organization_invitations
     where organization_id = 'b2000001-cccc-4000-8000-0000000000b1' $$,
  '42501',
  'permission denied for table organization_invitations',
  'authenticated cannot select organization_invitations (no grants)'
);

-- ---------------------------------------------------------------------------
-- 15. Reject / suspend require reason; reactivate works
-- ---------------------------------------------------------------------------

reset role;
select pg_temp.auth_as('b2000001-0000-4000-8000-000000000201');

insert into oo_aux (label, organization_id, invitation_id, raw_token)
select
  'reject',
  (j->>'organization_id')::uuid,
  (j->>'invitation_id')::uuid,
  j->>'raw_token'
from (
  select public.create_organization_with_admin_invite(
    p_legal_name := 'Reject Org Ltd',
    p_display_name := 'Reject Org',
    p_slug := 'onboard-reject',
    p_organization_type := 'other'::public.organization_type,
    p_admin_email := 'other@test.local',
    p_primary_contact_name := 'Other Contact',
    p_primary_contact_email := 'other@test.local'
  ) as j
) s;

reset role;
select pg_temp.auth_as('b2000001-0000-4000-8000-000000000207');

select lives_ok(
  $$ select public.accept_organization_invitation(
       (select raw_token from oo_aux where label = 'reject')
     ) $$,
  'other user accepts reject-org invitation'
);

select lives_ok(
  $$ select public.submit_organization_for_review(
       (select organization_id from oo_aux where label = 'reject')
     ) $$,
  'reject-org submitted for review'
);

reset role;
select pg_temp.auth_as('b2000001-0000-4000-8000-000000000201');

select throws_ok(
  $$ select public.reject_organization(
       (select organization_id from oo_aux where label = 'reject'),
       null
     ) $$,
  'P0001',
  'REASON_REQUIRED',
  'reject requires reason'
);

select throws_ok(
  $$ select public.reject_organization(
       (select organization_id from oo_aux where label = 'reject'),
       ''
     ) $$,
  'P0001',
  'REASON_REQUIRED',
  'reject with empty reason fails'
);

select lives_ok(
  $$ select public.reject_organization(
       (select organization_id from oo_aux where label = 'reject'),
       'Incomplete documentation'
     ) $$,
  'reject with reason succeeds'
);

select throws_ok(
  $$ select public.suspend_organization(
       (select organization_id from oo_create),
       null
     ) $$,
  'P0001',
  'REASON_REQUIRED',
  'suspend requires reason'
);

select lives_ok(
  $$ select public.suspend_organization(
       (select organization_id from oo_create),
       'Compliance hold'
     ) $$,
  'suspend with reason succeeds'
);

reset role;
set local role postgres;

select is(
  (
    select status::text
    from public.organizations
    where id = (select organization_id from oo_create)
  ),
  'suspended',
  'suspended organization status is suspended'
);

reset role;
select pg_temp.auth_as('b2000001-0000-4000-8000-000000000201');

select lives_ok(
  $$ select public.reactivate_organization(
       (select organization_id from oo_create),
       'Hold lifted'
     ) $$,
  'reactivate from suspended works'
);

reset role;
set local role postgres;

select is(
  (
    select status::text
    from public.organizations
    where id = (select organization_id from oo_create)
  ),
  'active',
  'reactivated organization is active'
);

reset role;
select pg_temp.auth_as('b2000001-0000-4000-8000-000000000201');

-- ---------------------------------------------------------------------------
-- 16. list_admin_organizations does not expose tax_vat
-- ---------------------------------------------------------------------------

select ok(
  (
    select
      not (row_to_json(r)::jsonb ? 'tax_vat_number')
      and not (row_to_json(r)::jsonb ? 'tax_vat')
      and position('tax_vat' in lower(row_to_json(r)::text)) = 0
    from public.list_admin_organizations(
      'onboard-clinic', null, null, 'newest', 20, 0
    ) r
    where r.id = (select organization_id from oo_create)
  ),
  'list_admin_organizations does not expose tax_vat fields'
);

-- ---------------------------------------------------------------------------
-- 17. Audit: organization_created without token/tax keys
-- ---------------------------------------------------------------------------

select ok(
  exists (
    select 1
    from public.audit_events
    where action = 'organization_created'
      and entity_id = (select organization_id from oo_create)
      and after ? 'slug'
      and after ? 'status'
      and not (after ? 'raw_token')
      and not (after ? 'token')
      and not (after ? 'token_hash')
      and not (after ? 'tax_vat_number')
      and not (after ? 'tax_vat')
  ),
  'organization_created audit exists without token/tax keys'
);

-- ---------------------------------------------------------------------------
-- 18. Newly created pending org (no accepted member) appears in admin list
-- ---------------------------------------------------------------------------

create temporary table oo_pending_list (
  organization_id uuid,
  invitation_id uuid
) on commit drop;

select lives_ok(
  $$ insert into oo_pending_list (organization_id, invitation_id)
     select
       (j->>'organization_id')::uuid,
       (j->>'invitation_id')::uuid
     from (
       select public.create_organization_with_admin_invite(
         p_legal_name := 'Pending List Hospital Ltd',
         p_display_name := 'Pending List Hospital',
         p_slug := 'pending-list-hospital',
         p_organization_type := 'hospital'::public.organization_type,
         p_admin_email := 'other@test.local'
       ) as j
     ) s $$,
  'super admin can create a second pending organization for list coverage'
);

select ok(
  (
    select
      r.status::text = 'pending'
      and r.member_count = 0
      and r.display_name = 'Pending List Hospital'
    from public.list_admin_organizations(
      null, null, null, 'newest', 50, 0
    ) r
    where r.id = (select organization_id from oo_pending_list)
  ),
  'newly created pending org with zero members appears in unfiltered admin list'
);

select ok(
  exists (
    select 1
    from public.list_admin_organizations(
      null, 'pending', null, 'newest', 50, 0
    ) r
    where r.id = (select organization_id from oo_pending_list)
  ),
  'status=pending filter includes the unsubmitted draft organization'
);

select ok(
  not exists (
    select 1
    from public.list_admin_organizations(
      null, 'under_review', null, 'newest', 50, 0
    ) r
    where r.id = (select organization_id from oo_pending_list)
  ),
  'unsubmitted pending org does not appear in under_review filter'
);

select ok(
  exists (
    select 1
    from public.list_admin_organizations(
      'pending-list-hospital', null, null, 'newest', 50, 0
    ) r
    where r.id = (select organization_id from oo_pending_list)
  )
  and not exists (
    select 1
    from public.list_admin_organizations(
      'no-such-org-zzzz', null, null, 'newest', 50, 0
    ) r
  ),
  'search finds the org by slug and empty-result search does not hide via error'
);

-- ---------------------------------------------------------------------------
-- 19. Non–platform-super-admin cannot list admin organizations
-- ---------------------------------------------------------------------------

reset role;
select pg_temp.auth_as('b2000001-0000-4000-8000-000000000206');

select throws_ok(
  $$ select * from public.list_admin_organizations(
       null, null, null, 'newest', 20, 0
     ) $$,
  'P0001',
  'NOT_AUTHORIZED',
  'organization admin cannot call list_admin_organizations'
);

reset role;
select pg_temp.auth_as('b2000001-0000-4000-8000-000000000208');

select throws_ok(
  $$ select * from public.list_admin_organizations(
       null, null, null, 'newest', 20, 0
     ) $$,
  'P0001',
  'NOT_AUTHORIZED',
  'other organization member cannot call list_admin_organizations'
);

-- ---------------------------------------------------------------------------
-- 20. Client cannot insert organizations (must use platform provisioning)
-- ---------------------------------------------------------------------------

reset role;
select pg_temp.auth_as('b2000001-0000-4000-8000-000000000207');

-- No INSERT grant to authenticated; direct inserts must fail.
select throws_ok(
  $$ insert into public.organizations (
       legal_name, display_name, slug, status
     ) values (
       'Self Serve Ltd', 'Self Serve', 'self-serve-hospital', 'pending'
     ) $$,
  '42501',
  'permission denied for table organizations',
  'authenticated non-admin cannot insert organization rows'
);

select * from finish();
rollback;
