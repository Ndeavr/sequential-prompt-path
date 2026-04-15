
-- =============================================
-- MODULE: Contractor Recruitment Automation Engine
-- =============================================

-- 1. recruitment_clusters
CREATE TABLE public.recruitment_clusters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  province_code text NOT NULL DEFAULT 'QC',
  region_name text,
  city_list_json jsonb DEFAULT '[]'::jsonb,
  postal_prefixes_json jsonb DEFAULT '[]'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  status text NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2. recruitment_cluster_categories
CREATE TABLE public.recruitment_cluster_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cluster_id uuid NOT NULL REFERENCES public.recruitment_clusters(id) ON DELETE CASCADE,
  category_slug text NOT NULL,
  season_code text NOT NULL DEFAULT 'all',
  is_active boolean NOT NULL DEFAULT true,
  priority_score integer NOT NULL DEFAULT 50,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_rcc_cluster ON public.recruitment_cluster_categories(cluster_id);

-- 3. recruitment_capacity_targets
CREATE TABLE public.recruitment_capacity_targets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cluster_id uuid NOT NULL REFERENCES public.recruitment_clusters(id) ON DELETE CASCADE,
  category_slug text NOT NULL,
  season_code text NOT NULL DEFAULT 'all',
  target_slots_total integer NOT NULL DEFAULT 10,
  target_slots_paid integer NOT NULL DEFAULT 0,
  target_slots_reserved integer NOT NULL DEFAULT 0,
  target_slots_waitlist integer NOT NULL DEFAULT 0,
  fill_ratio_cached numeric(5,4) NOT NULL DEFAULT 0,
  recruitment_status text NOT NULL DEFAULT 'draft',
  stop_when_full boolean NOT NULL DEFAULT true,
  last_recomputed_at timestamptz DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_rct_cluster ON public.recruitment_capacity_targets(cluster_id);
CREATE INDEX idx_rct_status ON public.recruitment_capacity_targets(recruitment_status);

-- 4. contractor_prospects
CREATE TABLE public.contractor_prospects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_name text,
  source_record_id text,
  business_name text NOT NULL,
  owner_name text,
  legal_name text,
  neq text,
  rbq text,
  category_slug text,
  website_url text,
  google_business_url text,
  city text,
  region text,
  province text DEFAULT 'QC',
  postal_code text,
  phone text,
  email text,
  language_guess text DEFAULT 'fr',
  review_count integer DEFAULT 0,
  review_rating numeric(3,2),
  domain_status text DEFAULT 'unknown',
  extraction_confidence numeric(5,4) DEFAULT 0,
  enrichment_status text NOT NULL DEFAULT 'pending',
  qualification_status text NOT NULL DEFAULT 'new',
  outreach_status text NOT NULL DEFAULT 'not_started',
  onboarding_status text NOT NULL DEFAULT 'not_started',
  payment_status text NOT NULL DEFAULT 'not_started',
  activation_status text NOT NULL DEFAULT 'pending',
  do_not_contact boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_cp_category ON public.contractor_prospects(category_slug);
CREATE INDEX idx_cp_city ON public.contractor_prospects(city);
CREATE INDEX idx_cp_qualification ON public.contractor_prospects(qualification_status);
CREATE INDEX idx_cp_outreach ON public.contractor_prospects(outreach_status);
CREATE INDEX idx_cp_email ON public.contractor_prospects(email);
CREATE INDEX idx_cp_neq ON public.contractor_prospects(neq);

-- 5. contractor_prospect_contacts
CREATE TABLE public.contractor_prospect_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id uuid NOT NULL REFERENCES public.contractor_prospects(id) ON DELETE CASCADE,
  contact_type text NOT NULL DEFAULT 'email',
  contact_value text NOT NULL,
  is_primary boolean NOT NULL DEFAULT false,
  verified_status text DEFAULT 'unverified',
  bounce_status text DEFAULT 'none',
  opt_out_status text DEFAULT 'none',
  last_contacted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_cpc_prospect ON public.contractor_prospect_contacts(prospect_id);

