
-- =============================================================
-- UNPRO Verification Engine — Premium Data Model Extension
-- =============================================================

-- ─── 1. EXTEND contractors TABLE ─────────────────────────────
ALTER TABLE public.contractors
  ADD COLUMN IF NOT EXISTS legal_name text,
  ADD COLUMN IF NOT EXISTS normalized_business_name text,
  ADD COLUMN IF NOT EXISTS normalized_phone text,
  ADD COLUMN IF NOT EXISTS normalized_website text,
  ADD COLUMN IF NOT EXISTS rbq_number text,
  ADD COLUMN IF NOT EXISTS neq text,
  ADD COLUMN IF NOT EXISTS google_business_url text,
  ADD COLUMN IF NOT EXISTS facebook_page_url text,
  ADD COLUMN IF NOT EXISTS admin_verified boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS internal_verified_score integer,
  ADD COLUMN IF NOT EXISTS internal_verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS internal_verified_by uuid,
  ADD COLUMN IF NOT EXISTS verification_notes text;

-- Indexes on contractors for verification lookups
CREATE INDEX IF NOT EXISTS idx_contractors_normalized_phone ON public.contractors (normalized_phone);
CREATE INDEX IF NOT EXISTS idx_contractors_rbq_number ON public.contractors (rbq_number);
CREATE INDEX IF NOT EXISTS idx_contractors_neq ON public.contractors (neq);
CREATE INDEX IF NOT EXISTS idx_contractors_normalized_website ON public.contractors (normalized_website);
CREATE INDEX IF NOT EXISTS idx_contractors_normalized_business_name ON public.contractors (normalized_business_name);
CREATE INDEX IF NOT EXISTS idx_contractors_city ON public.contractors (city);

-- ─── 2. EXTEND contractor_verification_runs TABLE ────────────
ALTER TABLE public.contractor_verification_runs
  ADD COLUMN IF NOT EXISTS input_phone text,
  ADD COLUMN IF NOT EXISTS input_business_name text,
  ADD COLUMN IF NOT EXISTS input_website text,
  ADD COLUMN IF NOT EXISTS input_rbq text,
  ADD COLUMN IF NOT EXISTS input_neq text,
  ADD COLUMN IF NOT EXISTS input_city text,
  ADD COLUMN IF NOT EXISTS matched_by text,
  ADD COLUMN IF NOT EXISTS internal_profile_found boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS admin_verified boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS used_admin_verified_profile boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS admin_verified_snapshot_score integer,
  ADD COLUMN IF NOT EXISTS identity_resolution_status text,
  ADD COLUMN IF NOT EXISTS identity_confidence_score integer,
  ADD COLUMN IF NOT EXISTS public_trust_score integer,
  ADD COLUMN IF NOT EXISTS live_risk_delta integer,
  ADD COLUMN IF NOT EXISTS ambiguity_level text,
  ADD COLUMN IF NOT EXISTS inconsistencies_json jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS missing_proofs_json jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS raw_findings_json jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS recommended_next_inputs_json jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS admin_review_status text DEFAULT 'pending';

-- Indexes on verification runs
CREATE INDEX IF NOT EXISTS idx_verification_runs_contractor ON public.contractor_verification_runs (contractor_id);
CREATE INDEX IF NOT EXISTS idx_verification_runs_user ON public.contractor_verification_runs (user_id);
CREATE INDEX IF NOT EXISTS idx_verification_runs_admin_review ON public.contractor_verification_runs (admin_review_status);
CREATE INDEX IF NOT EXISTS idx_verification_runs_created ON public.contractor_verification_runs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_verification_runs_identity ON public.contractor_verification_runs (identity_resolution_status);

-- ─── 3. CREATE contractor_verification_evidence ──────────────
CREATE TABLE IF NOT EXISTS public.contractor_verification_evidence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  verification_run_id uuid REFERENCES public.contractor_verification_runs(id) ON DELETE CASCADE NOT NULL,
  contractor_id uuid REFERENCES public.contractors(id) ON DELETE SET NULL,
  uploaded_by uuid NOT NULL,
  file_type text,
  storage_path text NOT NULL,
  mime_type text,
  extracted_text text,
  extracted_phone text,
  extracted_business_name text,
  extracted_website text,
  extracted_rbq text,
  extracted_neq text,
  extracted_address text,
  extracted_city text,
  visual_consistency_score integer,
  analysis_summary text,
  created_at timestamptz DEFAULT now() NOT NULL
);

COMMENT ON TABLE public.contractor_verification_evidence IS 'Raw evidence uploads and OCR/AI extractions tied to verification runs. Private by default.';

