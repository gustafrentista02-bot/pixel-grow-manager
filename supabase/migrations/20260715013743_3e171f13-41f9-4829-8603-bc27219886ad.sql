
-- 1) organizations
CREATE TABLE public.organizations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  logo_url TEXT NOT NULL DEFAULT '',
  cor_marca TEXT NOT NULL DEFAULT '#10b981',
  invite_code TEXT NOT NULL UNIQUE DEFAULT substr(md5(random()::text), 1, 8),
  plano TEXT NOT NULL DEFAULT 'trial',
  status TEXT NOT NULL DEFAULT 'ativo',
  trial_ends_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '14 days'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.organizations TO authenticated;
GRANT ALL ON public.organizations TO service_role;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON public.organizations
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2) organization_id em profiles + função current_org_id
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;

CREATE OR REPLACE FUNCTION public.current_org_id()
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT organization_id FROM public.profiles WHERE id = auth.uid()
$$;

CREATE POLICY "Members read own organization" ON public.organizations FOR SELECT TO authenticated
USING (id = public.current_org_id());
CREATE POLICY "Managers update own organization" ON public.organizations FOR UPDATE TO authenticated
USING (id = public.current_org_id() AND public.has_role(auth.uid(), 'gerente'))
WITH CHECK (id = public.current_org_id() AND public.has_role(auth.uid(), 'gerente'));
CREATE POLICY "Anyone authenticated can create an organization" ON public.organizations FOR INSERT TO authenticated
WITH CHECK (true);

-- 3) Backfill: criar org "Pixel Marketing" e vincular todo profile existente
DO $$
DECLARE
  v_org UUID;
  v_pixel UUID;
BEGIN
  SELECT id INTO v_pixel FROM public.profiles WHERE email = 'pixel.mkt.ofc@gmail.com' LIMIT 1;
  IF v_pixel IS NOT NULL THEN
    INSERT INTO public.organizations (nome) VALUES ('Pixel Marketing') RETURNING id INTO v_org;
    UPDATE public.profiles SET organization_id = v_org WHERE organization_id IS NULL;
  END IF;
END $$;

-- 4) Adicionar organization_id em cada tabela e backfillar via owner_id
ALTER TABLE public.leads              ADD COLUMN organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.cadences           ADD COLUMN organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.cadence_enrollments ADD COLUMN organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.message_templates  ADD COLUMN organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.proposal_templates ADD COLUMN organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.proposal_sends     ADD COLUMN organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.whatsapp_instances ADD COLUMN organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.scheduled_messages ADD COLUMN organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.tasks              ADD COLUMN organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.company_settings   ADD COLUMN organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;

UPDATE public.leads              t SET organization_id = p.organization_id FROM public.profiles p WHERE p.id = t.owner_id;
UPDATE public.cadences           t SET organization_id = p.organization_id FROM public.profiles p WHERE p.id = t.owner_id;
UPDATE public.cadence_enrollments t SET organization_id = p.organization_id FROM public.profiles p WHERE p.id = t.owner_id;
UPDATE public.message_templates  t SET organization_id = p.organization_id FROM public.profiles p WHERE p.id = t.owner_id;
UPDATE public.proposal_templates t SET organization_id = p.organization_id FROM public.profiles p WHERE p.id = t.owner_id;
UPDATE public.proposal_sends     t SET organization_id = p.organization_id FROM public.profiles p WHERE p.id = t.owner_id;
UPDATE public.whatsapp_instances t SET organization_id = p.organization_id FROM public.profiles p WHERE p.id = t.owner_id;
UPDATE public.scheduled_messages t SET organization_id = p.organization_id FROM public.profiles p WHERE p.id = t.owner_id;
UPDATE public.tasks              t SET organization_id = p.organization_id FROM public.profiles p WHERE p.id = t.owner_id;

-- company_settings: linha global única -> vincular a org do pixel (se existir)
UPDATE public.company_settings SET organization_id = (SELECT organization_id FROM public.profiles WHERE email='pixel.mkt.ofc@gmail.com' LIMIT 1)
WHERE organization_id IS NULL;
-- se não sobrou org (banco sem usuários), remove órfãs
DELETE FROM public.company_settings WHERE organization_id IS NULL;
ALTER TABLE public.company_settings ADD CONSTRAINT company_settings_org_unique UNIQUE (organization_id);
ALTER TABLE public.company_settings ALTER COLUMN organization_id SET NOT NULL;

-- 5) Reescrever políticas
-- profiles
DROP POLICY IF EXISTS "Authenticated read team profile names" ON public.profiles;
DROP POLICY IF EXISTS "Managers delete profiles" ON public.profiles;
DROP POLICY IF EXISTS "Managers read all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Managers update profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users update own profile" ON public.profiles;

