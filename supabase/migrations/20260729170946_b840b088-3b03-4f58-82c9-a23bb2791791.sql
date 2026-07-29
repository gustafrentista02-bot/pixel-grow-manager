DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'pixel-crm-send-scheduled-messages-every-minute') THEN
    PERFORM cron.unschedule('pixel-crm-send-scheduled-messages-every-minute');
  END IF;
END
$$;

SELECT cron.schedule(
  'pixel-crm-send-scheduled-messages-every-minute',
  '* * * * *',
  $cron$
  SELECT net.http_post(
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