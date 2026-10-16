-- 037_org_payout_iban_vault.sql
-- Encrypt full IBAN at submit time; org billing may reveal it for an approved
-- payout obligation (direct org→worker bank transfer). Commission invoices unchanged.

create extension if not exists pgcrypto with schema extensions;

create schema if not exists private;
revoke all on schema private from public;
revoke all on schema private from anon, authenticated;

-- Singleton encryption key (vault-style; never exposed to clients).
create table if not exists private.iban_encryption_secrets (
  id smallint primary key default 1 check (id = 1),
  key_material text not null,
  created_at timestamptz not null default now()
);

revoke all on table private.iban_encryption_secrets from public;
revoke all on table private.iban_encryption_secrets from anon, authenticated;

insert into private.iban_encryption_secrets (id, key_material)
values (1, encode(extensions.gen_random_bytes(32), 'hex'))
on conflict (id) do nothing;

create or replace function private.iban_encryption_key()
returns text
language sql
stable
security definer
set search_path = private, extensions
as $$
  select key_material from private.iban_encryption_secrets where id = 1;
$$;

revoke all on function private.iban_encryption_key() from public;
revoke all on function private.iban_encryption_key() from anon, authenticated;

create or replace function private.encrypt_iban(p_iban text)
returns bytea
language plpgsql
stable
security definer
set search_path = private, extensions, public
as $$
declare
  v_key text;
begin
  v_key := private.iban_encryption_key();
  if v_key is null or length(v_key) < 16 then
    raise exception 'IBAN_ENCRYPTION_KEY_MISSING';
  end if;
  return extensions.pgp_sym_encrypt(p_iban, v_key);
end;
$$;

revoke all on function private.encrypt_iban(text) from public;
revoke all on function private.encrypt_iban(text) from anon, authenticated;

create or replace function private.decrypt_iban(p_ciphertext bytea)
returns text
language plpgsql
stable
security definer
set search_path = private, extensions, public
as $$
declare
  v_key text;
begin
  if p_ciphertext is null then
    return null;
  end if;
  v_key := private.iban_encryption_key();
  if v_key is null or length(v_key) < 16 then
    raise exception 'IBAN_ENCRYPTION_KEY_MISSING';
  end if;
  return extensions.pgp_sym_decrypt(p_ciphertext, v_key);
end;
$$;

revoke all on function private.decrypt_iban(bytea) from public;
revoke all on function private.decrypt_iban(bytea) from anon, authenticated;

alter table public.payout_accounts
  add column if not exists iban_ciphertext bytea;

comment on column public.payout_accounts.iban_ciphertext is
  'pgp_sym_encrypt ciphertext of normalized full IBAN; decrypt only via SECURITY DEFINER helpers.';

-- ---------------------------------------------------------------------------
-- submit_payout_account: persist encrypted IBAN + mask
-- ---------------------------------------------------------------------------
create or replace function public.submit_payout_account(
  p_country text,
  p_currency text,
  p_iban text,
  p_account_holder_name text,
  p_proof_storage_path text,
  p_proof_mime_type text
)
returns public.payout_accounts
language plpgsql
security definer
set search_path = public, private, extensions
as $$
declare
  v_row public.payout_accounts;
  v_iban text;
  v_masked text;
  v_cipher bytea;
  v_holder text;
  v_path text;
  v_mime text;
  v_was_rejected boolean := false;
begin
  if auth.uid() is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  if not exists (
    select 1 from public.worker_profiles where user_id = auth.uid()
  ) then
    raise exception 'WORKER_PROFILE_REQUIRED';
  end if;

  v_holder := trim(coalesce(p_account_holder_name, ''));
  if char_length(v_holder) < 2 or char_length(v_holder) > 120 then
    raise exception 'ACCOUNT_HOLDER_NAME_REQUIRED';
  end if;

  v_iban := public.normalize_iban(p_iban);
  if not public.is_valid_iban(v_iban) then
    raise exception 'INVALID_IBAN';
  end if;
  v_masked := public.mask_iban(v_iban);
  v_cipher := private.encrypt_iban(v_iban);

  v_path := trim(coalesce(p_proof_storage_path, ''));
  v_mime := lower(trim(coalesce(p_proof_mime_type, '')));
  if v_path = '' or v_mime = '' then
    raise exception 'PAYOUT_PROOF_REQUIRED';
  end if;
  if v_mime not in ('application/pdf', 'image/jpeg', 'image/png') then
    raise exception 'PAYOUT_PROOF_INVALID_TYPE';
  end if;
  if split_part(v_path, '/', 1) is distinct from auth.uid()::text then
    raise exception 'PAYOUT_PROOF_PATH_INVALID';
  end if;
  if not exists (
    select 1 from storage.objects o
    where o.bucket_id = 'payout-proofs'
      and o.name = v_path
  ) then
    raise exception 'PAYOUT_PROOF_NOT_FOUND';
  end if;

  select status = 'rejected' into v_was_rejected
  from public.payout_accounts
  where worker_id = auth.uid();

  perform set_config('bridgehive.allow_payout_submit', 'on', true);

  insert into public.payout_accounts (
    worker_id,
    country,
    currency,
    masked_iban,
    iban_ciphertext,
    account_holder_name,
    proof_storage_path,
    proof_mime_type,
    status,
    rejection_reason,
    verified_at,
    last_verified_at
  )
  values (
    auth.uid(),
    upper(trim(p_country)),
    upper(trim(p_currency)),
    v_masked,
    v_cipher,
    v_holder,
    v_path,
    v_mime,
    'pending',
    null,
    null,
    null
  )
  on conflict (worker_id) do update
  set
    country = excluded.country,
    currency = excluded.currency,
    masked_iban = excluded.masked_iban,
    iban_ciphertext = excluded.iban_ciphertext,
    account_holder_name = excluded.account_holder_name,
    proof_storage_path = excluded.proof_storage_path,
    proof_mime_type = excluded.proof_mime_type,
    status = 'pending',
    rejection_reason = null,
    verified_at = null,
    last_verified_at = null,
    updated_at = now()
  where public.payout_accounts.status in ('pending', 'failed', 'rejected')
  returning * into v_row;

  perform set_config('bridgehive.allow_payout_submit', 'off', true);

  if v_row.id is null then
    raise exception 'PAYOUT_ACCOUNT_LOCKED';
  end if;

  insert into public.payout_account_events (payout_account_id, event_type, actor_user_id)
  values (v_row.id, 'submitted', auth.uid());

  perform public.create_audit_event(
    null,
    'payout_account',
    v_row.id,
    'submit_payout_account',
    null,
    jsonb_build_object(
      'status', v_row.status,
      'country', v_row.country,
      'currency', v_row.currency,
      'has_proof', true,
      'has_iban_ciphertext', v_row.iban_ciphertext is not null
    )
  );

  perform public.notify_credential_event(
    v_row.worker_id,
    'payout_account',
    'payout_submitted',
    null
  );

  perform public.notify_super_admin_task(
    case
      when coalesce(v_was_rejected, false) then 'admin_payout_account_resubmitted'
      else 'admin_payout_account_pending'
    end,
    case
      when coalesce(v_was_rejected, false) then 'Resubmitted payout account awaiting approval'
      else 'Payout account awaiting approval'
    end,
    'A worker submitted a payout account for platform use approval.',
    jsonb_build_object('worker_id', v_row.worker_id)
  );

  return v_row;
