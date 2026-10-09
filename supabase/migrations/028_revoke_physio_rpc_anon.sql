-- 028_revoke_physio_rpc_anon.sql
-- After 026 replaces physio-touched RPCs, explicitly revoke anon EXECUTE.
-- Supabase may grant EXECUTE to anon independently of PUBLIC.
-- Keeps TEST-validated 027 (org invitation/admin RPCs) unchanged.
-- Body matches reconcile-artifacts/027_revoke_physio_rpc_anon.sql.

revoke all on function public.create_shifts_batch(uuid, text, text, text, jsonb) from public;
revoke all on function public.create_shifts_batch(uuid, text, text, text, jsonb) from anon;
grant execute on function public.create_shifts_batch(uuid, text, text, text, jsonb) to authenticated;

revoke all on function public.ensure_my_worker_profile(public.worker_role, text) from public;
revoke all on function public.ensure_my_worker_profile(public.worker_role, text) from anon;
grant execute on function public.ensure_my_worker_profile(public.worker_role, text) to authenticated;

revoke all on function public.submit_worker_verification_package() from public;
revoke all on function public.submit_worker_verification_package() from anon;
grant execute on function public.submit_worker_verification_package() to authenticated;

revoke all on function public.credential_expiry_is_valid(text, timestamptz, timestamptz) from public;
revoke all on function public.credential_expiry_is_valid(text, timestamptz, timestamptz) from anon;
grant execute on function public.credential_expiry_is_valid(text, timestamptz, timestamptz) to authenticated;