CREATE POLICY "Users read own profile" ON public.profiles FOR SELECT TO authenticated
USING (id = auth.uid());
CREATE POLICY "Members read org profiles" ON public.profiles FOR SELECT TO authenticated
USING (organization_id = public.current_org_id());
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT TO authenticated
WITH CHECK (id = auth.uid());
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated
USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE POLICY "Managers update org profiles" ON public.profiles FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(),'gerente') AND organization_id = public.current_org_id())
WITH CHECK (public.has_role(auth.uid(),'gerente') AND organization_id = public.current_org_id());
CREATE POLICY "Managers delete org profiles" ON public.profiles FOR DELETE TO authenticated
USING (public.has_role(auth.uid(),'gerente') AND organization_id = public.current_org_id() AND id <> auth.uid());

-- leads
DROP POLICY IF EXISTS "Owner manages own leads" ON public.leads;
DROP POLICY IF EXISTS "Managers manage team leads" ON public.leads;
CREATE POLICY "Owner manages own leads" ON public.leads FOR ALL TO authenticated
USING (auth.uid() = owner_id AND organization_id = public.current_org_id())
WITH CHECK (auth.uid() = owner_id AND organization_id = public.current_org_id());
CREATE POLICY "Managers manage org leads" ON public.leads FOR ALL TO authenticated
USING (public.has_role(auth.uid(),'gerente') AND organization_id = public.current_org_id())
WITH CHECK (public.has_role(auth.uid(),'gerente') AND organization_id = public.current_org_id());

-- cadences
DROP POLICY IF EXISTS "Owner manages own cadences" ON public.cadences;
DROP POLICY IF EXISTS "Team reads shared cadences" ON public.cadences;
CREATE POLICY "Owner manages own cadences" ON public.cadences FOR ALL TO authenticated
USING (auth.uid() = owner_id AND organization_id = public.current_org_id())
WITH CHECK (auth.uid() = owner_id AND organization_id = public.current_org_id()
  AND (compartilhada = false OR public.has_role(auth.uid(),'gerente')));
CREATE POLICY "Team reads shared cadences" ON public.cadences FOR SELECT TO authenticated
USING (compartilhada = true AND organization_id = public.current_org_id());

-- cadence_steps (filha de cadences, isolamento propagado)
DROP POLICY IF EXISTS "Owner manages own cadence steps" ON public.cadence_steps;
DROP POLICY IF EXISTS "Team reads shared cadence steps" ON public.cadence_steps;
CREATE POLICY "Owner manages own cadence steps" ON public.cadence_steps FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.cadences c WHERE c.id = cadence_steps.cadence_id
  AND c.owner_id = auth.uid() AND c.organization_id = public.current_org_id()))
WITH CHECK (EXISTS (SELECT 1 FROM public.cadences c WHERE c.id = cadence_steps.cadence_id
  AND c.owner_id = auth.uid() AND c.organization_id = public.current_org_id()));
CREATE POLICY "Team reads shared cadence steps" ON public.cadence_steps FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.cadences c WHERE c.id = cadence_steps.cadence_id
  AND c.compartilhada = true AND c.organization_id = public.current_org_id()));

-- cadence_enrollments
DROP POLICY IF EXISTS "Owner manages cadence enrollments" ON public.cadence_enrollments;
CREATE POLICY "Owner manages cadence enrollments" ON public.cadence_enrollments FOR ALL TO authenticated
USING (auth.uid() = owner_id AND organization_id = public.current_org_id())
WITH CHECK (auth.uid() = owner_id AND organization_id = public.current_org_id());
CREATE POLICY "Managers manage org enrollments" ON public.cadence_enrollments FOR ALL TO authenticated
USING (public.has_role(auth.uid(),'gerente') AND organization_id = public.current_org_id())
WITH CHECK (public.has_role(auth.uid(),'gerente') AND organization_id = public.current_org_id());

-- message_templates
DROP POLICY IF EXISTS "Owner manages own message templates" ON public.message_templates;
DROP POLICY IF EXISTS "Team reads shared message templates" ON public.message_templates;
CREATE POLICY "Owner manages own message templates" ON public.message_templates FOR ALL TO authenticated
USING (auth.uid() = owner_id AND organization_id = public.current_org_id())
WITH CHECK (auth.uid() = owner_id AND organization_id = public.current_org_id()
  AND (compartilhada = false OR public.has_role(auth.uid(),'gerente')));
CREATE POLICY "Team reads shared message templates" ON public.message_templates FOR SELECT TO authenticated
USING (compartilhada = true AND organization_id = public.current_org_id());

-- proposal_templates
DROP POLICY IF EXISTS "Users manage own proposal templates" ON public.proposal_templates;
CREATE POLICY "Owner manages own proposal templates" ON public.proposal_templates FOR ALL TO authenticated
USING (auth.uid() = owner_id AND organization_id = public.current_org_id())
WITH CHECK (auth.uid() = owner_id AND organization_id = public.current_org_id());

-- proposal_sends
DROP POLICY IF EXISTS "Owner manages proposal sends" ON public.proposal_sends;
CREATE POLICY "Owner manages proposal sends" ON public.proposal_sends FOR ALL TO authenticated
USING (auth.uid() = owner_id AND organization_id = public.current_org_id())
WITH CHECK (auth.uid() = owner_id AND organization_id = public.current_org_id());
CREATE POLICY "Managers manage org proposal sends" ON public.proposal_sends FOR ALL TO authenticated
USING (public.has_role(auth.uid(),'gerente') AND organization_id = public.current_org_id())
WITH CHECK (public.has_role(auth.uid(),'gerente') AND organization_id = public.current_org_id());

