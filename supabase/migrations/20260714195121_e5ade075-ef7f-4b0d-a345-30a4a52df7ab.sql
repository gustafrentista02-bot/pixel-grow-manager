
CREATE TABLE IF NOT EXISTS public.scheduled_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  mensagem TEXT NOT NULL,
  enviar_em TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'pendente',
  erro TEXT NOT NULL DEFAULT '',
  enviado_em TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.scheduled_messages TO authenticated;
GRANT ALL ON public.scheduled_messages TO service_role;
ALTER TABLE public.scheduled_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner manages scheduled messages" ON public.scheduled_messages FOR ALL TO authenticated
USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE TRIGGER update_scheduled_messages_updated_at BEFORE UPDATE ON public.scheduled_messages
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_scheduled_messages_due ON public.scheduled_messages(status, enviar_em);

CREATE TABLE IF NOT EXISTS public.cadences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  ativa BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cadences TO authenticated;
GRANT ALL ON public.cadences TO service_role;
ALTER TABLE public.cadences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner manages cadences" ON public.cadences FOR ALL TO authenticated
USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE TRIGGER update_cadences_updated_at BEFORE UPDATE ON public.cadences
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.cadence_steps (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cadence_id UUID NOT NULL REFERENCES public.cadences(id) ON DELETE CASCADE,
  ordem INT NOT NULL,
  delay_dias INT NOT NULL DEFAULT 0,
  horario TEXT NOT NULL DEFAULT '09:00',
  mensagem TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cadence_steps TO authenticated;
GRANT ALL ON public.cadence_steps TO service_role;
ALTER TABLE public.cadence_steps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner manages cadence steps" ON public.cadence_steps FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.cadences c WHERE c.id = cadence_id AND c.owner_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.cadences c WHERE c.id = cadence_id AND c.owner_id = auth.uid()));
CREATE INDEX idx_cadence_steps_cadence ON public.cadence_steps(cadence_id, ordem);

CREATE TABLE IF NOT EXISTS public.cadence_enrollments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cadence_id UUID NOT NULL REFERENCES public.cadences(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'ativa',
  current_step INT NOT NULL DEFAULT 0,
  next_send_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cadence_enrollments TO authenticated;
GRANT ALL ON public.cadence_enrollments TO service_role;
ALTER TABLE public.cadence_enrollments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner manages cadence enrollments" ON public.cadence_enrollments FOR ALL TO authenticated
USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE TRIGGER update_cadence_enrollments_updated_at BEFORE UPDATE ON public.cadence_enrollments
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_cadence_enrollments_due ON public.cadence_enrollments(status, next_send_at);
CREATE UNIQUE INDEX idx_cadence_enrollments_unique_active ON public.cadence_enrollments(lead_id, cadence_id) WHERE status = 'ativa';
