-- 1) Extensões
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS supabase_vault WITH SCHEMA vault;

-- 2) Segredo no Vault (gerado internamente, nunca literal)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM vault.secrets WHERE name = 'pixel_crm_cron_secret') THEN
    PERFORM vault.create_secret(
      encode(extensions.gen_random_bytes(32), 'hex'),
      'pixel_crm_cron_secret',
      'Segredo usado pelo cron para autenticar chamadas a send-scheduled-messages'
    );
  END IF;
END
$$;

-- 3) RPC privada de validação
CREATE OR REPLACE FUNCTION public.verify_cron_secret(p_secret text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, vault, extensions
AS $$
DECLARE
  v_stored text;
BEGIN
  IF p_secret IS NULL OR length(btrim(p_secret)) = 0 THEN
    RETURN false;
  END IF;

  SELECT decrypted_secret INTO v_stored
  FROM vault.decrypted_secrets
  WHERE name = 'pixel_crm_cron_secret'
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_stored IS NULL THEN
    RETURN false;
  END IF;

  -- Compara digests SHA-256 (tamanho fixo), nunca os valores diretamente.
  RETURN extensions.digest(p_secret, 'sha256') = extensions.digest(v_stored, 'sha256');
END;
$$;

REVOKE ALL ON FUNCTION public.verify_cron_secret(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.verify_cron_secret(text) FROM anon;
REVOKE ALL ON FUNCTION public.verify_cron_secret(text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.verify_cron_secret(text) TO service_role;

-- 4) Cron seguro (idempotente)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'send-scheduled-messages-every-5min') THEN
    PERFORM cron.unschedule('send-scheduled-messages-every-5min');
  END IF;
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'pixel-crm-send-scheduled-messages-every-minute') THEN
    PERFORM cron.unschedule('pixel-crm-send-scheduled-messages-every-minute');
  END IF;
END
$$;

SELECT cron.schedule(
  'pixel-crm-send-scheduled-messages-every-minute',
  '* * * * *',
  $cron$
  SELECT extensions.net.http_post(
    url := 'https://xfmvnyatgsiaewcbarjq.supabase.co/functions/v1/send-scheduled-messages',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (
        SELECT decrypted_secret FROM vault.decrypted_secrets
        WHERE name = 'pixel_crm_cron_secret'
        ORDER BY created_at DESC LIMIT 1
      )
    ),
    body := '{"source":"cron"}'::jsonb,
    timeout_milliseconds := 50000
  );
  $cron$
);