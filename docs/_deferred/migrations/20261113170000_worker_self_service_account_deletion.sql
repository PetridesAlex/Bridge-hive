-- 20261113170000_worker_self_service_account_deletion.sql
-- Worker self-service deletion ledger and RPCs.
-- UNAPPLIED. Do not run against a hosted project without explicit approval.
-- Version is after staging Bridge-Hive-Test migration 20261112120000.
-- Apply this file alone. Do not db-push the directory and do not repair history.
-- auth.uid() only. No client-supplied target id.
-- Messages, invoices, payouts, organization logos, and location images are not deleted.
-- Recruitment files are not deleted. There is no verified owner column linking a
-- candidate to auth.users. Email equality is not ownership.
-- Deferred rows stay requested_pending_review. No role can complete them.
-- finalize_worker_account_deletion is service_role only, and only when Auth is gone.
-- Deletion-after-restore safeguard: unresolved. Not implemented.
-- Legal retention decisions: unresolved. No retention period is stored.

create table if not exists public.worker_account_deletion_requests (
  id uuid primary key default gen_random_uuid(),
  worker_id uuid not null references public.profiles (id) on delete cascade,
  client_request_id uuid not null,
  status text not null
    check (status in (
      'assessing',
      'awaiting_storage_cleanup',
      'ready_for_auth_delete',
      'requested_pending_review',
      'completed',
      'failed'
    )),
  blockers jsonb not null default '[]'::jsonb,
  error_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz,
  unique (worker_id, client_request_id)
);

create index if not exists worker_account_deletion_requests_worker_idx
  on public.worker_account_deletion_requests (worker_id, created_at desc);

comment on table public.worker_account_deletion_requests is
  'Worker self-service deletion ledger. Completed only by finalize_worker_account_deletion after Auth removal.';

alter table public.worker_account_deletion_requests enable row level security;

drop policy if exists worker_account_deletion_requests_select_own
  on public.worker_account_deletion_requests;
create policy worker_account_deletion_requests_select_own
  on public.worker_account_deletion_requests
  for select
  to authenticated
  using (worker_id = auth.uid());

create or replace function public.assess_my_worker_account_deletion()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_blockers jsonb := '[]'::jsonb;
  v_demo boolean := false;
  v_count int := 0;
