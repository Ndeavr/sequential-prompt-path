
-- verification_runs
CREATE TABLE public.verification_runs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  run_type TEXT NOT NULL DEFAULT 'full',
  environment TEXT NOT NULL DEFAULT 'production',
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  overall_status TEXT NOT NULL DEFAULT 'running',
  triggered_by TEXT,
  summary JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.verification_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_select_verification_runs" ON public.verification_runs FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_verification_runs" ON public.verification_runs FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_verification_runs" ON public.verification_runs FOR UPDATE TO authenticated USING (true);

-- verification_steps
CREATE TABLE public.verification_steps (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  verification_run_id UUID NOT NULL REFERENCES public.verification_runs(id) ON DELETE CASCADE,
  step_key TEXT NOT NULL,
  step_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'not_tested',
  evidence_payload JSONB,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  duration_ms INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.verification_steps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_select_verification_steps" ON public.verification_steps FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_verification_steps" ON public.verification_steps FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_verification_steps" ON public.verification_steps FOR UPDATE TO authenticated USING (true);
CREATE INDEX idx_verification_steps_run ON public.verification_steps(verification_run_id);

-- verification_failures
CREATE TABLE public.verification_failures (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  verification_run_id UUID NOT NULL REFERENCES public.verification_runs(id) ON DELETE CASCADE,
  step_id UUID REFERENCES public.verification_steps(id) ON DELETE SET NULL,
  component_name TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'high',
  failure_type TEXT NOT NULL,
  failure_message TEXT NOT NULL,
  technical_details JSONB,
  recommended_fix TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ
);
ALTER TABLE public.verification_failures ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_select_verification_failures" ON public.verification_failures FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_verification_failures" ON public.verification_failures FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_verification_failures" ON public.verification_failures FOR UPDATE TO authenticated USING (true);
CREATE INDEX idx_verification_failures_run ON public.verification_failures(verification_run_id);

-- runtime_function_health
CREATE TABLE public.runtime_function_health (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  function_name TEXT NOT NULL,
  http_status INTEGER,
  latency_ms INTEGER,
  health_status TEXT NOT NULL DEFAULT 'unknown',
  response_excerpt TEXT,
  checked_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.runtime_function_health ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_select_runtime_function_health" ON public.runtime_function_health FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_runtime_function_health" ON public.runtime_function_health FOR INSERT TO authenticated WITH CHECK (true);
CREATE INDEX idx_function_health_name ON public.runtime_function_health(function_name, checked_at DESC);

-- runtime_payment_checks
CREATE TABLE public.runtime_payment_checks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  provider TEXT NOT NULL DEFAULT 'stripe',
  mode TEXT NOT NULL DEFAULT 'test',
  checkout_created BOOLEAN DEFAULT false,
  checkout_session_id TEXT,
  webhook_received BOOLEAN DEFAULT false,
  activation_triggered BOOLEAN DEFAULT false,
  status TEXT NOT NULL DEFAULT 'not_tested',
  checked_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.runtime_payment_checks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_select_runtime_payment_checks" ON public.runtime_payment_checks FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_runtime_payment_checks" ON public.runtime_payment_checks FOR INSERT TO authenticated WITH CHECK (true);

-- runtime_outbound_checks
CREATE TABLE public.runtime_outbound_checks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  provider TEXT,
  channel TEXT NOT NULL DEFAULT 'email',
  sequence_id TEXT,
  message_id TEXT,
  delivery_status TEXT NOT NULL DEFAULT 'not_tested',
  provider_response JSONB,
  checked_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.runtime_outbound_checks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_select_runtime_outbound_checks" ON public.runtime_outbound_checks FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_runtime_outbound_checks" ON public.runtime_outbound_checks FOR INSERT TO authenticated WITH CHECK (true);
