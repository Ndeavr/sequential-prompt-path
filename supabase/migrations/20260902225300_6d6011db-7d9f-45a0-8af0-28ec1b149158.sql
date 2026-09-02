-- ─────────────────────────────────────────────────────────────
-- ISSUE 1 — booking payments: transaction record not saved
-- Root cause: public.booking_transactions has NO table grants,
-- so every insert (even from the service role) is denied.
-- ─────────────────────────────────────────────────────────────

ALTER TABLE public.booking_transactions
  ADD COLUMN IF NOT EXISTS payer_email text,
  ADD COLUMN IF NOT EXISTS payer_name text,
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS paid_at timestamptz,
  ADD COLUMN IF NOT EXISTS failed_at timestamptz,
  ADD COLUMN IF NOT EXISTS refunded_at timestamptz;

ALTER TABLE public.booking_transactions
  ALTER COLUMN currency SET DEFAULT 'cad';

CREATE UNIQUE INDEX IF NOT EXISTS booking_transactions_stripe_session_id_key
  ON public.booking_transactions (stripe_session_id)
  WHERE stripe_session_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS booking_transactions_payment_intent_idx
  ON public.booking_transactions (stripe_payment_intent_id)
  WHERE stripe_payment_intent_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS booking_transactions_booking_idx
  ON public.booking_transactions (booking_id);

-- Grants (missing entirely — this is the actual failure)
GRANT SELECT ON public.booking_transactions TO authenticated;
GRANT ALL ON public.booking_transactions TO service_role;

-- Remove the over-permissive anon insert policy
DROP POLICY IF EXISTS service_insert_transactions ON public.booking_transactions;

-- updated_at trigger
DROP TRIGGER IF EXISTS booking_transactions_set_updated_at ON public.booking_transactions;
CREATE TRIGGER booking_transactions_set_updated_at
  BEFORE UPDATE ON public.booking_transactions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ─────────────────────────────────────────────────────────────
-- ISSUE 2 — public credentials readable without exposing the
-- private credentials table.
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.public_contractor_credentials(_contractor_id uuid)
RETURNS TABLE (
  id uuid,
  credential_type text,
  profession_code text,
  issuer text,
  public_value text,
  verification_state text,
  credential_status text,
  issued_at date,
  expires_at date,
  verified_at timestamptz,
  source_last_verified_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    c.id,
    c.credential_type,
    c.profession_code,
    c.issuer,
    -- Only publicly-registered identifiers (RBQ/NEQ licences) are shown in full.
    CASE
      WHEN lower(coalesce(c.credential_type, '')) IN ('rbq', 'neq', 'licence', 'license')
        THEN c.credential_value
      WHEN c.credential_value IS NULL THEN NULL
      ELSE '••••' || right(c.credential_value, 3)
    END AS public_value,
    CASE
      WHEN c.expires_at IS NOT NULL AND c.expires_at < current_date THEN 'PENDING'
      ELSE coalesce(c.verification_state, 'PENDING')
    END AS verification_state,
    CASE
      WHEN c.expires_at IS NOT NULL AND c.expires_at < current_date THEN 'EXPIRED'
      ELSE coalesce(c.credential_status, 'UNVERIFIED')
    END AS credential_status,
    c.issued_at,
    c.expires_at,
    c.verified_at,
    c.source_last_verified_at
  FROM public.contractor_credentials c
  WHERE c.contractor_id = _contractor_id
  ORDER BY c.credential_type;
$$;

GRANT EXECUTE ON FUNCTION public.public_contractor_credentials(uuid) TO anon, authenticated, service_role;

-- Stop leaking internal credential columns (document_path, review_notes, verified_by…)
-- through the public profile RPC.
CREATE OR REPLACE FUNCTION public.get_contractor_public_profile(_slug text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  result jsonb;
  cid uuid;
BEGIN
  SELECT c.id INTO cid
  FROM public.contractors c
  JOIN public.contractor_public_pages pp ON pp.contractor_id = c.id
  WHERE (c.slug = _slug OR pp.slug = _slug) AND pp.is_published = true
  LIMIT 1;

  IF cid IS NULL THEN RETURN NULL; END IF;

  SELECT jsonb_build_object(
    'contractor', row_to_json(c),
    'ai_profile', (SELECT row_to_json(ai) FROM public.contractor_ai_profiles ai WHERE ai.contractor_id = cid AND ai.is_current = true LIMIT 1),
    'services', COALESCE((SELECT jsonb_agg(row_to_json(s) ORDER BY s.display_order) FROM public.contractor_services s WHERE s.contractor_id = cid AND s.is_active = true), '[]'),
    'service_areas', COALESCE((SELECT jsonb_agg(row_to_json(sa)) FROM public.contractor_service_areas sa WHERE sa.contractor_id = cid), '[]'),
    'media', COALESCE((SELECT jsonb_agg(row_to_json(m) ORDER BY m.display_order) FROM public.contractor_media m WHERE m.contractor_id = cid AND m.is_approved = true), '[]'),
    'credentials', COALESCE((SELECT jsonb_agg(row_to_json(cr)) FROM public.public_contractor_credentials(cid) cr), '[]'),
    'public_page', (SELECT row_to_json(pp) FROM public.contractor_public_pages pp WHERE pp.contractor_id = cid LIMIT 1),
    'problem_links', COALESCE((SELECT jsonb_agg(jsonb_build_object('problem_id', pl.problem_id, 'relevance', pl.relevance_score)) FROM public.contractor_problem_links pl WHERE pl.contractor_id = cid), '[]'),
    'comparables', COALESCE((SELECT jsonb_agg(jsonb_build_object('id', comp.comparable_contractor_id, 'similarity', comp.similarity_score, 'name', cc.business_name, 'slug', cc.slug) ORDER BY comp.similarity_score DESC) FROM public.contractor_comparables comp JOIN public.contractors cc ON cc.id = comp.comparable_contractor_id WHERE comp.contractor_id = cid), '[]')
  ) INTO result
  FROM public.contractors c
  WHERE c.id = cid;

  RETURN result;
END;
$function$;