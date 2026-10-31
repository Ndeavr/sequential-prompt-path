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