begin
  if v_uid is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  select coalesce(wp.is_app_review_demo, false)
  into v_demo
  from public.worker_profiles wp
  where wp.user_id = v_uid;

  if coalesce(v_demo, false) then
    v_blockers := v_blockers || jsonb_build_array(jsonb_build_object(
      'code', 'app_review_demo',
      'severity', true,
      'message', 'Demonstration accounts cannot self-delete.'
    ));
  end if;

  select count(*) into v_count
  from public.shift_assignments sa
  where sa.worker_id = v_uid;
  if v_count > 0 then
    v_blockers := v_blockers || jsonb_build_array(jsonb_build_object(
      'code', 'shift_assignments',
      'count', v_count,
      'retention', true,
      'erased', false,
      'decision', 'client_or_legal',
      'message', 'Shift assignment rows are not deleted. They block Auth removal until a separate decision.'
    ));
  end if;

  select count(*) into v_count
  from public.worker_commission_invoices i
  where i.worker_id = v_uid;
  if v_count > 0 then
    v_blockers := v_blockers || jsonb_build_array(jsonb_build_object(
      'code', 'commission_invoices',
      'count', v_count,
      'retention', true,
      'erased', false,
      'decision', 'client_or_legal',
      'message', 'Commission invoices are not cancelled, refunded, or deleted. They block Auth removal.'
    ));
  end if;

  select count(*) into v_count
  from public.payouts p
  where p.worker_id = v_uid;
  if v_count > 0 then
    v_blockers := v_blockers || jsonb_build_array(jsonb_build_object(
      'code', 'payout_records',
      'count', v_count,
      'retention', true,
      'erased', false,
      'decision', 'client_or_legal',
      'message', 'Payout records are not deleted or reversed. They block Auth removal.'
    ));
  end if;

  select count(*) into v_count
  from public.worker_sandbox_commission_invoices i
  where i.worker_id = v_uid;
  if v_count > 0 then
    v_blockers := v_blockers || jsonb_build_array(jsonb_build_object(
      'code', 'sandbox_invoices',
      'count', v_count,
      'retention', true,
      'erased', false,
      'decision', 'client_or_legal',
      'message', 'Sandbox invoice rows are not deleted. They block Auth removal.'
    ));
  end if;

  select count(*) into v_count
  from public.organization_worker_conversations c
  where c.worker_id = v_uid;
  if v_count > 0 then
    v_blockers := v_blockers || jsonb_build_array(jsonb_build_object(
      'code', 'organization_conversations',
      'count', v_count,
      'retention', true,
      'erased', false,
      'decision', 'client_or_legal',
      'message', 'Organization conversations are not deleted. Deletion is not complete.'
    ));
  end if;

  select count(*) into v_count
  from public.organization_worker_messages m
  where m.sender_user_id = v_uid;
  if v_count > 0 then
    v_blockers := v_blockers || jsonb_build_array(jsonb_build_object(
      'code', 'messages_sent',
      'count', v_count,
      'retention', true,
      'erased', false,
      'decision', 'client_or_legal',
      'message', 'Messages you sent are not deleted. They stay in the shared thread until a separate decision.'
    ));
  end if;

  select count(*) into v_count
  from public.shift_creation_batches b
  where b.created_by = v_uid;
  if v_count > 0 then
    v_blockers := v_blockers || jsonb_build_array(jsonb_build_object(
      'code', 'shift_creation_batches',
      'count', v_count,
      'retention', true,
      'erased', false,
      'decision', 'client_or_legal',
      'message', 'Shift creation batches authored by this account are not deleted and block Auth removal.'
    ));
  end if;

  select count(*) into v_count
  from public.organization_invitations i
  where i.created_by = v_uid;
  if v_count > 0 then
    v_blockers := v_blockers || jsonb_build_array(jsonb_build_object(
      'code', 'organization_invitations',
      'count', v_count,
      'retention', true,
      'erased', false,
      'decision', 'client_or_legal',
      'message', 'Organization invitations created by this account are not deleted and block Auth removal.'
    ));
  end if;

  select count(*) into v_count
  from public.organization_payment_reports r
  where r.reported_by = v_uid;
  if v_count > 0 then
    v_blockers := v_blockers || jsonb_build_array(jsonb_build_object(
      'code', 'organization_payment_reports',
      'count', v_count,
      'retention', true,
      'erased', false,
      'decision', 'client_or_legal',
      'message', 'Payment reports filed by this account are not deleted and block Auth removal.'
    ));
  end if;

  select count(*) into v_count
  from public.payment_adjustments a
  where a.created_by = v_uid;
  if v_count > 0 then
    v_blockers := v_blockers || jsonb_build_array(jsonb_build_object(
      'code', 'payment_adjustments',
      'count', v_count,
      'retention', true,
      'erased', false,
      'decision', 'client_or_legal',
      'message', 'Payment adjustments created by this account are not deleted and block Auth removal.'
    ));
  end if;

  select count(*) into v_count
  from public.recruitment_org_notes n
  where n.author_user_id = v_uid;
  if v_count > 0 then
    v_blockers := v_blockers || jsonb_build_array(jsonb_build_object(
      'code', 'recruitment_org_notes',
      'count', v_count,
      'retention', true,
      'erased', false,
      'decision', 'client_or_legal',
      'message', 'Recruitment notes authored by this account are not deleted and block Auth removal.'
    ));
  end if;

  return jsonb_build_object(
    'worker_id', v_uid,
    'blockers', v_blockers,
    'hard_delete_allowed', jsonb_array_length(v_blockers) = 0,
    'financial_records_erased', false,
    'messages_deleted', false,
    'recruitment_files_deleted', false,
    'recruitment_ownership', 'not_verified',
    'restore_safeguard', 'unresolved',
    'legal_retention_decision', 'unresolved'
  );
end;
$$;

revoke all on function public.assess_my_worker_account_deletion() from public;
revoke all on function public.assess_my_worker_account_deletion() from anon;
grant execute on function public.assess_my_worker_account_deletion() to authenticated;
grant execute on function public.assess_my_worker_account_deletion() to service_role;

