create extension if not exists pg_cron;
create extension if not exists pg_net;

do $$
begin
  perform cron.unschedule('system-watchdog-hourly');
exception when others then null;
end $$;

select cron.schedule(
  'system-watchdog-hourly',
  '5 * * * *',
  $$
    select net.http_post(
      url := 'https://clmaqdnphbndvmmqvpff.supabase.co/functions/v1/system-watchdog',
      headers := jsonb_build_object('content-type','application/json','Authorization','Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNsbWFxZG5waGJuZHZtbXF2cGZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMxNTk1NTUsImV4cCI6MjA4ODczNTU1NX0.uqNcgZ8JDldQJ8uDEimstyES8RO8O2ybRJYTcI_KBOk'),
      body := '{}'::jsonb
    );
  $$
);