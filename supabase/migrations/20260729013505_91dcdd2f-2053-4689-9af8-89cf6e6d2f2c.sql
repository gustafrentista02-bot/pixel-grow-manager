-- Idempotent cleanup: remove Google Business / Auditorias / bibliotecas de modelos.

DROP TABLE IF EXISTS public.gbp_audits CASCADE;
DROP TABLE IF EXISTS public.extension_tokens CASCADE;
DROP TABLE IF EXISTS public.message_templates CASCADE;
DROP TABLE IF EXISTS public.proposal_templates CASCADE;

ALTER TABLE public.leads DROP COLUMN IF EXISTS criado_por_extensao;
ALTER TABLE public.leads DROP COLUMN IF EXISTS link_perfil_google;
ALTER TABLE public.leads DROP COLUMN IF EXISTS tem_perfil_google;