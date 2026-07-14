-- WhatsApp instances (one per user)
CREATE TABLE IF NOT EXISTS public.whatsapp_instances (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  instance_name TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'desconectado',
  numero_conectado TEXT NOT NULL DEFAULT '',
  connected_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.whatsapp_instances TO authenticated;
GRANT ALL ON public.whatsapp_instances TO service_role;
ALTER TABLE public.whatsapp_instances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner manages own whatsapp instance"
  ON public.whatsapp_instances FOR ALL TO authenticated
  USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Managers view all whatsapp instances"
  ON public.whatsapp_instances FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'gerente'));

CREATE TRIGGER update_whatsapp_instances_updated_at
  BEFORE UPDATE ON public.whatsapp_instances
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Approval status on profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pendente';

-- Existing users are approved
UPDATE public.profiles SET status = 'aprovado' WHERE status = 'pendente';

-- Updated signup: first user → gerente aprovado; others → vendedor pendente
CREATE OR REPLACE FUNCTION public.handle_signup(_nome text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE is_first BOOLEAN;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;

  SELECT COUNT(*) = 0 INTO is_first FROM public.profiles;

  INSERT INTO public.profiles (id, nome, email, status)
  VALUES (
    auth.uid(),
    COALESCE(NULLIF(_nome,''),'Usuário'),
    (SELECT email FROM auth.users WHERE id = auth.uid()),
    CASE WHEN is_first THEN 'aprovado' ELSE 'pendente' END
  )
  ON CONFLICT (id) DO UPDATE SET nome = EXCLUDED.nome, email = EXCLUDED.email;

  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid()) THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (auth.uid(), CASE WHEN is_first THEN 'gerente'::app_role ELSE 'vendedor'::app_role END);
  END IF;
END;
$function$;

-- Allow managers to update/delete profiles (approve/reject)
CREATE POLICY "Managers update profiles"
  ON public.profiles FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'gerente'))
  WITH CHECK (public.has_role(auth.uid(), 'gerente'));

CREATE POLICY "Managers delete profiles"
  ON public.profiles FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'gerente'));