-- New role
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'administrador';

-- Extend leads
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS whatsapp TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS instagram TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS site TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS area_atendimento TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS responsavel_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS plano TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS status_comercial TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS potencial TEXT NOT NULL DEFAULT 'media',
  ADD COLUMN IF NOT EXISTS tem_perfil_google BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS link_perfil_google TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS tem_site BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS faz_google_ads BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS faz_meta_ads BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS canais_aquisicao TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS objetivo TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS dificuldade TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS proxima_acao TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS reuniao_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS meet_link TEXT NOT NULL DEFAULT '';

-- Managers can read all team leads (owner ALL policy already exists)
DROP POLICY IF EXISTS "Managers read team leads" ON public.leads;
CREATE POLICY "Managers read team leads" ON public.leads FOR SELECT TO authenticated
USING (public.has_role(auth.uid(),'gerente'));

-- LEAD EVENTS (timeline)
CREATE TABLE IF NOT EXISTS public.lead_events (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  autor_nome TEXT NOT NULL DEFAULT '',
  tipo TEXT NOT NULL DEFAULT 'nota',
  descricao TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lead_events TO authenticated;
GRANT ALL ON public.lead_events TO service_role;
ALTER TABLE public.lead_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read lead events" ON public.lead_events FOR SELECT TO authenticated
USING (public.has_role(auth.uid(),'gerente') OR EXISTS (SELECT 1 FROM public.leads l WHERE l.id = lead_id AND l.owner_id = auth.uid()));
CREATE POLICY "Insert lead events" ON public.lead_events FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM public.leads l WHERE l.id = lead_id AND l.owner_id = auth.uid()));

-- LEAD FILES
CREATE TABLE IF NOT EXISTS public.lead_files (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL DEFAULT '',
  categoria TEXT NOT NULL DEFAULT 'arquivo',
  path TEXT NOT NULL,
  tamanho BIGINT NOT NULL DEFAULT 0,
  mime TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lead_files TO authenticated;
GRANT ALL ON public.lead_files TO service_role;
ALTER TABLE public.lead_files ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read lead files" ON public.lead_files FOR SELECT TO authenticated
USING (public.has_role(auth.uid(),'gerente') OR EXISTS (SELECT 1 FROM public.leads l WHERE l.id = lead_id AND l.owner_id = auth.uid()));
CREATE POLICY "Insert lead files" ON public.lead_files FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid() AND EXISTS (SELECT 1 FROM public.leads l WHERE l.id = lead_id AND l.owner_id = auth.uid()));
CREATE POLICY "Delete lead files" ON public.lead_files FOR DELETE TO authenticated
USING (EXISTS (SELECT 1 FROM public.leads l WHERE l.id = lead_id AND l.owner_id = auth.uid()));

-- COMPANY SETTINGS (single-row global config)
CREATE TABLE IF NOT EXISTS public.company_settings (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  nome_empresa TEXT NOT NULL DEFAULT 'Pixel Marketing',
  logo_url TEXT NOT NULL DEFAULT '',
  telefone TEXT NOT NULL DEFAULT '',
  whatsapp TEXT NOT NULL DEFAULT '',
  instagram TEXT NOT NULL DEFAULT '',
  site TEXT NOT NULL DEFAULT '',
  meet_padrao TEXT NOT NULL DEFAULT '',
  assinatura TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.company_settings TO authenticated;
GRANT ALL ON public.company_settings TO service_role;
ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Everyone reads company settings" ON public.company_settings FOR SELECT TO authenticated
USING (true);
CREATE POLICY "Managers insert company settings" ON public.company_settings FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(),'gerente'));
CREATE POLICY "Managers update company settings" ON public.company_settings FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(),'gerente')) WITH CHECK (public.has_role(auth.uid(),'gerente'));

CREATE TRIGGER update_company_settings_updated_at BEFORE UPDATE ON public.company_settings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- indexes
CREATE INDEX IF NOT EXISTS idx_lead_events_lead ON public.lead_events(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_files_lead ON public.lead_files(lead_id);
CREATE INDEX IF NOT EXISTS idx_leads_responsavel ON public.leads(responsavel_id);