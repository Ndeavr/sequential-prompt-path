
-- =====================================================================
-- Revenue War Room — Autonomous Outreach Engine V1
-- =====================================================================

-- ─────────────────────────────────────────────────────────────────────
-- 1) contractor_prospect_priority
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.contractor_prospect_priority (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id uuid NOT NULL REFERENCES public.contractor_prospects(id) ON DELETE CASCADE,
  google_reviews_score integer NOT NULL DEFAULT 0,
  website_score integer NOT NULL DEFAULT 0,
  response_score integer NOT NULL DEFAULT 0,
  territory_score integer NOT NULL DEFAULT 0,
  total_score integer NOT NULL DEFAULT 0,
  score_breakdown jsonb NOT NULL DEFAULT '{}'::jsonb,
  computed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (prospect_id)
);

CREATE INDEX IF NOT EXISTS idx_cpp_total_score ON public.contractor_prospect_priority(total_score DESC);
CREATE INDEX IF NOT EXISTS idx_cpp_computed_at ON public.contractor_prospect_priority(computed_at DESC);

GRANT SELECT ON public.contractor_prospect_priority TO authenticated;
GRANT ALL ON public.contractor_prospect_priority TO service_role;

ALTER TABLE public.contractor_prospect_priority ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins read prospect priority"
  ON public.contractor_prospect_priority FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- ─────────────────────────────────────────────────────────────────────
-- 2) outreach_template_metrics
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.outreach_template_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_key text NOT NULL,
  variant text NOT NULL,
  sent_count integer NOT NULL DEFAULT 0,
  delivered_count integer NOT NULL DEFAULT 0,
  clicked_count integer NOT NULL DEFAULT 0,
  registered_count integer NOT NULL DEFAULT 0,
  activated_count integer NOT NULL DEFAULT 0,
  is_winner boolean NOT NULL DEFAULT false,
  computed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (template_key)
);

GRANT SELECT ON public.outreach_template_metrics TO authenticated;
GRANT ALL ON public.outreach_template_metrics TO service_role;

ALTER TABLE public.outreach_template_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins read template metrics"
  ON public.outreach_template_metrics FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- ─────────────────────────────────────────────────────────────────────
-- 3) contractor_activation_reminders
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.contractor_activation_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.contractor_leads(id) ON DELETE CASCADE,
  contractor_id uuid,
  stage text NOT NULL CHECK (stage IN ('registration_incomplete','profile_incomplete','payment_incomplete')),
  attempt integer NOT NULL CHECK (attempt BETWEEN 1 AND 3),
  template_key text NOT NULL,
  channel text NOT NULL DEFAULT 'sms',
  sent_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'sent',
  UNIQUE (lead_id, stage, attempt)
);

CREATE INDEX IF NOT EXISTS idx_car_lead ON public.contractor_activation_reminders(lead_id);
CREATE INDEX IF NOT EXISTS idx_car_sent_at ON public.contractor_activation_reminders(sent_at DESC);

GRANT SELECT ON public.contractor_activation_reminders TO authenticated;
GRANT ALL ON public.contractor_activation_reminders TO service_role;

ALTER TABLE public.contractor_activation_reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins read activation reminders"
  ON public.contractor_activation_reminders FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- ─────────────────────────────────────────────────────────────────────
