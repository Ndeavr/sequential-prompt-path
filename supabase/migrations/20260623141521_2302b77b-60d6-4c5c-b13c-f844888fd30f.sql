
CREATE TABLE IF NOT EXISTS public.acquisition_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id uuid NULL,
  contractor_id uuid NULL,
  profile_id uuid NULL,
  tracking_id text NULL,
  channel text NOT NULL CHECK (channel IN ('sms','email','manual','system','web','stripe')),
  event_type text NOT NULL CHECK (event_type IN (
    'scraped','contacted','sent','delivered','opened','clicked',
    'registered','onboarded','paid','active','failed','bounced','unsubscribed'
  )),
  provider text NULL CHECK (provider IS NULL OR provider IN ('twilio','resend','stripe','app','system')),
  provider_event_id text NULL,
  source_table text NULL,
  source_row_id text NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_acq_events_source UNIQUE (source_table, source_row_id, event_type),
  CONSTRAINT uq_acq_events_provider UNIQUE (provider, provider_event_id)
);

CREATE INDEX IF NOT EXISTS idx_acq_events_type_time ON public.acquisition_events (event_type, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_acq_events_prospect ON public.acquisition_events (prospect_id, event_type) WHERE prospect_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_acq_events_contractor ON public.acquisition_events (contractor_id, event_type) WHERE contractor_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_acq_events_profile ON public.acquisition_events (profile_id, event_type) WHERE profile_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_acq_events_tracking ON public.acquisition_events (tracking_id) WHERE tracking_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_acq_events_provider ON public.acquisition_events (provider, occurred_at DESC);

GRANT SELECT ON public.acquisition_events TO authenticated;
GRANT ALL ON public.acquisition_events TO service_role;

ALTER TABLE public.acquisition_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read acquisition events"
  ON public.acquisition_events FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Service role full access acquisition events"
  ON public.acquisition_events FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.acquisition_tracking_links (
  id text PRIMARY KEY,
  prospect_id uuid NULL,
  contractor_id uuid NULL,
  profile_id uuid NULL,
  destination_url text NOT NULL,
  campaign text NULL,
  channel text NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  click_count int NOT NULL DEFAULT 0,
  first_click_at timestamptz NULL,
  last_click_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_acq_tracking_prospect ON public.acquisition_tracking_links (prospect_id) WHERE prospect_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_acq_tracking_contractor ON public.acquisition_tracking_links (contractor_id) WHERE contractor_id IS NOT NULL;

GRANT SELECT ON public.acquisition_tracking_links TO authenticated;
GRANT ALL ON public.acquisition_tracking_links TO service_role;

ALTER TABLE public.acquisition_tracking_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read tracking links"
  ON public.acquisition_tracking_links FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Service role manages tracking links"
  ON public.acquisition_tracking_links FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- BACKFILL
INSERT INTO public.acquisition_events
  (prospect_id, channel, event_type, provider, source_table, source_row_id, occurred_at, metadata)
SELECT p.id, 'system', 'scraped', 'app', 'contractor_prospects', p.id::text,
       COALESCE(p.created_at, now()), jsonb_build_object('backfill', true)
FROM public.contractor_prospects p
ON CONFLICT ON CONSTRAINT uq_acq_events_source DO NOTHING;

INSERT INTO public.acquisition_events
  (contractor_id, channel, event_type, provider, source_table, source_row_id, occurred_at, metadata)
SELECT l.contractor_id, 'system', 'scraped', 'app', 'contractor_leads', l.id::text,
       COALESCE(l.created_at, now()), jsonb_build_object('backfill', true)
FROM public.contractor_leads l
ON CONFLICT ON CONSTRAINT uq_acq_events_source DO NOTHING;

INSERT INTO public.acquisition_events
  (contractor_id, channel, event_type, provider, source_table, source_row_id, occurred_at, metadata)
SELECT o.contractor_id,
  COALESCE(o.channel, 'system'),
  CASE
    WHEN o.status = 'delivered' THEN 'delivered'
    WHEN o.status IN ('failed','undelivered','bounced') THEN 'failed'
    WHEN o.status = 'opened' THEN 'opened'
    WHEN o.status = 'clicked' THEN 'clicked'
    ELSE 'sent'
  END,
  CASE WHEN o.channel = 'sms' THEN 'twilio' WHEN o.channel = 'email' THEN 'resend' ELSE 'app' END,
  'contractor_outreach_logs', o.id::text,
  COALESCE(o.sent_at, o.created_at, now()),
  jsonb_build_object('backfill', true, 'status', o.status, 'error_code', o.error_code)
FROM public.contractor_outreach_logs o
ON CONFLICT ON CONSTRAINT uq_acq_events_source DO NOTHING;

INSERT INTO public.acquisition_events
  (contractor_id, channel, event_type, provider, source_table, source_row_id, occurred_at, metadata)
SELECT o.contractor_id, COALESCE(o.channel, 'email'), 'opened',
  CASE WHEN o.channel = 'sms' THEN 'twilio' ELSE 'resend' END,
  'contractor_outreach_logs_opened', o.id::text, o.opened_at,
  jsonb_build_object('backfill', true)
FROM public.contractor_outreach_logs o
WHERE o.opened_at IS NOT NULL
ON CONFLICT ON CONSTRAINT uq_acq_events_source DO NOTHING;

INSERT INTO public.acquisition_events
  (contractor_id, channel, event_type, provider, source_table, source_row_id, occurred_at, metadata)
SELECT o.contractor_id, COALESCE(o.channel, 'email'), 'clicked',
  CASE WHEN o.channel = 'sms' THEN 'twilio' ELSE 'resend' END,
  'contractor_outreach_logs_clicked', o.id::text, o.clicked_at,
  jsonb_build_object('backfill', true)
FROM public.contractor_outreach_logs o
WHERE o.clicked_at IS NOT NULL
ON CONFLICT ON CONSTRAINT uq_acq_events_source DO NOTHING;

INSERT INTO public.acquisition_events
  (profile_id, channel, event_type, provider, source_table, source_row_id, occurred_at, metadata)
SELECT p.id, 'web', 'registered', 'app', 'profiles', p.id::text,
       COALESCE(p.created_at, now()), jsonb_build_object('backfill', true)
FROM public.profiles p
ON CONFLICT ON CONSTRAINT uq_acq_events_source DO NOTHING;

INSERT INTO public.acquisition_events
  (contractor_id, channel, event_type, provider, source_table, source_row_id, occurred_at, metadata)
SELECT s.contractor_id, 'stripe', 'paid', 'stripe', 'contractor_subscriptions', s.id::text,
       COALESCE(s.created_at, now()), jsonb_build_object('backfill', true, 'status', s.status)
FROM public.contractor_subscriptions s
WHERE s.status IN ('active','trialing')
ON CONFLICT ON CONSTRAINT uq_acq_events_source DO NOTHING;

INSERT INTO public.acquisition_events
  (contractor_id, channel, event_type, provider, source_table, source_row_id, occurred_at, metadata)
SELECT c.id, 'system', 'active', 'app', 'contractors', c.id::text,
       COALESCE(c.updated_at, c.created_at, now()), jsonb_build_object('backfill', true)
FROM public.contractors c
WHERE COALESCE(c.is_published, false) = true
ON CONFLICT ON CONSTRAINT uq_acq_events_source DO NOTHING;
