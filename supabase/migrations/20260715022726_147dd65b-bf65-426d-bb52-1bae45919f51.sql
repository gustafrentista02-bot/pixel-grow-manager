
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS subscription_status TEXT NOT NULL DEFAULT 'trial';
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS current_period_end TIMESTAMPTZ;
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS limite_usuarios INT NOT NULL DEFAULT 5;
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS limite_mensagens_mes INT NOT NULL DEFAULT 2000;
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS cakto_customer_email TEXT NOT NULL DEFAULT '';

CREATE TABLE IF NOT EXISTS public.message_usage (
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  ano_mes TEXT NOT NULL,
  total_enviadas INT NOT NULL DEFAULT 0,
  PRIMARY KEY (organization_id, ano_mes)
);
GRANT SELECT ON public.message_usage TO authenticated;
GRANT ALL ON public.message_usage TO service_role;
ALTER TABLE public.message_usage ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members read own org usage" ON public.message_usage FOR SELECT TO authenticated
USING (organization_id = public.current_org_id());

CREATE TABLE IF NOT EXISTS public.cakto_webhook_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event TEXT NOT NULL DEFAULT '',
  customer_email TEXT NOT NULL DEFAULT '',
  matched_organization_id UUID,
  raw_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.cakto_webhook_log TO authenticated;
GRANT ALL ON public.cakto_webhook_log TO service_role;
ALTER TABLE public.cakto_webhook_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Managers read own org webhook log" ON public.cakto_webhook_log FOR SELECT TO authenticated
USING (matched_organization_id = public.current_org_id() AND public.has_role(auth.uid(), 'gerente'));
