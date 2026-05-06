
-- 1. Partners application status
ALTER TABLE public.partners
  ADD COLUMN IF NOT EXISTS partner_application_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS application_submitted_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS application_reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS application_reviewed_by uuid,
  ADD COLUMN IF NOT EXISTS admin_notes text,
  ADD COLUMN IF NOT EXISTS application_data jsonb DEFAULT '{}'::jsonb;

DO $$ BEGIN
  ALTER TABLE public.partners
    ADD CONSTRAINT partner_application_status_chk
    CHECK (partner_application_status IN ('pending','under_review','approved','rejected','suspended'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Backfill existing approved partners
UPDATE public.partners
SET partner_application_status = 'approved',
    application_reviewed_at = COALESCE(application_reviewed_at, approved_at, now())
WHERE partner_status = 'approved' AND partner_application_status = 'pending';

-- 2. Terms acceptance
CREATE TABLE IF NOT EXISTS public.partner_terms_acceptance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid REFERENCES public.partners(id) ON DELETE CASCADE,
  user_id uuid,
  role text NOT NULL,
  terms_version text NOT NULL,
  accepted boolean NOT NULL DEFAULT true,
  accepted_at timestamptz NOT NULL DEFAULT now(),
  ip_address text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.partner_terms_acceptance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "partner_terms_select_own_or_admin"
ON public.partner_terms_acceptance FOR SELECT TO authenticated
USING (
  has_role(auth.uid(),'admin'::app_role)
  OR user_id = auth.uid()
  OR partner_id = current_partner_id(auth.uid())
);

CREATE POLICY "partner_terms_insert_self"
ON public.partner_terms_acceptance FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid() OR has_role(auth.uid(),'admin'::app_role));

-- 3. Audit logs
CREATE TABLE IF NOT EXISTS public.partner_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid REFERENCES public.partners(id) ON DELETE SET NULL,
  user_id uuid,
  action text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  ip_address text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.partner_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "partner_audit_select_own_or_admin"
ON public.partner_audit_logs FOR SELECT TO authenticated
USING (
  has_role(auth.uid(),'admin'::app_role)
  OR user_id = auth.uid()
  OR partner_id = current_partner_id(auth.uid())
);

CREATE POLICY "partner_audit_insert_authenticated"
ON public.partner_audit_logs FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid() OR has_role(auth.uid(),'admin'::app_role));

-- 4. partner_leads isolation
ALTER TABLE public.partner_leads
  ADD COLUMN IF NOT EXISTS created_by uuid,
  ADD COLUMN IF NOT EXISTS assigned_by uuid,
  ADD COLUMN IF NOT EXISTS lead_origin text NOT NULL DEFAULT 'partner_added',
  ADD COLUMN IF NOT EXISTS visibility_scope text NOT NULL DEFAULT 'assigned_partner_only';

DO $$ BEGIN
  ALTER TABLE public.partner_leads
    ADD CONSTRAINT partner_leads_origin_chk
    CHECK (lead_origin IN ('partner_added','admin_assigned','partner_generated','imported_with_permission'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Trigger to auto-set created_by
CREATE OR REPLACE FUNCTION public.partner_leads_set_creator()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.created_by IS NULL THEN
    NEW.created_by := auth.uid();
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_partner_leads_set_creator ON public.partner_leads;
CREATE TRIGGER trg_partner_leads_set_creator
BEFORE INSERT ON public.partner_leads
FOR EACH ROW EXECUTE FUNCTION public.partner_leads_set_creator();

-- Replace SELECT policy with stricter scope
DROP POLICY IF EXISTS partners_select_own_leads ON public.partner_leads;
CREATE POLICY "partners_select_own_or_assigned_leads"
ON public.partner_leads FOR SELECT TO authenticated
USING (
  has_role(auth.uid(),'admin'::app_role)
  OR partner_id = current_partner_id(auth.uid())
  OR created_by = auth.uid()
);

-- 5. Lead assignment logs
CREATE TABLE IF NOT EXISTS public.partner_lead_assignment_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid REFERENCES public.partner_leads(id) ON DELETE CASCADE,
  previous_partner_id uuid,
  new_partner_id uuid,
  assigned_by uuid,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.partner_lead_assignment_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "lead_assignment_logs_admin_only_select"
ON public.partner_lead_assignment_logs FOR SELECT TO authenticated
USING (has_role(auth.uid(),'admin'::app_role));

CREATE POLICY "lead_assignment_logs_admin_only_insert"
ON public.partner_lead_assignment_logs FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(),'admin'::app_role));
