CREATE OR REPLACE FUNCTION public.annual_presence_status(_contractor_id uuid, _include_test boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  WITH paid AS (
    SELECT l.created_at,
      CASE
        WHEN e.payload->'data'->'object'->'metadata'->>'offer' = 'entry_activation_350'
          AND e.payload->'data'->'object'->'metadata'->>'presence_tier' = 'founder_120m'
          AND e.payload->'data'->'object'->'metadata'->>'entry_tax_contract' = 'qc-exclusive-founder120-v1'
          AND e.payload->'data'->'object'->'metadata'->>'presence_ia_months' = '120'
          AND e.payload->'data'->'object'->>'amount_subtotal' = '199500'
          AND l.metadata->>'presence_tier' = 'founder_120m'
          AND l.metadata->>'presence_months' = '120'
        THEN interval '120 months'
        ELSE interval '12 months'
      END AS term
    FROM public.contractor_activation_ledger l
    JOIN public.stripe_webhook_events e
      ON e.stripe_event_id = l.metadata->>'stripe_event_id'
     AND e.session_id = l.metadata->>'stripe_session_id'
    WHERE l.contractor_id = _contractor_id
      AND l.action = 'entry_activation_350_paid'
      AND l.source = 'stripe_webhook'
      AND (
        (e.livemode = true AND l.metadata->>'livemode' = 'true')
        OR (_include_test AND e.livemode = false AND l.metadata->>'livemode' = 'false')
      )
      AND e.event_type IN ('checkout.session.completed', 'checkout.session.async_payment_succeeded')
      AND e.payload->'data'->'object'->>'payment_status' = 'paid'
      AND lower(e.payload->'data'->'object'->>'currency') = 'cad'
      AND (
        (e.payload->'data'->'object'->'metadata'->>'offer' IN ('entry_activation_350', 'entry_pack_350')
          AND e.payload->'data'->'object'->>'amount_subtotal' = '35000'
          AND coalesce(e.payload->'data'->'object'->'metadata'->>'presence_tier', 'launch_12m') = 'launch_12m')
        OR (e.payload->'data'->'object'->'metadata'->>'offer' = 'entry_activation_350'
          AND e.payload->'data'->'object'->'metadata'->>'presence_tier' = 'founder_120m'
          AND e.payload->'data'->'object'->'metadata'->>'entry_tax_contract' = 'qc-exclusive-founder120-v1'
          AND e.payload->'data'->'object'->>'amount_subtotal' = '199500'
          AND l.metadata->>'presence_months' = '120')
        OR (e.payload->'data'->'object'->'metadata'->>'annual_presence' = 'included'
          AND e.payload->'data'->'object'->'metadata'->>'annual_presence_cents' = '35000'
          AND l.metadata->>'annual_presence_line_verified' = 'true')
      )
      AND NOT EXISTS (
        SELECT 1 FROM public.contractor_activation_ledger r
        WHERE r.action = 'deactivated'
          AND r.source = 'stripe_webhook'
          AND r.metadata->>'stripe_session_id' = l.metadata->>'stripe_session_id'
      )
  )
  SELECT jsonb_build_object(
    'valid', coalesce(max(created_at + term) > now(), false),
    'last_paid_at', max(created_at),
    'valid_until', max(created_at + term)
  )
  FROM paid
$function$;
REVOKE ALL ON FUNCTION public.annual_presence_status(uuid, boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.annual_presence_status(uuid, boolean) TO service_role;

CREATE OR REPLACE FUNCTION public.guard_annual_presence_overlap()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.action <> 'entry_activation_350_paid' OR NEW.contractor_id IS NULL THEN
    RETURN NEW;
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('annual_presence:' || NEW.contractor_id::text, 0));
  IF EXISTS (
    SELECT 1 FROM public.contractor_activation_ledger l
    WHERE l.contractor_id = NEW.contractor_id
      AND l.action = 'entry_activation_350_paid'
      AND coalesce(l.metadata->>'livemode', '') = coalesce(NEW.metadata->>'livemode', '')
      AND l.metadata->>'stripe_session_id' IS DISTINCT FROM NEW.metadata->>'stripe_session_id'
      AND l.created_at + CASE
            WHEN l.metadata->>'presence_tier' = 'founder_120m' AND l.metadata->>'presence_months' = '120'
            THEN interval '120 months' ELSE interval '12 months' END > now()
      AND NOT EXISTS (
        SELECT 1 FROM public.contractor_activation_ledger r
        WHERE r.action = 'deactivated' AND r.source = 'stripe_webhook'
          AND r.metadata->>'stripe_session_id' = l.metadata->>'stripe_session_id'
      )
  ) THEN
    RAISE EXCEPTION 'annual_presence_still_valid' USING ERRCODE = 'unique_violation';
  END IF;
  RETURN NEW;
END;
$function$;