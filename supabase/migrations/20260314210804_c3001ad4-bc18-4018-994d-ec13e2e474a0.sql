
-- Block 7: QR Property Architecture & Contractor Contributions

-- QR code types enum
DO $$ BEGIN
  CREATE TYPE public.qr_type AS ENUM ('property_plate', 'electrical_panel', 'jobsite_temporary');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Contribution status enum
DO $$ BEGIN
  CREATE TYPE public.contribution_status AS ENUM ('pending', 'approved', 'rejected', 'expired');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 1. Property QR Codes
CREATE TABLE IF NOT EXISTS public.property_qr_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  qr_type public.qr_type NOT NULL,
  token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  label text,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid NOT NULL,
  project_id uuid REFERENCES public.projects(id),
  contractor_id uuid REFERENCES public.contractors(id),
  -- For jobsite QR: limited public info
  public_project_type text,
  public_city text,
  public_status text DEFAULT 'active',
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2. QR Scan Events (logging)
CREATE TABLE IF NOT EXISTS public.qr_scan_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  qr_code_id uuid NOT NULL REFERENCES public.property_qr_codes(id) ON DELETE CASCADE,
  scanned_by uuid,
  scanner_role text,
  ip_hash text,
  user_agent text,
  scan_context text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 3. Contractor Contributions
CREATE TABLE IF NOT EXISTS public.contractor_contributions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  qr_code_id uuid REFERENCES public.property_qr_codes(id),
  contractor_id uuid REFERENCES public.contractors(id),
  -- Lightweight contractor capture if not registered
  contributor_name text,
  contributor_phone text,
  contributor_email text,
  -- Work details
  work_type text NOT NULL,
  work_description text,
  work_date date,
  cost_estimate numeric,
  -- Files
  photo_paths text[] DEFAULT '{}',
  document_paths text[] DEFAULT '{}',
  -- Status
  status public.contribution_status NOT NULL DEFAULT 'pending',
  owner_review_note text,
  reviewed_at timestamptz,
  reviewed_by uuid,
  -- If approved: which passport section/event was created
  property_event_id uuid REFERENCES public.property_events(id),
  passport_section_key text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_qr_codes_property ON public.property_qr_codes(property_id);
CREATE INDEX IF NOT EXISTS idx_qr_codes_token ON public.property_qr_codes(token);
CREATE INDEX IF NOT EXISTS idx_scan_events_qr ON public.qr_scan_events(qr_code_id);
CREATE INDEX IF NOT EXISTS idx_contributions_property ON public.contractor_contributions(property_id);
CREATE INDEX IF NOT EXISTS idx_contributions_status ON public.contractor_contributions(status);

-- RLS
ALTER TABLE public.property_qr_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qr_scan_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contractor_contributions ENABLE ROW LEVEL SECURITY;

-- QR codes: owner can CRUD, anyone can read by token (handled in app layer)
CREATE POLICY "Owner manages QR codes" ON public.property_qr_codes
  FOR ALL TO authenticated
  USING (
    created_by = auth.uid()
    OR EXISTS (SELECT 1 FROM public.properties p WHERE p.id = property_id AND p.user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  )
  WITH CHECK (
    created_by = auth.uid()
    OR EXISTS (SELECT 1 FROM public.properties p WHERE p.id = property_id AND p.user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  );

-- Scan events: anyone authenticated can insert (logging), owner/admin can read
CREATE POLICY "Authenticated users log scans" ON public.qr_scan_events
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Owner reads scan events" ON public.qr_scan_events
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.property_qr_codes qr
      JOIN public.properties p ON p.id = qr.property_id
      WHERE qr.id = qr_code_id AND (p.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
    )
  );

-- Contributions: anyone authenticated can insert, owner can read/update
CREATE POLICY "Anyone can submit contribution" ON public.contractor_contributions
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Owner manages contributions" ON public.contractor_contributions
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.properties p WHERE p.id = property_id AND p.user_id = auth.uid())
    OR contractor_id IN (SELECT id FROM public.contractors WHERE user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Owner reviews contributions" ON public.contractor_contributions
  FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.properties p WHERE p.id = property_id AND p.user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.properties p WHERE p.id = property_id AND p.user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  );

-- Public read for QR token resolution (security definer function)
CREATE OR REPLACE FUNCTION public.resolve_qr_token(_token text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  qr record;
  result jsonb;
BEGIN
  SELECT qr.*, p.city, p.user_id AS owner_id
  INTO qr
  FROM public.property_qr_codes qr
  JOIN public.properties p ON p.id = qr.property_id
  WHERE qr.token = _token AND qr.is_active = true
    AND (qr.expires_at IS NULL OR qr.expires_at > now());

  IF NOT FOUND THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'invalid_or_expired');
  END IF;

  -- Return limited info based on QR type
  IF qr.qr_type = 'jobsite_temporary' THEN
    -- Public-safe: no address, no owner identity
    result := jsonb_build_object(
      'valid', true,
      'qr_type', qr.qr_type,
      'qr_id', qr.id,
      'property_id', qr.property_id,
      'project_type', qr.public_project_type,
      'city', qr.public_city,
      'status', qr.public_status,
      'contractor_id', qr.contractor_id
    );
  ELSE
    -- Owner-only context (property_plate, electrical_panel)
    result := jsonb_build_object(
      'valid', true,
      'qr_type', qr.qr_type,
      'qr_id', qr.id,
      'property_id', qr.property_id,
      'owner_id', qr.owner_id
    );
  END IF;

  RETURN result;
END;
$$;

-- Updated_at trigger
CREATE OR REPLACE TRIGGER trg_qr_codes_updated_at
  BEFORE UPDATE ON public.property_qr_codes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE TRIGGER trg_contributions_updated_at
  BEFORE UPDATE ON public.contractor_contributions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
