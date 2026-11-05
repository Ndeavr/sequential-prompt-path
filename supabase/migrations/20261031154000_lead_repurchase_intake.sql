-- UNPRO: rachat de leads / voluntary contractor intake. Additive only.
-- Customer PII must NEVER be placed in contractor_leads (prospecting records).
CREATE TABLE IF NOT EXISTS public.lead_repurchase_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_name text NOT NULL CHECK (char_length(company_name) BETWEEN 2 AND 160),
  client_first_name text NOT NULL CHECK (char_length(client_first_name) BETWEEN 1 AND 100),
  client_last_name text,
  client_phone text,
  client_email text,
  client_city text NOT NULL CHECK (char_length(client_city) BETWEEN 2 AND 120),
  service_requested text NOT NULL CHECK (char_length(service_requested) BETWEEN 2 AND 150),
  project_description text NOT NULL CHECK (char_length(project_description) BETWEEN 5 AND 4000),
  project_timeline text NOT NULL DEFAULT 'flexible',
  mismatch_reason text NOT NULL CHECK (mismatch_reason IN ('service','territory','calendar','capacity','other')),
  acquisition_source text NOT NULL CHECK (char_length(acquisition_source) BETWEEN 2 AND 100),
  acquisition_cost_cents integer CHECK (acquisition_cost_cents BETWEEN 0 AND 10000000),
  acquisition_cost_evidence text,
  -- A checked box alone is not a licence to use third-party personal data.
  consent_attested boolean NOT NULL CHECK (consent_attested = true),
  consent_provenance text NOT NULL CHECK (char_length(consent_provenance) BETWEEN 8 AND 2000),
  consent_recorded_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','withdrawn')),
  approved_credit_cents integer NOT NULL DEFAULT 0 CHECK (approved_credit_cents BETWEEN 0 AND 10000000),
  review_reason text,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (nullif(trim(coalesce(client_phone,'')), '') IS NOT NULL
    OR nullif(trim(coalesce(client_email,'')), '') IS NOT NULL),
  CHECK (status = 'approved' OR approved_credit_cents = 0)
);
CREATE INDEX IF NOT EXISTS idx_lead_repurchase_owner_created
  ON public.lead_repurchase_submissions(owner_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lead_repurchase_admin_review
  ON public.lead_repurchase_submissions(status, created_at DESC);
-- Prevent the same professional resubmitting the same contact/project in the same location.
CREATE UNIQUE INDEX IF NOT EXISTS uq_lead_repurchase_project
  ON public.lead_repurchase_submissions (
    owner_user_id,
    lower(trim(coalesce(nullif(client_phone,''),nullif(client_email,''),''))),
    lower(trim(service_requested)),
    lower(trim(client_city))
  );

ALTER TABLE public.lead_repurchase_submissions ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE ON public.lead_repurchase_submissions TO authenticated;
CREATE POLICY "repurchase_owner_read_or_admin" ON public.lead_repurchase_submissions
  FOR SELECT TO authenticated
  USING (owner_user_id = (select auth.uid()) OR public.has_role((select auth.uid()),'admin'));
CREATE POLICY "repurchase_contractor_submit_pending_only" ON public.lead_repurchase_submissions
  FOR INSERT TO authenticated
  WITH CHECK (
    owner_user_id = (select auth.uid())
    AND (public.has_role((select auth.uid()),'contractor') OR public.has_role((select auth.uid()),'admin'))
    AND status = 'pending'
    AND approved_credit_cents = 0 AND reviewed_at IS NULL AND review_reason IS NULL
  );
CREATE POLICY "repurchase_admin_review_only" ON public.lead_repurchase_submissions
  FOR UPDATE TO authenticated
  USING (public.has_role((select auth.uid()),'admin'))
  WITH CHECK (public.has_role((select auth.uid()),'admin'));

-- Only the client-account holder and authorized staff may read evidence metadata.
CREATE TABLE IF NOT EXISTS public.lead_repurchase_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id uuid NOT NULL REFERENCES public.lead_repurchase_submissions(id) ON DELETE CASCADE,
  owner_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  storage_path text NOT NULL UNIQUE,
  kind text NOT NULL CHECK (kind IN ('client_request','quote','acquisition_receipt')),
  original_filename text NOT NULL CHECK (char_length(original_filename) BETWEEN 1 AND 180),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_lead_repurchase_documents_submission
  ON public.lead_repurchase_documents(submission_id);
ALTER TABLE public.lead_repurchase_documents ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT ON public.lead_repurchase_documents TO authenticated;
CREATE POLICY "repurchase_documents_owner_read_or_admin" ON public.lead_repurchase_documents
  FOR SELECT TO authenticated
  USING (owner_user_id = (select auth.uid()) OR public.has_role((select auth.uid()),'admin'));
CREATE POLICY "repurchase_documents_owner_insert" ON public.lead_repurchase_documents
  FOR INSERT TO authenticated
  WITH CHECK (
    owner_user_id = (select auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.lead_repurchase_submissions s
      WHERE s.id = submission_id AND s.owner_user_id = (select auth.uid())
    )
    AND storage_path LIKE ((select auth.uid())::text || '/' || submission_id::text || '/%')
  );

-- Separate explicit consent for future offers; does not enable an outbound worker.
CREATE TABLE IF NOT EXISTS public.lead_repurchase_offer_preferences (
  owner_user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  company_name text NOT NULL CHECK (char_length(company_name) BETWEEN 2 AND 160),
  services text NOT NULL DEFAULT '',
  territory text NOT NULL DEFAULT '',
  preferred_hours text NOT NULL DEFAULT '',
  sms_opt_in boolean NOT NULL DEFAULT false,
  email_opt_in boolean NOT NULL DEFAULT false,
  sms_consented_at timestamptz,
  email_consented_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (sms_opt_in = false OR sms_consented_at IS NOT NULL),
  CHECK (email_opt_in = false OR email_consented_at IS NOT NULL)
);
ALTER TABLE public.lead_repurchase_offer_preferences ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE ON public.lead_repurchase_offer_preferences TO authenticated;
CREATE POLICY "repurchase_preferences_read_owner_or_admin"
  ON public.lead_repurchase_offer_preferences FOR SELECT TO authenticated
  USING (owner_user_id = (select auth.uid()) OR public.has_role((select auth.uid()),'admin'));
CREATE POLICY "repurchase_preferences_insert_contractor"
  ON public.lead_repurchase_offer_preferences FOR INSERT TO authenticated
  WITH CHECK (owner_user_id = (select auth.uid())
    AND (public.has_role((select auth.uid()),'contractor') OR public.has_role((select auth.uid()),'admin')));
CREATE POLICY "repurchase_preferences_update_owner"
  ON public.lead_repurchase_offer_preferences FOR UPDATE TO authenticated
  USING (owner_user_id = (select auth.uid()))
  WITH CHECK (owner_user_id = (select auth.uid()));

-- All client documents private and scoped to the account and a submission owned by it.
INSERT INTO storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
VALUES ('lead-repurchase-private','lead-repurchase-private',false,10485760,
  ARRAY['application/pdf','image/jpeg','image/png','image/webp'])
ON CONFLICT (id) DO NOTHING;
CREATE POLICY "repurchase_files_owner_or_admin_read"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'lead-repurchase-private' AND (
    (storage.foldername(name))[1] = (select auth.uid())::text
    OR public.has_role((select auth.uid()),'admin')
  ));
