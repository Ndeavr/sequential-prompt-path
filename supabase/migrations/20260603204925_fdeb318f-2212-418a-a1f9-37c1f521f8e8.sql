
SELECT cron.unschedule('agent-send-outreach');

SELECT cron.schedule(
  'agent-send-outreach',
  '*/15 * * * *',
  $$ SELECT net.http_post(
       url:='https://clmaqdnphbndvmmqvpff.supabase.co/functions/v1/agent-send-outreach',
       headers:='{"Content-Type":"application/json","apikey":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNsbWFxZG5waGJuZHZtbXF2cGZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMxNTk1NTUsImV4cCI6MjA4ODczNTU1NX0.uqNcgZ8JDldQJ8uDEimstyES8RO8O2ybRJYTcI_KBOk"}'::jsonb,
       body:='{"trigger":"cron","dry_run":false,"max_batch":5,"daily_cap":10}'::jsonb
     ); $$
);