-- 6. contractor_prospect_enrichment
CREATE TABLE public.contractor_prospect_enrichment (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id uuid NOT NULL UNIQUE REFERENCES public.contractor_prospects(id) ON DELETE CASCADE,
  services_detected_json jsonb DEFAULT '[]'::jsonb,
  cities_detected_json jsonb DEFAULT '[]'::jsonb,
  site_quality_score numeric(5,2) DEFAULT 0,
  aeo_score_estimate numeric(5,2) DEFAULT 0,
  seo_score_estimate numeric(5,2) DEFAULT 0,
  trust_signal_score numeric(5,2) DEFAULT 0,
  ad_activity_estimate text,
  business_size_estimate text,
  social_links_json jsonb DEFAULT '{}'::jsonb,
  extraction_payload_json jsonb,
  enrichment_payload_json jsonb,
  last_enriched_at timestamptz
);

-- 7. contractor_prospect_scores
CREATE TABLE public.contractor_prospect_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id uuid NOT NULL REFERENCES public.contractor_prospects(id) ON DELETE CASCADE,
  cluster_id uuid REFERENCES public.recruitment_clusters(id),
  category_slug text,
  season_code text DEFAULT 'all',
  fit_score numeric(5,2) DEFAULT 0,
  urgency_score numeric(5,2) DEFAULT 0,
  payment_probability_score numeric(5,4) DEFAULT 0,
  response_probability_score numeric(5,4) DEFAULT 0,
  exclusivity_value_score numeric(5,2) DEFAULT 0,
  final_recruitment_score numeric(5,2) DEFAULT 0,
  score_reason_json jsonb,
  scored_at timestamptz DEFAULT now()
);
CREATE INDEX idx_cps_prospect ON public.contractor_prospect_scores(prospect_id);
CREATE INDEX idx_cps_cluster ON public.contractor_prospect_scores(cluster_id);

-- 8. contractor_recruitment_campaigns
CREATE TABLE public.contractor_recruitment_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cluster_id uuid REFERENCES public.recruitment_clusters(id),
  category_slug text,
  season_code text DEFAULT 'all',
  name text NOT NULL,
  channel_mix text DEFAULT 'email',
  status text NOT NULL DEFAULT 'draft',
  budget_limit integer,
  daily_send_limit integer DEFAULT 50,
  started_at timestamptz,
  paused_at timestamptz,
  completed_at timestamptz,
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_crc_cluster ON public.contractor_recruitment_campaigns(cluster_id);
CREATE INDEX idx_crc_status ON public.contractor_recruitment_campaigns(status);

-- 9. contractor_recruitment_sequences
CREATE TABLE public.contractor_recruitment_sequences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.contractor_recruitment_campaigns(id) ON DELETE CASCADE,
  name text NOT NULL,
  trigger_type text DEFAULT 'auto',
  sequence_status text NOT NULL DEFAULT 'draft',
  variant_code text,
  personalization_level text DEFAULT 'standard',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_crs_campaign ON public.contractor_recruitment_sequences(campaign_id);

-- 10. contractor_recruitment_steps
CREATE TABLE public.contractor_recruitment_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sequence_id uuid NOT NULL REFERENCES public.contractor_recruitment_sequences(id) ON DELETE CASCADE,
  step_order integer NOT NULL DEFAULT 1,
  channel_type text NOT NULL DEFAULT 'email',
  delay_hours integer NOT NULL DEFAULT 0,
  template_key text,
  stop_if_replied boolean NOT NULL DEFAULT true,
  stop_if_cluster_full boolean NOT NULL DEFAULT true,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_crst_sequence ON public.contractor_recruitment_steps(sequence_id);