CREATE POLICY "repurchase_files_owner_upload"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'lead-repurchase-private'
    AND (storage.foldername(name))[1] = (select auth.uid())::text
    AND EXISTS (
      SELECT 1 FROM public.lead_repurchase_submissions s
      WHERE s.id::text = (storage.foldername(name))[2]
        AND s.owner_user_id = (select auth.uid())
    )
  );


-- Eligibility for credit GRANT and credit USE is separate from the one-time
-- $350 profile activation. A valid paid subscription to Rendez-vous UNPRO is
-- required; a registration, trial, profile-only plan or expired term is not enough.
--
-- Internal function: privileged caller only, with fixed search_path. Do not
-- expose the parameterized variant to regular clients (avoids account probing).
CREATE OR REPLACE FUNCTION public.lead_repurchase_has_valid_booking_subscription(_owner_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.contractors c
    JOIN public.contractor_subscriptions cs ON cs.contractor_id = c.id
    LEFT JOIN public.plans p
      ON p.code = public.canonical_plan_code(cs.plan_id) AND p.audience = 'contractor'
    LEFT JOIN public.contractor_entitlements ce ON ce.contractor_id = c.id
    WHERE c.user_id = _owner_user_id
      AND cs.status = 'active'
      AND cs.payment_status = 'paid'
      AND cs.payment_method <> 'free'
      -- A real recurring Stripe subscription or verified manual subscription;
      -- not a one-time profile activation masquerading as an appointment plan.
      AND (
        (cs.payment_method = 'stripe' AND cs.stripe_subscription_id LIKE 'sub_%')
        OR cs.payment_method = 'manual'
      )
      AND cs.current_period_end IS NOT NULL
      AND cs.current_period_end > now()
      AND (
        coalesce(p.appointments_included, 0) > 0
        OR (
          coalesce(ce.can_receive_appointments, false)
          AND (ce.valid_until IS NULL OR ce.valid_until > now())
        )
      )
  );