end;
$$;

revoke all on function public.submit_payout_account(text, text, text, text, text, text) from public;
grant execute on function public.submit_payout_account(text, text, text, text, text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Org billing: reveal transfer details for an approved payout obligation
-- ---------------------------------------------------------------------------
create or replace function public.get_org_payout_transfer_details(p_payout_id uuid)
returns table (
  payout_id uuid,
  payout_status text,
  organization_id uuid,
  assignment_id uuid,
  worker_id uuid,
  worker_full_name text,
  worker_role text,
  shift_id uuid,
  shift_title text,
  currency text,
  gross_amount_minor integer,
  organization_total_due_minor integer,
  due_at timestamptz,
  account_holder_name text,
  masked_iban text,
  full_iban text
)
language plpgsql
security definer
set search_path = public, private, extensions
as $$
declare
  v_payout public.payouts;
  v_account public.payout_accounts;
  v_iban text;
  v_shift_id uuid;
  v_shift_title text;
  v_full_name text;
  v_role text;
begin
  if auth.uid() is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  if p_payout_id is null then
    raise exception 'PAYOUT_NOT_FOUND';
  end if;

  select * into v_payout
  from public.payouts
  where id = p_payout_id;

  if not found then
    raise exception 'PAYOUT_NOT_FOUND';
  end if;

  if not public.has_org_role(
    v_payout.organization_id,
    array['org_admin'::public.org_role, 'org_billing'::public.org_role]
  ) then
    raise exception 'NOT_AUTHORIZED';
  end if;

  if v_payout.status not in (
    'approved',
    'payment_instruction_ready',
    'reconciliation_pending',
    'overdue'
  ) then
    raise exception 'PAYOUT_STATUS_INVALID';
  end if;

  select s.id, s.title
  into v_shift_id, v_shift_title
  from public.shift_assignments sa
  join public.shifts s on s.id = sa.shift_id
  where sa.id = v_payout.assignment_id;

  select p.full_name, wp.worker_role::text
  into v_full_name, v_role
  from public.profiles p
  join public.worker_profiles wp on wp.user_id = p.id
  where p.id = v_payout.worker_id;

  if v_payout.payout_account_id is not null then
    select * into v_account
    from public.payout_accounts
    where id = v_payout.payout_account_id;
  end if;

  if v_account.id is null then
    select * into v_account
    from public.payout_accounts
    where worker_id = v_payout.worker_id
      and status = 'verified'
    order by verified_at desc nulls last
    limit 1;
  end if;

  if v_account.id is null or v_account.iban_ciphertext is null then
    raise exception 'PAYOUT_IBAN_UNAVAILABLE';
  end if;

  v_iban := private.decrypt_iban(v_account.iban_ciphertext);
  if v_iban is null or length(trim(v_iban)) < 8 then
    raise exception 'PAYOUT_IBAN_UNAVAILABLE';
  end if;

  perform public.create_audit_event(
    v_payout.organization_id,
    'payout',
    v_payout.id,
    'org_view_payout_transfer_details',
    null,
    jsonb_build_object(
      'payout_id', v_payout.id,
      'worker_id', v_payout.worker_id,
      'organization_id', v_payout.organization_id,
      'assignment_id', v_payout.assignment_id
    )
  );

  return query
  select
    v_payout.id,
    v_payout.status::text,
    v_payout.organization_id,
    v_payout.assignment_id,
    v_payout.worker_id,
    coalesce(nullif(trim(v_full_name), ''), 'Assigned worker'),
    v_role,
    v_shift_id,
    v_shift_title,
    v_payout.currency,
    v_payout.gross_amount_minor,
    v_payout.organization_total_due_minor,
    v_payout.due_at,
    v_account.account_holder_name,
    v_account.masked_iban,
    v_iban;
end;
$$;

revoke all on function public.get_org_payout_transfer_details(uuid) from public;
grant execute on function public.get_org_payout_transfer_details(uuid) to authenticated;

comment on function public.get_org_payout_transfer_details(uuid) is
  'Org admin/billing reveal of holder name + full IBAN for an awaiting payout. Audited; no IBAN in audit metadata.';
