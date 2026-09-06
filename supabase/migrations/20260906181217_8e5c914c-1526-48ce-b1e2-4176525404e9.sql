-- 1. Restore least-privilege EXECUTE on security helpers used inside RLS policies.
DO $$
BEGIN
  IF to_regprocedure('public.has_role(uuid, public.app_role)') IS NOT NULL THEN
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO anon, authenticated, service_role';
  END IF;
  IF to_regprocedure('public.is_admin()') IS NOT NULL THEN
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.is_admin() TO anon, authenticated, service_role';
  END IF;
  IF to_regprocedure('public.is_syndicate_admin(uuid, uuid)') IS NOT NULL THEN
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.is_syndicate_admin(uuid, uuid) TO authenticated, service_role';
  END IF;
  IF to_regprocedure('public.affiliate_entry_by_slug(text)') IS NOT NULL THEN
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.affiliate_entry_by_slug(text) TO anon, authenticated, service_role';
  END IF;
  IF to_regprocedure('public.public_contractor_credentials(uuid)') IS NOT NULL THEN
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.public_contractor_credentials(uuid) TO anon, authenticated, service_role';
  END IF;
END $$;

-- 2. Booking transactions: make the Stripe session id a full unique key so the
--    idempotent upsert (ON CONFLICT stripe_session_id) can infer it. A partial
--    unique index cannot be inferred by PostgREST, which broke the insert.
DROP INDEX IF EXISTS public.booking_transactions_stripe_session_id_key;
CREATE UNIQUE INDEX IF NOT EXISTS booking_transactions_stripe_session_id_key
  ON public.booking_transactions (stripe_session_id);