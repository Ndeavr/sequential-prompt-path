
-- prospect_import_runs
CREATE TABLE IF NOT EXISTS public.prospect_import_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  started_by text,
  input_type text NOT NULL DEFAULT 'domain',
  input_value text NOT NULL,
  normalized_domain text,
  status text NOT NULL DEFAULT 'queued',
  source_label text,
  notes text,
  linked_prospect_id uuid
);
ALTER TABLE public.prospect_import_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_full_prospect_import_runs" ON public.prospect_import_runs FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- prospect_records
CREATE TABLE IF NOT EXISTS public.prospect_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  company_name text,
  domain text,
  email text,
  phone text,
  city_primary text,
  province text DEFAULT 'QC',
  category_primary text,
  categories_secondary jsonb DEFAULT '[]'::jsonb,
  lead_source text,
  status text NOT NULL DEFAULT 'new',
  website_status text,
  contact_confidence_score numeric DEFAULT 0,
  assigned_to text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.prospect_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_full_prospect_records" ON public.prospect_records FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- link import runs to prospect records
ALTER TABLE public.prospect_import_runs
  ADD CONSTRAINT fk_import_run_prospect FOREIGN KEY (linked_prospect_id) REFERENCES public.prospect_records(id) ON DELETE SET NULL;

-- prospect_enrichment_signals
CREATE TABLE IF NOT EXISTS public.prospect_enrichment_signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id uuid NOT NULL REFERENCES public.prospect_records(id) ON DELETE CASCADE,
  signal_type text NOT NULL,
  label text NOT NULL,
  value text,
  confidence_score numeric DEFAULT 0,
  source_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.prospect_enrichment_signals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_full_enrichment_signals" ON public.prospect_enrichment_signals FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE INDEX idx_enrichment_prospect ON public.prospect_enrichment_signals(prospect_id);

-- prospect_aipp_snapshots
CREATE TABLE IF NOT EXISTS public.prospect_aipp_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id uuid NOT NULL REFERENCES public.prospect_records(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  score_global numeric DEFAULT 0,
  score_visibility numeric DEFAULT 0,
  score_conversion numeric DEFAULT 0,
  score_structure numeric DEFAULT 0,
  score_authority numeric DEFAULT 0,
  score_trust numeric DEFAULT 0,
  score_brand numeric DEFAULT 0,
  score_content numeric DEFAULT 0,
  weaknesses_json jsonb DEFAULT '[]'::jsonb,
  opportunities_json jsonb DEFAULT '[]'::jsonb,
  money_left_on_table_estimate numeric DEFAULT 0
);
ALTER TABLE public.prospect_aipp_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_full_aipp_snapshots" ON public.prospect_aipp_snapshots FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE INDEX idx_aipp_prospect ON public.prospect_aipp_snapshots(prospect_id);

-- contractor_plan_sessions_v2 (avoids conflict with existing contractor_plan_sessions)
CREATE TABLE IF NOT EXISTS public.prospect_plan_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  prospect_id uuid NOT NULL REFERENCES public.prospect_records(id) ON DELETE CASCADE,
  recommended_plan text,
  recommended_plan_reason text,
  estimated_monthly_revenue numeric DEFAULT 0,
  estimated_monthly_appointments integer DEFAULT 0,
  capacity_score numeric DEFAULT 0,
  competition_score numeric DEFAULT 0,
  territory_score numeric DEFAULT 0,
  founders_offer_shown boolean DEFAULT false,
  signature_offer_shown boolean DEFAULT false,
  status text NOT NULL DEFAULT 'draft'
);
ALTER TABLE public.prospect_plan_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_full_plan_sessions" ON public.prospect_plan_sessions FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE INDEX idx_plan_session_prospect ON public.prospect_plan_sessions(prospect_id);

