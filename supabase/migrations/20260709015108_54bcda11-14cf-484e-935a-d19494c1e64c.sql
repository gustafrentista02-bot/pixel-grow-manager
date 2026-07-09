-- Allow authenticated users to execute the role-check helper used inside RLS policies.
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO anon;

-- Ensure the leads table (and related tables) are reachable through the Data API.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.leads TO authenticated;
GRANT ALL ON public.leads TO service_role;