-- 11. contractor_recruitment_messages
CREATE TABLE public.contractor_recruitment_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid REFERENCES public.contractor_recruitment_campaigns(id),
  prospect_id uuid NOT NULL REFERENCES public.contractor_prospects(id) ON DELETE CASCADE,
  step_id uuid REFERENCES public.contractor_recruitment_steps(id),
  channel_type text NOT NULL DEFAULT 'email',
  provider_name text,
  provider_message_id text,
  send_status text NOT NULL DEFAULT 'pending',
  delivery_status text,
  open_status text,
  click_status text,
  reply_status text,
  error_code text,
  error_message text,
  sent_at timestamptz,
  delivered_at timestamptz,
  opened_at timestamptz,
  clicked_at timestamptz,
  replied_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_crm_prospect ON public.contractor_recruitment_messages(prospect_id);
CREATE INDEX idx_crm_campaign ON public.contractor_recruitment_messages(campaign_id);
CREATE INDEX idx_crm_status ON public.contractor_recruitment_messages(send_status);

-- 12. contractor_recruitment_events
CREATE TABLE public.contractor_recruitment_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  entity_type text,
  entity_id uuid,
  actor_type text DEFAULT 'system',
  actor_id text,
  payload_json jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_cre_type ON public.contractor_recruitment_events(event_type);
CREATE INDEX idx_cre_entity ON public.contractor_recruitment_events(entity_id);

-- 13. contractor_recruitment_replies
CREATE TABLE public.contractor_recruitment_replies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id uuid NOT NULL REFERENCES public.contractor_prospects(id) ON DELETE CASCADE,
  campaign_id uuid REFERENCES public.contractor_recruitment_campaigns(id),
  message_id uuid REFERENCES public.contractor_recruitment_messages(id),
  channel_type text DEFAULT 'email',
  reply_text text,
  intent_label text,
  sentiment_label text,
  objection_label text,
  confidence_score numeric(5,4) DEFAULT 0,
  requires_human_review boolean NOT NULL DEFAULT false,
  processed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_crr_prospect ON public.contractor_recruitment_replies(prospect_id);

-- 14. contractor_recruitment_tasks
CREATE TABLE public.contractor_recruitment_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id uuid REFERENCES public.contractor_prospects(id) ON DELETE CASCADE,
  campaign_id uuid REFERENCES public.contractor_recruitment_campaigns(id),
  task_type text NOT NULL DEFAULT 'follow_up',
  assigned_to text,
  status text NOT NULL DEFAULT 'pending',
  due_at timestamptz,
  payload_json jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_crt_status ON public.contractor_recruitment_tasks(status);

-- 15. contractor_recruitment_offers
CREATE TABLE public.contractor_recruitment_offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id uuid NOT NULL REFERENCES public.contractor_prospects(id) ON DELETE CASCADE,
  cluster_id uuid REFERENCES public.recruitment_clusters(id),
  category_slug text,
  offer_type text DEFAULT 'standard',
  plan_code text,
  pricing_mode text DEFAULT 'subscription',
  price_amount integer DEFAULT 0,
  setup_fee_amount integer DEFAULT 0,
  recurring_amount integer DEFAULT 0,
  founder_discount_percent integer DEFAULT 0,
  coupon_code text,
  scarcity_message text,
  expires_at timestamptz,
  accepted_at timestamptz,
  declined_at timestamptz,
  status text NOT NULL DEFAULT 'pending',
  magic_token text UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_cro_prospect ON public.contractor_recruitment_offers(prospect_id);
CREATE INDEX idx_cro_token ON public.contractor_recruitment_offers(magic_token);

-- 16. contractor_recruitment_checkout_sessions
CREATE TABLE public.contractor_recruitment_checkout_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id uuid NOT NULL REFERENCES public.contractor_prospects(id) ON DELETE CASCADE,
  offer_id uuid REFERENCES public.contractor_recruitment_offers(id),
  checkout_provider text DEFAULT 'stripe',
  checkout_session_id text,
  checkout_url text,
  session_status text NOT NULL DEFAULT 'created',
  started_at timestamptz DEFAULT now(),
  abandoned_at timestamptz,
  recovered_at timestamptz,
  completed_at timestamptz
);
CREATE INDEX idx_crcs_prospect ON public.contractor_recruitment_checkout_sessions(prospect_id);

