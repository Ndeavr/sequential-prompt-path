
-- Status enum for webhook processing
DO $$ BEGIN
  CREATE TYPE public.unpro_webhook_processing_status AS ENUM (
    'received','processing','processed','ignored','retry_pending','failed','dead_letter'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 1) unpro_stripe_webhook_events
CREATE TABLE IF NOT EXISTS public.unpro_stripe_webhook_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  stripe_event_id TEXT NOT NULL UNIQUE,
  stripe_account_id TEXT,
  livemode BOOLEAN NOT NULL DEFAULT false,
  event_type TEXT NOT NULL,
  object_id TEXT,
  processing_status public.unpro_webhook_processing_status NOT NULL DEFAULT 'received',
  attempt_count INTEGER NOT NULL DEFAULT 0,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ,
  last_attempt_at TIMESTAMPTZ,
  error_code TEXT,
  error_message TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  processing_result JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS unpro_stripe_webhook_events_status_idx
  ON public.unpro_stripe_webhook_events(processing_status);
CREATE INDEX IF NOT EXISTS unpro_stripe_webhook_events_event_type_idx
  ON public.unpro_stripe_webhook_events(event_type);
CREATE INDEX IF NOT EXISTS unpro_stripe_webhook_events_received_at_idx
  ON public.unpro_stripe_webhook_events(received_at DESC);
CREATE INDEX IF NOT EXISTS unpro_stripe_webhook_events_object_id_idx
  ON public.unpro_stripe_webhook_events(object_id);

GRANT SELECT ON public.unpro_stripe_webhook_events TO authenticated;
GRANT ALL ON public.unpro_stripe_webhook_events TO service_role;

ALTER TABLE public.unpro_stripe_webhook_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read unpro_stripe_webhook_events"
  ON public.unpro_stripe_webhook_events
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Service role manages unpro_stripe_webhook_events"
  ON public.unpro_stripe_webhook_events
  FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.unpro_stripe_webhook_events_touch()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS trg_unpro_stripe_webhook_events_touch ON public.unpro_stripe_webhook_events;
CREATE TRIGGER trg_unpro_stripe_webhook_events_touch
  BEFORE UPDATE ON public.unpro_stripe_webhook_events
  FOR EACH ROW EXECUTE FUNCTION public.unpro_stripe_webhook_events_touch();

-- 2) unpro_payment_activation_audit
CREATE TABLE IF NOT EXISTS public.unpro_payment_activation_audit (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contractor_id UUID,
  prospect_id UUID,
  stripe_event_id TEXT,
  checkout_session_id TEXT,
  payment_intent_id TEXT,
  subscription_id TEXT,
  action TEXT NOT NULL,
  previous_status TEXT,
  new_status TEXT,
  amount_cents INTEGER,
  currency TEXT,
  source TEXT,
  campaign_id TEXT,
  result TEXT NOT NULL DEFAULT 'success',
  error_code TEXT,
  error_message TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS unpro_payment_activation_audit_contractor_idx
  ON public.unpro_payment_activation_audit(contractor_id);
CREATE INDEX IF NOT EXISTS unpro_payment_activation_audit_event_idx
  ON public.unpro_payment_activation_audit(stripe_event_id);
CREATE INDEX IF NOT EXISTS unpro_payment_activation_audit_created_idx
  ON public.unpro_payment_activation_audit(created_at DESC);

GRANT SELECT ON public.unpro_payment_activation_audit TO authenticated;
GRANT ALL ON public.unpro_payment_activation_audit TO service_role;

ALTER TABLE public.unpro_payment_activation_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read unpro_payment_activation_audit"
  ON public.unpro_payment_activation_audit
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Service role manages unpro_payment_activation_audit"
  ON public.unpro_payment_activation_audit
  FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);
