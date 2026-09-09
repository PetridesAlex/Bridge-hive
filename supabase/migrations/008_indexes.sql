-- 008_indexes.sql
-- Performance indexes for foreign keys and RLS predicate columns.

-- Profiles / workers
create index if not exists profiles_account_status_idx
  on public.profiles (account_status);

create index if not exists worker_profiles_role_verification_idx
  on public.worker_profiles (worker_role, verification_status);

create index if not exists credentials_worker_id_idx
  on public.credentials (worker_id);

create index if not exists credentials_status_expires_idx
  on public.credentials (status, expires_at);

-- Organizations
create index if not exists organization_members_user_id_idx
  on public.organization_members (user_id);

create index if not exists organization_members_org_status_idx
  on public.organization_members (organization_id, status);

create index if not exists locations_organization_id_idx
  on public.locations (organization_id);

create index if not exists wards_location_id_idx
  on public.wards (location_id);

-- Shifts
create index if not exists shifts_organization_id_idx
  on public.shifts (organization_id);

create index if not exists shifts_location_id_idx
  on public.shifts (location_id);

create index if not exists shifts_status_deadline_idx
  on public.shifts (status, acceptance_deadline);

create index if not exists shifts_starts_at_idx
  on public.shifts (starts_at);

create index if not exists shifts_required_role_status_idx
  on public.shifts (required_role, status);

create index if not exists shift_requirements_shift_id_idx
  on public.shift_requirements (shift_id);

-- Assignments / timesheets
create index if not exists shift_assignments_worker_id_idx
  on public.shift_assignments (worker_id);

create index if not exists shift_assignments_shift_id_idx
  on public.shift_assignments (shift_id);

create index if not exists shift_assignments_worker_status_idx
  on public.shift_assignments (worker_id, status);

create index if not exists timesheets_assignment_id_idx
  on public.timesheets (assignment_id);

create index if not exists timesheets_status_idx
  on public.timesheets (status);

-- Infrastructure
create index if not exists device_tokens_user_id_idx
  on public.device_tokens (user_id);

create index if not exists notifications_user_id_created_idx
  on public.notifications (user_id, created_at desc);

create index if not exists notifications_user_unread_idx
  on public.notifications (user_id)
  where read_at is null;

create index if not exists audit_events_org_created_idx
  on public.audit_events (organization_id, created_at desc);

create index if not exists audit_events_actor_created_idx
  on public.audit_events (actor_user_id, created_at desc);

create index if not exists audit_events_entity_idx
  on public.audit_events (entity_type, entity_id);
