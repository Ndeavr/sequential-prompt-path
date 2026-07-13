
-- 1) Canonical health RPC — single source of truth
CREATE OR REPLACE FUNCTION public.get_sms_outbound_health()
RETURNS TABLE (
  is_operational boolean,
  status text,
  last_callback_at timestamptz,
  last_test_success_at timestamptz,
  valid_until timestamptz,
  sent_24h integer,
  delivered_24h integer,
  failed_24h integer,
  delivery_rate_24h numeric,
  last_test_sid text,
  last_test_phone text,
  last_test_error text,
  reason text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v RECORD;
  t RECORD;
  age_h numeric;
BEGIN
  SELECT * INTO v FROM public.v_sms_infrastructure_status LIMIT 1;
  SELECT id, phone, message_sid, success, callback_received, sent_at, delivered_at, failed_at, error, created_at
    INTO t
    FROM public.sms_test_runs
    ORDER BY created_at DESC
    LIMIT 1;

  status := COALESCE(v.status, 'ERROR');
  last_callback_at := v.last_callback_at;
  last_test_success_at := v.last_test_success_at;
  sent_24h := COALESCE(v.sent_24h, 0);
  delivered_24h := COALESCE(v.delivered_24h, 0);
  failed_24h := COALESCE(v.failed_24h, 0);
  delivery_rate_24h := v.delivery_rate_24h;
  last_test_sid := t.message_sid;
  last_test_phone := t.phone;
  last_test_error := t.error;
  valid_until := CASE WHEN v.last_test_success_at IS NOT NULL
                      THEN v.last_test_success_at + interval '24 hours'
                      ELSE NULL END;
  is_operational := status = 'HEALTHY';

  IF is_operational THEN
    reason := NULL;
  ELSIF v.last_callback_at IS NULL THEN
    reason := 'Aucun callback Twilio reçu. Le webhook twilio-status-v2 n''a jamais confirmé une livraison. Envoyez un SMS test.';
  ELSIF v.last_test_success_at IS NULL THEN
    reason := 'Aucun test SMS livré enregistré. Cliquez « Exécuter un test SMS » pour valider le pipeline.';
  ELSE
    age_h := EXTRACT(EPOCH FROM (now() - v.last_test_success_at))/3600.0;
    IF age_h > 24 THEN
      reason := 'Dernier test SMS livré il y a ' || to_char(age_h, 'FM999.0') || 'h (>24h). Relancez un test.';
    ELSIF COALESCE(v.sent_24h,0) > 10 AND COALESCE(v.delivery_rate_24h,100) < 90 THEN
      reason := 'Taux de livraison 24h à ' || COALESCE(v.delivery_rate_24h::text,'?') || '% (<90%). Trop d''échecs Twilio.';
    ELSE
      reason := 'Outbound bloqué. Consultez v_sms_infrastructure_status.';
    END IF;
  END IF;

  RETURN NEXT;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_sms_outbound_health() TO authenticated, service_role;

-- 2) Enrich sms_batches with richer status tracking
ALTER TABLE public.sms_batches
  ADD COLUMN IF NOT EXISTS requested_count integer,
  ADD COLUMN IF NOT EXISTS selected_count integer,
  ADD COLUMN IF NOT EXISTS failed_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS blocked_reason text,
  ADD COLUMN IF NOT EXISTS started_at timestamptz,
  ADD COLUMN IF NOT EXISTS completed_at timestamptz;

-- 3) Tracked link slug on launch_leads
ALTER TABLE public.launch_leads
  ADD COLUMN IF NOT EXISTS tracked_link_slug uuid UNIQUE DEFAULT gen_random_uuid();