-- 4) v_outreach_command_funnel — 10-stage live funnel
-- ─────────────────────────────────────────────────────────────────────
DROP VIEW IF EXISTS public.v_outreach_command_funnel CASCADE;
CREATE VIEW public.v_outreach_command_funnel
WITH (security_invoker = true)
AS
WITH
  prospects AS (
    SELECT
      COUNT(*)                                                             AS total,
      COUNT(*) FILTER (WHERE created_at >= now() - interval '24 hours')    AS d24,
      COUNT(*) FILTER (WHERE created_at >= now() - interval '7 days')      AS d7
    FROM public.contractor_prospects
  ),
  validated AS (
    SELECT
      COUNT(*)                                                             AS total,
      COUNT(*) FILTER (WHERE created_at >= now() - interval '24 hours')    AS d24,
      COUNT(*) FILTER (WHERE created_at >= now() - interval '7 days')      AS d7
    FROM public.contractor_prospects
    WHERE phone IS NOT NULL AND length(regexp_replace(phone,'[^0-9]','','g')) >= 10
  ),
  sms_sent AS (
    SELECT
      COUNT(*)                                                             AS total,
      COUNT(*) FILTER (WHERE sent_at >= now() - interval '24 hours')       AS d24,
      COUNT(*) FILTER (WHERE sent_at >= now() - interval '7 days')         AS d7
    FROM public.contractor_outreach_logs
    WHERE channel = 'sms' AND status IN ('sent','delivered','clicked')
  ),
  sms_delivered AS (
    SELECT
      COUNT(*)                                                             AS total,
      COUNT(*) FILTER (WHERE sent_at >= now() - interval '24 hours')       AS d24,
      COUNT(*) FILTER (WHERE sent_at >= now() - interval '7 days')         AS d7
    FROM public.contractor_outreach_logs
    WHERE channel = 'sms' AND status IN ('delivered','clicked')
  ),
  clicked AS (
    SELECT
      COUNT(DISTINCT lead_id)                                                                              AS total,
      COUNT(DISTINCT lead_id) FILTER (WHERE clicked_at >= now() - interval '24 hours')                     AS d24,
      COUNT(DISTINCT lead_id) FILTER (WHERE clicked_at >= now() - interval '7 days')                       AS d7
    FROM public.contractor_outreach_logs
    WHERE clicked_at IS NOT NULL
  ),
  registered AS (
    SELECT
      COUNT(*)                                                                          AS total,
      COUNT(*) FILTER (WHERE onboarding_started_at >= now() - interval '24 hours')      AS d24,
      COUNT(*) FILTER (WHERE onboarding_started_at >= now() - interval '7 days')        AS d7
    FROM public.contractor_leads
    WHERE onboarding_started_at IS NOT NULL
  ),
  profile_completed AS (
    SELECT
      COUNT(*)                                                                          AS total,
      COUNT(*) FILTER (WHERE updated_at >= now() - interval '24 hours')                 AS d24,
      COUNT(*) FILTER (WHERE updated_at >= now() - interval '7 days')                   AS d7
    FROM public.contractor_leads
    WHERE profile_status = 'complete'
  ),
  stripe_started AS (
    SELECT
      COUNT(*)                                                                          AS total,
      COUNT(*) FILTER (WHERE payment_started_at >= now() - interval '24 hours')         AS d24,
      COUNT(*) FILTER (WHERE payment_started_at >= now() - interval '7 days')           AS d7
    FROM public.contractor_leads
    WHERE payment_started_at IS NOT NULL
  ),
  activated AS (
    SELECT
      COUNT(*)                                                                          AS total,
      COUNT(*) FILTER (WHERE paid_at >= now() - interval '24 hours')                    AS d24,
      COUNT(*) FILTER (WHERE paid_at >= now() - interval '7 days')                      AS d7
    FROM public.contractor_leads
    WHERE paid_at IS NOT NULL
  ),
  upgraded AS (
    SELECT
      COUNT(*)                                                                          AS total,
      COUNT(*) FILTER (WHERE updated_at >= now() - interval '24 hours')                 AS d24,
      COUNT(*) FILTER (WHERE updated_at >= now() - interval '7 days')                   AS d7
    FROM public.contractor_subscriptions
    WHERE plan_id <> 'recrue' AND status = 'active'
  )
SELECT 1  AS stage_order, 'prospects_found'      AS stage_key, 'Prospects trouvés'      AS stage_label, total, d24 AS delta_24h, d7 AS delta_7d FROM prospects
UNION ALL SELECT 2, 'validated_mobile',   'Mobile validé',         total, d24, d7 FROM validated
UNION ALL SELECT 3, 'sms_sent',           'SMS envoyés',           total, d24, d7 FROM sms_sent
UNION ALL SELECT 4, 'sms_delivered',      'SMS livrés',            total, d24, d7 FROM sms_delivered
UNION ALL SELECT 5, 'clicked',            'Cliqués',               total, d24, d7 FROM clicked
UNION ALL SELECT 6, 'registration_started','Inscription démarrée', total, d24, d7 FROM registered
UNION ALL SELECT 7, 'profile_completed',  'Profil complété',       total, d24, d7 FROM profile_completed
UNION ALL SELECT 8, 'stripe_started',     'Stripe démarré',        total, d24, d7 FROM stripe_started
UNION ALL SELECT 9, 'activated',          '1$ activé',             total, d24, d7 FROM activated
UNION ALL SELECT 10,'plan_upgraded',      'Plan upgradé',          total, d24, d7 FROM upgraded
ORDER BY 1;

GRANT SELECT ON public.v_outreach_command_funnel TO authenticated;

-- ─────────────────────────────────────────────────────────────────────
-- 5) v_first_revenue_snapshot
-- ─────────────────────────────────────────────────────────────────────
DROP VIEW IF EXISTS public.v_first_revenue_snapshot CASCADE;
CREATE VIEW public.v_first_revenue_snapshot
WITH (security_invoker = true)
AS
SELECT
  (SELECT COUNT(*) FROM public.contractor_leads WHERE paid_at >= date_trunc('day', now()))                              AS activations_today,
  (SELECT COUNT(*) FROM public.contractor_leads WHERE paid_at >= now() - interval '7 days')                             AS activations_7d,
  (SELECT COUNT(*) FROM public.contractor_leads WHERE paid_at >= now() - interval '30 days')                            AS activations_30d,
  (SELECT COUNT(*) FROM public.contractor_outreach_logs WHERE channel='sms' AND sent_at >= now() - interval '7 days')   AS contacted_7d,
  (SELECT COUNT(*) FROM public.contractor_outreach_logs WHERE channel='sms' AND sent_at >= now() - interval '30 days')  AS contacted_30d,
  (SELECT COUNT(*) FROM public.contractor_leads WHERE onboarding_started_at >= now() - interval '7 days')               AS registrations_7d,
  (SELECT COUNT(*) FROM public.contractor_leads WHERE profile_status='complete' AND updated_at >= now() - interval '7 days') AS profiles_completed_7d,
  (SELECT COUNT(*) FROM public.contractor_subscriptions WHERE plan_id <> 'recrue' AND status='active')                  AS paid_plans_active,
  (SELECT MAX(paid_at) FROM public.contractor_leads)                                                                    AS last_activation_at,
  CASE
    WHEN (SELECT MAX(paid_at) FROM public.contractor_leads) IS NULL THEN true
    WHEN (SELECT MAX(paid_at) FROM public.contractor_leads) < now() - interval '48 hours' THEN true
    ELSE false
  END AS alert_no_activation_48h;