$$;
REVOKE ALL ON FUNCTION public.lead_repurchase_has_valid_booking_subscription(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.lead_repurchase_has_valid_booking_subscription(uuid) TO service_role;

-- Safe, own-account only RPC for a contractor-facing notice. Not an authority
-- for credit issuance; the trigger below independently checks the subscription.
CREATE OR REPLACE FUNCTION public.lead_repurchase_my_booking_subscription_valid()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT CASE WHEN auth.uid() IS NULL THEN false
    ELSE public.lead_repurchase_has_valid_booking_subscription(auth.uid())
  END;
$$;
REVOKE ALL ON FUNCTION public.lead_repurchase_my_booking_subscription_valid() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.lead_repurchase_my_booking_subscription_valid() TO authenticated, service_role;

-- Nobody, including an admin or service role, can issue/raise a lead credit for
-- an unsubscribed contractor. A lead may remain PENDING until subscription.
CREATE OR REPLACE FUNCTION public.lead_repurchase_credit_subscription_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $
DECLARE
  prior_status text;
  prior_credit_cents integer := 0;
BEGIN
  -- Do not reference OLD on INSERT: OLD is unassigned in that event.
  IF TG_OP = 'UPDATE' THEN
    prior_status := OLD.status;
    prior_credit_cents := OLD.approved_credit_cents;
  END IF;
  IF (
    (NEW.status = 'approved' AND prior_status IS DISTINCT FROM 'approved')
    OR NEW.approved_credit_cents > prior_credit_cents
  ) AND NOT public.lead_repurchase_has_valid_booking_subscription(NEW.owner_user_id) THEN
    RAISE EXCEPTION 'subscription_required_for_lead_credit'
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.lead_repurchase_credit_subscription_guard() FROM PUBLIC;
DROP TRIGGER IF EXISTS trg_repurchase_credit_subscription_guard ON public.lead_repurchase_submissions;
CREATE TRIGGER trg_repurchase_credit_subscription_guard
BEFORE INSERT OR UPDATE ON public.lead_repurchase_submissions
FOR EACH ROW EXECUTE FUNCTION public.lead_repurchase_credit_subscription_guard();

-- To redeem credit, every future appointment booking/credit spending function
-- MUST re-check lead_repurchase_has_valid_booking_subscription(owner_user_id)
-- server-side at transaction time and block use if expired/cancelled/refunded.
-- This migration does not implement redemption, which stays disabled.
