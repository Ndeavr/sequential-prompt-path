
CREATE TABLE public.first_dollar_sprint_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event TEXT NOT NULL,
  prospect_id UUID NULL,
  campaign_variant TEXT NULL,
  city TEXT NULL,
  category TEXT NULL,
  session_id TEXT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_fdse_event ON public.first_dollar_sprint_events(event);
CREATE INDEX idx_fdse_prospect ON public.first_dollar_sprint_events(prospect_id);
CREATE INDEX idx_fdse_created ON public.first_dollar_sprint_events(created_at DESC);
CREATE INDEX idx_fdse_variant ON public.first_dollar_sprint_events(campaign_variant);

GRANT SELECT, INSERT ON public.first_dollar_sprint_events TO anon;
GRANT SELECT, INSERT ON public.first_dollar_sprint_events TO authenticated;
GRANT ALL ON public.first_dollar_sprint_events TO service_role;

ALTER TABLE public.first_dollar_sprint_events ENABLE ROW LEVEL SECURITY;

-- Public can insert funnel events (landing views, checkout opens from anon browser)
CREATE POLICY "sprint_events_insert_anyone"
  ON public.first_dollar_sprint_events
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

-- Admins read events
CREATE POLICY "sprint_events_select_admin"
  ON public.first_dollar_sprint_events
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Cron job: run the abandonment follow-up every 5 minutes
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron')
     AND EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_net') THEN
    PERFORM cron.unschedule('sprint-abandonment-followup')
      WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'sprint-abandonment-followup');
    PERFORM cron.schedule(
      'sprint-abandonment-followup',
      '*/5 * * * *',
      $cron$
      SELECT net.http_post(
        url := 'https://clmaqdnphbndvmmqvpff.supabase.co/functions/v1/sprint-abandonment-followup',
        headers := '{"Content-Type":"application/json","apikey":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNsbWFxZG5waGJuZHZtbXF2cGZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMxNTk1NTUsImV4cCI6MjA4ODczNTU1NX0.uqNcgZ8JDldQJ8uDEimstyES8RO8O2ybRJYTcI_KBOk"}'::jsonb,
        body := '{}'::jsonb
      );
      $cron$
    );
  END IF;
END $$;
