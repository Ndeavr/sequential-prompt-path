
-- email_sequences
CREATE TABLE public.email_sequences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sequence_key TEXT NOT NULL UNIQUE,
  sequence_label TEXT NOT NULL,
  description TEXT,
  step_count INT NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft',
  target_persona TEXT DEFAULT 'contractor',
  language TEXT DEFAULT 'fr',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.email_sequences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_email_sequences" ON public.email_sequences FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- email_sequence_steps
CREATE TABLE public.email_sequence_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sequence_id UUID NOT NULL REFERENCES public.email_sequences(id) ON DELETE CASCADE,
  step_order INT NOT NULL DEFAULT 1,
  delay_hours INT NOT NULL DEFAULT 24,
  subject_template TEXT NOT NULL,
  body_template TEXT NOT NULL,
  max_links INT NOT NULL DEFAULT 1,
  tone TEXT DEFAULT 'human',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.email_sequence_steps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_email_sequence_steps" ON public.email_sequence_steps FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- sending_domains
CREATE TABLE public.sending_domains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain TEXT NOT NULL UNIQUE,
  purpose TEXT DEFAULT 'outbound',
  spf_valid BOOLEAN DEFAULT false,
  dkim_valid BOOLEAN DEFAULT false,
  dmarc_valid BOOLEAN DEFAULT false,
  warmup_stage TEXT DEFAULT 'cold',
  daily_cap INT NOT NULL DEFAULT 50,
  current_daily_sent INT NOT NULL DEFAULT 0,
  health_score INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.sending_domains ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_sending_domains" ON public.sending_domains FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- sending_mailboxes
CREATE TABLE public.sending_mailboxes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sending_domain_id UUID NOT NULL REFERENCES public.sending_domains(id) ON DELETE CASCADE,
  email_address TEXT NOT NULL UNIQUE,
  display_name TEXT,
  daily_cap INT NOT NULL DEFAULT 30,
  current_daily_sent INT NOT NULL DEFAULT 0,
  warmup_day INT NOT NULL DEFAULT 0,
  rotation_weight NUMERIC(3,2) DEFAULT 1.00,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.sending_mailboxes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_sending_mailboxes" ON public.sending_mailboxes FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- email_warmup_logs
CREATE TABLE public.email_warmup_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mailbox_id UUID NOT NULL REFERENCES public.sending_mailboxes(id) ON DELETE CASCADE,
  log_date DATE NOT NULL DEFAULT CURRENT_DATE,
  emails_sent INT NOT NULL DEFAULT 0,
  bounces INT NOT NULL DEFAULT 0,
  complaints INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.email_warmup_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_email_warmup_logs" ON public.email_warmup_logs FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- deliverability_scores
CREATE TABLE public.deliverability_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain_id UUID REFERENCES public.sending_domains(id) ON DELETE SET NULL,
  domain TEXT NOT NULL,
  score INT NOT NULL DEFAULT 0,
  risk_level TEXT NOT NULL DEFAULT 'unknown',
  spf_ok BOOLEAN DEFAULT false,
  dkim_ok BOOLEAN DEFAULT false,
  dmarc_ok BOOLEAN DEFAULT false,
  open_rate NUMERIC(5,2) DEFAULT 0,
  reply_rate NUMERIC(5,2) DEFAULT 0,
  bounce_rate NUMERIC(5,2) DEFAULT 0,
  complaint_rate NUMERIC(5,4) DEFAULT 0,
  details_json JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.deliverability_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_deliverability_scores" ON public.deliverability_scores FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- email_personalizations
CREATE TABLE public.email_personalizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id UUID,
  first_name TEXT,
  company_name TEXT,
  city TEXT,
  service TEXT,
  website_url TEXT,
  aipp_score INT,
  personalization_score NUMERIC(5,2) DEFAULT 0,
  original_body TEXT,
  rewritten_body TEXT,
  rewritten_subject TEXT,
  model_used TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.email_personalizations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_email_personalizations" ON public.email_personalizations FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- revenue_loss_estimations
CREATE TABLE public.revenue_loss_estimations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id UUID,
  company_name TEXT,
  city TEXT,
  aipp_score INT,
  lost_leads_per_month INT DEFAULT 0,
  avg_job_value INT DEFAULT 0,
  monthly_loss INT DEFAULT 0,
  yearly_loss INT DEFAULT 0,
  opportunity_label TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.revenue_loss_estimations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_revenue_loss_estimations" ON public.revenue_loss_estimations FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- unopened_email_flags
CREATE TABLE public.unopened_email_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id UUID NOT NULL,
  email_count_sent INT NOT NULL DEFAULT 0,
  email_count_unopened INT NOT NULL DEFAULT 0,
  last_email_sent_at TIMESTAMPTZ,
  flagged_for_sms BOOLEAN DEFAULT false,
  sms_sent BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.unopened_email_flags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_unopened_email_flags" ON public.unopened_email_flags FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- sms_fallback_sequences
CREATE TABLE public.sms_fallback_sequences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sequence_key TEXT NOT NULL UNIQUE,
  sequence_label TEXT NOT NULL,
  step_count INT NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.sms_fallback_sequences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_sms_fallback_sequences" ON public.sms_fallback_sequences FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- sms_messages
CREATE TABLE public.sms_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id UUID NOT NULL,
  sequence_id UUID REFERENCES public.sms_fallback_sequences(id) ON DELETE SET NULL,
  step_order INT DEFAULT 1,
  phone_number TEXT NOT NULL,
  message_body TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued',
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.sms_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_sms_messages" ON public.sms_messages FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Indexes
CREATE INDEX idx_email_sequence_steps_seq ON public.email_sequence_steps(sequence_id, step_order);
CREATE INDEX idx_sending_mailboxes_domain ON public.sending_mailboxes(sending_domain_id);
CREATE INDEX idx_warmup_logs_mailbox ON public.email_warmup_logs(mailbox_id, log_date);
CREATE INDEX idx_deliverability_domain ON public.deliverability_scores(domain);
CREATE INDEX idx_unopened_prospect ON public.unopened_email_flags(prospect_id);
CREATE INDEX idx_sms_messages_prospect ON public.sms_messages(prospect_id);
