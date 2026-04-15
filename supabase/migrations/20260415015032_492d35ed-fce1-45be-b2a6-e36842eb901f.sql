
-- =============================================
-- QA Simulation Module Tables
-- =============================================

-- 1. simulation_scenarios
CREATE TABLE public.simulation_scenarios (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  step_order_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  default_environment TEXT NOT NULL DEFAULT 'test',
  severity_level TEXT NOT NULL DEFAULT 'medium',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.simulation_scenarios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin full access simulation_scenarios" ON public.simulation_scenarios FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- 2. simulation_runs
CREATE TABLE public.simulation_runs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  scenario_id UUID REFERENCES public.simulation_scenarios(id),
  environment TEXT NOT NULL DEFAULT 'test',
  run_name TEXT,
  status TEXT NOT NULL DEFAULT 'queued',
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  started_by UUID,
  health_score NUMERIC DEFAULT 0,
  critical_failures_count INTEGER DEFAULT 0,
  warnings_count INTEGER DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.simulation_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin full access simulation_runs" ON public.simulation_runs FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- 3. simulation_steps
CREATE TABLE public.simulation_steps (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  run_id UUID NOT NULL REFERENCES public.simulation_runs(id) ON DELETE CASCADE,
  step_code TEXT NOT NULL,
  step_label TEXT NOT NULL,
  step_order INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  duration_ms INTEGER,
  expected_result TEXT,
  actual_result TEXT,
  is_critical BOOLEAN NOT NULL DEFAULT true,
  retry_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.simulation_steps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin full access simulation_steps" ON public.simulation_steps FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE INDEX idx_simulation_steps_run_id ON public.simulation_steps(run_id);

-- 4. simulation_events
CREATE TABLE public.simulation_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  run_id UUID NOT NULL REFERENCES public.simulation_runs(id) ON DELETE CASCADE,
  step_id UUID REFERENCES public.simulation_steps(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  event_label TEXT,
  event_payload_json JSONB,
  status TEXT NOT NULL DEFAULT 'info',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.simulation_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin full access simulation_events" ON public.simulation_events FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE INDEX idx_simulation_events_run_id ON public.simulation_events(run_id);

-- 5. simulation_errors
CREATE TABLE public.simulation_errors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  run_id UUID NOT NULL REFERENCES public.simulation_runs(id) ON DELETE CASCADE,
  step_id UUID REFERENCES public.simulation_steps(id) ON DELETE CASCADE,
  error_code TEXT,
  error_title TEXT NOT NULL,
  error_message TEXT,
  error_context_json JSONB,
  severity TEXT NOT NULL DEFAULT 'medium',
  resolved BOOLEAN NOT NULL DEFAULT false,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.simulation_errors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin full access simulation_errors" ON public.simulation_errors FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE INDEX idx_simulation_errors_run_id ON public.simulation_errors(run_id);

-- 6. simulation_email_events
CREATE TABLE public.simulation_email_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  run_id UUID NOT NULL REFERENCES public.simulation_runs(id) ON DELETE CASCADE,
  sequence_name TEXT,
  template_code TEXT,
  recipient_email TEXT,
  delivery_status TEXT NOT NULL DEFAULT 'queued',
  open_status TEXT NOT NULL DEFAULT 'unknown',
  click_status TEXT NOT NULL DEFAULT 'unknown',
  cta_url TEXT,
  provider_message_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.simulation_email_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin full access simulation_email_events" ON public.simulation_email_events FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- 7. simulation_payment_events
CREATE TABLE public.simulation_payment_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  run_id UUID NOT NULL REFERENCES public.simulation_runs(id) ON DELETE CASCADE,
  contractor_id UUID,
  stripe_customer_id TEXT,
  stripe_session_id TEXT,
  stripe_subscription_id TEXT,
  plan_code TEXT,
  amount_cents INTEGER DEFAULT 0,
  currency TEXT DEFAULT 'cad',
  payment_status TEXT NOT NULL DEFAULT 'pending',
  webhook_status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.simulation_payment_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin full access simulation_payment_events" ON public.simulation_payment_events FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- 8. simulation_profile_events
CREATE TABLE public.simulation_profile_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  run_id UUID NOT NULL REFERENCES public.simulation_runs(id) ON DELETE CASCADE,
  user_id UUID,
  contractor_id UUID,
  profile_status_before TEXT,
  profile_status_after TEXT,
  completion_before NUMERIC DEFAULT 0,
  completion_after NUMERIC DEFAULT 0,
  activated BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.simulation_profile_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin full access simulation_profile_events" ON public.simulation_profile_events FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Enable realtime on simulation_steps
ALTER PUBLICATION supabase_realtime ADD TABLE public.simulation_steps;

-- Seed default scenarios
INSERT INTO public.simulation_scenarios (name, code, description, severity_level, step_order_json) VALUES
('Full Funnel Contractor', 'full_funnel_contractor', 'Simule le cycle complet : extract → email → CTA → signup → payment → profil → activation', 'critical', '["extract","email","cta_click","signup","payment","profile"]'::jsonb),
('Extract Only', 'extract_only', 'Valide uniquement le pipeline d''extraction de données', 'medium', '["extract"]'::jsonb),
('Extract to Email', 'extract_to_email', 'Valide extract + envoi de séquence email', 'medium', '["extract","email"]'::jsonb),
('Extract to Signup', 'extract_to_signup', 'Valide extract → email → CTA → inscription', 'high', '["extract","email","cta_click","signup"]'::jsonb),
('Payment Recovery', 'payment_recovery', 'Valide la récupération de paiements échoués et webhooks', 'high', '["payment"]'::jsonb),
('Webhook Integrity Audit', 'webhook_integrity_audit', 'Vérifie l''intégrité des webhooks Stripe', 'critical', '["payment"]'::jsonb);
