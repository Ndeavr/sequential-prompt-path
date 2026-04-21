
-- =========================
-- OUTREACH TARGETS (personalized landing pages)
-- =========================
CREATE TABLE IF NOT EXISTS public.outreach_targets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NULL REFERENCES public.outreach_campaigns(id) ON DELETE SET NULL,
  contractor_id uuid NULL REFERENCES public.contractors(id) ON DELETE SET NULL,
  business_name text NOT NULL,
  website_url text NULL,
  phone text NULL,
  city text NULL,
  rbq_number text NULL,
  neq_number text NULL,
  category text NULL,
  slug text NOT NULL,
  secure_token text NOT NULL UNIQUE,
  landing_status text NOT NULL DEFAULT 'prepared',
  pre_audit_id uuid NULL REFERENCES public.contractor_aipp_audits(id) ON DELETE SET NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  first_viewed_at timestamptz NULL,
  claimed_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_outreach_targets_slug ON public.outreach_targets (slug);
CREATE INDEX IF NOT EXISTS idx_outreach_targets_token ON public.outreach_targets (secure_token);
CREATE INDEX IF NOT EXISTS idx_outreach_targets_campaign ON public.outreach_targets (campaign_id);
CREATE INDEX IF NOT EXISTS idx_outreach_targets_status ON public.outreach_targets (landing_status);

ALTER TABLE public.outreach_targets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read outreach targets by token"
  ON public.outreach_targets FOR SELECT
  USING (true);

CREATE POLICY "Service role can manage outreach targets"
  ON public.outreach_targets FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- =========================
-- OUTREACH PAGE EVENTS
-- =========================
CREATE TABLE IF NOT EXISTS public.outreach_page_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target_id uuid NOT NULL REFERENCES public.outreach_targets(id) ON DELETE CASCADE,
  event_name text NOT NULL,
  event_props jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_outreach_page_events_target ON public.outreach_page_events (target_id);
CREATE INDEX IF NOT EXISTS idx_outreach_page_events_name ON public.outreach_page_events (event_name);

ALTER TABLE public.outreach_page_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert outreach page events"
  ON public.outreach_page_events FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Service role can read outreach page events"
  ON public.outreach_page_events FOR SELECT
  TO service_role
  USING (true);