-- 17. contractor_recruitment_payments
CREATE TABLE public.contractor_recruitment_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id uuid NOT NULL REFERENCES public.contractor_prospects(id) ON DELETE CASCADE,
  offer_id uuid REFERENCES public.contractor_recruitment_offers(id),
  external_payment_id text,
  amount_subtotal integer DEFAULT 0,
  amount_tax integer DEFAULT 0,
  amount_total integer DEFAULT 0,
  currency text DEFAULT 'cad',
  payment_status text NOT NULL DEFAULT 'pending',
  payment_method_type text,
  paid_at timestamptz,
  failed_at timestamptz,
  refunded_at timestamptz,
  raw_payload_json jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_crp_prospect ON public.contractor_recruitment_payments(prospect_id);
CREATE INDEX idx_crp_status ON public.contractor_recruitment_payments(payment_status);

-- 18. contractor_recruitment_conversions
CREATE TABLE public.contractor_recruitment_conversions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id uuid NOT NULL REFERENCES public.contractor_prospects(id) ON DELETE CASCADE,
  cluster_id uuid REFERENCES public.recruitment_clusters(id),
  category_slug text,
  conversion_type text NOT NULL DEFAULT 'paid',
  conversion_source text,
  campaign_id uuid REFERENCES public.contractor_recruitment_campaigns(id),
  offer_id uuid REFERENCES public.contractor_recruitment_offers(id),
  payment_id uuid REFERENCES public.contractor_recruitment_payments(id),
  activated_contractor_id uuid,
  converted_at timestamptz DEFAULT now()
);

-- 19. contractor_recruitment_stop_rules
CREATE TABLE public.contractor_recruitment_stop_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cluster_id uuid NOT NULL REFERENCES public.recruitment_clusters(id) ON DELETE CASCADE,
  category_slug text,
  season_code text DEFAULT 'all',
  stop_rule_type text NOT NULL DEFAULT 'fill_ratio',
  threshold_value numeric(5,4) NOT NULL DEFAULT 1.0,
  is_enabled boolean NOT NULL DEFAULT true,
  triggered_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_crsr_cluster ON public.contractor_recruitment_stop_rules(cluster_id);

-- 20. contractor_recruitment_exceptions
CREATE TABLE public.contractor_recruitment_exceptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id uuid REFERENCES public.contractor_prospects(id),
  campaign_id uuid REFERENCES public.contractor_recruitment_campaigns(id),
  exception_type text NOT NULL,
  severity text NOT NULL DEFAULT 'medium',
  status text NOT NULL DEFAULT 'open',
  message text,
  recovery_action text,
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);
CREATE INDEX idx_crex_status ON public.contractor_recruitment_exceptions(status);

-- 21. contractor_recruitment_audit_logs
CREATE TABLE public.contractor_recruitment_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL,
  entity_id uuid,
  event_type text NOT NULL,
  actor_type text DEFAULT 'system',
  actor_id text,
  event_payload_json jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_cral_entity ON public.contractor_recruitment_audit_logs(entity_type, entity_id);
CREATE INDEX idx_cral_event ON public.contractor_recruitment_audit_logs(event_type);

-- =============================================
-- RLS POLICIES
-- =============================================

ALTER TABLE public.recruitment_clusters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recruitment_cluster_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recruitment_capacity_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contractor_prospects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contractor_prospect_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contractor_prospect_enrichment ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contractor_prospect_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contractor_recruitment_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contractor_recruitment_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contractor_recruitment_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contractor_recruitment_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contractor_recruitment_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contractor_recruitment_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contractor_recruitment_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contractor_recruitment_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contractor_recruitment_checkout_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contractor_recruitment_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contractor_recruitment_conversions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contractor_recruitment_stop_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contractor_recruitment_exceptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contractor_recruitment_audit_logs ENABLE ROW LEVEL SECURITY;

