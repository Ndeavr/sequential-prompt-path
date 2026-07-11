ALTER TABLE public.contractor_onboarding_sessions
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'not_started',
  ADD COLUMN IF NOT EXISTS completion_percent integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_activity_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS checkout_session_id text,
  ADD COLUMN IF NOT EXISTS prospect_id uuid,
  ADD COLUMN IF NOT EXISTS contractor_id uuid;

CREATE INDEX IF NOT EXISTS idx_onboarding_sessions_status
  ON public.contractor_onboarding_sessions(status);
CREATE INDEX IF NOT EXISTS idx_onboarding_sessions_checkout
  ON public.contractor_onboarding_sessions(checkout_session_id)
  WHERE checkout_session_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_onboarding_sessions_prospect
  ON public.contractor_onboarding_sessions(prospect_id)
  WHERE prospect_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_onboarding_sessions_contractor
  ON public.contractor_onboarding_sessions(contractor_id)
  WHERE contractor_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.touch_onboarding_activity()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
BEGIN
  NEW.last_activity_at := now();
  NEW.updated_at := now();
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_touch_onboarding_activity ON public.contractor_onboarding_sessions;
CREATE TRIGGER trg_touch_onboarding_activity
BEFORE UPDATE ON public.contractor_onboarding_sessions
FOR EACH ROW EXECUTE FUNCTION public.touch_onboarding_activity();

CREATE OR REPLACE FUNCTION public.advance_onboarding_status(
  p_session_id uuid,
  p_new_status text,
  p_patch jsonb DEFAULT '{}'::jsonb
)
RETURNS public.contractor_onboarding_sessions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pct integer;
  v_row public.contractor_onboarding_sessions;
BEGIN
  v_pct := CASE p_new_status
    WHEN 'not_started' THEN 0
    WHEN 'link_opened' THEN 5
    WHEN 'identity_confirmed' THEN 15
    WHEN 'business_completed' THEN 30
    WHEN 'services_completed' THEN 45
    WHEN 'territory_completed' THEN 60
    WHEN 'verification_completed' THEN 70
    WHEN 'plan_selected' THEN 80
    WHEN 'checkout_started' THEN 85
    WHEN 'payment_pending' THEN 90
    WHEN 'paid' THEN 95
    WHEN 'activated' THEN 100
    ELSE 0
  END;

  UPDATE public.contractor_onboarding_sessions
  SET
    status = p_new_status,
    completion_percent = GREATEST(completion_percent, v_pct),
    business_data = COALESCE(business_data, '{}'::jsonb) || COALESCE(p_patch->'business_data', '{}'::jsonb),
    import_form  = COALESCE(import_form,  '{}'::jsonb) || COALESCE(p_patch->'import_form',  '{}'::jsonb),
    selected_plan = COALESCE(p_patch->'selected_plan', selected_plan),
    checkout_session_id = COALESCE(p_patch->>'checkout_session_id', checkout_session_id),
    completed_at = CASE WHEN p_new_status = 'activated' THEN COALESCE(completed_at, now()) ELSE completed_at END
  WHERE id = p_session_id
  RETURNING * INTO v_row;

  IF v_row.id IS NULL THEN
    RAISE EXCEPTION 'onboarding session % not found', p_session_id;
  END IF;

  BEGIN
    PERFORM public.log_system_audit(
      'onboarding.status_change',
      jsonb_build_object(
        'session_id', v_row.id,
        'user_id', v_row.user_id,
        'contractor_id', v_row.contractor_id,
        'new_status', p_new_status,
        'completion_percent', v_row.completion_percent
      )
    );
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  RETURN v_row;
END; $$;

GRANT EXECUTE ON FUNCTION public.advance_onboarding_status(uuid, text, jsonb) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.increment_stripe_event_retry(p_event_id text)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.stripe_webhook_events
  SET retry_count = COALESCE(retry_count, 0) + 1,
      last_retry_at = now()
  WHERE stripe_event_id = p_event_id;
$$;

GRANT EXECUTE ON FUNCTION public.increment_stripe_event_retry(text) TO service_role, authenticated;

CREATE OR REPLACE FUNCTION public.stripe_reconciliation_report()
RETURNS TABLE(
  total_events bigint,
  processed bigint,
  pending bigint,
  failed bigint,
  paid_no_activation bigint,
  activated_no_matching bigint
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT
    (SELECT count(*) FROM public.stripe_webhook_events),
    (SELECT count(*) FROM public.stripe_webhook_events WHERE processing_status = 'processed'),
    (SELECT count(*) FROM public.stripe_webhook_events WHERE processing_status IN ('processing','received')),
    (SELECT count(*) FROM public.stripe_webhook_events WHERE processing_status = 'failed'),
    (SELECT count(*)
       FROM public.stripe_webhook_events e
      WHERE e.event_type = 'checkout.session.completed'
        AND e.processing_status = 'processed'
        AND e.contractor_id IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM public.contractor_subscriptions cs
          WHERE cs.contractor_id::text = e.contractor_id::text
            AND cs.status IN ('active','trialing')
        )
    ),
    (SELECT count(*)
       FROM public.contractor_subscriptions cs
      WHERE cs.status IN ('active','trialing')
        AND NOT EXISTS (
          SELECT 1 FROM public.contractor_matching_status m
          WHERE m.contractor_id::text = cs.contractor_id::text
            AND m.is_eligible = true
        )
    );
$$;

GRANT EXECUTE ON FUNCTION public.stripe_reconciliation_report() TO authenticated, service_role;

CREATE OR REPLACE VIEW public.v_stripe_events_reprocess_queue
WITH (security_invoker = true) AS
SELECT
  id, stripe_event_id, event_type, contractor_id, session_id,
  processing_status, error_message, retry_count, last_retry_at,
  received_at, processed_at
FROM public.stripe_webhook_events
WHERE processing_status IN ('failed','received','processing')
   OR (processing_status = 'processed' AND success = false);

GRANT SELECT ON public.v_stripe_events_reprocess_queue TO authenticated, service_role;