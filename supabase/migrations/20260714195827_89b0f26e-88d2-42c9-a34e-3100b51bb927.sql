
ALTER TABLE public.cadences ADD COLUMN IF NOT EXISTS compartilhada BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.message_templates ADD COLUMN IF NOT EXISTS compartilhada BOOLEAN NOT NULL DEFAULT false;

-- Cadences
DROP POLICY IF EXISTS "Owner manages cadences" ON public.cadences;
DROP POLICY IF EXISTS "Owner manages own cadences" ON public.cadences;
DROP POLICY IF EXISTS "Team reads shared cadences" ON public.cadences;
CREATE POLICY "Owner manages own cadences" ON public.cadences FOR ALL TO authenticated
USING (auth.uid() = owner_id)
WITH CHECK (auth.uid() = owner_id AND (compartilhada = false OR public.has_role(auth.uid(), 'gerente')));
CREATE POLICY "Team reads shared cadences" ON public.cadences FOR SELECT TO authenticated
USING (compartilhada = true);

-- Cadence steps
DROP POLICY IF EXISTS "Owner manages cadence steps" ON public.cadence_steps;
DROP POLICY IF EXISTS "Owner manages own cadence steps" ON public.cadence_steps;
DROP POLICY IF EXISTS "Team reads shared cadence steps" ON public.cadence_steps;
CREATE POLICY "Owner manages own cadence steps" ON public.cadence_steps FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.cadences c WHERE c.id = cadence_id AND c.owner_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.cadences c WHERE c.id = cadence_id AND c.owner_id = auth.uid()));
CREATE POLICY "Team reads shared cadence steps" ON public.cadence_steps FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.cadences c WHERE c.id = cadence_id AND c.compartilhada = true));

-- Message templates
DROP POLICY IF EXISTS "Users manage own message templates" ON public.message_templates;
DROP POLICY IF EXISTS "Owner manages own message templates" ON public.message_templates;
DROP POLICY IF EXISTS "Team reads shared message templates" ON public.message_templates;
CREATE POLICY "Owner manages own message templates" ON public.message_templates FOR ALL TO authenticated
USING (auth.uid() = owner_id)
WITH CHECK (auth.uid() = owner_id AND (compartilhada = false OR public.has_role(auth.uid(), 'gerente')));
CREATE POLICY "Team reads shared message templates" ON public.message_templates FOR SELECT TO authenticated
USING (compartilhada = true);
