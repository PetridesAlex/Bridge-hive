-- 20261106121000_shift_capacity_occupancy_guard.sql
-- Reject reducing shifts.required_positions below currently occupied capacity.
-- Ordered after 20261103132451_worker_sandbox_payments (hosted Bridge-Hive).
-- Occupancy matches shift_active_assignment_count (031): accepted…approved.
-- Does not rewrite claim_shift, open-position helpers, or pay RPCs.

create or replace function public.shifts_guard_required_positions()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_occupied integer;
begin
  if tg_op <> 'UPDATE' then
    return new;
  end if;

  if new.required_positions is not distinct from old.required_positions then
    return new;
  end if;

  if new.required_positions is null
     or new.required_positions < 1
     or new.required_positions > 100 then
    raise exception 'INVALID_REQUIRED_POSITIONS'
      using errcode = 'P0001';
  end if;

  -- Increases are always allowed; only reductions need an occupancy check.
  if new.required_positions >= old.required_positions then
    return new;
  end if;

  v_occupied := public.shift_active_assignment_count(new.id);

  if new.required_positions < v_occupied then
    raise exception 'CAPACITY_BELOW_OCCUPIED'
      using errcode = 'P0001',
            detail = format(
              'required_positions=%s occupied=%s',
              new.required_positions,
              v_occupied
            );
  end if;

  return new;
end;
$$;

comment on function public.shifts_guard_required_positions() is
  'Rejects required_positions updates that drop below currently occupying assignments.';

drop trigger if exists shifts_guard_required_positions on public.shifts;
create trigger shifts_guard_required_positions
before update of required_positions on public.shifts
for each row
execute function public.shifts_guard_required_positions();
