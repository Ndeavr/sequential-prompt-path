ALTER TABLE public.contractor_pricing_quotes
  ADD COLUMN IF NOT EXISTS offer_kind text NOT NULL DEFAULT 'subscription',
  ADD COLUMN IF NOT EXISTS total_price_cents integer,
  ADD COLUMN IF NOT EXISTS guarantee_duration_months integer,
  ADD COLUMN IF NOT EXISTS appointments_delivered integer NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_cpq_offer_kind ON public.contractor_pricing_quotes (offer_kind, created_at DESC);

CREATE OR REPLACE FUNCTION public.enforce_pack_guarantee_cap()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.offer_kind = 'pack_350' AND COALESCE(NEW.guaranteed_appointments, 0) > 5 THEN
    RAISE EXCEPTION 'Le forfait de 350 $ est limité à un maximum de 5 rendez-vous garantis. Augmentez le budget ou réduisez la garantie.';
  END IF;
  IF COALESCE(NEW.appointments_delivered, 0) < 0 THEN
    NEW.appointments_delivered := 0;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_pack_guarantee_cap ON public.contractor_pricing_quotes;
CREATE TRIGGER trg_enforce_pack_guarantee_cap
BEFORE INSERT OR UPDATE ON public.contractor_pricing_quotes
FOR EACH ROW EXECUTE FUNCTION public.enforce_pack_guarantee_cap();

CREATE OR REPLACE VIEW public.v_pack350_performance
WITH (security_invoker = true) AS
SELECT
  q.trade_primary,
  q.city,
  count(*) FILTER (WHERE q.pricing_status = 'offered')                        AS packs_offered,
  count(*) FILTER (WHERE q.pricing_status = 'accepted')                       AS packs_sold,
  count(*) FILTER (WHERE q.guaranteed_appointments >= 4)                      AS offers_4_5,
  coalesce(sum(q.guaranteed_appointments), 0)                                 AS appointments_guaranteed,
  coalesce(sum(q.appointments_delivered), 0)                                  AS appointments_delivered,
  greatest(coalesce(sum(q.guaranteed_appointments), 0) - coalesce(sum(q.appointments_delivered), 0), 0) AS appointments_remaining,
  coalesce(sum(q.total_price_cents), 0)                                       AS revenue_cents,
  CASE WHEN coalesce(sum(q.guaranteed_appointments), 0) > 0
       THEN round(coalesce(sum(q.total_price_cents), 0)::numeric / sum(q.guaranteed_appointments), 0)
       ELSE NULL END                                                          AS revenue_cents_per_appointment,
  CASE WHEN coalesce(sum(q.total_price_cents), 0) > 0
       THEN round((coalesce(sum(q.total_price_cents), 0)
              - (coalesce(sum(q.guaranteed_appointments), 0) * 2900 + count(*) * 1500))::numeric
              / sum(q.total_price_cents), 3)
       ELSE NULL END                                                          AS estimated_margin_ratio
FROM public.contractor_pricing_quotes q
WHERE q.offer_kind = 'pack_350'
GROUP BY q.trade_primary, q.city;

GRANT SELECT ON public.v_pack350_performance TO authenticated;
GRANT ALL ON public.v_pack350_performance TO service_role;