-- whatsapp_instances
DROP POLICY IF EXISTS "Owner manages own whatsapp instance" ON public.whatsapp_instances;
DROP POLICY IF EXISTS "Managers view all whatsapp instances" ON public.whatsapp_instances;
CREATE POLICY "Owner manages own whatsapp instance" ON public.whatsapp_instances FOR ALL TO authenticated
USING (auth.uid() = owner_id AND organization_id = public.current_org_id())
WITH CHECK (auth.uid() = owner_id AND organization_id = public.current_org_id());
CREATE POLICY "Managers view org whatsapp instances" ON public.whatsapp_instances FOR SELECT TO authenticated
USING (public.has_role(auth.uid(),'gerente') AND organization_id = public.current_org_id());

-- scheduled_messages
DROP POLICY IF EXISTS "Owner manages scheduled messages" ON public.scheduled_messages;
CREATE POLICY "Owner manages scheduled messages" ON public.scheduled_messages FOR ALL TO authenticated
USING (auth.uid() = owner_id AND organization_id = public.current_org_id())
WITH CHECK (auth.uid() = owner_id AND organization_id = public.current_org_id());

-- tasks
DROP POLICY IF EXISTS "Users manage own tasks" ON public.tasks;
DROP POLICY IF EXISTS "Managers view all tasks" ON public.tasks;
CREATE POLICY "Users manage own tasks" ON public.tasks FOR ALL TO authenticated
USING (auth.uid() = owner_id AND organization_id = public.current_org_id())
WITH CHECK (auth.uid() = owner_id AND organization_id = public.current_org_id());
CREATE POLICY "Managers view org tasks" ON public.tasks FOR SELECT TO authenticated
USING (public.has_role(auth.uid(),'gerente') AND organization_id = public.current_org_id());

-- company_settings
DROP POLICY IF EXISTS "Everyone reads company settings" ON public.company_settings;
DROP POLICY IF EXISTS "Managers insert company settings" ON public.company_settings;
DROP POLICY IF EXISTS "Managers update company settings" ON public.company_settings;
CREATE POLICY "Members read org company settings" ON public.company_settings FOR SELECT TO authenticated
USING (organization_id = public.current_org_id());
CREATE POLICY "Managers insert org company settings" ON public.company_settings FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(),'gerente') AND organization_id = public.current_org_id());
CREATE POLICY "Managers update org company settings" ON public.company_settings FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(),'gerente') AND organization_id = public.current_org_id())
WITH CHECK (public.has_role(auth.uid(),'gerente') AND organization_id = public.current_org_id());

-- lead_notes / lead_movements / lead_events / lead_files: já são filhas de leads (leads já isoladas), políticas mantidas
-- Reforço opcional: garantir que o lead pai pertença à org do usuário (has_role manager pode ler cross-owner mas mesma org)
DROP POLICY IF EXISTS "Read lead events" ON public.lead_events;
CREATE POLICY "Read lead events" ON public.lead_events FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.leads l WHERE l.id = lead_events.lead_id
  AND l.organization_id = public.current_org_id()
  AND (l.owner_id = auth.uid() OR public.has_role(auth.uid(),'gerente'))));
DROP POLICY IF EXISTS "Read lead files" ON public.lead_files;
CREATE POLICY "Read lead files" ON public.lead_files FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.leads l WHERE l.id = lead_files.lead_id
  AND l.organization_id = public.current_org_id()
  AND (l.owner_id = auth.uid() OR public.has_role(auth.uid(),'gerente'))));

-- 6) handle_signup com invite code
CREATE OR REPLACE FUNCTION public.handle_signup(_nome text, _invite_code text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_org UUID;
  v_role app_role;
  v_status TEXT;
  v_email TEXT;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  SELECT email INTO v_email FROM auth.users WHERE id = auth.uid();

  IF _invite_code IS NOT NULL AND length(trim(_invite_code)) > 0 THEN
    SELECT id INTO v_org FROM public.organizations WHERE invite_code = trim(_invite_code) LIMIT 1;
    IF v_org IS NULL THEN
      RAISE EXCEPTION 'invalid invite code';
    END IF;
    v_role := 'vendedor'::app_role;
    v_status := 'pendente';
  ELSE
    INSERT INTO public.organizations (nome)
    VALUES (COALESCE(NULLIF(_nome,'') || ' - Empresa', 'Minha empresa'))
    RETURNING id INTO v_org;
    v_role := 'gerente'::app_role;
    v_status := 'aprovado';
  END IF;

  INSERT INTO public.profiles (id, nome, email, status, organization_id)
  VALUES (auth.uid(), COALESCE(NULLIF(_nome,''),'Usuário'), v_email, v_status, v_org)
  ON CONFLICT (id) DO UPDATE
    SET nome = EXCLUDED.nome, email = EXCLUDED.email,
        organization_id = COALESCE(public.profiles.organization_id, EXCLUDED.organization_id);

  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid()) THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (auth.uid(), v_role);
  END IF;
END;
$function$;
