-- 014_worker_shift_details_rpc.sql
-- Allow workers to read denormalized organization/location/ward names for
-- published shifts or shifts they are assigned to (without opening org RLS).

create or replace function public.get_worker_shift_details(p_shift_id uuid)
returns table (
  shift_id uuid,
  organization_name text,
  location_name text,
  ward_name text,
  title text,
  starts_at timestamptz,
  ends_at timestamptz,
  rate_minor integer,
  currency text,
  required_role public.worker_role,
  status public.shift_status,
  notes text,
  break_minutes integer,
  acceptance_deadline timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  return query
  select
    s.id as shift_id,
    o.display_name as organization_name,
    l.name as location_name,
    w.name as ward_name,
    s.title,
    s.starts_at,
    s.ends_at,
    s.rate_minor,
    s.currency,
    s.required_role,
    s.status,
    s.notes,
    s.break_minutes,
    s.acceptance_deadline
  from public.shifts s
  join public.organizations o on o.id = s.organization_id
  join public.locations l on l.id = s.location_id
  left join public.wards w on w.id = s.ward_id
  where s.id = p_shift_id
    and (
      exists (
        select 1
        from public.shift_assignments sa
        where sa.shift_id = s.id
          and sa.worker_id = auth.uid()
      )
      or (
        s.status = 'published'
        and (
          s.acceptance_deadline is null
          or s.acceptance_deadline > now()
        )
      )
    );
end;
$$;

revoke all on function public.get_worker_shift_details(uuid) from public;
grant execute on function public.get_worker_shift_details(uuid) to authenticated;
