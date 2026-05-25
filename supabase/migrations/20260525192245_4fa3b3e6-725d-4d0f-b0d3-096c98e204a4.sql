
CREATE TABLE IF NOT EXISTS public.plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  tier_rank int NOT NULL DEFAULT 0,
  monthly_price int NOT NULL DEFAULT 0,
  yearly_price int NOT NULL DEFAULT 0,
  one_time_price int NOT NULL DEFAULT 0,
  visibility_multiplier numeric(4,2) NOT NULL DEFAULT 1.0,
  recommendation_multiplier numeric(4,2) NOT NULL DEFAULT 1.0,
  ai_index_priority int NOT NULL DEFAULT 50,
  trust_boost numeric(4,2) NOT NULL DEFAULT 0,
  seo_boost numeric(4,2) NOT NULL DEFAULT 0,
  citation_boost numeric(4,2) NOT NULL DEFAULT 0,
  territory_radius_km int NOT NULL DEFAULT 0,
  booking_priority int NOT NULL DEFAULT 0,
  appointments_included int NOT NULL DEFAULT 0,
  tagline text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "plans_public_read" ON public.plans FOR SELECT USING (true);
CREATE POLICY "plans_admin_write" ON public.plans FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE IF NOT EXISTS public.plan_features (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_code text NOT NULL REFERENCES public.plans(code) ON DELETE CASCADE,
  feature_key text NOT NULL,
  enabled boolean NOT NULL DEFAULT false,
  limit_value int,
  teaser_copy text,
  upgrade_target text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (plan_code, feature_key)
);
CREATE INDEX IF NOT EXISTS idx_plan_features_lookup ON public.plan_features(plan_code, feature_key);
ALTER TABLE public.plan_features ENABLE ROW LEVEL SECURITY;
CREATE POLICY "plan_features_public_read" ON public.plan_features FOR SELECT USING (true);
CREATE POLICY "plan_features_admin_write" ON public.plan_features FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE IF NOT EXISTS public.profile_visibility_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id uuid NOT NULL,
  visibility_score numeric(6,2) NOT NULL DEFAULT 0,
  ai_citation_count int NOT NULL DEFAULT 0,
  booking_count int NOT NULL DEFAULT 0,
  plan_code text,
  recorded_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_pvh_contractor_time ON public.profile_visibility_history(contractor_id, recorded_at DESC);
ALTER TABLE public.profile_visibility_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pvh_owner_read" ON public.profile_visibility_history FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (SELECT 1 FROM public.contractors c WHERE c.id = contractor_id AND c.user_id = auth.uid())
  );
CREATE POLICY "pvh_admin_write" ON public.profile_visibility_history FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE IF NOT EXISTS public.profile_ai_citation_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id uuid NOT NULL,
  source text NOT NULL,
  query text,
  context jsonb,
  cited_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_pach_contractor_time ON public.profile_ai_citation_history(contractor_id, cited_at DESC);
CREATE INDEX IF NOT EXISTS idx_pach_source ON public.profile_ai_citation_history(source);
ALTER TABLE public.profile_ai_citation_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pach_owner_read" ON public.profile_ai_citation_history FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (SELECT 1 FROM public.contractors c WHERE c.id = contractor_id AND c.user_id = auth.uid())
  );
CREATE POLICY "pach_admin_write" ON public.profile_ai_citation_history FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE VIEW public.v_contractor_recommendation_score
WITH (security_invoker = true) AS
SELECT
  c.id AS contractor_id,
  COALESCE(p.code, 'recrue') AS plan_code,
  COALESCE(p.visibility_multiplier, 1.0) AS visibility_multiplier,
  COALESCE(p.recommendation_multiplier, 1.0) AS recommendation_multiplier,
  COALESCE(p.ai_index_priority, 50) AS ai_index_priority,
  ROUND((
    (COALESCE(c.rating, 0)::numeric * 20) * 0.25 +
    COALESCE((SELECT count(*) FROM public.profile_ai_citation_history ach
              WHERE ach.contractor_id = c.id
              AND ach.cited_at > now() - interval '90 days'), 0)::numeric * 0.20 +
    LEAST(COALESCE(c.review_count, 0), 100)::numeric * 0.15 +
    50 * 0.10 +
    (COALESCE(p.recommendation_multiplier, 1.0) * 20)::numeric * 0.30
  )::numeric, 2) AS recommendation_score
FROM public.contractors c
LEFT JOIN public.contractor_subscriptions cs
  ON cs.contractor_id = c.id AND cs.status = 'active'
LEFT JOIN public.plans p ON p.code = cs.plan_id;

CREATE OR REPLACE FUNCTION public.snapshot_visibility_on_plan_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_score numeric;
BEGIN
  IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND NEW.plan_id IS DISTINCT FROM OLD.plan_id) THEN
    SELECT recommendation_score INTO v_score FROM public.v_contractor_recommendation_score
    WHERE contractor_id = NEW.contractor_id LIMIT 1;
    INSERT INTO public.profile_visibility_history (contractor_id, visibility_score, plan_code)
    VALUES (NEW.contractor_id, COALESCE(v_score, 0), NEW.plan_id);
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_snapshot_visibility_on_plan_change ON public.contractor_subscriptions;
CREATE TRIGGER trg_snapshot_visibility_on_plan_change
AFTER INSERT OR UPDATE OF plan_id ON public.contractor_subscriptions
FOR EACH ROW EXECUTE FUNCTION public.snapshot_visibility_on_plan_change();