ALTER TABLE public.contractor_verification_evidence ENABLE ROW LEVEL SECURITY;

-- ─── 4. CREATE admin_notifications ───────────────────────────
CREATE TABLE IF NOT EXISTS public.admin_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL,
  severity text NOT NULL DEFAULT 'info',
  contractor_id uuid REFERENCES public.contractors(id) ON DELETE SET NULL,
  verification_run_id uuid REFERENCES public.contractor_verification_runs(id) ON DELETE CASCADE,
  title text NOT NULL,
  body text NOT NULL,
  payload_json jsonb DEFAULT '{}'::jsonb,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now() NOT NULL
);

COMMENT ON TABLE public.admin_notifications IS 'Internal admin alerts for verification events, risk signals, and review requests. Never exposed to public UI.';

ALTER TABLE public.admin_notifications ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_admin_notifications_is_read ON public.admin_notifications (is_read);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_severity ON public.admin_notifications (severity);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_type ON public.admin_notifications (type);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_created ON public.admin_notifications (created_at DESC);

-- ─── 5. CREATE admin_action_logs ─────────────────────────────
CREATE TABLE IF NOT EXISTS public.admin_action_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id uuid NOT NULL,
  contractor_id uuid REFERENCES public.contractors(id) ON DELETE SET NULL,
  verification_run_id uuid REFERENCES public.contractor_verification_runs(id) ON DELETE SET NULL,
  action_type text NOT NULL,
  notes text,
  payload_json jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now() NOT NULL
);

COMMENT ON TABLE public.admin_action_logs IS 'Immutable audit trail for all admin actions on contractors and verification runs.';

ALTER TABLE public.admin_action_logs ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_admin_action_logs_actor ON public.admin_action_logs (actor_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_action_logs_contractor ON public.admin_action_logs (contractor_id);
CREATE INDEX IF NOT EXISTS idx_admin_action_logs_created ON public.admin_action_logs (created_at DESC);

-- ─── 6. STORAGE BUCKET ──────────────────────────────────────
INSERT INTO storage.buckets (id, name, public)
VALUES ('verification-evidence', 'verification-evidence', false)
ON CONFLICT (id) DO NOTHING;

-- ─── 7. RLS POLICIES ────────────────────────────────────────

-- 7a. contractor_verification_evidence
CREATE POLICY "Users can insert evidence for own runs"
  ON public.contractor_verification_evidence FOR INSERT TO authenticated
  WITH CHECK (
    uploaded_by = auth.uid()
    AND public.owns_verification_run(auth.uid(), verification_run_id)
  );

CREATE POLICY "Users can read own evidence"
  ON public.contractor_verification_evidence FOR SELECT TO authenticated
  USING (
    uploaded_by = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Admins can manage all evidence"
  ON public.contractor_verification_evidence FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 7b. admin_notifications — admin only
CREATE POLICY "Admins can read notifications"
  ON public.admin_notifications FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update notifications"
  ON public.admin_notifications FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "System can insert notifications"
  ON public.admin_notifications FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 7c. admin_action_logs — admin only, insert + read
CREATE POLICY "Admins can read action logs"
  ON public.admin_action_logs FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert action logs"
  ON public.admin_action_logs FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    AND actor_user_id = auth.uid()
  );

-- 7d. Storage RLS for verification-evidence bucket
CREATE POLICY "Users can upload verification evidence"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'verification-evidence'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can read own verification evidence"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'verification-evidence'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR public.has_role(auth.uid(), 'admin')
    )
  );

CREATE POLICY "Admins can manage all verification evidence"
  ON storage.objects FOR ALL TO authenticated
  USING (
    bucket_id = 'verification-evidence'
    AND public.has_role(auth.uid(), 'admin')
  )
  WITH CHECK (
    bucket_id = 'verification-evidence'
    AND public.has_role(auth.uid(), 'admin')
  );

-- 7e. Protect admin-only fields on contractors
-- Only admins can set admin_verified, internal_verified_*, verification_notes
CREATE OR REPLACE FUNCTION public.protect_contractor_admin_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    NEW.admin_verified := OLD.admin_verified;
    NEW.internal_verified_score := OLD.internal_verified_score;
    NEW.internal_verified_at := OLD.internal_verified_at;
    NEW.internal_verified_by := OLD.internal_verified_by;
    NEW.verification_notes := OLD.verification_notes;
    NEW.admin_note := OLD.admin_note;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_contractor_admin_fields ON public.contractors;
CREATE TRIGGER trg_protect_contractor_admin_fields
  BEFORE UPDATE ON public.contractors
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_contractor_admin_fields();
