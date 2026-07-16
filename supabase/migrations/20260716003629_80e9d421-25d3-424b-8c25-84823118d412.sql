
-- Extension tokens
CREATE TABLE public.extension_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(24), 'hex'),
  nome TEXT NOT NULL DEFAULT 'Extensão Chrome',
  revogado BOOLEAN NOT NULL DEFAULT false,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.extension_tokens TO authenticated;
GRANT ALL ON public.extension_tokens TO service_role;
ALTER TABLE public.extension_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner manages own extension tokens" ON public.extension_tokens FOR ALL TO authenticated
USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id AND organization_id = public.current_org_id());

-- GBP audits (minimal)
CREATE TABLE public.gbp_audits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  dados_brutos JSONB NOT NULL DEFAULT '{}'::jsonb,
  metricas JSONB NOT NULL DEFAULT '[]'::jsonb,
  score_geral NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'concluida',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_gbp_audits_lead ON public.gbp_audits(lead_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.gbp_audits TO authenticated;
GRANT ALL ON public.gbp_audits TO service_role;
ALTER TABLE public.gbp_audits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members of org read audits" ON public.gbp_audits FOR SELECT TO authenticated
USING (organization_id = public.current_org_id());
CREATE POLICY "Owner manages own audits" ON public.gbp_audits FOR ALL TO authenticated
USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id AND organization_id = public.current_org_id());

-- Flag no lead
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS criado_por_extensao BOOLEAN NOT NULL DEFAULT false;
