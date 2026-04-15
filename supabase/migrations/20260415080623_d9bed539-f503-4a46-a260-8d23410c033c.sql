
-- email_domain_health
CREATE TABLE IF NOT EXISTS public.email_domain_health (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  domain text NOT NULL,
  dkim_status text NOT NULL DEFAULT 'unknown',
  spf_status text NOT NULL DEFAULT 'unknown',
  dmarc_status text NOT NULL DEFAULT 'unknown',
  dmarc_policy text,
  overall_score integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  last_checked timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.email_domain_health ENABLE ROW LEVEL SECURITY;
CREATE UNIQUE INDEX idx_email_domain_health_domain ON public.email_domain_health(domain);
CREATE POLICY "Admins manage email_domain_health" ON public.email_domain_health FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- email_warmup_schedule
CREATE TABLE IF NOT EXISTS public.email_warmup_schedule (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  domain text NOT NULL,
  day_number integer NOT NULL DEFAULT 1,
  max_emails integer NOT NULL DEFAULT 10,
  sent_count integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'active',
  scheduled_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.email_warmup_schedule ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_email_warmup_domain ON public.email_warmup_schedule(domain, scheduled_date);
CREATE POLICY "Admins manage email_warmup_schedule" ON public.email_warmup_schedule FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- email_delivery_logs
CREATE TABLE IF NOT EXISTS public.email_delivery_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id text,
  recipient_email text,
  template_name text,
  status text NOT NULL DEFAULT 'queued',
  provider text,
  provider_response text,
  domain_used text,
  spam_score text DEFAULT 'low',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.email_delivery_logs ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_email_delivery_logs_status ON public.email_delivery_logs(status, created_at DESC);
CREATE INDEX idx_email_delivery_logs_domain ON public.email_delivery_logs(domain_used);
CREATE POLICY "Admins manage email_delivery_logs" ON public.email_delivery_logs FOR ALL USING (public.has_role(auth.uid(), 'admin'));
