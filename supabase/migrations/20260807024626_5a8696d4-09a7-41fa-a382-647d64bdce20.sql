ALTER TABLE public.plans
  ADD COLUMN IF NOT EXISTS audience text NOT NULL DEFAULT 'contractor',
  ADD COLUMN IF NOT EXISTS stripe_monthly_price_id text,
  ADD COLUMN IF NOT EXISTS stripe_yearly_price_id text,
  ADD COLUMN IF NOT EXISTS billing_interval text NOT NULL DEFAULT 'month';

INSERT INTO public.plans (code, name, tier_rank, monthly_price, yearly_price, one_time_price, tagline, active, audience, billing_interval, stripe_yearly_price_id, appointments_included)
VALUES
  ('home_decouverte', 'Découverte', 0, 0, 0, 0, 'Les bases pour vérifier, comprendre et avancer.', true, 'homeowner', 'year', NULL, 0),
  ('home_plus', 'Plus', 1, 0, 4900, 0, 'Comparez mieux et centralisez votre maison.', true, 'homeowner', 'year', 'price_1TJfluCvZwK1QnPVMBBo3eUK', 0),
  ('home_signature', 'Signature', 2, 0, 14900, 0, 'Pilotez votre maison avec un copilote stratégique.', true, 'homeowner', 'year', 'price_1TJflvCvZwK1QnPVRX3aQTqH', 0)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  yearly_price = EXCLUDED.yearly_price,
  tagline = EXCLUDED.tagline,
  audience = EXCLUDED.audience,
  billing_interval = EXCLUDED.billing_interval,
  stripe_yearly_price_id = EXCLUDED.stripe_yearly_price_id,
  active = true,
  updated_at = now();

INSERT INTO public.plan_features (plan_code, feature_key, enabled, limit_value, teaser_copy, upgrade_target) VALUES
  ('home_decouverte','properties_max',true,1,'Ajoutez jusqu''à 3 adresses avec le plan Plus.','home_plus'),
  ('home_plus','properties_max',true,3,'Ajoutez jusqu''à 5 adresses avec Signature.','home_signature'),
  ('home_signature','properties_max',true,5,NULL,NULL),

  ('home_decouverte','quote_analysis_monthly',true,1,'Analyses de soumissions illimitées avec le plan Plus.','home_plus'),
  ('home_plus','quote_analysis_monthly',true,-1,NULL,NULL),
  ('home_signature','quote_analysis_monthly',true,-1,NULL,NULL),

  ('home_decouverte','quote_comparison',false,0,'Comparez jusqu''à 3 soumissions côte à côte avec le plan Plus.','home_plus'),
  ('home_plus','quote_comparison',true,3,NULL,NULL),
  ('home_signature','quote_comparison',true,3,NULL,NULL),

  ('home_decouverte','contractor_verification_detailed',false,0,'Vérifications entrepreneur détaillées avec le plan Plus.','home_plus'),
  ('home_plus','contractor_verification_detailed',true,NULL,NULL,NULL),
  ('home_signature','contractor_verification_detailed',true,NULL,NULL,NULL),

  ('home_decouverte','maintenance_reminders',false,0,'Recevez vos rappels d''entretien avec le plan Plus.','home_plus'),
  ('home_plus','maintenance_reminders',true,NULL,NULL,NULL),
  ('home_signature','maintenance_reminders',true,NULL,NULL,NULL),

  ('home_decouverte','document_archive_advanced',false,0,'Classement et archivage avancé des documents avec le plan Plus.','home_plus'),
  ('home_plus','document_archive_advanced',true,NULL,NULL,NULL),
  ('home_signature','document_archive_advanced',true,NULL,NULL,NULL),

  ('home_decouverte','project_history',false,0,'Historique des projets et dépenses avec le plan Plus.','home_plus'),
  ('home_plus','project_history',true,NULL,NULL,NULL),
  ('home_signature','project_history',true,NULL,NULL,NULL),

  ('home_decouverte','alex_priority',false,0,'Accompagnement Alex avancé avec Signature.','home_signature'),
  ('home_plus','alex_priority',false,0,'Accompagnement Alex avancé avec Signature.','home_signature'),
  ('home_signature','alex_priority',true,NULL,NULL,NULL),

  ('home_decouverte','work_prioritization',false,0,'Priorisation des travaux selon risque et valeur avec Signature.','home_signature'),
  ('home_plus','work_prioritization',false,0,'Priorisation des travaux selon risque et valeur avec Signature.','home_signature'),
  ('home_signature','work_prioritization',true,NULL,NULL,NULL),

  ('home_decouverte','proactive_suggestions',false,0,'Suggestions proactives avec Signature.','home_signature'),
  ('home_plus','proactive_suggestions',false,0,'Suggestions proactives avec Signature.','home_signature'),
  ('home_signature','proactive_suggestions',true,NULL,NULL,NULL),

  ('home_decouverte','priority_support',false,0,'Support prioritaire avec le plan Plus.','home_plus'),
  ('home_plus','priority_support',true,NULL,NULL,NULL),
  ('home_signature','priority_support',true,NULL,NULL,NULL)
ON CONFLICT (plan_code, feature_key) DO UPDATE SET
  enabled = EXCLUDED.enabled,
  limit_value = EXCLUDED.limit_value,
  teaser_copy = EXCLUDED.teaser_copy,
  upgrade_target = EXCLUDED.upgrade_target,
  updated_at = now();

CREATE OR REPLACE FUNCTION public.homeowner_plan_code(_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (
      SELECT CASE hs.plan_code
               WHEN 'plus' THEN 'home_plus'
               WHEN 'signature' THEN 'home_signature'
               WHEN 'discovery' THEN 'home_decouverte'
               ELSE hs.plan_code
             END
      FROM public.homeowner_subscriptions hs
      WHERE hs.user_id = _user_id
        AND hs.status IN ('active', 'trialing')
        AND (hs.current_period_end IS NULL OR hs.current_period_end > now())
      ORDER BY hs.updated_at DESC NULLS LAST
      LIMIT 1
    ),
    'home_decouverte'
  );
$$;

CREATE OR REPLACE FUNCTION public.homeowner_feature_access(_user_id uuid, _feature_key text)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH pc AS (SELECT public.homeowner_plan_code(_user_id) AS code)
  SELECT jsonb_build_object(
    'plan_code', pc.code,
    'feature_key', _feature_key,
    'allowed', COALESCE(pf.enabled, false),
    'limit', pf.limit_value,
    'unlimited', COALESCE(pf.limit_value, -1) = -1,
    'teaser', pf.teaser_copy,
    'upgrade_target', pf.upgrade_target
  )
  FROM pc
  LEFT JOIN public.plan_features pf
    ON pf.plan_code = pc.code AND pf.feature_key = _feature_key;
$$;

GRANT EXECUTE ON FUNCTION public.homeowner_plan_code(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.homeowner_feature_access(uuid, text) TO authenticated, service_role;