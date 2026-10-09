-- 027_revoke_activation_rpc_anon.sql
-- Supabase grants EXECUTE to anon on new/replaced functions independently of PUBLIC.
-- Migration 023 revoked PUBLIC only; explicit anon revoke matches 019/020/021.

revoke all on function public.mark_organization_invitation_delivery(uuid, text, text) from public;
revoke all on function public.mark_organization_invitation_delivery(uuid, text, text) from anon;
grant execute on function public.mark_organization_invitation_delivery(uuid, text, text) to authenticated;

revoke all on function public.assert_invitation_resend_allowed(uuid) from public;
revoke all on function public.assert_invitation_resend_allowed(uuid) from anon;
grant execute on function public.assert_invitation_resend_allowed(uuid) to authenticated;

revoke all on function public.accept_organization_invitation_by_id(uuid) from public;
revoke all on function public.accept_organization_invitation_by_id(uuid) from anon;
grant execute on function public.accept_organization_invitation_by_id(uuid) to authenticated;

revoke all on function public.get_organization_invitation_preview_by_id(uuid) from public;
revoke all on function public.get_organization_invitation_preview_by_id(uuid) from anon;
grant execute on function public.get_organization_invitation_preview_by_id(uuid) to authenticated;

revoke all on function public.revoke_organization_invitation(uuid) from public;
revoke all on function public.revoke_organization_invitation(uuid) from anon;
grant execute on function public.revoke_organization_invitation(uuid) to authenticated;

revoke all on function public.accept_organization_invitation(text) from public;
revoke all on function public.accept_organization_invitation(text) from anon;
grant execute on function public.accept_organization_invitation(text) to authenticated;

revoke all on function public.get_admin_organization_detail(uuid) from public;
revoke all on function public.get_admin_organization_detail(uuid) from anon;
grant execute on function public.get_admin_organization_detail(uuid) to authenticated;