create or replace function public.prepare_my_worker_account_deletion(
  p_client_request_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_assessment jsonb;
  v_blockers jsonb;
  v_hard boolean;
  v_request public.worker_account_deletion_requests;
  v_status text;
  v_profile public.profiles;
begin
  if v_uid is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  if p_client_request_id is null then
    raise exception 'REQUEST_ID_REQUIRED';
  end if;

  select * into v_request
  from public.worker_account_deletion_requests
  where worker_id = v_uid
    and client_request_id = p_client_request_id;

  if found and v_request.status = 'completed' then
    if exists (select 1 from auth.users u where u.id = v_uid) then
      update public.worker_account_deletion_requests
      set
        status = 'ready_for_auth_delete',
        error_code = 'completion_invalid_auth_remains',
        completed_at = null,
        updated_at = now()
      where id = v_request.id;
    else
      return jsonb_build_object(
        'status', 'completed',
        'request_id', v_request.id,
        'worker_id', v_uid,
        'blockers', v_request.blockers,
        'financial_records_erased', false,
        'messages_deleted', false
      );
    end if;
  end if;

  v_assessment := public.assess_my_worker_account_deletion();
  v_blockers := coalesce(v_assessment -> 'blockers', '[]'::jsonb);
  v_hard := coalesce((v_assessment ->> 'hard_delete_allowed')::boolean, false);

  if exists (
    select 1
    from jsonb_array_elements(v_blockers) b
    where b ->> 'code' = 'app_review_demo'
  ) then
    raise exception 'APP_REVIEW_DEMO_FORBIDDEN';
  end if;

  select * into v_profile
  from public.profiles
  where id = v_uid
  for update;

  if not found then
    raise exception 'PROFILE_NOT_FOUND';
  end if;

  delete from public.notifications where user_id = v_uid;
  delete from public.device_tokens where user_id = v_uid;
  delete from public.worker_push_devices where worker_id = v_uid;
  delete from public.worker_notification_deliveries where worker_id = v_uid;
  delete from public.organization_worker_conversation_reads where user_id = v_uid;

  if v_hard then
    delete from public.credentials where worker_id = v_uid;
    delete from public.payout_accounts where worker_id = v_uid;
  end if;

  update public.profiles
  set
    account_status = 'deleted',
    avatar_path = null,
    full_name = case
      when v_hard then 'Deleted worker'
      else full_name
    end,
    phone = case when v_hard then null else phone end,
    updated_at = now()
  where id = v_uid;

  v_status := case
    when v_hard then 'ready_for_auth_delete'
    else 'requested_pending_review'
  end;

  if v_request.id is null then
    insert into public.worker_account_deletion_requests (
      worker_id,
      client_request_id,
      status,
      blockers
    ) values (
      v_uid,
      p_client_request_id,
      v_status,
      v_blockers
    )
    returning * into v_request;
  else
    update public.worker_account_deletion_requests
    set
      status = v_status,
      blockers = v_blockers,
      updated_at = now(),
      error_code = null
    where id = v_request.id
    returning * into v_request;
  end if;

  perform public.create_audit_event(
    null,
    'profile',
    v_uid,
    'worker_self_service_deletion_prepare',
    jsonb_build_object(
      'request_id', v_request.id,
      'status', v_status,
      'blocker_count', jsonb_array_length(v_blockers),
      'financial_records_erased', false,
      'messages_deleted', false
    ),
    jsonb_build_object('account_status', 'deleted')
  );

  return jsonb_build_object(
    'status', v_status,
    'request_id', v_request.id,
    'worker_id', v_uid,
    'blockers', v_blockers,
    'hard_delete_allowed', v_hard,
    'financial_records_erased', false,
    'messages_deleted', false,
    'recruitment_files_deleted', false,
    'recruitment_ownership', 'not_verified',
    'restore_safeguard', 'unresolved',
    'legal_retention_decision', 'unresolved'
  );
end;
$$;

revoke all on function public.prepare_my_worker_account_deletion(uuid) from public;
revoke all on function public.prepare_my_worker_account_deletion(uuid) from anon;
grant execute on function public.prepare_my_worker_account_deletion(uuid) to authenticated;
grant execute on function public.prepare_my_worker_account_deletion(uuid) to service_role;

-- Authenticated callers cannot mark a request completed.
create or replace function public.complete_my_worker_account_deletion(
  p_client_request_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;
  if p_client_request_id is null then
    raise exception 'REQUEST_ID_REQUIRED';
  end if;
  raise exception 'COMPLETION_REQUIRES_SERVICE_FINALIZE';
end;
$$;

revoke all on function public.complete_my_worker_account_deletion(uuid) from public;
revoke all on function public.complete_my_worker_account_deletion(uuid) from anon;
grant execute on function public.complete_my_worker_account_deletion(uuid) to authenticated;
grant execute on function public.complete_my_worker_account_deletion(uuid) to service_role;

create or replace function public.finalize_worker_account_deletion(
  p_worker_id uuid,
  p_client_request_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request public.worker_account_deletion_requests;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'SERVICE_ROLE_REQUIRED';
  end if;
  if p_worker_id is null or p_client_request_id is null then
    raise exception 'REQUEST_ID_REQUIRED';
  end if;

  if exists (select 1 from auth.users u where u.id = p_worker_id) then
    raise exception 'AUTH_STILL_PRESENT';
  end if;

  select * into v_request
  from public.worker_account_deletion_requests
  where worker_id = p_worker_id
    and client_request_id = p_client_request_id
  for update;

  if not found then
    raise exception 'REQUEST_NOT_FOUND';
  end if;

  if v_request.status = 'completed' then
    return jsonb_build_object(
      'status', 'completed',
      'request_id', v_request.id,
      'worker_id', p_worker_id,
      'financial_records_erased', false,
      'messages_deleted', false
    );
  end if;

  if v_request.status <> 'ready_for_auth_delete' then
    raise exception 'REQUEST_NOT_READY';
  end if;

  update public.worker_account_deletion_requests
  set
    status = 'completed',
    updated_at = now(),
    completed_at = now(),
    error_code = null
  where id = v_request.id
  returning * into v_request;

  return jsonb_build_object(
    'status', 'completed',
    'request_id', v_request.id,
    'worker_id', p_worker_id,
    'financial_records_erased', false,
    'messages_deleted', false
  );
end;
$$;

revoke all on function public.finalize_worker_account_deletion(uuid, uuid) from public;
revoke all on function public.finalize_worker_account_deletion(uuid, uuid) from anon;
revoke all on function public.finalize_worker_account_deletion(uuid, uuid) from authenticated;
grant execute on function public.finalize_worker_account_deletion(uuid, uuid) to service_role;
