-- Canonical access resolver: an active paid subscription keeps precedence.
-- Otherwise a verified LIVE CA$350 entry activation grants the 'presence'
-- plan for 12 months from the ORIGINAL ledger receipt. Provenance is
-- cross-checked against the signed Stripe event stored by stripe-webhook;
-- TEST events, other amounts/currencies, refunds/disputes and ledger rows
-- without a matching LIVE signed event never grant access.
CREATE OR REPLACE FUNCTION public.contractor_plan_code(_user_id uuid)
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT coalesce(
    (
      SELECT public.canonical_plan_code(cs.plan_id)
      FROM public.contractors c
      JOIN public.contractor_subscriptions cs ON cs.contractor_id = c.id
      WHERE c.user_id = _user_id
        AND (auth.uid() IS NULL OR auth.uid() = _user_id OR public.has_role(auth.uid(), 'admin'))
        AND cs.status IN ('active', 'trialing', 'past_due')
      ORDER BY cs.updated_at DESC
      LIMIT 1
    ),
    (
      SELECT 'presence'::text
      FROM (
        SELECT l.created_at, l.metadata->>'stripe_session_id' AS sid
        FROM public.contractors c
        JOIN public.contractor_activation_ledger l ON l.contractor_id = c.id
        JOIN public.stripe_webhook_events e
          ON e.stripe_event_id = l.metadata->>'stripe_event_id'
         AND e.session_id = l.metadata->>'stripe_session_id'
        WHERE c.user_id = _user_id
          AND (auth.uid() IS NULL OR auth.uid() = _user_id OR public.has_role(auth.uid(), 'admin'))
          AND l.action = 'entry_activation_350_paid'
          AND l.source = 'stripe_webhook'
          AND l.metadata->>'livemode' = 'true'
          AND e.livemode = true
          AND e.event_type IN ('checkout.session.completed', 'checkout.session.async_payment_succeeded')
          AND e.payload->'data'->'object'->>'payment_status' = 'paid'
          AND e.payload->'data'->'object'->>'amount_subtotal' = '35000'
          AND lower(e.payload->'data'->'object'->>'currency') = 'cad'
          AND e.payload->'data'->'object'->'metadata'->>'offer' IN ('entry_activation_350', 'entry_pack_350')
        ORDER BY l.created_at ASC
        LIMIT 1
      ) first_paid
      WHERE first_paid.created_at + interval '12 months' > now()
        AND NOT EXISTS (
          SELECT 1 FROM public.contractor_activation_ledger r
          WHERE r.action = 'deactivated'
            AND r.source = 'stripe_webhook'
            AND r.metadata->>'stripe_session_id' = first_paid.sid
        )
    )
  )
$function$;