-- has_role is only used inside RLS policies; no API role needs EXECUTE
REVOKE EXECUTE ON FUNCTION public.has_role(UUID, app_role) FROM PUBLIC, anon, authenticated;

-- handle_signup is called via RPC by signed-in users only
REVOKE EXECUTE ON FUNCTION public.handle_signup(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.handle_signup(TEXT) TO authenticated;