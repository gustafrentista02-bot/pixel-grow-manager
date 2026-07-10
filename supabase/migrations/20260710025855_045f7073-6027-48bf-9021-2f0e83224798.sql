-- Managers (gerente) can fully manage team leads, not just read them.
-- Previously only the owner could UPDATE, so a manager editing a lead they
-- did not own updated 0 rows and .single() failed with
-- "Cannot coerce the result to a single JSON object".
DROP POLICY IF EXISTS "Managers read team leads" ON public.leads;

CREATE POLICY "Managers manage team leads"
ON public.leads
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'gerente'))
WITH CHECK (public.has_role(auth.uid(), 'gerente'));