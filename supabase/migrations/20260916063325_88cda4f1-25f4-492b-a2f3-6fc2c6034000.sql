UPDATE public.founder_eligible_categories
SET is_active = false, updated_at = now()
WHERE group_type = 'professional' AND is_active = true;

CREATE OR REPLACE FUNCTION public.resolve_contractor_offer(p_city text, p_category_slug text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_slug text := nullif(btrim(coalesce(p_category_slug, '')), '');
  v_city text := nullif(btrim(coalesce(p_city, '')), '');
  v_group text;
  v_active boolean;
  v_elig jsonb;
  v_remaining int;
BEGIN
  IF v_slug IS NULL THEN
    RETURN jsonb_build_object(
      'offer', 'unknown', 'category_group', NULL,
      'city_remaining', NULL, 'reason', 'missing_category');
  END IF;

  SELECT group_type, is_active INTO v_group, v_active
  FROM public.founder_eligible_categories
  WHERE slug = v_slug;

  -- Professions : aucune offre active pour l'instant.
  IF v_group = 'professional' THEN
    RETURN jsonb_build_object(
      'offer', 'none', 'category_group', 'professional',
      'city_remaining', NULL, 'reason', 'no_active_offer_for_profession');
  END IF;

  -- Service résidentiel : l'offre gratuite dépend de la capacité réelle.
  IF v_group = 'local_service' AND coalesce(v_active, false) THEN
    IF v_city IS NULL THEN
      RETURN jsonb_build_object(
        'offer', 'unknown', 'category_group', 'local_service',
        'city_remaining', NULL, 'reason', 'missing_city');
    END IF;

    v_elig := public.check_founder_eligibility(v_city, v_slug);
    v_remaining := nullif(v_elig->>'city_remaining', '')::int;

    IF coalesce((v_elig->>'eligible')::boolean, false) THEN
      RETURN jsonb_build_object(
        'offer', 'free_founding', 'category_group', 'local_service',
        'city_remaining', v_remaining, 'reason', NULL);
    END IF;

    RETURN jsonb_build_object(
      'offer', 'express_350', 'category_group', 'local_service',
      'city_remaining', v_remaining,
      'reason', coalesce(v_elig->>'reason', 'not_eligible'));
  END IF;

  -- Métier de projet / construction connu : Activation Express.
  IF EXISTS (
    SELECT 1 FROM public.project_trade_categories
    WHERE slug = v_slug AND is_active = true
  ) THEN
    RETURN jsonb_build_object(
      'offer', 'express_350', 'category_group', 'project_trade',
      'city_remaining', NULL, 'reason', NULL);
  END IF;

  -- Catégorie inconnue : aucune décision automatique.
  RETURN jsonb_build_object(
    'offer', 'unknown', 'category_group', NULL,
    'city_remaining', NULL, 'reason', 'category_not_recognized');
END;
$function$;

CREATE TABLE IF NOT EXISTS public.project_trade_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name_fr text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.project_trade_categories TO anon, authenticated;
GRANT ALL ON public.project_trade_categories TO service_role;

ALTER TABLE public.project_trade_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS project_trade_categories_public_read ON public.project_trade_categories;
CREATE POLICY project_trade_categories_public_read
  ON public.project_trade_categories
  FOR SELECT
  USING (is_active = true);

DROP TRIGGER IF EXISTS trg_project_trade_categories_updated_at ON public.project_trade_categories;
CREATE TRIGGER trg_project_trade_categories_updated_at
  BEFORE UPDATE ON public.project_trade_categories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.project_trade_categories (slug, name_fr) VALUES
  ('entrepreneur-general', 'Entrepreneur général'),
  ('renovation', 'Rénovation'),
  ('fondation-drain-excavation', 'Fondation, drain et excavation'),
  ('toiture', 'Toiture'),
  ('plomberie', 'Plomberie'),
  ('electricite', 'Électricité'),
  ('cvac-thermopompe', 'CVAC et thermopompes'),
  ('pavage', 'Pavage et asphalte'),
  ('amenagement-majeur', 'Aménagement paysager majeur'),
  ('decontamination-vermiculite', 'Décontamination et vermiculite')
ON CONFLICT (slug) DO NOTHING;

REVOKE ALL ON FUNCTION public.resolve_contractor_offer(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resolve_contractor_offer(text, text) TO anon, authenticated, service_role;