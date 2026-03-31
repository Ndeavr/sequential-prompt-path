
-- Domain Health Check tables for SSL/DNS/Security monitoring

CREATE TABLE public.domain_health_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  domain text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  score integer DEFAULT 0,
  ssl_valid boolean,
  dns_valid boolean,
  access_ok boolean,
  security_ok boolean,
  details_json jsonb DEFAULT '{}'::jsonb,
  checked_by text DEFAULT 'system',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.domain_ssl_status (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  domain text NOT NULL,
  valid boolean DEFAULT false,
  issuer text,
  expiry_date timestamptz,
  error_code text,
  error_message text,
  checked_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.domain_dns_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  domain text NOT NULL,
  record_type text NOT NULL,
  expected_value text,
  actual_value text,
  status text NOT NULL DEFAULT 'unknown',
  checked_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.domain_security_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  domain text NOT NULL,
  flag_type text NOT NULL,
  fortiguard_block boolean DEFAULT false,
  category text,
  risk_level text DEFAULT 'low',
  details text,
  checked_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.domain_fix_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  domain text NOT NULL,
  action text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  result_json jsonb DEFAULT '{}'::jsonb,
  performed_by text DEFAULT 'system',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- RLS: admin-only access
ALTER TABLE public.domain_health_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.domain_ssl_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.domain_dns_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.domain_security_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.domain_fix_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access domain_health_checks" ON public.domain_health_checks FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admin full access domain_ssl_status" ON public.domain_ssl_status FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admin full access domain_dns_records" ON public.domain_dns_records FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admin full access domain_security_flags" ON public.domain_security_flags FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admin full access domain_fix_logs" ON public.domain_fix_logs FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Indexes
CREATE INDEX idx_domain_health_checks_domain ON public.domain_health_checks (domain);
CREATE INDEX idx_domain_ssl_status_domain ON public.domain_ssl_status (domain);
CREATE INDEX idx_domain_dns_records_domain ON public.domain_dns_records (domain);
CREATE INDEX idx_domain_security_flags_domain ON public.domain_security_flags (domain);
CREATE INDEX idx_domain_fix_logs_domain ON public.domain_fix_logs (domain);