-- =========================
-- AUDIT INTAKE SESSIONS
-- =========================
CREATE TABLE IF NOT EXISTS public.audit_intake_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id uuid NULL REFERENCES public.contractors(id) ON DELETE SET NULL,
  session_token text NOT NULL UNIQUE,
  source_campaign text NULL,
  business_name text NULL,
  phone text NULL,
  website_url text NULL,
  city text NULL,
  rbq_number text NULL,
  email text NULL,
  audit_id uuid NULL REFERENCES public.contractor_aipp_audits(id) ON DELETE SET NULL,
  recommended_plan text NULL,
  selected_plan text NULL,
  funnel_status text NOT NULL DEFAULT 'landing',
  goal text NULL,
  monthly_appointment_goal int NULL,
  average_job_value int NULL,
  service_area_count int NULL,
  outreach_target_id uuid NULL REFERENCES public.outreach_targets(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_intake_sessions_token ON public.audit_intake_sessions (session_token);
CREATE INDEX IF NOT EXISTS idx_intake_sessions_status ON public.audit_intake_sessions (funnel_status);

ALTER TABLE public.audit_intake_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can create intake sessions"
  ON public.audit_intake_sessions FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can read own intake session by token"
  ON public.audit_intake_sessions FOR SELECT
  USING (true);

CREATE POLICY "Anyone can update intake sessions"
  ON public.audit_intake_sessions FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- =========================
-- AUDIT FUNNEL EVENTS
-- =========================
CREATE TABLE IF NOT EXISTS public.audit_funnel_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.audit_intake_sessions(id) ON DELETE CASCADE,
  event_name text NOT NULL,
  event_props jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_funnel_events_session ON public.audit_funnel_events (session_id);

ALTER TABLE public.audit_funnel_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert funnel events"
  ON public.audit_funnel_events FOR INSERT
  WITH CHECK (true);

-- =========================
-- SNIPER TARGETS
-- =========================
CREATE TABLE IF NOT EXISTS public.sniper_targets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id uuid NULL REFERENCES public.contractors(id) ON DELETE SET NULL,
  source_campaign_id uuid NULL REFERENCES public.outreach_campaigns(id) ON DELETE SET NULL,
  business_name text NOT NULL,
  legal_name text NULL,
  category text NULL,
  city text NULL,
  province text DEFAULT 'QC',
  website_url text NULL,
  domain text NULL,
  phone text NULL,
  email text NULL,
  rbq_number text NULL,
  neq_number text NULL,
  source_origin text NULL,
  source_reference jsonb NOT NULL DEFAULT '{}'::jsonb,
  enrichment_status text NOT NULL DEFAULT 'pending',
  identity_status text NOT NULL DEFAULT 'unresolved',
  outreach_status text NOT NULL DEFAULT 'not_started',
  sniper_priority_score numeric(5,2) NULL,
  revenue_potential_score numeric(5,2) NULL,
  readiness_score numeric(5,2) NULL,
  pain_upside_score numeric(5,2) NULL,
  strategic_fit_score numeric(5,2) NULL,
  contactability_score numeric(5,2) NULL,
  founder_eligible boolean NOT NULL DEFAULT false,
  recommended_channel text NULL,
  latest_outreach_target_id uuid NULL REFERENCES public.outreach_targets(id) ON DELETE SET NULL,
  latest_audit_id uuid NULL REFERENCES public.contractor_aipp_audits(id) ON DELETE SET NULL,
  heat_score numeric(5,2) NOT NULL DEFAULT 0,
  notes jsonb NOT NULL DEFAULT '{}'::jsonb,
  tags jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sniper_targets_status ON public.sniper_targets (outreach_status);
CREATE INDEX IF NOT EXISTS idx_sniper_targets_priority ON public.sniper_targets (sniper_priority_score DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_sniper_targets_heat ON public.sniper_targets (heat_score DESC);
CREATE INDEX IF NOT EXISTS idx_sniper_targets_city ON public.sniper_targets (city);

ALTER TABLE public.sniper_targets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role manages sniper targets"
  ON public.sniper_targets FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated admins can read sniper targets"
  ON public.sniper_targets FOR SELECT
  TO authenticated
  USING (true);

-- =========================
-- SNIPER MESSAGE VARIANTS
-- =========================
CREATE TABLE IF NOT EXISTS public.sniper_message_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sniper_target_id uuid NOT NULL REFERENCES public.sniper_targets(id) ON DELETE CASCADE,
  channel text NOT NULL,
  variant_type text NOT NULL,
  subject_line text NULL,
  message_body text NOT NULL,
  personalization_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  cta_url text NULL,
  is_selected boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sniper_msgs_target ON public.sniper_message_variants (sniper_target_id);

ALTER TABLE public.sniper_message_variants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role manages message variants"
  ON public.sniper_message_variants FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated can read message variants"
  ON public.sniper_message_variants FOR SELECT
  TO authenticated
  USING (true);

-- =========================
-- SNIPER SEND QUEUE
-- =========================
CREATE TABLE IF NOT EXISTS public.sniper_send_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sniper_target_id uuid NOT NULL REFERENCES public.sniper_targets(id) ON DELETE CASCADE,
  message_variant_id uuid NULL REFERENCES public.sniper_message_variants(id) ON DELETE SET NULL,
  channel text NOT NULL,
  destination text NOT NULL,
  send_status text NOT NULL DEFAULT 'queued',
  provider text NULL,
  provider_message_id text NULL,
  scheduled_at timestamptz NULL,
  sent_at timestamptz NULL,
  delivered_at timestamptz NULL,
  failed_at timestamptz NULL,
  error_message text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_send_queue_status ON public.sniper_send_queue (send_status);
CREATE INDEX IF NOT EXISTS idx_send_queue_target ON public.sniper_send_queue (sniper_target_id);

ALTER TABLE public.sniper_send_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role manages send queue"
  ON public.sniper_send_queue FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated can read send queue"
  ON public.sniper_send_queue FOR SELECT
  TO authenticated
  USING (true);

-- =========================
-- SNIPER ENGAGEMENT EVENTS
-- =========================
CREATE TABLE IF NOT EXISTS public.sniper_engagement_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sniper_target_id uuid NOT NULL REFERENCES public.sniper_targets(id) ON DELETE CASCADE,
  send_queue_id uuid NULL REFERENCES public.sniper_send_queue(id) ON DELETE SET NULL,
  outreach_target_id uuid NULL REFERENCES public.outreach_targets(id) ON DELETE SET NULL,
  event_name text NOT NULL,
  event_props jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_engagement_events_target ON public.sniper_engagement_events (sniper_target_id);
CREATE INDEX IF NOT EXISTS idx_engagement_events_name ON public.sniper_engagement_events (event_name);

ALTER TABLE public.sniper_engagement_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert engagement events"
  ON public.sniper_engagement_events FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Authenticated can read engagement events"
  ON public.sniper_engagement_events FOR SELECT
  TO authenticated
  USING (true);

-- =========================
-- UPDATED_AT TRIGGERS
-- =========================
CREATE TRIGGER trg_outreach_targets_updated_at
  BEFORE UPDATE ON public.outreach_targets
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_intake_sessions_updated_at
  BEFORE UPDATE ON public.audit_intake_sessions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_sniper_targets_updated_at
  BEFORE UPDATE ON public.sniper_targets
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_send_queue_updated_at
  BEFORE UPDATE ON public.sniper_send_queue
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
