CREATE OR REPLACE VIEW public.v_crm_next_action
WITH (security_invoker = true) AS
SELECT
  p.*,
  GREATEST(0, LEAST(100,
    (CASE
       WHEN p.paid_at IS NOT NULL THEN 100
       WHEN p.checkout_at IS NOT NULL THEN 70
       WHEN p.registered_at IS NOT NULL THEN 55
       WHEN p.clicked_at IS NOT NULL THEN 40
       WHEN p.landing_at IS NOT NULL THEN 30
       WHEN p.sms_delivered > 0 THEN 14
       WHEN p.sms_sent > 0 THEN 8
       ELSE 4
     END)
    + (CASE WHEN p.has_email THEN 6 ELSE 0 END)
    + (CASE WHEN p.phone_line_type = 'mobile' THEN 6 ELSE 0 END)
    + (CASE WHEN p.website_url IS NOT NULL THEN 3 ELSE 0 END)
    + (CASE WHEN p.rbq_number IS NOT NULL THEN 3 ELSE 0 END)
    - (CASE WHEN p.sms_undelivered > 0 AND NOT p.has_email THEN 10 ELSE 0 END)
    - (CASE WHEN p.opted_out THEN 100 ELSE 0 END)
    - (CASE WHEN COALESCE(p.hours_since_last_activity, 0) > 336 THEN 8 ELSE 0 END)
  ))::int AS activation_probability,
  (CASE
     WHEN p.category IN ('plomberie','electricite','toiture','excavation','drain_francais') THEN 34900
     WHEN p.category IS NULL THEN 14900
     ELSE 24900
   END)::int AS estimated_value_cents,
  (CASE
     WHEN p.opted_out THEN 'desabonne'
     WHEN p.paid_at IS NOT NULL THEN 'aucun'
     WHEN p.checkout_at IS NOT NULL THEN 'paiement_non_complete'
     WHEN p.registered_at IS NOT NULL THEN 'inscription_sans_paiement'
     WHEN p.clicked_at IS NOT NULL THEN 'clic_sans_inscription'
     WHEN p.sms_undelivered > 0 AND p.last_error ILIKE '30006%' THEN 'ligne_fixe'
     WHEN p.sms_undelivered > 0 AND p.last_error ILIKE '30034%' THEN 'a2p_non_enregistre'
     WHEN p.sms_undelivered > 0 OR p.sms_failed > 0 THEN 'sms_non_livre'
     WHEN p.sms_delivered > 0 THEN 'livre_sans_clic'
     WHEN p.sms_sent > 0 THEN 'sms_sans_accuse'
     WHEN p.phone_e164 IS NULL AND NOT p.has_email THEN 'aucun_canal'
     WHEN p.validated_at IS NULL THEN 'non_valide'
     ELSE 'jamais_contacte'
   END) AS blocked_reason,
  (CASE
     WHEN p.opted_out OR p.paid_at IS NOT NULL THEN 'none'
     WHEN p.checkout_at IS NOT NULL THEN 'payment_email'
     WHEN p.registered_at IS NOT NULL THEN 'payment_email'
     WHEN p.clicked_at IS NOT NULL AND p.has_email THEN 'send_email'
     WHEN p.clicked_at IS NOT NULL THEN 'second_sms'
     WHEN (p.sms_undelivered > 0 OR p.sms_failed > 0) AND p.has_email THEN 'onboarding_email'
     WHEN p.sms_delivered > 0 THEN 'second_sms'
     WHEN p.sms_sent = 0 AND p.phone_e164 IS NOT NULL THEN 'second_sms'
     WHEN p.has_email THEN 'onboarding_email'
     ELSE 'none'
   END) AS next_best_action
FROM public.v_crm_prospects p;

GRANT SELECT ON public.v_crm_next_action TO authenticated;
GRANT SELECT ON public.v_crm_next_action TO service_role;

CREATE OR REPLACE VIEW public.v_revenue_scoreboard
WITH (security_invoker = true) AS
WITH pay AS (
  SELECT created_at, COALESCE(amount_cents, 0) AS cents
  FROM public.unpro_payment_activation_audit
  WHERE result = 'success'
)
SELECT
  COALESCE(SUM(cents) FILTER (WHERE created_at >= date_trunc('day', now())), 0)::bigint AS revenue_today_cents,
  COALESCE(SUM(cents) FILTER (WHERE created_at >= date_trunc('day', now()) - interval '1 day'
                                AND created_at < date_trunc('day', now())), 0)::bigint AS revenue_yesterday_cents,
  COALESCE(SUM(cents) FILTER (WHERE created_at >= now() - interval '7 days'), 0)::bigint AS revenue_7d_cents,
  COALESCE(SUM(cents) FILTER (WHERE created_at >= now() - interval '30 days'), 0)::bigint AS revenue_30d_cents,
  COUNT(*) FILTER (WHERE created_at >= date_trunc('day', now()))::int AS activations_today,
  COUNT(*)::int AS activations_total
FROM pay;

GRANT SELECT ON public.v_revenue_scoreboard TO authenticated;
GRANT SELECT ON public.v_revenue_scoreboard TO service_role;