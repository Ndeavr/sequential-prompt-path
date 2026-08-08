-- Job 201: was sending mode:"autonomous", an unrecognised value that the
-- orchestrator silently downgraded to dry_run. Use the canonical live mode.
select cron.alter_job(
  201,
  command := $job$
  select net.http_post(
      url:='https://clmaqdnphbndvmmqvpff.supabase.co/functions/v1/recruitment-orchestrator',
      headers:='{"Content-Type": "application/json", "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNsbWFxZG5waGJuZHZtbXF2cGZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMxNTk1NTUsImV4cCI6MjA4ODczNTU1NX0.uqNcgZ8JDldQJ8uDEimstyES8RO8O2ybRJYTcI_KBOk"}'::jsonb,
      body:=concat('{"mode":"live","source":"autonomous","requested_by":"cron","limit":5,"scheduled_at":"', now(), '"}')::jsonb
  ) as request_id;
  $job$
);

-- Job 134: hourly relance was hard-coded to dry_run true.
select cron.alter_job(
  134,
  command := $job$
  select net.http_post(
    url:='https://clmaqdnphbndvmmqvpff.supabase.co/functions/v1/outreach-relance-cron',
    headers:='{"Content-Type":"application/json","apikey":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNsbWFxZG5waGJuZHZtbXF2cGZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMxNTk1NTUsImV4cCI6MjA4ODczNTU1NX0.uqNcgZ8JDldQJ8uDEimstyES8RO8O2ybRJYTcI_KBOk"}'::jsonb,
    body:='{"dry_run": false, "limit": 50}'::jsonb
  );
  $job$
);