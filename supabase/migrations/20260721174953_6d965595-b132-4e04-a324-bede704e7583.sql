
-- Enum temperatura
DO $$ BEGIN
  CREATE TYPE public.lead_temperatura AS ENUM ('quente','morno','frio');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS email text DEFAULT '' NOT NULL,
  ADD COLUMN IF NOT EXISTS temperatura public.lead_temperatura,
  ADD COLUMN IF NOT EXISTS proximo_followup_at timestamptz,
  ADD COLUMN IF NOT EXISTS motivo_perda text DEFAULT '' NOT NULL,
  ADD COLUMN IF NOT EXISTS valor_proposta numeric DEFAULT 0 NOT NULL,
  ADD COLUMN IF NOT EXISTS valor_fechado numeric DEFAULT 0 NOT NULL,
  ADD COLUMN IF NOT EXISTS probabilidade_fechamento integer DEFAULT 0 NOT NULL,
  ADD COLUMN IF NOT EXISTS link_whatsapp text DEFAULT '' NOT NULL,
  ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}'::text[] NOT NULL;