-- Admin-only policies for all 21 tables
DO $$
DECLARE
  tbl text;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY[
    'recruitment_clusters','recruitment_cluster_categories','recruitment_capacity_targets',
    'contractor_prospects','contractor_prospect_contacts','contractor_prospect_enrichment',
    'contractor_prospect_scores','contractor_recruitment_campaigns','contractor_recruitment_sequences',
    'contractor_recruitment_steps','contractor_recruitment_messages','contractor_recruitment_events',
    'contractor_recruitment_replies','contractor_recruitment_tasks',
    'contractor_recruitment_payments','contractor_recruitment_conversions',
    'contractor_recruitment_stop_rules','contractor_recruitment_exceptions',
    'contractor_recruitment_audit_logs'
  ])
  LOOP
    EXECUTE format('CREATE POLICY "Admin full access on %I" ON public.%I FOR ALL TO authenticated USING (public.has_role(auth.uid(), ''admin'')) WITH CHECK (public.has_role(auth.uid(), ''admin''))', tbl, tbl);
  END LOOP;
END$$;

-- Offers: admin + public read by magic token
CREATE POLICY "Admin full access on contractor_recruitment_offers" ON public.contractor_recruitment_offers
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Public read offers by magic token" ON public.contractor_recruitment_offers
  FOR SELECT TO anon USING (magic_token IS NOT NULL);

-- Checkout sessions: admin + public read by prospect via offer
CREATE POLICY "Admin full access on contractor_recruitment_checkout_sessions" ON public.contractor_recruitment_checkout_sessions
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Public read checkout by offer" ON public.contractor_recruitment_checkout_sessions
  FOR SELECT TO anon USING (true);

-- =============================================
-- RPC FUNCTIONS
-- =============================================

CREATE OR REPLACE FUNCTION public.rpc_get_cluster_fill_ratio(p_cluster_id uuid, p_category_slug text DEFAULT NULL)
RETURNS TABLE(cluster_id uuid, category_slug text, season_code text, target_slots_total int, target_slots_paid int, target_slots_reserved int, fill_ratio numeric)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    rct.cluster_id,
    rct.category_slug,
    rct.season_code,
    rct.target_slots_total,
    rct.target_slots_paid,
    rct.target_slots_reserved,
    rct.fill_ratio_cached as fill_ratio
  FROM recruitment_capacity_targets rct
  WHERE rct.cluster_id = p_cluster_id
    AND (p_category_slug IS NULL OR rct.category_slug = p_category_slug);
$$;

CREATE OR REPLACE FUNCTION public.rpc_get_recruitment_funnel_stats()
RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'total_prospects', (SELECT count(*) FROM contractor_prospects),
    'qualified', (SELECT count(*) FROM contractor_prospects WHERE qualification_status = 'valid'),
    'contacted', (SELECT count(*) FROM contractor_prospects WHERE outreach_status IN ('contacted','replied')),
    'replied', (SELECT count(*) FROM contractor_prospects WHERE outreach_status = 'replied'),
    'onboarding', (SELECT count(*) FROM contractor_prospects WHERE onboarding_status = 'in_progress'),
    'paid', (SELECT count(*) FROM contractor_prospects WHERE payment_status = 'paid'),
    'activated', (SELECT count(*) FROM contractor_prospects WHERE activation_status = 'active'),
    'campaigns_active', (SELECT count(*) FROM contractor_recruitment_campaigns WHERE status = 'active'),
    'clusters_full', (SELECT count(*) FROM recruitment_capacity_targets WHERE recruitment_status = 'full')
  );
$$;

-- Enable realtime on capacity targets
ALTER PUBLICATION supabase_realtime ADD TABLE public.recruitment_capacity_targets;
