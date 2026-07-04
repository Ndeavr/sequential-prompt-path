
CREATE TABLE IF NOT EXISTS public.sms_sprint_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  test_phone text NOT NULL DEFAULT '+15142499522',
  batch_size int NOT NULL DEFAULT 25,
  target_cities text[] NOT NULL DEFAULT ARRAY['Laval','Terrebonne','Repentigny','Mascouche','Montréal','Longueuil'],
  target_categories text[] NOT NULL DEFAULT ARRAY['attic-insulation','roofing','mold-removal','foundation-repair','french-drains','hvac'],
  first_batch_sent_at timestamptz,
  test_ok_at timestamptz,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sms_sprint_campaigns TO authenticated;
GRANT ALL ON public.sms_sprint_campaigns TO service_role;
ALTER TABLE public.sms_sprint_campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage sprint campaigns" ON public.sms_sprint_campaigns
  FOR ALL USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE IF NOT EXISTS public.sms_sprint_prospects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.sms_sprint_campaigns(id) ON DELETE CASCADE,
  prospect_id uuid REFERENCES public.contractor_prospects(id) ON DELETE SET NULL,
  company_name text,
  owner_name text,
  city text,
  category text,
  roi_score int NOT NULL DEFAULT 0,
  phone_e164 text,
  phone_type text,
  google_rating numeric,
  review_count int,
  qualification_status text NOT NULL DEFAULT 'qualified',
  rejection_reason text,
  variant char(1),
  tracking_slug text UNIQUE,
  activation_status text NOT NULL DEFAULT 'pending',
  activated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sms_sprint_prospects TO authenticated;
GRANT ALL ON public.sms_sprint_prospects TO service_role;
ALTER TABLE public.sms_sprint_prospects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage sprint prospects" ON public.sms_sprint_prospects
  FOR ALL USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE INDEX IF NOT EXISTS idx_ssp_campaign ON public.sms_sprint_prospects(campaign_id);
CREATE INDEX IF NOT EXISTS idx_ssp_slug ON public.sms_sprint_prospects(tracking_slug);
CREATE INDEX IF NOT EXISTS idx_ssp_status ON public.sms_sprint_prospects(qualification_status);

CREATE TABLE IF NOT EXISTS public.sms_sprint_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sprint_prospect_id uuid NOT NULL REFERENCES public.sms_sprint_prospects(id) ON DELETE CASCADE,
  phase text NOT NULL DEFAULT 'initial',
  body text NOT NULL,
  provider_id text,
  status text NOT NULL DEFAULT 'queued',
  status_reason text,
  sent_at timestamptz,
  delivered_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sms_sprint_messages TO authenticated;
GRANT ALL ON public.sms_sprint_messages TO service_role;
ALTER TABLE public.sms_sprint_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage sprint messages" ON public.sms_sprint_messages
  FOR ALL USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE INDEX IF NOT EXISTS idx_ssm_prospect ON public.sms_sprint_messages(sprint_prospect_id);

CREATE TABLE IF NOT EXISTS public.sms_sprint_link_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tracking_slug text NOT NULL,
  sprint_prospect_id uuid REFERENCES public.sms_sprint_prospects(id) ON DELETE SET NULL,
  event text NOT NULL,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  occurred_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.sms_sprint_link_events TO authenticated;
GRANT SELECT, INSERT ON public.sms_sprint_link_events TO anon;
GRANT ALL ON public.sms_sprint_link_events TO service_role;
ALTER TABLE public.sms_sprint_link_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can insert link events" ON public.sms_sprint_link_events
  FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Admins read link events" ON public.sms_sprint_link_events
  FOR SELECT USING (public.has_role(auth.uid(),'admin'));
CREATE INDEX IF NOT EXISTS idx_ssle_slug ON public.sms_sprint_link_events(tracking_slug);

CREATE TABLE IF NOT EXISTS public.sms_sprint_test_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid REFERENCES public.sms_sprint_campaigns(id) ON DELETE CASCADE,
  phone text NOT NULL,
  tracking_slug text,
  provider_id text,
  status text NOT NULL DEFAULT 'queued',
  status_reason text,
  sent_at timestamptz,
  delivered_at timestamptz,
  link_clicked_at timestamptz,
  checkout_completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sms_sprint_test_runs TO authenticated;
GRANT ALL ON public.sms_sprint_test_runs TO service_role;
ALTER TABLE public.sms_sprint_test_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage sprint test runs" ON public.sms_sprint_test_runs
  FOR ALL USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE OR REPLACE VIEW public.v_sms_sprint_landing WITH (security_invoker = true) AS
SELECT tracking_slug, company_name, city, category, variant, activation_status
FROM public.sms_sprint_prospects
WHERE tracking_slug IS NOT NULL;
GRANT SELECT ON public.v_sms_sprint_landing TO anon, authenticated;

CREATE OR REPLACE VIEW public.v_sms_sprint_eligible WITH (security_invoker = true) AS
SELECT
  cp.id,
  cp.business_name AS company_name,
  cp.owner_name,
  cp.city,
  cp.category_slug AS category,
  cp.acquisition_priority_score AS roi_score,
  cp.phone AS phone_raw,
  cp.phone_type,
  cp.has_mobile,
  cp.has_landline,
  cp.review_rating AS google_rating,
  cp.review_count,
  cp.has_website,
  cp.website_quality_score,
  cp.aggregator_email,
  cp.outreach_eligible,
  cp.suppression_reason
FROM public.contractor_prospects cp
WHERE cp.suppression_reason IS NULL
  AND cp.aggregator_email = false
  AND cp.acquisition_priority_score >= 80
  AND (cp.has_mobile = true OR cp.phone_type IN ('mobile','likely_mobile'))
  AND coalesce(cp.review_rating, 0) >= 4.6
  AND coalesce(cp.review_count, 0) >= 20;
GRANT SELECT ON public.v_sms_sprint_eligible TO authenticated;
