
-- Email domain configurations for outbound sending
CREATE TABLE public.email_domain_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain TEXT NOT NULL,
  provider TEXT,
  from_email TEXT,
  reply_to TEXT,
  health_score INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(domain)
);
ALTER TABLE public.email_domain_configs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_full_access_email_domain_configs" ON public.email_domain_configs FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Authentication checks (SPF/DKIM/DMARC)
CREATE TABLE public.email_authentication_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain_config_id UUID REFERENCES public.email_domain_configs(id) ON DELETE CASCADE NOT NULL,
  spf_status TEXT DEFAULT 'unknown',
  spf_record TEXT,
  spf_issues JSONB DEFAULT '[]',
  dkim_status TEXT DEFAULT 'unknown',
  dkim_record TEXT,
  dkim_selector TEXT,
  dkim_issues JSONB DEFAULT '[]',
  dmarc_status TEXT DEFAULT 'unknown',
  dmarc_record TEXT,
  dmarc_policy TEXT,
  dmarc_issues JSONB DEFAULT '[]',
  alignment_status TEXT DEFAULT 'unknown',
  alignment_details JSONB DEFAULT '{}',
  raw_dns_payload JSONB DEFAULT '{}',
  checked_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.email_authentication_checks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_full_access_email_auth_checks" ON public.email_authentication_checks FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Health reports (scored)
CREATE TABLE public.email_health_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain_config_id UUID REFERENCES public.email_domain_configs(id) ON DELETE CASCADE NOT NULL,
  overall_score INTEGER DEFAULT 0,
  auth_score INTEGER DEFAULT 0,
  alignment_score INTEGER DEFAULT 0,
  reputation_score INTEGER DEFAULT 0,
  behavior_score INTEGER DEFAULT 0,
  content_score INTEGER DEFAULT 0,
  level TEXT DEFAULT 'unknown',
  issues JSONB DEFAULT '[]',
  recommendations JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.email_health_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_full_access_email_health_reports" ON public.email_health_reports FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Test runs
CREATE TABLE public.email_test_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain_config_id UUID REFERENCES public.email_domain_configs(id) ON DELETE CASCADE,
  test_type TEXT NOT NULL DEFAULT 'full_audit',
  target_inbox TEXT,
  inbox_result TEXT,
  spam_result TEXT,
  headers JSONB DEFAULT '{}',
  auth_results JSONB DEFAULT '{}',
  status TEXT DEFAULT 'pending',
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);
ALTER TABLE public.email_test_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_full_access_email_test_runs" ON public.email_test_runs FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Fix recommendations
CREATE TABLE public.email_fix_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain_config_id UUID REFERENCES public.email_domain_configs(id) ON DELETE CASCADE NOT NULL,
  issue_type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'warning',
  title TEXT NOT NULL,
  description TEXT,
  impact TEXT,
  fix_instructions TEXT,
  dns_record_to_add TEXT,
  is_resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.email_fix_recommendations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_full_access_email_fix_recs" ON public.email_fix_recommendations FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE INDEX idx_email_auth_checks_domain ON public.email_authentication_checks(domain_config_id);
CREATE INDEX idx_email_health_reports_domain ON public.email_health_reports(domain_config_id);
CREATE INDEX idx_email_fix_recs_domain ON public.email_fix_recommendations(domain_config_id);
CREATE INDEX idx_email_test_runs_domain ON public.email_test_runs(domain_config_id);
