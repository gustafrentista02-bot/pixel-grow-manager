
ALTER TABLE public.message_templates ADD COLUMN IF NOT EXISTS favorito BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.proposal_templates ADD COLUMN IF NOT EXISTS favorito BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.proposal_sends (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  proposal_id UUID REFERENCES public.proposal_templates(id) ON DELETE SET NULL,
  nome TEXT NOT NULL DEFAULT '',
  valor NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'enviada',
  observacao TEXT NOT NULL DEFAULT '',
  enviada_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.proposal_sends TO authenticated;
GRANT ALL ON public.proposal_sends TO service_role;

ALTER TABLE public.proposal_sends ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner manages proposal sends"
  ON public.proposal_sends FOR ALL
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

CREATE INDEX IF NOT EXISTS idx_proposal_sends_lead ON public.proposal_sends(lead_id);
CREATE INDEX IF NOT EXISTS idx_proposal_sends_owner ON public.proposal_sends(owner_id);

DROP TRIGGER IF EXISTS update_proposal_sends_updated_at ON public.proposal_sends;
CREATE TRIGGER update_proposal_sends_updated_at
  BEFORE UPDATE ON public.proposal_sends
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
