-- 20261113200000_org_shift_assigned_worker_names.sql
-- UNAPPLIED. Not on staging, not on production.
--
-- Lets an organization see the NAME of a worker who has accepted one of its
-- shifts. Today `profiles` is readable only by its owner and platform admins,
-- so the shift page can only show the worker role and a short id.
--
-- Scope is deliberately narrow:
--   * caller must be an active member of the organization that owns the shift;
--   * only workers whose assignment currently occupies a position
--     (accepted, checked_in, checked_out, submitted, approved) are returned;
--     withdrawn, cancelled, rejected and no_show assignments return nothing;
--   * only assignment id, worker id and full name are returned. No email,
--     phone, address, bank or document data;
--   * read-only. No table policy is widened, so the same workers' names stay
--     hidden everywhere else.

create or replace function public.list_org_shift_assigned_workers(
  p_shift_id uuid
)
returns table (
  assignment_id uuid,
  worker_id uuid,
  full_name text
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_org_id uuid;
begin
  if auth.uid() is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  if p_shift_id is null then
    raise exception 'INVALID_ARGUMENTS';
  end if;

  select s.organization_id into v_org_id
  from public.shifts s
  where s.id = p_shift_id;

  if v_org_id is null or not public.is_org_member(v_org_id) then
    raise exception 'NOT_AUTHORIZED';
  end if;

  return query
  select
    sa.id,
    sa.worker_id,
    nullif(trim(p.full_name), '')
  from public.shift_assignments sa
  join public.profiles p on p.id = sa.worker_id
  where sa.shift_id = p_shift_id
    and sa.status in ('accepted', 'checked_in', 'checked_out', 'submitted', 'approved')
  order by sa.accepted_at asc nulls last, sa.id asc;
end;
$$;

revoke all on function public.list_org_shift_assigned_workers(uuid)
  from public, anon;
grant execute on function public.list_org_shift_assigned_workers(uuid)
  to authenticated;

-- ---------------------------------------------------------------------------
-- Batch version for the shifts list (UNAPPLIED).
-- Same rules: only rows for shifts of organizations the caller is an active
-- member of, only position-occupying assignments, only id and full name.
-- Shifts of other organizations are silently ignored, never an error.
-- ---------------------------------------------------------------------------

create or replace function public.list_org_assigned_workers_for_shifts(
  p_shift_ids uuid[]
)
returns table (
  shift_id uuid,
  assignment_id uuid,
  worker_id uuid,
  full_name text
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  if p_shift_ids is null or coalesce(array_length(p_shift_ids, 1), 0) = 0 then
    return;
  end if;

  if array_length(p_shift_ids, 1) > 200 then
    raise exception 'INVALID_ARGUMENTS';
  end if;

  return query
  select
    sa.shift_id,
    sa.id,
    sa.worker_id,
    nullif(trim(p.full_name), '')
  from public.shift_assignments sa
  join public.shifts s on s.id = sa.shift_id
  join public.profiles p on p.id = sa.worker_id
  where sa.shift_id = any (p_shift_ids)
    and public.is_org_member(s.organization_id)
    and sa.status in ('accepted', 'checked_in', 'checked_out', 'submitted', 'approved')
  order by sa.shift_id, sa.accepted_at asc nulls last, sa.id asc;
end;
$$;

revoke all on function public.list_org_assigned_workers_for_shifts(uuid[])
  from public, anon;
grant execute on function public.list_org_assigned_workers_for_shifts(uuid[])
  to authenticated;
