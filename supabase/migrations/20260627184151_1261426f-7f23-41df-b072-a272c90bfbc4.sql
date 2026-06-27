ALTER TABLE public.sms_events_v2
  ADD COLUMN IF NOT EXISTS provider_response jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS status_callback_url text,
  ADD COLUMN IF NOT EXISTS twilio_status_url text,
  ADD COLUMN IF NOT EXISTS twilio_status_checked_at timestamptz,
  ADD COLUMN IF NOT EXISTS clicked_at timestamptz;

ALTER TABLE public.sms_events_v2 DROP CONSTRAINT IF EXISTS sms_events_v2_status_check;
ALTER TABLE public.sms_events_v2 ADD CONSTRAINT sms_events_v2_status_check CHECK (status IN (
  'queued','sending','sent','delivered','undelivered','failed','invalid_phone','blocked','opted_out','retry_scheduled','contact_required',
  'deferred_window','delivery_unknown','api_accepted'
));

CREATE TABLE IF NOT EXISTS public.message_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel text NOT NULL DEFAULT 'sms',
  provider text NOT NULL DEFAULT 'twilio',
  provider_message_id text,
  message_event_type text NOT NULL,
  status text,
  error_code text,
  error_message text,
  source_table text,
  source_row_id text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.message_events TO service_role;
GRANT SELECT ON public.message_events TO authenticated;
ALTER TABLE public.message_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role can manage message events" ON public.message_events FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can read message events" ON public.message_events FOR SELECT TO authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_message_events_provider_message_id ON public.message_events(provider, provider_message_id);
CREATE INDEX IF NOT EXISTS idx_message_events_occurred_at ON public.message_events(occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_message_events_type ON public.message_events(channel, provider, message_event_type);

CREATE TABLE IF NOT EXISTS public.click_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tracking_id text,
  channel text NOT NULL DEFAULT 'web',
  provider text NOT NULL DEFAULT 'app',
  provider_message_id text,
  destination_url text,
  user_agent text,
  referer text,
  ip_hash text,
  source_table text,
  source_row_id text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.click_events TO service_role;
GRANT SELECT ON public.click_events TO authenticated;
ALTER TABLE public.click_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role can manage click events" ON public.click_events FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can read click events" ON public.click_events FOR SELECT TO authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_click_events_tracking_id ON public.click_events(tracking_id);
CREATE INDEX IF NOT EXISTS idx_click_events_provider_message_id ON public.click_events(provider_message_id);
CREATE INDEX IF NOT EXISTS idx_click_events_occurred_at ON public.click_events(occurred_at DESC);