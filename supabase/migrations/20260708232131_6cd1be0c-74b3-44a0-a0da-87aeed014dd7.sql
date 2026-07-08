DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT jobid, jobname FROM cron.job
    WHERE command ILIKE '%email-live-test%'
       OR command ILIKE '%email-health-selfheal%'
  LOOP
    PERFORM cron.unschedule(r.jobid);
  END LOOP;
END $$;

SELECT cron.schedule(
  'email-live-health-hourly',
  '0 * * * *',
  $$SELECT net.http_post(
    url:='https://clmaqdnphbndvmmqvpff.supabase.co/functions/v1/email-health-selfheal',
    headers:='{"Content-Type":"application/json","apikey":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNsbWFxZG5waGJuZHZtbXF2cGZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMxNTk1NTUsImV4cCI6MjA4ODczNTU1NX0.uqNcgZ8JDldQJ8uDEimstyES8RO8O2ybRJYTcI_KBOk"}'::jsonb,
    body:='{"triggered_by":"cron_hourly"}'::jsonb
  );$$
);