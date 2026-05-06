
-- 1. Update partners table
ALTER TABLE public.partners
  ADD COLUMN IF NOT EXISTS partner_type text DEFAULT 'affiliate'
    CHECK (partner_type IN ('affiliate','certified_partner','territory_partner'));

ALTER TABLE public.partners ALTER COLUMN commission_rate_first_24_months SET DEFAULT 0.10;
ALTER TABLE public.partners ALTER COLUMN commission_rate_lifetime SET DEFAULT 0.00;

-- Migrate existing rows: anyone with old 0.30/0.10 → certified_partner with new rates
UPDATE public.partners
SET partner_type = 'certified_partner',
    commission_rate_first_24_months = 0.20,
    commission_rate_lifetime = 0.05
WHERE partner_type = 'affiliate'
  AND (commission_rate_first_24_months >= 0.20 OR commission_rate_lifetime >= 0.05);

-- 2. Helper: get current partner id for auth user
CREATE OR REPLACE FUNCTION public.current_partner_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.partners WHERE user_id = _user_id LIMIT 1;
$$;

-- 3. partner_leads
CREATE TABLE IF NOT EXISTS public.partner_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  business_name text,
  contact_name text,
  email text,
  phone text,
  website text,
  rbq text,
  city text,
  trade text,
  source text,
  lead_status text NOT NULL DEFAULT 'new_prospect'
    CHECK (lead_status IN (
      'new_prospect','permission_required','contact_authorized','contacted',
      'to_call_back','interested','demo_scheduled','onboarding',
      'payment_pending','active','refused','lost','do_not_contact'
    )),
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low','medium','high','urgent')),
  potential_score integer DEFAULT 0,
  notes text,
  next_follow_up_at timestamptz,
  consent_status text NOT NULL DEFAULT 'permission_required'
    CHECK (consent_status IN (
      'unknown','permission_required','verbal_permission','written_permission',
      'web_form_opt_in','existing_business_relationship','opted_out','do_not_contact'
    )),
  consent_source text,
  consent_method text,
  consent_scope text,
  consent_proof text,
  consent_given_at timestamptz,
  opt_out_at timestamptz,
  opt_out_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_partner_leads_partner_status ON public.partner_leads(partner_id, lead_status);
CREATE INDEX IF NOT EXISTS idx_partner_leads_followup ON public.partner_leads(partner_id, next_follow_up_at);
CREATE INDEX IF NOT EXISTS idx_partner_leads_consent ON public.partner_leads(partner_id, consent_status);

ALTER TABLE public.partner_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "partners_select_own_leads" ON public.partner_leads
  FOR SELECT USING (partner_id = public.current_partner_id(auth.uid()) OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "partners_insert_own_leads" ON public.partner_leads
  FOR INSERT WITH CHECK (partner_id = public.current_partner_id(auth.uid()) OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "partners_update_own_leads" ON public.partner_leads
  FOR UPDATE USING (partner_id = public.current_partner_id(auth.uid()) OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins_delete_leads" ON public.partner_leads
  FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- 4. partner_lead_activities (append-only)
CREATE TABLE IF NOT EXISTS public.partner_lead_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.partner_leads(id) ON DELETE CASCADE,
  partner_id uuid NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  activity_type text NOT NULL,
  direction text,
  subject text,
  body text,
  outcome text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pla_lead ON public.partner_lead_activities(lead_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pla_partner ON public.partner_lead_activities(partner_id, created_at DESC);

ALTER TABLE public.partner_lead_activities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "partners_select_own_activities" ON public.partner_lead_activities
  FOR SELECT USING (partner_id = public.current_partner_id(auth.uid()) OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "partners_insert_own_activities" ON public.partner_lead_activities
  FOR INSERT WITH CHECK (partner_id = public.current_partner_id(auth.uid()) OR public.has_role(auth.uid(), 'admin'));

-- 5. partner_tasks
CREATE TABLE IF NOT EXISTS public.partner_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  lead_id uuid REFERENCES public.partner_leads(id) ON DELETE CASCADE,
  task_type text NOT NULL DEFAULT 'call',
  title text NOT NULL,
  description text,
  due_at timestamptz,
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low','medium','high','urgent')),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','done','cancelled')),
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pt_partner_due ON public.partner_tasks(partner_id, due_at);
CREATE INDEX IF NOT EXISTS idx_pt_lead ON public.partner_tasks(lead_id);

ALTER TABLE public.partner_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "partners_select_own_tasks" ON public.partner_tasks
  FOR SELECT USING (partner_id = public.current_partner_id(auth.uid()) OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "partners_insert_own_tasks" ON public.partner_tasks
  FOR INSERT WITH CHECK (partner_id = public.current_partner_id(auth.uid()) OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "partners_update_own_tasks" ON public.partner_tasks
  FOR UPDATE USING (partner_id = public.current_partner_id(auth.uid()) OR public.has_role(auth.uid(), 'admin'));

-- 6. lead_consent_logs (immutable)
CREATE TABLE IF NOT EXISTS public.lead_consent_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.partner_leads(id) ON DELETE CASCADE,
  partner_id uuid NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  previous_status text,
  new_status text NOT NULL,
  consent_method text,
  proof text,
  changed_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lcl_lead ON public.lead_consent_logs(lead_id, created_at DESC);

ALTER TABLE public.lead_consent_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "partners_select_own_consent_logs" ON public.lead_consent_logs
  FOR SELECT USING (partner_id = public.current_partner_id(auth.uid()) OR public.has_role(auth.uid(), 'admin'));
-- No INSERT/UPDATE/DELETE policies for clients — only triggers and edge functions (service role) write

-- 7. Triggers
CREATE OR REPLACE FUNCTION public.partner_leads_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_partner_leads_updated_at ON public.partner_leads;
CREATE TRIGGER trg_partner_leads_updated_at
  BEFORE UPDATE ON public.partner_leads
  FOR EACH ROW EXECUTE FUNCTION public.partner_leads_set_updated_at();

CREATE OR REPLACE FUNCTION public.log_consent_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF (TG_OP = 'INSERT' AND NEW.consent_status IS NOT NULL)
     OR (TG_OP = 'UPDATE' AND NEW.consent_status IS DISTINCT FROM OLD.consent_status) THEN
    INSERT INTO public.lead_consent_logs(lead_id, partner_id, previous_status, new_status, consent_method, proof, changed_by)
    VALUES (NEW.id, NEW.partner_id, CASE WHEN TG_OP='UPDATE' THEN OLD.consent_status ELSE NULL END,
            NEW.consent_status, NEW.consent_method, NEW.consent_proof, auth.uid());
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_consent_change ON public.partner_leads;
CREATE TRIGGER trg_log_consent_change
  AFTER INSERT OR UPDATE OF consent_status ON public.partner_leads
  FOR EACH ROW EXECUTE FUNCTION public.log_consent_change();
