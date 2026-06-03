
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Helper: unschedule prior jobs if present
DO $$
DECLARE j text;
BEGIN
  FOR j IN SELECT jobname FROM cron.job WHERE jobname LIKE 'agent-%' LOOP
    PERFORM cron.unschedule(j);
  END LOOP;
END $$;

SELECT cron.schedule(
  'agent-scout-leads',
  '*/15 * * * *',
  $$ SELECT net.http_post(
       url:='https://clmaqdnphbndvmmqvpff.supabase.co/functions/v1/agent-scout-leads',
       headers:='{"Content-Type":"application/json","apikey":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNsbWFxZG5waGJuZHZtbXF2cGZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMxNTk1NTUsImV4cCI6MjA4ODczNTU1NX0.uqNcgZ8JDldQJ8uDEimstyES8RO8O2ybRJYTcI_KBOk"}'::jsonb,
       body:='{"trigger":"cron"}'::jsonb
     ); $$
);

SELECT cron.schedule(
  'agent-enrich-leads',
  '0 * * * *',
  $$ SELECT net.http_post(
       url:='https://clmaqdnphbndvmmqvpff.supabase.co/functions/v1/agent-enrich-leads',
       headers:='{"Content-Type":"application/json","apikey":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNsbWFxZG5waGJuZHZtbXF2cGZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMxNTk1NTUsImV4cCI6MjA4ODczNTU1NX0.uqNcgZ8JDldQJ8uDEimstyES8RO8O2ybRJYTcI_KBOk"}'::jsonb,
       body:='{"trigger":"cron"}'::jsonb
     ); $$
);

SELECT cron.schedule(
  'agent-ai-visibility',
  '0 * * * *',
  $$ SELECT net.http_post(
       url:='https://clmaqdnphbndvmmqvpff.supabase.co/functions/v1/agent-ai-visibility',
       headers:='{"Content-Type":"application/json","apikey":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNsbWFxZG5waGJuZHZtbXF2cGZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMxNTk1NTUsImV4cCI6MjA4ODczNTU1NX0.uqNcgZ8JDldQJ8uDEimstyES8RO8O2ybRJYTcI_KBOk"}'::jsonb,
       body:='{"trigger":"cron"}'::jsonb
     ); $$
);

SELECT cron.schedule(
  'agent-generate-message',
  '*/30 * * * *',
  $$ SELECT net.http_post(
       url:='https://clmaqdnphbndvmmqvpff.supabase.co/functions/v1/agent-generate-message',
       headers:='{"Content-Type":"application/json","apikey":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNsbWFxZG5waGJuZHZtbXF2cGZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMxNTk1NTUsImV4cCI6MjA4ODczNTU1NX0.uqNcgZ8JDldQJ8uDEimstyES8RO8O2ybRJYTcI_KBOk"}'::jsonb,
       body:='{"trigger":"cron"}'::jsonb
     ); $$
);

SELECT cron.schedule(
  'agent-send-outreach',
  '*/15 * * * *',
  $$ SELECT net.http_post(
       url:='https://clmaqdnphbndvmmqvpff.supabase.co/functions/v1/agent-send-outreach',
       headers:='{"Content-Type":"application/json","apikey":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNsbWFxZG5waGJuZHZtbXF2cGZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMxNTk1NTUsImV4cCI6MjA4ODczNTU1NX0.uqNcgZ8JDldQJ8uDEimstyES8RO8O2ybRJYTcI_KBOk"}'::jsonb,
       body:='{"trigger":"cron","dry_run":true}'::jsonb
     ); $$
);

SELECT cron.schedule(
  'agent-activation-dispatch',
  '*/15 * * * *',
  $$ SELECT net.http_post(
       url:='https://clmaqdnphbndvmmqvpff.supabase.co/functions/v1/agent-activation-dispatch',
       headers:='{"Content-Type":"application/json","apikey":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNsbWFxZG5waGJuZHZtbXF2cGZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMxNTk1NTUsImV4cCI6MjA4ODczNTU1NX0.uqNcgZ8JDldQJ8uDEimstyES8RO8O2ybRJYTcI_KBOk"}'::jsonb,
       body:='{"trigger":"cron"}'::jsonb
     ); $$
);
