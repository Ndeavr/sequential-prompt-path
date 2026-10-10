CREATE TABLE public.impact_formula_versions (
  version text PRIMARY KEY,
  active boolean NOT NULL DEFAULT false,
  eligible_statuses text[] NOT NULL,
  homeowner_hours_per_match numeric NOT NULL,
  contractor_hours_per_match numeric NOT NULL,
  avoided_spend_source text,
  assumptions text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.impact_formula_versions TO anon, authenticated;
GRANT ALL ON public.impact_formula_versions TO service_role;
ALTER TABLE public.impact_formula_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read formula" ON public.impact_formula_versions FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins manage formula" ON public.impact_formula_versions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE UNIQUE INDEX impact_formula_one_active ON public.impact_formula_versions ((active)) WHERE active;

INSERT INTO public.impact_formula_versions (version, active, eligible_statuses, homeowner_hours_per_match, contractor_hours_per_match, avoided_spend_source, assumptions)
VALUES ('v1-2026-10', true, ARRAY['confirmed','scheduled','accepted','completed','paid','activated'], 1.5, 2.0, NULL,
'Un rendez-vous exclusif confirmé remplace la recherche de 2 soumissions supplémentaires. Propriétaire : environ 1,5 h évitée (appels, répétition du projet, visites). Entrepreneur : environ 2 h évitées (déplacement et soumission hors cible). Estimation, non mesurée. Aucun taux horaire appliqué. Dépenses évitées : aucune source vérifiée pour l''instant.');

CREATE OR REPLACE FUNCTION public.get_public_impact_snapshot()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH f AS (SELECT * FROM public.impact_formula_versions WHERE active LIMIT 1),
  ev AS (
    SELECT count(DISTINCT a.id) AS n, min(a.created_at) AS since, max(a.updated_at) AS last_event
    FROM public.appointments a, f
    WHERE a.status::text = ANY (f.eligible_statuses)
  )
  SELECT jsonb_build_object(
    'formula_version', f.version,
    'eligible_matches', ev.n,
    'period_start', ev.since,
    'last_event_at', ev.last_event,
    'computed_at', now(),
    'homeowner_hours', round(ev.n * f.homeowner_hours_per_match, 1),
    'contractor_hours', round(ev.n * f.contractor_hours_per_match, 1),
    'hours_saved', round(ev.n * (f.homeowner_hours_per_match + f.contractor_hours_per_match), 1),
    'hours_status', 'estimated',
    'dollars_saved', NULL,
    'dollars_status', CASE WHEN f.avoided_spend_source IS NULL THEN 'measuring' ELSE 'measured' END,
    'homeowner_hours_per_match', f.homeowner_hours_per_match,
    'contractor_hours_per_match', f.contractor_hours_per_match,
    'assumptions', f.assumptions
  ) FROM f, ev;
$$;
REVOKE ALL ON FUNCTION public.get_public_impact_snapshot() FROM public;
GRANT EXECUTE ON FUNCTION public.get_public_impact_snapshot() TO anon, authenticated;