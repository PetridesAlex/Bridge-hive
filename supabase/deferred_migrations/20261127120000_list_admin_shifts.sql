-- DEFERRED — not release-ready; excluded from supabase/migrations so `db push`
-- will not apply it. Apply only after explicit hosted approval.
--
-- Preferred long-term path for the super-admin Active Shifts monitor.
-- Until this RPC is applied AND apps/web callers are switched to
-- supabase.rpc('list_admin_shifts') under the admin JWT, the page/export/details
-- path still requires an authorized server-only createServiceRoleClient()
-- (SUPABASE_SERVICE_ROLE_KEY). Applying this SQL alone does not remove that
-- dependency from the current TypeScript callers.
--
-- Active (default) definition (no DB status named "active"):
--   status IN ('published','filled','in_progress') AND ends_at > now()
-- Occupancy: shift_active_assignment_count / shift_open_positions (031).

create or replace function public.list_admin_shifts(
  p_search text default null,
  p_organization_id uuid default null,
  p_required_role public.worker_role default null,
  p_view text default 'active',
  p_starts_from timestamptz default null,
  p_starts_to timestamptz default null,
  p_sort text default 'starts_asc',
  p_limit integer default 40,
  p_offset integer default 0
)
returns table (
  id uuid,
  organization_id uuid,
  organization_name text,
  location_id uuid,
  location_name text,
  location_city text,
  timezone text,
  starts_at timestamptz,
  ends_at timestamptz,
  required_role public.worker_role,
  required_positions integer,
  occupied integer,
  remaining integer,
  status public.shift_status,
  created_at timestamptz,
  updated_at timestamptz,
  rate_minor integer,
  currency text,
  title text,
  notes text,
  total_count bigint
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_limit integer := greatest(1, least(coalesce(p_limit, 40), 5000));
  v_offset integer := greatest(0, coalesce(p_offset, 0));
  v_view text := lower(coalesce(nullif(trim(p_view), ''), 'active'));
  v_sort text := lower(coalesce(nullif(trim(p_sort), ''), 'starts_asc'));
begin
  if not public.is_platform_admin('platform_super_admin') then
    raise exception 'FORBIDDEN';
  end if;

  return query
  with filtered as (
    select
      s.id,
      s.organization_id,
      o.display_name as organization_name,
      s.location_id,
      l.name as location_name,
      l.city as location_city,
      coalesce(nullif(l.timezone, ''), nullif(o.timezone, ''), 'Europe/Nicosia') as timezone,
      s.starts_at,
      s.ends_at,
      s.required_role,
      s.required_positions,
      public.shift_active_assignment_count(s.id)::integer as occupied,
      public.shift_open_positions(s.id)::integer as remaining,
      s.status,
      s.created_at,
      s.updated_at,
      s.rate_minor,
      s.currency,
      s.title,
      s.notes
    from public.shifts s
    join public.organizations o on o.id = s.organization_id
    left join public.locations l on l.id = s.location_id
    where
      (p_organization_id is null or s.organization_id = p_organization_id)
      and (p_required_role is null or s.required_role = p_required_role)
      and (p_starts_from is null or s.starts_at >= p_starts_from)
      and (p_starts_to is null or s.starts_at < p_starts_to)
      and (
        case v_view
          when 'active' then
            s.status in ('published', 'filled', 'in_progress') and s.ends_at > now()
          when 'upcoming' then
            s.status in ('published', 'filled', 'in_progress')
            and s.ends_at > now()
            and s.starts_at > now()
          when 'in_progress' then
            s.status in ('published', 'filled', 'in_progress')
            and s.starts_at <= now()
            and s.ends_at > now()
          when 'ended' then
            s.ends_at <= now() and s.status <> 'draft'
          when 'cancelled' then
            s.status = 'cancelled'
          when 'draft' then
            s.status = 'draft'
          when 'all' then
            true
          else
            s.status in ('published', 'filled', 'in_progress') and s.ends_at > now()
        end
      )
      and (
        p_search is null
        or length(trim(p_search)) = 0
        or o.display_name ilike '%' || trim(p_search) || '%'
        or coalesce(l.name, '') ilike '%' || trim(p_search) || '%'
        or coalesce(l.city, '') ilike '%' || trim(p_search) || '%'
        or replace(s.id::text, '-', '') ilike '%' || replace(lower(trim(p_search)), '-', '') || '%'
      )
  ),
  counted as (
    select f.*, count(*) over() as total_count
    from filtered f
  )
  select
    c.id,
    c.organization_id,
    c.organization_name,
    c.location_id,
    c.location_name,
    c.location_city,
    c.timezone,
    c.starts_at,
    c.ends_at,
    c.required_role,
    c.required_positions,
    c.occupied,
    c.remaining,
    c.status,
    c.created_at,
    c.updated_at,
    c.rate_minor,
    c.currency,
    c.title,
    c.notes,
    c.total_count
  from counted c
  order by
    case when v_sort = 'starts_desc' then c.starts_at end desc nulls last,
    case when v_sort = 'updated_desc' then c.updated_at end desc nulls last,
    case when v_sort = 'starts_asc' or v_sort not in ('starts_desc', 'updated_desc') then c.starts_at end asc nulls last,
    c.id asc
  limit v_limit
  offset v_offset;
end;
$$;

revoke all on function public.list_admin_shifts(
  text, uuid, public.worker_role, text, timestamptz, timestamptz, text, integer, integer
) from public;

grant execute on function public.list_admin_shifts(
  text, uuid, public.worker_role, text, timestamptz, timestamptz, text, integer, integer
) to authenticated;

comment on function public.list_admin_shifts is
  'PENDING APPLY: Super-admin cross-org shift monitor. Active = published|filled|in_progress AND ends_at > now().';
