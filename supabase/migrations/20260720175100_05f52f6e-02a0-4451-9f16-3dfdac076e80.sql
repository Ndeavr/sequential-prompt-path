
DO $$ BEGIN
  CREATE TYPE public.onboarding_state AS ENUM (
    'SCRAPED','VALIDATING','CONTACTABLE','NEEDS_REVIEW',
    'INVITED','LANDED','REGISTERING','OTP_VERIFIED',
    'PAYMENT_COMPLETE','ACTIVATED','PROFILE_ENRICHMENT',
    'VERIFIED','RECOMMENDATION_ELIGIBLE','LIVE','STUCK'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.contractor_onboarding_states (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id uuid NOT NULL UNIQUE,
  state public.onboarding_state NOT NULL DEFAULT 'SCRAPED',
  previous_state public.onboarding_state,
  confidence_score numeric(5,2),
  readiness_score numeric(5,2),
  next_action_at timestamptz,
  retry_count int NOT NULL DEFAULT 0,
  blocked_reason text,
  stuck_since timestamptz,
  activated_at timestamptz,
  live_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.contractor_onboarding_states TO authenticated;
GRANT ALL ON public.contractor_onboarding_states TO service_role;

ALTER TABLE public.contractor_onboarding_states ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage onboarding states" ON public.contractor_onboarding_states;
CREATE POLICY "Admins manage onboarding states"
  ON public.contractor_onboarding_states FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS idx_onboarding_states_state ON public.contractor_onboarding_states(state);
CREATE INDEX IF NOT EXISTS idx_onboarding_states_next_action ON public.contractor_onboarding_states(next_action_at) WHERE next_action_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_onboarding_states_stuck ON public.contractor_onboarding_states(stuck_since) WHERE stuck_since IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.contractor_onboarding_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id uuid NOT NULL,
  from_state public.onboarding_state,
  to_state public.onboarding_state NOT NULL,
  actor text NOT NULL DEFAULT 'system' CHECK (actor IN ('system','user','admin','affiliate')),
  duration_ms int,
  retry_count int NOT NULL DEFAULT 0,
  error text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.contractor_onboarding_events TO authenticated;
GRANT ALL ON public.contractor_onboarding_events TO service_role;

ALTER TABLE public.contractor_onboarding_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins read all onboarding events" ON public.contractor_onboarding_events;
CREATE POLICY "Admins read all onboarding events"
  ON public.contractor_onboarding_events FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS idx_onboarding_events_contractor ON public.contractor_onboarding_events(contractor_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.tg_onboarding_states_touch()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

DROP TRIGGER IF EXISTS trg_onboarding_states_touch ON public.contractor_onboarding_states;
CREATE TRIGGER trg_onboarding_states_touch
  BEFORE UPDATE ON public.contractor_onboarding_states
  FOR EACH ROW EXECUTE FUNCTION public.tg_onboarding_states_touch();

CREATE OR REPLACE FUNCTION public.tg_seed_onboarding_state()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.contractor_onboarding_states(contractor_id, state, next_action_at)
  VALUES (NEW.id, 'SCRAPED', now())
  ON CONFLICT (contractor_id) DO NOTHING;
  INSERT INTO public.contractor_onboarding_events(contractor_id, from_state, to_state, actor, metadata)
  VALUES (NEW.id, NULL, 'SCRAPED', 'system', jsonb_build_object('source', COALESCE(NEW.source, 'unknown')));
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_seed_onboarding_state ON public.contractor_leads;
CREATE TRIGGER trg_seed_onboarding_state
  AFTER INSERT ON public.contractor_leads
  FOR EACH ROW EXECUTE FUNCTION public.tg_seed_onboarding_state();

INSERT INTO public.contractor_onboarding_states(contractor_id, state, next_action_at)
SELECT id, 'SCRAPED', now() FROM public.contractor_leads
ON CONFLICT (contractor_id) DO NOTHING;