GRANT SELECT ON public.v_first_revenue_snapshot TO authenticated;

-- ─────────────────────────────────────────────────────────────────────
-- 6) v_outreach_template_performance
-- ─────────────────────────────────────────────────────────────────────
DROP VIEW IF EXISTS public.v_outreach_template_performance CASCADE;
CREATE VIEW public.v_outreach_template_performance
WITH (security_invoker = true)
AS
SELECT
  m.template_key,
  m.variant,
  m.sent_count,
  m.delivered_count,
  m.clicked_count,
  m.registered_count,
  m.activated_count,
  CASE WHEN m.sent_count > 0 THEN ROUND(100.0 * m.delivered_count / m.sent_count, 1) ELSE 0 END  AS delivered_rate,
  CASE WHEN m.sent_count > 0 THEN ROUND(100.0 * m.clicked_count   / m.sent_count, 1) ELSE 0 END  AS click_rate,
  CASE WHEN m.sent_count > 0 THEN ROUND(100.0 * m.activated_count / m.sent_count, 2) ELSE 0 END  AS activation_rate,
  m.is_winner,
  m.computed_at
FROM public.outreach_template_metrics m
ORDER BY activation_rate DESC, m.sent_count DESC;

GRANT SELECT ON public.v_outreach_template_performance TO authenticated;

-- ─────────────────────────────────────────────────────────────────────
-- 7) Seed 3 outreach templates (variants A / B / C)
-- ─────────────────────────────────────────────────────────────────────
INSERT INTO public.outreach_templates (template_name, channel_type, language, template_type, body_template)
SELECT 'war_room_variant_a', 'sms', 'fr', 'acquisition',
       E'Votre entreprise mérite-t-elle d''être recommandée par l''IA d''UNPRO?\n\nActivation 7 jours pour 1$.\n\nunpro.ca'
WHERE NOT EXISTS (SELECT 1 FROM public.outreach_templates WHERE template_name='war_room_variant_a');

INSERT INTO public.outreach_templates (template_name, channel_type, language, template_type, body_template)
SELECT 'war_room_variant_b', 'sms', 'fr', 'acquisition',
       E'L''IA d''UNPRO recommande des entrepreneurs selon leur expertise, réputation et territoire.\n\nVotre entreprise est-elle recommandée?\n\n1$ pour commencer.\n\nunpro.ca'
WHERE NOT EXISTS (SELECT 1 FROM public.outreach_templates WHERE template_name='war_room_variant_b');

INSERT INTO public.outreach_templates (template_name, channel_type, language, template_type, body_template)
SELECT 'war_room_variant_c', 'sms', 'fr', 'acquisition',
       E'Toujours à chercher des clients?\n\nUNPRO aide les entrepreneurs à être trouvés et recommandés.\n\nEssai 7 jours: 1$\n\nunpro.ca'
WHERE NOT EXISTS (SELECT 1 FROM public.outreach_templates WHERE template_name='war_room_variant_c');

-- Corresponding metric rows so the dashboard renders immediately
INSERT INTO public.outreach_template_metrics (template_key, variant)
VALUES ('war_room_variant_a','A'), ('war_room_variant_b','B'), ('war_room_variant_c','C')
ON CONFLICT (template_key) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────
-- 8) Seed suppression rules for soumission sites / aggregators
-- ─────────────────────────────────────────────────────────────────────
INSERT INTO public.outbound_suppressions (domain, suppression_type, suppression_reason, source, active)
SELECT d, 'domain', 'aggregator / lead reseller — not a real contractor', 'war_room_v1', true
FROM (VALUES
  ('renoassistance.ca'),
  ('renoassistance.com'),
  ('soumissionrenovation.ca'),
  ('soumissionrenovation.com'),
  ('bark.com'),
  ('homestars.com'),
  ('houzz.com'),
  ('trouvetonpro.com'),
  ('trouvetonpro.ca'),
  ('estimatique.com'),
  ('estimatique.ca'),
  ('reno-quotes.com'),
  ('renoquotes.com')
) AS s(d)
WHERE NOT EXISTS (
  SELECT 1 FROM public.outbound_suppressions os
  WHERE os.domain = s.d AND os.suppression_type = 'domain'
);
