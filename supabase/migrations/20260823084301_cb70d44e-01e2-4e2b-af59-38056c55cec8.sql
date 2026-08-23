
CREATE TABLE IF NOT EXISTS public.ai_recommendation_audits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_token text NOT NULL DEFAULT encode(gen_random_bytes(18), 'hex'),
  query_text text,
  source text NOT NULL DEFAULT 'public_audit',
  utm jsonb NOT NULL DEFAULT '{}'::jsonb,
  contractor_id uuid REFERENCES public.contractors(id) ON DELETE SET NULL,
  prospect_id uuid REFERENCES public.verified_contractor_prospects(id) ON DELETE SET NULL,
  business_name text,
  city text,
  trade text,
  readiness_score integer,
  baseline jsonb NOT NULL DEFAULT '{}'::jsonb,
  gaps jsonb NOT NULL DEFAULT '[]'::jsonb,
  capacity jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'started',
  claimed_contact jsonb,
  ai_agent_run_id uuid,
  completed_at timestamptz,
  claimed_at timestamptz,
  activation_started_at timestamptz,
  checkout_created_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS ai_recommendation_audits_token_idx ON public.ai_recommendation_audits(session_token);
CREATE INDEX IF NOT EXISTS ai_recommendation_audits_created_idx ON public.ai_recommendation_audits(created_at DESC);
CREATE INDEX IF NOT EXISTS ai_recommendation_audits_contractor_idx ON public.ai_recommendation_audits(contractor_id);
CREATE INDEX IF NOT EXISTS ai_recommendation_audits_status_idx ON public.ai_recommendation_audits(status);

GRANT ALL ON public.ai_recommendation_audits TO service_role;
GRANT SELECT ON public.ai_recommendation_audits TO authenticated;
ALTER TABLE public.ai_recommendation_audits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read recommendation audits"
  ON public.ai_recommendation_audits FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE IF NOT EXISTS public.ai_recommendation_audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_id uuid NOT NULL REFERENCES public.ai_recommendation_audits(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ai_recommendation_audit_events_type_chk CHECK (event_type = ANY (ARRAY[
    'audit_started','audit_completed','profile_claimed','activation_started',
    'checkout_created','paid','profile_activated','first_recommendation','first_appointment','audit_abandoned'
  ]))
);
CREATE INDEX IF NOT EXISTS ai_recommendation_audit_events_audit_idx ON public.ai_recommendation_audit_events(audit_id, occurred_at);

GRANT ALL ON public.ai_recommendation_audit_events TO service_role;
GRANT SELECT ON public.ai_recommendation_audit_events TO authenticated;
ALTER TABLE public.ai_recommendation_audit_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read recommendation audit events"
  ON public.ai_recommendation_audit_events FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.ai_recommendation_audits_touch()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS trg_ai_recommendation_audits_touch ON public.ai_recommendation_audits;
CREATE TRIGGER trg_ai_recommendation_audits_touch
BEFORE UPDATE ON public.ai_recommendation_audits
FOR EACH ROW EXECUTE FUNCTION public.ai_recommendation_audits_touch();
