DO $$
DECLARE
  v_jobid bigint;
BEGIN
  SELECT jobid INTO v_jobid
  FROM cron.job
  WHERE jobname = 'send-scheduled-messages-every-5min'
  LIMIT 1;

  IF v_jobid IS NOT NULL THEN
    PERFORM cron.unschedule(v_jobid);
    RAISE NOTICE 'cron job send-scheduled-messages-every-5min removido (jobid %)', v_jobid;
  ELSE
    RAISE NOTICE 'cron job send-scheduled-messages-every-5min nao existe; nada a fazer';
  END IF;
END $$;