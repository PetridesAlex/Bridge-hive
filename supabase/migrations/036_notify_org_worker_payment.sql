-- 036_notify_org_worker_payment.sql
-- Notify organization admins/billing when a worker payout obligation is created
-- after timesheet approval (hospital owes approved gross).

create or replace function public.notify_org_worker_payment_due(
  p_organization_id uuid,
  p_payout_id uuid,
  p_assignment_id uuid,
  p_amount_minor integer,
  p_currency text,
  p_due_at timestamptz
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_member record;
  v_title text := 'Worker payment due';
  v_body text;
  v_amount text;
begin
  if p_organization_id is null or p_payout_id is null then
    return;
  end if;

  v_amount := trim(
    to_char(coalesce(p_amount_minor, 0) / 100.0, 'FM999999990.00')
  );

  v_body := format(
    'Approved work created a worker payment obligation of %s %s. Open Worker payments to settle the approved gross with the worker.',
    upper(coalesce(nullif(trim(p_currency), ''), 'EUR')),
    v_amount
  );

  for v_member in
    select m.user_id
    from public.organization_members m
    where m.organization_id = p_organization_id
      and m.status = 'active'
      and m.role in (
        'org_admin'::public.org_role,
        'org_billing'::public.org_role
      )
  loop
    if exists (
      select 1
      from public.notifications n
      where n.user_id = v_member.user_id
        and n.type = 'org_worker_payment_due'
        and n.data->>'payout_id' = p_payout_id::text
        and n.created_at > now() - interval '7 days'
    ) then
      continue;
    end if;

    insert into public.notifications (user_id, type, title, body, data)
    values (
      v_member.user_id,
      'org_worker_payment_due',
      v_title,
      v_body,
      jsonb_build_object(
        'event', 'worker_payment_due',
        'organization_id', p_organization_id,
        'payout_id', p_payout_id,
        'assignment_id', p_assignment_id,
        'amount_minor', p_amount_minor,
        'currency', upper(coalesce(nullif(trim(p_currency), ''), 'EUR')),
        'due_at', p_due_at,
        'href', '/payments'
      )
    );
  end loop;
end;
$$;

revoke all on function public.notify_org_worker_payment_due(
  uuid, uuid, uuid, integer, text, timestamptz
) from public;

comment on function public.notify_org_worker_payment_due(
  uuid, uuid, uuid, integer, text, timestamptz
) is
  'In-app notify for org_admin/org_billing when a payout row is created after timesheet approval.';

create or replace function public.payouts_notify_org_on_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.notify_org_worker_payment_due(
    new.organization_id,
    new.id,
    new.assignment_id,
    coalesce(new.organization_total_due_minor, new.gross_amount_minor),
    new.currency,
    new.due_at
  );
  return new;
end;
$$;

drop trigger if exists payouts_notify_org_on_insert on public.payouts;
create trigger payouts_notify_org_on_insert
after insert on public.payouts
for each row
execute function public.payouts_notify_org_on_insert();

-- Backfill notifications for existing open/awaiting payouts that never notified.
do $$
declare
  r record;
begin
  for r in
    select
      p.id,
      p.organization_id,
      p.assignment_id,
      coalesce(p.organization_total_due_minor, p.gross_amount_minor) as amount_minor,
      p.currency,
      p.due_at
    from public.payouts p
    where p.status in (
      'approved',
      'payment_instruction_ready',
      'reconciliation_pending',
      'overdue'
    )
  loop
    perform public.notify_org_worker_payment_due(
      r.organization_id,
      r.id,
      r.assignment_id,
      r.amount_minor,
      r.currency,
      r.due_at
    );
  end loop;
end;
$$;
