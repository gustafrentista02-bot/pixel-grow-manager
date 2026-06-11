-- ENUMS
CREATE TYPE public.app_role AS ENUM ('gerente', 'vendedor');
CREATE TYPE public.lead_stage AS ENUM ('lead_novo','conversando','reuniao','proposta','ganho','perdido','follow_up','sem_interesse');
CREATE TYPE public.followup_stage AS ENUM ('followup_1','followup_2','followup_3','followup_4');
CREATE TYPE public.lead_origin AS ENUM ('google','instagram','facebook','whatsapp','site','indicacao','trafego_pago','outro');

-- PROFILES
CREATE TABLE public.profiles (
  id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- USER ROLES
CREATE TABLE public.user_roles (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- has_role helper
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

-- LEADS
CREATE TABLE public.leads (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  telefone TEXT NOT NULL DEFAULT '',
  cidade TEXT NOT NULL DEFAULT '',
  uf TEXT NOT NULL DEFAULT '',
  empresa TEXT NOT NULL DEFAULT '',
  segmento TEXT NOT NULL DEFAULT '',
  faturamento_mensal NUMERIC NOT NULL DEFAULT 0,
  origem lead_origin NOT NULL DEFAULT 'outro',
  observacoes TEXT NOT NULL DEFAULT '',
  stage lead_stage NOT NULL DEFAULT 'lead_novo',
  followup_stage followup_stage,
  sem_interesse_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_interaction_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.leads TO authenticated;
GRANT ALL ON public.leads TO service_role;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- LEAD NOTES
CREATE TABLE public.lead_notes (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  autor_nome TEXT NOT NULL DEFAULT '',
  conteudo TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lead_notes TO authenticated;
GRANT ALL ON public.lead_notes TO service_role;
ALTER TABLE public.lead_notes ENABLE ROW LEVEL SECURITY;

-- LEAD MOVEMENTS
CREATE TABLE public.lead_movements (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  from_stage TEXT NOT NULL DEFAULT '',
  to_stage TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lead_movements TO authenticated;
GRANT ALL ON public.lead_movements TO service_role;
ALTER TABLE public.lead_movements ENABLE ROW LEVEL SECURITY;

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
CREATE TRIGGER update_leads_updated_at BEFORE UPDATE ON public.leads
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- signup setup (profile + role). First user becomes gerente.
CREATE OR REPLACE FUNCTION public.handle_signup(_nome TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE is_first BOOLEAN;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  INSERT INTO public.profiles (id, nome, email)
  VALUES (auth.uid(), COALESCE(NULLIF(_nome,''),'Usuário'), (SELECT email FROM auth.users WHERE id = auth.uid()))
  ON CONFLICT (id) DO UPDATE SET nome = EXCLUDED.nome, email = EXCLUDED.email;

  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid()) THEN
    SELECT COUNT(*) = 0 INTO is_first FROM public.user_roles;
    INSERT INTO public.user_roles (user_id, role)
    VALUES (auth.uid(), CASE WHEN is_first THEN 'gerente'::app_role ELSE 'vendedor'::app_role END);
  END IF;
END;
$$;
GRANT EXECUTE ON FUNCTION public.handle_signup(TEXT) TO authenticated;

-- POLICIES: profiles
CREATE POLICY "Users read own profile" ON public.profiles FOR SELECT TO authenticated
USING (auth.uid() = id);
CREATE POLICY "Managers read all profiles" ON public.profiles FOR SELECT TO authenticated
USING (public.has_role(auth.uid(),'gerente'));
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated
USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT TO authenticated
WITH CHECK (auth.uid() = id);

-- POLICIES: user_roles
CREATE POLICY "Users read own roles" ON public.user_roles FOR SELECT TO authenticated
USING (user_id = auth.uid());
CREATE POLICY "Managers read all roles" ON public.user_roles FOR SELECT TO authenticated
USING (public.has_role(auth.uid(),'gerente'));
CREATE POLICY "Managers insert roles" ON public.user_roles FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(),'gerente'));
CREATE POLICY "Managers update roles" ON public.user_roles FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(),'gerente')) WITH CHECK (public.has_role(auth.uid(),'gerente'));
CREATE POLICY "Managers delete roles" ON public.user_roles FOR DELETE TO authenticated
USING (public.has_role(auth.uid(),'gerente'));

-- POLICIES: leads (owner-only)
CREATE POLICY "Owner manages own leads" ON public.leads FOR ALL TO authenticated
USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());

-- POLICIES: lead_notes (via lead ownership)
CREATE POLICY "Owner reads own lead notes" ON public.lead_notes FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.leads l WHERE l.id = lead_id AND l.owner_id = auth.uid()));
CREATE POLICY "Owner inserts own lead notes" ON public.lead_notes FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid() AND EXISTS (SELECT 1 FROM public.leads l WHERE l.id = lead_id AND l.owner_id = auth.uid()));
CREATE POLICY "Owner deletes own lead notes" ON public.lead_notes FOR DELETE TO authenticated
USING (EXISTS (SELECT 1 FROM public.leads l WHERE l.id = lead_id AND l.owner_id = auth.uid()));

-- POLICIES: lead_movements (via lead ownership)
CREATE POLICY "Owner reads own lead movements" ON public.lead_movements FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.leads l WHERE l.id = lead_id AND l.owner_id = auth.uid()));
CREATE POLICY "Owner inserts own lead movements" ON public.lead_movements FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid() AND EXISTS (SELECT 1 FROM public.leads l WHERE l.id = lead_id AND l.owner_id = auth.uid()));

-- indexes
CREATE INDEX idx_leads_owner ON public.leads(owner_id);
CREATE INDEX idx_leads_stage ON public.leads(stage);
CREATE INDEX idx_lead_notes_lead ON public.lead_notes(lead_id);
CREATE INDEX idx_lead_movements_lead ON public.lead_movements(lead_id);