SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname = 'unpro-acquisition-discovery-6h';

SELECT cron.schedule(
  'unpro-acquisition-discovery-6h',
  '7 */6 * * *',
  $$
  select net.http_post(
    url:='https://clmaqdnphbndvmmqvpff.supabase.co/functions/v1/acquisition-discovery-cycle',
    headers:=(select headers from cron.job where jobname = 'unpro-acquisition-worker-15m' limit 1),
    body:=concat('{"max_searches":3,"caller":"cron-6h","scheduled_at":"', now(), '"}')::jsonb
  ) as request_id;
  $$
);