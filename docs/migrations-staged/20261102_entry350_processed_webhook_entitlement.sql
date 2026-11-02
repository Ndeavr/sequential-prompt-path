-- STAGED ONLY / NEVER AUTO-APPLY. GitHub review artifact for issue #86.
-- Source: drizzle/migrations/0023_entry_350_presence_entitlement.sql @ b17409361415edf9b0bc6e97fc6042a9edf9b259
-- Purpose: fail closed when a signed Stripe event/ledger receipt exists but
-- downstream provisioning failed before the webhook's terminal success update.
-- This file has NOT been executed against production. The target project's
-- deployed function definition, schema, 12-month entitlements, and rollback
-- must first be inspected with authorized READ-ONLY access.
-- Pre-apply gates: isolated DB + signed TEST event replay; synthetic ledger with
-- processing/failed event grants no 'presence'; processed+success grants it;
-- deactivated entry revokes it; subscription precedence and RLS unchanged;
-- positive checkout path and 12-calendar-month expiry pass; reconcile existing
-- legitimate LIVE rows before changing access. Authorize a separate rollout.
-- This only hardens event state; it does NOT certify Stripe settlement, the
-- legal entity, refunds/disputes, or live deployment.

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
          -- Signed delivery alone is not a completed provision: require terminal success.
          AND e.processing_status = 'processed'
          AND e.success IS TRUE
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