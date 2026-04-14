
-- =============================================
-- EMAIL SYSTEM CHECKS
-- =============================================
CREATE TABLE IF NOT EXISTS public.email_system_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  check_type text NOT NULL,
  check_key text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('passed','failed','warning','pending','needs_action')),
  severity text NOT NULL DEFAULT 'info' CHECK (severity IN ('critical','high','medium','low','info')),
  message text,
  recommended_action text,
  is_blocking boolean NOT NULL DEFAULT false,
  checked_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(check_key)
);
ALTER TABLE public.email_system_checks ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_email_system_checks_status ON public.email_system_checks(status);

CREATE POLICY "Admins manage email checks" ON public.email_system_checks FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- =============================================
-- EMAIL CONFIGURATION ALERTS
-- =============================================
CREATE TABLE IF NOT EXISTS public.email_configuration_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type text NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  severity text NOT NULL DEFAULT 'medium' CHECK (severity IN ('critical','high','medium','low')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','resolved','dismissed')),
  recommended_action text,
  related_check_key text REFERENCES public.email_system_checks(check_key) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);
ALTER TABLE public.email_configuration_alerts ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_email_config_alerts_status ON public.email_configuration_alerts(status);

CREATE POLICY "Admins manage email alerts" ON public.email_configuration_alerts FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- =============================================
-- EMAIL PROVIDER STATUS
-- =============================================
CREATE TABLE IF NOT EXISTS public.email_provider_status (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_name text NOT NULL,
  provider_mode text NOT NULL DEFAULT 'api' CHECK (provider_mode IN ('api','smtp','hybrid')),
  api_connected boolean NOT NULL DEFAULT false,
  smtp_connected boolean NOT NULL DEFAULT false,
  webhook_connected boolean NOT NULL DEFAULT false,
  sender_verified boolean NOT NULL DEFAULT false,
  daily_limit integer NOT NULL DEFAULT 0,
  current_usage integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('active','warning','critical','pending','inactive')),
  checked_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(provider_name)
);
ALTER TABLE public.email_provider_status ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage provider status" ON public.email_provider_status FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- =============================================
-- EMAIL DELIVERY EVENTS
-- =============================================
CREATE TABLE IF NOT EXISTS public.email_delivery_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id text,
  campaign_id text,
  inbox_id text,
  recipient_email text,
  event_type text NOT NULL CHECK (event_type IN ('queued','sent','delivered','opened','clicked','bounced','complained','failed')),
  provider_name text,
  event_at timestamptz NOT NULL DEFAULT now(),
  metadata_json jsonb DEFAULT '{}'
);
ALTER TABLE public.email_delivery_events ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_email_delivery_events_type ON public.email_delivery_events(event_type);
CREATE INDEX idx_email_delivery_events_at ON public.email_delivery_events(event_at);
CREATE INDEX idx_email_delivery_events_msg ON public.email_delivery_events(message_id);

CREATE POLICY "Admins view delivery events" ON public.email_delivery_events FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "System inserts delivery events" ON public.email_delivery_events FOR INSERT WITH CHECK (true);

-- =============================================
-- EMAIL TEST RUNS
-- =============================================
CREATE TABLE IF NOT EXISTS public.email_test_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  initiated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  mailbox_id text,
  test_target_email text NOT NULL,
  send_status text NOT NULL DEFAULT 'pending' CHECK (send_status IN ('pending','sent','failed')),
  delivery_status text DEFAULT 'unknown' CHECK (delivery_status IN ('unknown','delivered','bounced','failed')),
  open_status text DEFAULT 'unknown' CHECK (open_status IN ('unknown','opened','not_opened')),
  click_status text DEFAULT 'unknown' CHECK (click_status IN ('unknown','clicked','not_clicked')),
  bounce_status text DEFAULT 'none' CHECK (bounce_status IN ('none','soft','hard')),
  latency_ms integer,
  summary_status text NOT NULL DEFAULT 'pending' CHECK (summary_status IN ('pending','success','partial','failed')),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.email_test_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage test runs" ON public.email_test_runs FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- =============================================
-- EMAIL DOMAIN HEALTH SNAPSHOTS
-- =============================================
CREATE TABLE IF NOT EXISTS public.email_domain_health_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  domain text NOT NULL,
  spf_status text NOT NULL DEFAULT 'unknown',
  dkim_status text NOT NULL DEFAULT 'unknown',
  dmarc_status text NOT NULL DEFAULT 'unknown',
  mx_status text NOT NULL DEFAULT 'unknown',
  return_path_status text NOT NULL DEFAULT 'unknown',
  overall_status text NOT NULL DEFAULT 'unknown' CHECK (overall_status IN ('active','warning','critical','unknown')),
  score integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.email_domain_health_snapshots ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_email_domain_snapshots_domain ON public.email_domain_health_snapshots(domain);

CREATE POLICY "Admins view domain snapshots" ON public.email_domain_health_snapshots FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- =============================================
-- RPC: compute_email_system_status
-- =============================================
CREATE OR REPLACE FUNCTION public.compute_email_system_status()
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  total_checks integer;
  passed_checks integer;
  failed_checks integer;
  warning_checks integer;
  blocking_count integer;
  score integer;
  status text;
BEGIN
  SELECT count(*) INTO total_checks FROM public.email_system_checks;
  SELECT count(*) INTO passed_checks FROM public.email_system_checks WHERE status = 'passed';
  SELECT count(*) INTO failed_checks FROM public.email_system_checks WHERE status = 'failed';
  SELECT count(*) INTO warning_checks FROM public.email_system_checks WHERE status = 'warning';
  SELECT count(*) INTO blocking_count FROM public.email_system_checks WHERE is_blocking = true AND status != 'passed';

  IF total_checks = 0 THEN
    score := 0;
    status := 'pending';
  ELSE
    score := round((passed_checks::numeric / total_checks) * 100);
    IF blocking_count > 0 THEN status := 'critical';
    ELSIF failed_checks > 0 THEN status := 'warning';
    ELSIF warning_checks > 0 THEN status := 'warning';
    ELSE status := 'active';
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'status', status,
    'score', score,
    'total_checks', total_checks,
    'passed', passed_checks,
    'failed', failed_checks,
    'warnings', warning_checks,
    'blocking_issues', blocking_count,
    'active_alerts', (SELECT count(*) FROM public.email_configuration_alerts WHERE status = 'active'),
    'checked_at', now()
  );
END;
$$;
