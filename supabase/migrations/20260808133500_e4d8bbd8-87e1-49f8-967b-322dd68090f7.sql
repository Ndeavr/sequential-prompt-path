CREATE TABLE public.scout_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  group_name text,
  group_url text,
  status text NOT NULL DEFAULT 'active',
  captured_count integer NOT NULL DEFAULT 0,
  new_count integer NOT NULL DEFAULT 0,
  duplicate_count integer NOT NULL DEFAULT 0,
  error_count integer NOT NULL DEFAULT 0,
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.scout_sessions TO authenticated;
GRANT ALL ON public.scout_sessions TO service_role;
ALTER TABLE public.scout_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage scout sessions" ON public.scout_sessions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.scout_captures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES public.scout_sessions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  source_platform text NOT NULL DEFAULT 'facebook_group',
  source_url text,
  post_url text,
  group_name text,
  author_name text,
  raw_text text,
  extraction_mode text NOT NULL DEFAULT 'dom',
  company_name text,
  contact_name text,
  phone_e164 text,
  email text,
  website_url text,
  rbq_number text,
  city text,
  category text,
  extracted jsonb NOT NULL DEFAULT '{}'::jsonb,
  confidence numeric NOT NULL DEFAULT 0,
  intent_score integer NOT NULL DEFAULT 0,
  intent_evidence text,
  dedupe_status text NOT NULL DEFAULT 'new',
  dedupe_signal text,
  prospect_id uuid REFERENCES public.verified_contractor_prospects(id) ON DELETE SET NULL,
  error text,
  captured_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.scout_captures TO authenticated;
GRANT ALL ON public.scout_captures TO service_role;
ALTER TABLE public.scout_captures ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage scout captures" ON public.scout_captures FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_scout_captures_session ON public.scout_captures(session_id);
CREATE INDEX idx_scout_captures_prospect ON public.scout_captures(prospect_id);
CREATE INDEX idx_scout_captures_phone ON public.scout_captures(phone_e164);
CREATE INDEX idx_scout_captures_captured_at ON public.scout_captures(captured_at DESC);

ALTER TABLE public.verified_contractor_prospects
  ADD COLUMN IF NOT EXISTS intent_signal_score integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS intent_evidence text,
  ADD COLUMN IF NOT EXISTS intent_source text;

CREATE OR REPLACE FUNCTION public.scout_touch_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_scout_sessions_updated
BEFORE UPDATE ON public.scout_sessions
FOR EACH ROW EXECUTE FUNCTION public.scout_touch_updated_at();

CREATE OR REPLACE VIEW public.v_scout_source_performance
WITH (security_invoker = true) AS
SELECT
  COALESCE(sc.group_name, 'Groupe inconnu') AS group_name,
  count(*)                                                        AS detected,
  count(DISTINCT sc.prospect_id)                                  AS unique_prospects,
  count(*) FILTER (WHERE sc.dedupe_status = 'new')                AS new_prospects,
  count(*) FILTER (WHERE sc.dedupe_status = 'duplicate')          AS duplicates,
  count(*) FILTER (WHERE sc.intent_score >= 40)                   AS high_intent,
  count(DISTINCT p.id) FILTER (WHERE p.verification_status = 'verified')       AS verified,
  count(DISTINCT p.id) FILTER (WHERE p.outreach_status <> 'none')              AS contacted,
  count(DISTINCT p.id) FILTER (WHERE p.outreach_clicked_at IS NOT NULL)        AS clicked,
  count(DISTINCT p.id) FILTER (WHERE p.outreach_status = 'paid')               AS paid
FROM public.scout_captures sc
LEFT JOIN public.verified_contractor_prospects p ON p.id = sc.prospect_id
GROUP BY 1;
GRANT SELECT ON public.v_scout_source_performance TO authenticated, service_role;