-- 025_worker_role_physiotherapist.sql
-- Add physiotherapist to public.worker_role.
--
-- PostgreSQL enum values added inside a transaction cannot be used until that
-- transaction commits. Keep this migration enum-only; migration 026 consumes
-- the new value in functions and checklists.

alter type public.worker_role add value if not exists 'physiotherapist';
