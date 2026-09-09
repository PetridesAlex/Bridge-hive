-- 013_fix_rls_recursion.sql
-- Proven defect: shifts <-> shift_assignments SELECT policies recurse under RLS.
-- Use SECURITY DEFINER helpers so cross-table checks do not re-enter RLS.

create or replace function public.worker_has_assignment_on_shift(p_shift_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.shift_assignments sa
    where sa.shift_id = p_shift_id
      and sa.worker_id = auth.uid()
  );
$$;

create or replace function public.shift_organization_id(p_shift_id uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select s.organization_id
  from public.shifts s
  where s.id = p_shift_id;
$$;

create or replace function public.assignment_belongs_to_org_member(p_assignment_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.shift_assignments sa
    join public.shifts s on s.id = sa.shift_id
    where sa.id = p_assignment_id
      and public.is_org_member(s.organization_id)
  );
$$;

create or replace function public.worker_assigned_to_org_member(p_worker_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.shift_assignments sa
    join public.shifts s on s.id = sa.shift_id
    where sa.worker_id = p_worker_id
      and public.is_org_member(s.organization_id)
  );
$$;

revoke all on function public.worker_has_assignment_on_shift(uuid) from public;
grant execute on function public.worker_has_assignment_on_shift(uuid) to authenticated;

revoke all on function public.shift_organization_id(uuid) from public;
grant execute on function public.shift_organization_id(uuid) to authenticated;

revoke all on function public.assignment_belongs_to_org_member(uuid) from public;
grant execute on function public.assignment_belongs_to_org_member(uuid) to authenticated;

revoke all on function public.worker_assigned_to_org_member(uuid) from public;
grant execute on function public.worker_assigned_to_org_member(uuid) to authenticated;

-- Replace recursive policies
drop policy if exists "shifts_select_own_assignment" on public.shifts;
create policy "shifts_select_own_assignment"
on public.shifts
for select
to authenticated
using (public.worker_has_assignment_on_shift(id));

drop policy if exists "shift_assignments_select_org" on public.shift_assignments;
create policy "shift_assignments_select_org"
on public.shift_assignments
for select
to authenticated
using (
  public.is_org_member(public.shift_organization_id(shift_id))
);

drop policy if exists "timesheets_select_org" on public.timesheets;
create policy "timesheets_select_org"
on public.timesheets
for select
to authenticated
using (public.assignment_belongs_to_org_member(assignment_id));

drop policy if exists "worker_profiles_select_assigned_org" on public.worker_profiles;
create policy "worker_profiles_select_assigned_org"
on public.worker_profiles
for select
to authenticated
using (public.worker_assigned_to_org_member(user_id));