INSERT INTO public.plans (code, name, tier_rank, monthly_price, yearly_price, visibility_multiplier, recommendation_multiplier, ai_index_priority, trust_boost, seo_boost, citation_boost, territory_radius_km, booking_priority, appointments_included, tagline) VALUES
('recrue','Recrue',1,14900,149000,1.0,1.0,30,0,0,0,0,1,0,'Vous existez'),
('pro','Pro',2,34900,349000,1.5,1.3,50,0.10,0.15,0.10,10,2,5,'Vous recevez des opportunités'),
('premium','Premium',3,59900,599000,2.5,2.0,70,0.20,0.30,0.25,25,3,10,'Votre agenda commence à se remplir'),
('elite','Élite',4,99900,999000,3.5,3.0,85,0.35,0.50,0.45,50,4,25,'Votre agenda devient optimisé'),
('signature','Signature',5,179900,1799000,5.0,4.5,100,0.50,0.80,0.75,100,5,50,'Vous contrôlez votre marché')
ON CONFLICT (code) DO UPDATE SET
  visibility_multiplier=EXCLUDED.visibility_multiplier,
  recommendation_multiplier=EXCLUDED.recommendation_multiplier,
  ai_index_priority=EXCLUDED.ai_index_priority,
  trust_boost=EXCLUDED.trust_boost, seo_boost=EXCLUDED.seo_boost, citation_boost=EXCLUDED.citation_boost,
  territory_radius_km=EXCLUDED.territory_radius_km, booking_priority=EXCLUDED.booking_priority,
  appointments_included=EXCLUDED.appointments_included, tagline=EXCLUDED.tagline, updated_at=now();

INSERT INTO public.plan_features (plan_code, feature_key, enabled, limit_value, teaser_copy, upgrade_target) VALUES
('recrue','ai_index_priority',true,30,null,null),
('pro','ai_index_priority',true,50,null,null),
('premium','ai_index_priority',true,70,null,null),
('elite','ai_index_priority',true,85,null,null),
('signature','ai_index_priority',true,100,null,null),
('recrue','aeo_blocks_published',false,0,'Vos pages SEO/IA dédiées débloquent vos premières citations IA.','pro'),
('pro','aeo_blocks_published',true,5,null,null),
('premium','aeo_blocks_published',true,20,null,null),
('elite','aeo_blocks_published',true,50,null,null),
('signature','aeo_blocks_published',true,-1,null,null),
('recrue','booking_direct',false,0,'Recevez des rendez-vous directs dans votre agenda.','premium'),
('pro','booking_direct',false,0,'Recevez des rendez-vous directs dans votre agenda.','premium'),
('premium','booking_direct',true,10,null,null),
('elite','booking_direct',true,25,null,null),
('signature','booking_direct',true,50,null,null),
('recrue','route_optimization',false,0,'Optimisez vos déplacements et regroupez par secteur.','elite'),
('pro','route_optimization',false,0,'Optimisez vos déplacements et regroupez par secteur.','elite'),
('premium','route_optimization',false,0,'Optimisez vos déplacements et regroupez par secteur.','elite'),
('elite','route_optimization',true,null,null,null),
('signature','route_optimization',true,null,null,null),
('recrue','territory_lock',false,0,'Verrouillez votre territoire en exclusivité.','signature'),
('pro','territory_lock',false,0,'Verrouillez votre territoire en exclusivité.','signature'),
('premium','territory_lock',false,0,'Verrouillez votre territoire en exclusivité.','signature'),
('elite','territory_lock',false,0,'Verrouillez votre territoire en exclusivité.','signature'),
('signature','territory_lock',true,null,null,null),
('recrue','priority_dispatch',false,0,null,'premium'),
('pro','priority_dispatch',false,0,null,'premium'),
('premium','priority_dispatch',true,null,null,null),
('elite','priority_dispatch',true,null,null,null),
('signature','priority_dispatch',true,null,null,null),
('recrue','analytics_advanced',false,0,'Débloquez vos statistiques avancées.','pro'),
('pro','analytics_advanced',true,null,null,null),
('premium','analytics_advanced',true,null,null,null),
('elite','analytics_advanced',true,null,null,null),
('signature','analytics_advanced',true,null,null,null),
('recrue','priority_support',false,0,'Support prioritaire dès Élite.','elite'),
('pro','priority_support',false,0,'Support prioritaire dès Élite.','elite'),
('premium','priority_support',false,0,'Support prioritaire dès Élite.','elite'),
('elite','priority_support',true,null,null,null),
('signature','priority_support',true,null,null,null)
ON CONFLICT (plan_code, feature_key) DO UPDATE SET
  enabled=EXCLUDED.enabled, limit_value=EXCLUDED.limit_value,
  teaser_copy=EXCLUDED.teaser_copy, upgrade_target=EXCLUDED.upgrade_target, updated_at=now();
