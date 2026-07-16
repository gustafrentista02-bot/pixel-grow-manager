-- Permitir que gerentes atualizem visibilidade de métricas de qualquer auditoria da mesma organização
CREATE POLICY "Gerentes update org audits"
ON public.gbp_audits
FOR UPDATE
TO authenticated
USING (organization_id = public.current_org_id() AND public.has_role(auth.uid(), 'gerente'))
WITH CHECK (organization_id = public.current_org_id() AND public.has_role(auth.uid(), 'gerente'));