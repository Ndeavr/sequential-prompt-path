-- Founder Verification Command Center — Phase 1
CREATE TABLE public.founder_health_checks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  module TEXT NOT NULL,
  target TEXT,
  status TEXT NOT NULL CHECK (status IN ('green','yellow','red')),
  latency_ms INTEGER,
  quota_remaining TEXT,
  error_code TEXT,
  error_message TEXT,
  probable_cause TEXT,
  proposed_fix TEXT,
  auto_fixable BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  checked_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_founder_health_module_time ON public.founder_health_checks(module, checked_at DESC);

GRANT SELECT, INSERT ON public.founder_health_checks TO authenticated;
GRANT ALL ON public.founder_health_checks TO service_role;
ALTER TABLE public.founder_health_checks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins read health" ON public.founder_health_checks
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins insert health" ON public.founder_health_checks
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.auto_fix_policies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  system TEXT NOT NULL,
  action TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('safe','warning','critical')),
  auto_allowed BOOLEAN NOT NULL DEFAULT false,
  requires_confirmation BOOLEAN NOT NULL DEFAULT true,
  cooldown_seconds INTEGER NOT NULL DEFAULT 300,
  max_retries INTEGER NOT NULL DEFAULT 3,
  enabled BOOLEAN NOT NULL DEFAULT true,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.auto_fix_policies TO authenticated;
GRANT ALL ON public.auto_fix_policies TO service_role;
ALTER TABLE public.auto_fix_policies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins manage policies" ON public.auto_fix_policies
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.auto_fix_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  policy_id UUID REFERENCES public.auto_fix_policies(id) ON DELETE SET NULL,
  issue_type TEXT,
  classification TEXT,
  target TEXT,
  action_taken TEXT,
  automatic BOOLEAN NOT NULL DEFAULT false,
  success BOOLEAN NOT NULL DEFAULT false,
  before_state JSONB,
  after_state JSONB,
  execution_time_ms INTEGER,
  triggered_by UUID,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_auto_fix_logs_time ON public.auto_fix_logs(created_at DESC);
CREATE INDEX idx_auto_fix_logs_policy ON public.auto_fix_logs(policy_id, created_at DESC);
GRANT SELECT, INSERT ON public.auto_fix_logs TO authenticated;
GRANT ALL ON public.auto_fix_logs TO service_role;
ALTER TABLE public.auto_fix_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins read fix logs" ON public.auto_fix_logs
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins insert fix logs" ON public.auto_fix_logs
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Seed baseline policies
INSERT INTO public.auto_fix_policies (system, action, severity, auto_allowed, requires_confirmation, cooldown_seconds, max_retries, description) VALUES
  ('outreach', 'retry_failed_queue', 'safe', true, false, 60, 5, 'Replay les jobs outreach échoués sur erreur transient'),
  ('aipp', 'requeue_failed_scan', 'safe', true, false, 120, 3, 'Relance les scans AIPP timeouts'),
  ('scraping', 'restart_scraping_worker', 'warning', false, true, 600, 2, 'Redémarre worker cascade-scrape bloqué'),
  ('email', 'rotate_sending_domain', 'critical', false, true, 3600, 1, 'Bascule sur domaine secondaire si bounces élevés'),
  ('sms', 'pause_campaign', 'warning', false, true, 300, 1, 'Suspend une campagne SMS dégradée'),
  ('stripe', 'resync_subscription', 'safe', true, false, 60, 3, 'Resynchronise statut Stripe après webhook raté'),
  ('onboarding', 'resume_session', 'safe', true, false, 60, 5, 'Reprend session onboarding abandonnée'),
  ('api', 'refresh_token', 'safe', true, false, 60, 3, 'Rotation token expiré (Twilio/Stripe)');