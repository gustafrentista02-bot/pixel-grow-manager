
-- 1) Tighten organizations INSERT policy
DROP POLICY IF EXISTS "Anyone authenticated can create an organization" ON public.organizations;
CREATE POLICY "Users without org can create an organization" ON public.organizations
FOR INSERT TO authenticated
WITH CHECK (
  NOT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.organization_id IS NOT NULL
  )
);

-- 2) Revoke EXECUTE from anon/public on SECURITY DEFINER functions
REVOKE EXECUTE ON FUNCTION public.current_org_id() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_team_metrics() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.set_org_id_from_user() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.handle_signup(text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.handle_signup(text, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.current_org_id() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_team_metrics() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.handle_signup(text, text) TO authenticated, service_role;
