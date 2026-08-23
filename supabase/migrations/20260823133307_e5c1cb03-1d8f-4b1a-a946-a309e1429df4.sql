-- UNPRO — Phase 3 compatibilité : résultats réels + séparation publique/privée

CREATE TABLE IF NOT EXISTS public.contractor_recommendation_outcomes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id uuid NOT NULL,
  lead_id uuid,
  appointment_id uuid,
  service_slug text,
  city_slug text,
  stage text NOT NULL CHECK (stage IN (
    'recommended','appointment_proposed','appointment_accepted','appointment_completed',
    'quote_sent','won','lost'
  )),
  project_value_cents integer CHECK (project_value_cents IS NULL OR project_value_cents >= 0),
  source text NOT NULL DEFAULT 'production_event',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS contractor_recommendation_outcomes_uniq
  ON public.contractor_recommendation_outcomes (contractor_id, stage, COALESCE(appointment_id, lead_id, id));
CREATE INDEX IF NOT EXISTS contractor_recommendation_outcomes_contractor_idx
  ON public.contractor_recommendation_outcomes (contractor_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS contractor_recommendation_outcomes_stage_idx
  ON public.contractor_recommendation_outcomes (stage);

GRANT SELECT ON public.contractor_recommendation_outcomes TO authenticated;
GRANT ALL ON public.contractor_recommendation_outcomes TO service_role;

ALTER TABLE public.contractor_recommendation_outcomes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "outcomes_admin_read"
  ON public.contractor_recommendation_outcomes FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "outcomes_contractor_read_own"
  ON public.contractor_recommendation_outcomes FOR SELECT TO authenticated
  USING (contractor_id IN (SELECT c.id FROM public.contractors c WHERE c.user_id = auth.uid()));

-- Enregistrement d'un résultat réel (appelé par les fonctions serveur uniquement)
CREATE OR REPLACE FUNCTION public.record_contractor_outcome(
  _contractor_id uuid,
  _stage text,
  _lead_id uuid DEFAULT NULL,
  _appointment_id uuid DEFAULT NULL,
  _service_slug text DEFAULT NULL,
  _city_slug text DEFAULT NULL,
  _project_value_cents integer DEFAULT NULL,
  _metadata jsonb DEFAULT '{}'::jsonb
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _id uuid;
BEGIN
  INSERT INTO public.contractor_recommendation_outcomes
    (contractor_id, stage, lead_id, appointment_id, service_slug, city_slug, project_value_cents, metadata)
  VALUES
    (_contractor_id, _stage, _lead_id, _appointment_id, _service_slug, _city_slug, _project_value_cents, COALESCE(_metadata,'{}'::jsonb))
  ON CONFLICT (contractor_id, stage, COALESCE(appointment_id, lead_id, id)) DO UPDATE
    SET project_value_cents = COALESCE(EXCLUDED.project_value_cents, public.contractor_recommendation_outcomes.project_value_cents),
        metadata = public.contractor_recommendation_outcomes.metadata || EXCLUDED.metadata
  RETURNING id INTO _id;
  RETURN _id;
END;
$$;

-- Vue de comparaison préférences déclarées vs résultats réels
CREATE OR REPLACE VIEW public.v_contractor_preference_vs_outcome
WITH (security_invoker = true) AS
SELECT
  p.contractor_id,
  p.floor_project_cents           AS declared_floor_cents,
  p.ideal_project_min_cents       AS declared_ideal_min_cents,
  p.ideal_project_max_cents       AS declared_ideal_max_cents,
  COUNT(o.*) FILTER (WHERE o.stage = 'appointment_completed') AS completed_count,
  COUNT(o.*) FILTER (WHERE o.stage = 'won')                   AS won_count,
  COUNT(o.*) FILTER (WHERE o.stage = 'lost')                  AS lost_count,
  AVG(o.project_value_cents) FILTER (WHERE o.stage = 'won')   AS avg_won_value_cents,
  MIN(o.project_value_cents) FILTER (WHERE o.stage = 'won')   AS min_won_value_cents,
  COUNT(o.*) FILTER (WHERE o.stage = 'won' AND p.floor_project_cents IS NOT NULL
                       AND o.project_value_cents < p.floor_project_cents) AS won_below_declared_floor
FROM public.contractor_compatibility_profiles p
LEFT JOIN public.contractor_recommendation_outcomes o ON o.contractor_id = p.contractor_id
GROUP BY p.contractor_id, p.floor_project_cents, p.ideal_project_min_cents, p.ideal_project_max_cents;

GRANT SELECT ON public.v_contractor_preference_vs_outcome TO authenticated;
GRANT ALL ON public.v_contractor_preference_vs_outcome TO service_role;

-- Vue publique : uniquement les services déclarés (jamais les minimums, capacité, exclusions ni déductions)
CREATE OR REPLACE VIEW public.v_contractor_public_services
WITH (security_invoker = true) AS
SELECT
  sp.contractor_id,
  sp.service_slug,
  sp.service_label_fr,
  (sp.stance = 'priority') AS is_priority
FROM public.contractor_service_preferences sp
WHERE sp.stance IN ('priority','accepted')
  AND sp.source = 'declared';

GRANT SELECT ON public.v_contractor_public_services TO anon, authenticated;
GRANT ALL ON public.v_contractor_public_services TO service_role;