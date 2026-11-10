-- credential_text_values.test.sql
-- Tax/social text credentials: save, satisfy, approve, RLS, legacy files untouched.

begin;

select plan(20);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  (
    '00000000-0000-0000-0000-000000000000',
    'c1000001-0000-4000-8000-000000000001',
    'authenticated', 'authenticated', 'text-worker@test.local', 'x',
    now(), '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Text Worker"}'::jsonb, now(), now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'c1000001-0000-4000-8000-000000000002',
    'authenticated', 'authenticated', 'text-other@test.local', 'x',
    now(), '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Other Worker"}'::jsonb, now(), now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'c1000001-0000-4000-8000-000000000003',
    'authenticated', 'authenticated', 'text-verifier@test.local', 'x',
    now(), '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Verifier"}'::jsonb, now(), now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'c1000001-0000-4000-8000-000000000004',
    'authenticated', 'authenticated', 'text-org@test.local', 'x',
    now(), '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Org User"}'::jsonb, now(), now()
  );

insert into public.profiles (id, role, full_name, account_status)
values
  ('c1000001-0000-4000-8000-000000000001', 'worker', 'Text Worker', 'active'),
  ('c1000001-0000-4000-8000-000000000002', 'worker', 'Other Worker', 'active'),
  ('c1000001-0000-4000-8000-000000000003', 'platform_admin', 'Verifier', 'active'),
  ('c1000001-0000-4000-8000-000000000004', 'organization_member', 'Org User', 'active');

insert into public.platform_admin_roles (user_id, role)
values ('c1000001-0000-4000-8000-000000000003', 'platform_verifier');

insert into public.worker_profiles (user_id, worker_role, onboarding_status, verification_status)
values
  ('c1000001-0000-4000-8000-000000000001', 'ward_assistant', 'in_progress', 'draft'),
  ('c1000001-0000-4000-8000-000000000002', 'ward_assistant', 'in_progress', 'draft');

-- Legacy file row for social insurance remains untouched.
insert into public.credentials (
  id, worker_id, credential_type, status, storage_path, storage_paths
) values (
  'c1000001-cccc-4000-8000-0000000000e1',
  'c1000001-0000-4000-8000-000000000001',
  'social_insurance_proof',
  'pending',
  'c1000001-0000-4000-8000-000000000001/social_insurance_proof/legacy.pdf',
  '["c1000001-0000-4000-8000-000000000001/social_insurance_proof/legacy.pdf"]'::jsonb
);

create or replace function pg_temp.auth_as(p_uid uuid)
returns void
language plpgsql
as $$
begin
  perform set_config('request.jwt.claim.sub', p_uid::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  perform set_config('role', 'authenticated', true);
end;
$$;

select ok(public.credential_is_text_type('tax_identification_proof'), 'tax is text type');
select ok(public.credential_is_text_type('social_insurance_proof'), 'social is text type');
select ok(not public.credential_is_text_type('nursing_licence'), 'licence remains file type');

select throws_ok(
  $$ select public.normalize_credential_text_value('') $$,
  'CREDENTIAL_TEXT_REQUIRED',
  'empty text rejected'
);

select throws_ok(
  $$ select public.normalize_credential_text_value('uploaded') $$,
  'CREDENTIAL_TEXT_PLACEHOLDER',
  'placeholder rejected'
);

select is(
  public.normalize_credential_text_value('  TX-99  '),
  'TX-99',
  'text value is trimmed'
);

reset role;
select pg_temp.auth_as('c1000001-0000-4000-8000-000000000001');

select lives_ok(
  $$ select public.save_my_credential_text_value('tax_identification_proof', '  CY123456  ') $$,
  'worker can save own tax identification text'
);

select is(
  (select text_value from public.credentials
   where worker_id = 'c1000001-0000-4000-8000-000000000001'
     and credential_type = 'tax_identification_proof'
   order by updated_at desc limit 1),
  'CY123456',
  'saved tax text round-trips'
);

select ok(
  (select public.credential_requirement_satisfied(c)
   from public.credentials c
   where worker_id = 'c1000001-0000-4000-8000-000000000001'
     and credential_type = 'tax_identification_proof'
   order by updated_at desc limit 1),
  'text value satisfies tax requirement'
);

select ok(
  (select public.credential_requirement_satisfied(c)
   from public.credentials c
   where id = 'c1000001-cccc-4000-8000-0000000000e1'),
  'legacy social insurance file still satisfies requirement'
);

select is(
  (select storage_path from public.credentials
   where id = 'c1000001-cccc-4000-8000-0000000000e1'),
  'c1000001-0000-4000-8000-000000000001/social_insurance_proof/legacy.pdf',
  'legacy upload path remains untouched'
);

select throws_ok(
  $$ select public.save_my_credential_text_value('nursing_licence', 'nope') $$,
  'CREDENTIAL_NOT_TEXT_TYPE',
  'cannot save text for file credential types'
);

reset role;
select pg_temp.auth_as('c1000001-0000-4000-8000-000000000002');

select is_empty(
  $$ select text_value from public.credentials
     where worker_id = 'c1000001-0000-4000-8000-000000000001'
       and credential_type = 'tax_identification_proof' $$,
  'unrelated worker cannot read tax text value'
);

select lives_ok(
  $$ select public.save_my_credential_text_value('tax_identification_proof', 'OTHER99') $$,
  'other worker can save their own tax text'
);

select is(
  (select text_value from public.credentials
   where worker_id = 'c1000001-0000-4000-8000-000000000001'
     and credential_type = 'tax_identification_proof'
   order by updated_at desc limit 1),
  'CY123456',
  'peer tax value unchanged after other worker save'
);

select is(
  (select text_value from public.credentials
   where worker_id = 'c1000001-0000-4000-8000-000000000002'
     and credential_type = 'tax_identification_proof'
   order by updated_at desc limit 1),
  'OTHER99',
  'other worker text is stored on their own credential row'
);

reset role;
select pg_temp.auth_as('c1000001-0000-4000-8000-000000000004');

select is_empty(
  $$ select text_value from public.credentials
     where credential_type = 'tax_identification_proof' $$,
  'organization user cannot read tax text values'
);

reset role;
set local role anon;

select throws_ok(
  $$ select public.save_my_credential_text_value('tax_identification_proof', 'anon') $$,
  'NOT_AUTHENTICATED',
  'anonymous cannot save credential text'
);

reset role;
select pg_temp.auth_as('c1000001-0000-4000-8000-000000000003');

select ok(
  exists (
    select 1 from public.credentials
    where worker_id = 'c1000001-0000-4000-8000-000000000001'
      and credential_type = 'tax_identification_proof'
      and text_value = 'CY123456'
  ),
  'verifier can read worker tax text for review'
);

select throws_ok(
  $$ select text_value from public.credential_support_view() $$,
  '42703',
  'support view does not expose text_value column'
);

select ok(
  not exists (
    select 1 from public.notifications
    where data ? 'text_value'
       or data ? 'tax_identification'
       or data ? 'social_insurance'
  ),
  'notifications do not carry text credential values'
);

select finish();
rollback;