-- outbound_email_sequences (prospect-level)
CREATE TABLE IF NOT EXISTS public.prospect_email_sequences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  prospect_id uuid NOT NULL REFERENCES public.prospect_records(id) ON DELETE CASCADE,
  sequence_type text NOT NULL DEFAULT 'cold_outreach',
  language text NOT NULL DEFAULT 'fr',
  status text NOT NULL DEFAULT 'draft',
  current_step integer DEFAULT 1,
  send_mode text NOT NULL DEFAULT 'manual_review_then_send'
);
ALTER TABLE public.prospect_email_sequences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_full_email_sequences" ON public.prospect_email_sequences FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- outbound_email_messages
CREATE TABLE IF NOT EXISTS public.prospect_email_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  sequence_id uuid REFERENCES public.prospect_email_sequences(id) ON DELETE CASCADE,
  prospect_id uuid NOT NULL REFERENCES public.prospect_records(id) ON DELETE CASCADE,
  message_type text NOT NULL DEFAULT 'initial',
  subject text,
  preheader text,
  body_html text,
  body_text text,
  personalization_tokens_json jsonb DEFAULT '{}'::jsonb,
  approval_status text NOT NULL DEFAULT 'pending',
  send_status text NOT NULL DEFAULT 'draft',
  scheduled_for timestamptz,
  sent_at timestamptz
);
ALTER TABLE public.prospect_email_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_full_email_messages" ON public.prospect_email_messages FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE INDEX idx_email_msg_prospect ON public.prospect_email_messages(prospect_id);

-- outbound_email_send_attempts
CREATE TABLE IF NOT EXISTS public.prospect_email_send_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES public.prospect_email_messages(id) ON DELETE CASCADE,
  attempt_number integer NOT NULL DEFAULT 1,
  provider_name text,
  from_email text,
  to_email text,
  send_status text NOT NULL DEFAULT 'pending',
  provider_message_id text,
  error_code text,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.prospect_email_send_attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_full_send_attempts" ON public.prospect_email_send_attempts FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE INDEX idx_send_attempt_msg ON public.prospect_email_send_attempts(message_id);

-- prospect_execution_runs
CREATE TABLE IF NOT EXISTS public.prospect_execution_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  prospect_id uuid REFERENCES public.prospect_records(id) ON DELETE CASCADE,
  run_type text NOT NULL DEFAULT 'full_pipeline',
  triggered_by text,
  status text NOT NULL DEFAULT 'queued',
  completion_percent integer DEFAULT 0,
  current_step text,
  summary_json jsonb DEFAULT '{}'::jsonb
);
ALTER TABLE public.prospect_execution_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_full_exec_runs" ON public.prospect_execution_runs FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE INDEX idx_exec_run_prospect ON public.prospect_execution_runs(prospect_id);

-- prospect_execution_steps
CREATE TABLE IF NOT EXISTS public.prospect_execution_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL REFERENCES public.prospect_execution_runs(id) ON DELETE CASCADE,
  step_key text NOT NULL,
  step_label text NOT NULL,
  step_order integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'queued',
  payload_json jsonb DEFAULT '{}'::jsonb,
  result_json jsonb DEFAULT '{}'::jsonb,
  error_code text,
  error_message text,
  started_at timestamptz,
  completed_at timestamptz,
  retry_count integer DEFAULT 0
);
ALTER TABLE public.prospect_execution_steps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_full_exec_steps" ON public.prospect_execution_steps FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE INDEX idx_exec_step_run ON public.prospect_execution_steps(run_id);

-- deliverability_domain_profiles
CREATE TABLE IF NOT EXISTS public.deliverability_domain_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  sending_domain text NOT NULL UNIQUE,
  provider_name text,
  spf_status text DEFAULT 'unknown',
  dkim_status text DEFAULT 'unknown',
  dmarc_status text DEFAULT 'unknown',
  warmup_status text DEFAULT 'cold',
  risk_score numeric DEFAULT 50,
  last_checked_at timestamptz
);
ALTER TABLE public.deliverability_domain_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_full_deliverability" ON public.deliverability_domain_profiles FOR ALL TO authenticated USING (true) WITH CHECK (true);
