
CREATE TABLE IF NOT EXISTS public.system_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_type text NOT NULL DEFAULT 'system',
  actor_id uuid NULL,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id text NULL,
  before_state jsonb NULL,
  after_state jsonb NULL,
  source text NULL,
  request_id text NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sal_action ON public.system_audit_logs(action, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sal_entity ON public.system_audit_logs(entity_type, entity_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sal_actor  ON public.system_audit_logs(actor_type, actor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sal_created ON public.system_audit_logs(created_at DESC);

GRANT SELECT, INSERT ON public.system_audit_logs TO authenticated;
GRANT ALL ON public.system_audit_logs TO service_role;

ALTER TABLE public.system_audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin can view all audit logs" ON public.system_audit_logs;
CREATE POLICY "Admin can view all audit logs" ON public.system_audit_logs
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Authenticated can insert audit logs" ON public.system_audit_logs;
CREATE POLICY "Authenticated can insert audit logs" ON public.system_audit_logs
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.log_system_audit(
  _action text, _entity_type text, _entity_id text DEFAULT NULL,
  _actor_type text DEFAULT 'system', _actor_id uuid DEFAULT NULL,
  _before jsonb DEFAULT NULL, _after jsonb DEFAULT NULL,
  _source text DEFAULT NULL, _metadata jsonb DEFAULT '{}'::jsonb
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _id uuid;
BEGIN
  INSERT INTO public.system_audit_logs(actor_type, actor_id, action, entity_type, entity_id, before_state, after_state, source, metadata)
  VALUES (_actor_type, _actor_id, _action, _entity_type, _entity_id, _before, _after, _source, COALESCE(_metadata, '{}'::jsonb))
  RETURNING id INTO _id;
  RETURN _id;
END; $$;

GRANT EXECUTE ON FUNCTION public.log_system_audit(text, text, text, text, uuid, jsonb, jsonb, text, jsonb) TO authenticated, service_role;

ALTER TABLE public.stripe_webhook_events
  ADD COLUMN IF NOT EXISTS processing_status text NOT NULL DEFAULT 'received',
  ADD COLUMN IF NOT EXISTS retry_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_retry_at timestamptz NULL;

CREATE INDEX IF NOT EXISTS idx_swe_processing_status ON public.stripe_webhook_events(processing_status, received_at DESC);

UPDATE public.stripe_webhook_events
SET processing_status = CASE
  WHEN processed_at IS NOT NULL AND success = true THEN 'processed'
  WHEN processed_at IS NOT NULL AND success = false THEN 'failed'
  ELSE 'received'
END
WHERE processing_status = 'received';

CREATE TABLE IF NOT EXISTS public.acquisition_pipeline_errors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL,
  error_code text NOT NULL,
  error_message text NOT NULL,
  entity_type text NULL,
  entity_id text NULL,
  step_key text NULL,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  occurrences integer NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'open',
  repair_attempts integer NOT NULL DEFAULT 0,
  last_repair_at timestamptz NULL,
  last_repair_result text NULL,
  recommended_action text NULL,
  repair_function text NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ape_category ON public.acquisition_pipeline_errors(category, status, last_seen_at DESC);
CREATE INDEX IF NOT EXISTS idx_ape_status   ON public.acquisition_pipeline_errors(status, last_seen_at DESC);
CREATE INDEX IF NOT EXISTS idx_ape_entity   ON public.acquisition_pipeline_errors(entity_type, entity_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_ape_dedupe ON public.acquisition_pipeline_errors(
  category, error_code, COALESCE(entity_id, ''), COALESCE(step_key, '')
) WHERE status = 'open';

GRANT SELECT, INSERT, UPDATE ON public.acquisition_pipeline_errors TO authenticated;
GRANT ALL ON public.acquisition_pipeline_errors TO service_role;

ALTER TABLE public.acquisition_pipeline_errors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin manages pipeline errors" ON public.acquisition_pipeline_errors;
CREATE POLICY "Admin manages pipeline errors" ON public.acquisition_pipeline_errors
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE OR REPLACE FUNCTION public.tg_update_pipeline_errors_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS trg_pipeline_errors_updated_at ON public.acquisition_pipeline_errors;
CREATE TRIGGER trg_pipeline_errors_updated_at
  BEFORE UPDATE ON public.acquisition_pipeline_errors
  FOR EACH ROW EXECUTE FUNCTION public.tg_update_pipeline_errors_updated_at();

CREATE OR REPLACE FUNCTION public.record_pipeline_error(
  _category text, _error_code text, _error_message text,
  _entity_type text DEFAULT NULL, _entity_id text DEFAULT NULL, _step_key text DEFAULT NULL,
  _recommended_action text DEFAULT NULL, _repair_function text DEFAULT NULL,
  _metadata jsonb DEFAULT '{}'::jsonb
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _id uuid;
BEGIN
  INSERT INTO public.acquisition_pipeline_errors(
    category, error_code, error_message, entity_type, entity_id, step_key,
    recommended_action, repair_function, metadata
  ) VALUES (
    _category, _error_code, _error_message, _entity_type, _entity_id, _step_key,
    _recommended_action, _repair_function, COALESCE(_metadata, '{}'::jsonb)
  )
  ON CONFLICT (category, error_code, COALESCE(entity_id, ''), COALESCE(step_key, '')) WHERE status = 'open'
  DO UPDATE SET
    occurrences = acquisition_pipeline_errors.occurrences + 1,
    last_seen_at = now(),
    error_message = EXCLUDED.error_message,
    recommended_action = COALESCE(EXCLUDED.recommended_action, acquisition_pipeline_errors.recommended_action),
    repair_function = COALESCE(EXCLUDED.repair_function, acquisition_pipeline_errors.repair_function),
    metadata = acquisition_pipeline_errors.metadata || EXCLUDED.metadata
  RETURNING id INTO _id;
  RETURN _id;
END; $$;

GRANT EXECUTE ON FUNCTION public.record_pipeline_error(text, text, text, text, text, text, text, text, jsonb) TO authenticated, service_role;

CREATE OR REPLACE VIEW public.v_pipeline_funnel_counts
WITH (security_invoker = true) AS
SELECT
  (SELECT COUNT(*) FROM public.contractor_prospects)::bigint AS scraped,
  (SELECT COUNT(*) FROM public.contractor_prospects WHERE phone IS NOT NULL OR email IS NOT NULL)::bigint AS contactable,
  (SELECT COUNT(*) FROM public.outreach_targets WHERE landing_status IN ('prepared','ready','queued'))::bigint AS outreach_queued,
  (SELECT COUNT(*) FROM public.contractor_outreach_logs WHERE status IN ('sent','delivered','opened','clicked'))::bigint AS sent,
  (SELECT COUNT(*) FROM public.contractor_outreach_logs WHERE status IN ('delivered','opened','clicked'))::bigint AS delivered,
  (SELECT COUNT(*) FROM public.contractor_outreach_logs WHERE status = 'clicked' OR clicked_at IS NOT NULL)::bigint AS clicked,
  (SELECT COUNT(*) FROM public.contractor_onboarding_sessions)::bigint AS onboarding_started,
  (SELECT COUNT(*) FROM public.contractor_onboarding_sessions WHERE completed_at IS NOT NULL)::bigint AS onboarding_completed,
  (SELECT COUNT(*) FROM public.contractor_checkouts WHERE payment_status IN ('pending','processing','paid','completed'))::bigint AS payment_started,
  (SELECT COUNT(*) FROM public.contractor_subscriptions WHERE status = 'active')::bigint AS paid,
  (SELECT COUNT(*) FROM public.contractor_entitlements WHERE can_be_matched = true OR can_receive_appointments = true)::bigint AS activated,
  (SELECT COUNT(*) FROM public.contractor_matching_status WHERE is_eligible = true)::bigint AS recommendable;

GRANT SELECT ON public.v_pipeline_funnel_counts TO authenticated;

ALTER TABLE public.pipeline_verification_runs
  ADD COLUMN IF NOT EXISTS mode text NOT NULL DEFAULT 'simulation',
  ADD COLUMN IF NOT EXISTS allow_live_delivery boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS test_prospect_id uuid NULL,
  ADD COLUMN IF NOT EXISTS test_contractor_id uuid NULL,
  ADD COLUMN IF NOT EXISTS operational_status jsonb NULL;

CREATE INDEX IF NOT EXISTS idx_pvr_mode ON public.pipeline_verification_runs(mode, created_at DESC);

COMMENT ON TABLE public.system_audit_logs IS 'Journal audit centralisé du pipeline UNPRO.';
COMMENT ON TABLE public.acquisition_pipeline_errors IS 'File d''erreurs pipeline consolidée par catégorie.';
COMMENT ON VIEW public.v_pipeline_funnel_counts IS 'Compte live des 12 étapes du funnel Scraped → Recommendable.';
