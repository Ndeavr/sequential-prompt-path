DROP POLICY IF EXISTS "condo_subscriptions_manage" ON public.condo_subscriptions;
REVOKE INSERT, UPDATE, DELETE ON public.condo_subscriptions FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.portfolio_subscriptions FROM anon, authenticated;
GRANT SELECT ON public.condo_subscriptions TO authenticated;
GRANT ALL ON public.condo_subscriptions TO service_role;
COMMENT ON TABLE public.condo_subscriptions IS 'Payment status written only by server (signed Stripe webhook). Members read via condo_subscriptions_select.';