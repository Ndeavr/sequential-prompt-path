-- 1. Canonical funnel event taxonomy ------------------------------------
ALTER TABLE public.acquisition_events DROP CONSTRAINT IF EXISTS acquisition_events_event_type_check;
ALTER TABLE public.acquisition_events ADD CONSTRAINT acquisition_events_event_type_check CHECK (
  event_type = ANY (ARRAY[
    'scraped','contacted','sent','delivered','opened','clicked','registered','onboarded','paid','active','failed','bounced','unsubscribed',
    'outreach_queued','link_clicked','landing_viewed','landing_engaged','profile_viewed','profile_section_expanded',
    'correction_requested','checkout_cta_clicked','checkout_cta_failed','checkout_created','checkout_abandoned',
    'payment_succeeded','goals_started','goals_completed','plan_recommended','plan_accepted',
    'profile_completion_updated','recommendation_eligible'
  ])
);

ALTER TABLE public.acquisition_events ADD COLUMN IF NOT EXISTS idempotency_key text;
CREATE UNIQUE INDEX IF NOT EXISTS uq_acq_events_idem ON public.acquisition_events (idempotency_key) WHERE idempotency_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_acq_events_type_time ON public.acquisition_events (event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_acq_events_prospect ON public.acquisition_events (prospect_id, created_at DESC);

-- 2. Post-$1 contractor goals --------------------------------------------
CREATE TABLE IF NOT EXISTS public.contractor_activation_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id uuid,
  contractor_id uuid,
  user_id uuid,
  activation_token text,
  growth_objective text,
  desired_project_types text[] DEFAULT '{}',
  ideal_project_value_cad integer,
  territories text[] DEFAULT '{}',
  monthly_appointment_goal integer,
  exclusions text[] DEFAULT '{}',
  urgency text,
  exclusivity_preference text,
  answers jsonb NOT NULL DEFAULT '{}'::jsonb,
  current_step integer NOT NULL DEFAULT 0,
  completed_at timestamptz,
  recommended_plan_code text,
  recommended_plan_reason text,
  accepted_plan_code text,
  accepted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.contractor_activation_goals TO authenticated;
GRANT ALL ON public.contractor_activation_goals TO service_role;
ALTER TABLE public.contractor_activation_goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "goals_owner_rw" ON public.contractor_activation_goals
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "goals_admin_all" ON public.contractor_activation_goals
  FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE UNIQUE INDEX IF NOT EXISTS uq_goals_token ON public.contractor_activation_goals (activation_token) WHERE activation_token IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_goals_prospect ON public.contractor_activation_goals (prospect_id);

-- 3. Profile completion ---------------------------------------------------
CREATE TABLE IF NOT EXISTS public.contractor_profile_completion (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id uuid,
  contractor_id uuid,
  user_id uuid,
  completion_score integer NOT NULL DEFAULT 0,
  items jsonb NOT NULL DEFAULT '{}'::jsonb,
  missing_keys text[] DEFAULT '{}',
  recommendation_ready boolean NOT NULL DEFAULT false,
  last_confirmed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.contractor_profile_completion TO authenticated;
GRANT ALL ON public.contractor_profile_completion TO service_role;
ALTER TABLE public.contractor_profile_completion ENABLE ROW LEVEL SECURITY;
CREATE POLICY "completion_owner_rw" ON public.contractor_profile_completion
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "completion_admin_all" ON public.contractor_profile_completion
  FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE UNIQUE INDEX IF NOT EXISTS uq_completion_prospect ON public.contractor_profile_completion (prospect_id) WHERE prospect_id IS NOT NULL;

-- 4. Conversion variants --------------------------------------------------
CREATE TABLE IF NOT EXISTS public.conversion_variant_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id uuid NOT NULL,
  surface text NOT NULL,
  variant text NOT NULL,
  cohort_city text,
  cohort_trade text,
  assigned_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.conversion_variant_assignments TO authenticated;
GRANT ALL ON public.conversion_variant_assignments TO service_role;
ALTER TABLE public.conversion_variant_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "variants_admin_read" ON public.conversion_variant_assignments
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE UNIQUE INDEX IF NOT EXISTS uq_variant_prospect_surface ON public.conversion_variant_assignments (prospect_id, surface);

-- 5. updated_at triggers ---------------------------------------------------
CREATE TRIGGER trg_goals_updated BEFORE UPDATE ON public.contractor_activation_goals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_completion_updated BEFORE UPDATE ON public.contractor_profile_completion
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 6. Conversion lab view ---------------------------------------------------
CREATE OR REPLACE VIEW public.v_conversion_lab
WITH (security_invoker = true) AS
WITH base AS (
  SELECT p.id AS prospect_id, p.city, p.category AS trade,
    COALESCE(vm.variant,'default') AS message_variant,
    COALESCE(vl.variant,'default') AS landing_variant,
    COALESCE(vp.variant,'default') AS profile_variant,
    p.outreach_status, p.outreach_sent_at, p.outreach_delivered_at, p.outreach_clicked_at
  FROM public.verified_contractor_prospects p
  LEFT JOIN public.conversion_variant_assignments vm ON vm.prospect_id = p.id AND vm.surface='message'
  LEFT JOIN public.conversion_variant_assignments vl ON vl.prospect_id = p.id AND vl.surface='landing'
  LEFT JOIN public.conversion_variant_assignments vp ON vp.prospect_id = p.id AND vp.surface='profile'
), ev AS (
  SELECT prospect_id,
    count(*) FILTER (WHERE event_type='landing_viewed')      AS landing_viewed,
    count(*) FILTER (WHERE event_type='landing_engaged')     AS landing_engaged,
    count(*) FILTER (WHERE event_type='profile_viewed')      AS profile_viewed,
    count(*) FILTER (WHERE event_type='checkout_cta_clicked')AS cta_clicked,
    count(*) FILTER (WHERE event_type='checkout_created')    AS checkout_created,
    count(*) FILTER (WHERE event_type='payment_succeeded')   AS paid,
    count(*) FILTER (WHERE event_type='goals_completed')     AS goals_completed,
    count(*) FILTER (WHERE event_type='plan_accepted')       AS plan_accepted
  FROM public.acquisition_events WHERE prospect_id IS NOT NULL GROUP BY 1
)
SELECT b.message_variant, b.landing_variant, b.profile_variant, b.trade, b.city,
  count(*) AS cohort_size,
  count(*) FILTER (WHERE b.outreach_sent_at IS NOT NULL) AS sent,
  count(*) FILTER (WHERE b.outreach_delivered_at IS NOT NULL OR b.outreach_status IN ('delivered','sent_email')) AS delivered,
  count(*) FILTER (WHERE b.outreach_clicked_at IS NOT NULL) AS clicked,
  COALESCE(sum(CASE WHEN ev.landing_viewed>0 THEN 1 ELSE 0 END),0) AS landing_viewed,
  COALESCE(sum(CASE WHEN ev.landing_engaged>0 THEN 1 ELSE 0 END),0) AS landing_engaged,
  COALESCE(sum(CASE WHEN ev.profile_viewed>0 THEN 1 ELSE 0 END),0) AS profile_viewed,
  COALESCE(sum(CASE WHEN ev.cta_clicked>0 THEN 1 ELSE 0 END),0) AS cta_clicked,
  COALESCE(sum(CASE WHEN ev.checkout_created>0 THEN 1 ELSE 0 END),0) AS checkout_created,
  COALESCE(sum(CASE WHEN ev.paid>0 THEN 1 ELSE 0 END),0) AS paid,
  COALESCE(sum(CASE WHEN ev.goals_completed>0 THEN 1 ELSE 0 END),0) AS goals_completed,
  COALESCE(sum(CASE WHEN ev.plan_accepted>0 THEN 1 ELSE 0 END),0) AS plan_accepted
FROM base b LEFT JOIN ev ON ev.prospect_id = b.prospect_id
GROUP BY 1,2,3,4,5;

GRANT SELECT ON public.v_conversion_lab TO authenticated;

-- 7. Bottleneck detector ---------------------------------------------------
CREATE OR REPLACE VIEW public.v_activation_bottleneck
WITH (security_invoker = true) AS
WITH t AS (
  SELECT
    count(*) FILTER (WHERE outreach_sent_at IS NOT NULL OR outreach_status IN ('sent','delivered','sent_email')) AS sent,
    count(*) FILTER (WHERE outreach_delivered_at IS NOT NULL OR outreach_status IN ('delivered','sent_email')) AS delivered,
    count(*) FILTER (WHERE outreach_clicked_at IS NOT NULL) AS clicked
  FROM public.verified_contractor_prospects
), e AS (
  SELECT
    count(DISTINCT prospect_id) FILTER (WHERE event_type='landing_viewed') AS landing_viewed,
    count(DISTINCT prospect_id) FILTER (WHERE event_type='profile_viewed') AS profile_viewed,
    count(DISTINCT prospect_id) FILTER (WHERE event_type='checkout_cta_clicked') AS cta_clicked,
    count(DISTINCT prospect_id) FILTER (WHERE event_type='checkout_created') AS checkout_created,
    count(DISTINCT prospect_id) FILTER (WHERE event_type='payment_succeeded') AS paid,
    count(DISTINCT prospect_id) FILTER (WHERE event_type='goals_completed') AS goals_completed
  FROM public.acquisition_events
)
SELECT * FROM (
  SELECT 1 AS step_order,'sent→delivered' AS transition, t.sent AS from_count, t.delivered AS to_count,
         CASE WHEN t.sent>0 THEN round(100.0*t.delivered/t.sent,1) ELSE NULL END AS rate_pct FROM t
  UNION ALL SELECT 2,'delivered→clicked', t.delivered, t.clicked,
         CASE WHEN t.delivered>0 THEN round(100.0*t.clicked/t.delivered,1) END FROM t
  UNION ALL SELECT 3,'clicked→landing', t.clicked, e.landing_viewed,
         CASE WHEN t.clicked>0 THEN round(100.0*e.landing_viewed/t.clicked,1) END FROM t,e
  UNION ALL SELECT 4,'landing→profile', e.landing_viewed, e.profile_viewed,
         CASE WHEN e.landing_viewed>0 THEN round(100.0*e.profile_viewed/e.landing_viewed,1) END FROM e
  UNION ALL SELECT 5,'profile→cta', e.profile_viewed, e.cta_clicked,
         CASE WHEN e.profile_viewed>0 THEN round(100.0*e.cta_clicked/e.profile_viewed,1) END FROM e
  UNION ALL SELECT 6,'cta→checkout', e.cta_clicked, e.checkout_created,
         CASE WHEN e.cta_clicked>0 THEN round(100.0*e.checkout_created/e.cta_clicked,1) END FROM e
  UNION ALL SELECT 7,'checkout→paid', e.checkout_created, e.paid,
         CASE WHEN e.checkout_created>0 THEN round(100.0*e.paid/e.checkout_created,1) END FROM e
  UNION ALL SELECT 8,'paid→goals', e.paid, e.goals_completed,
         CASE WHEN e.paid>0 THEN round(100.0*e.goals_completed/e.paid,1) END FROM e
) s ORDER BY step_order;

GRANT SELECT ON public.v_activation_bottleneck TO authenticated;