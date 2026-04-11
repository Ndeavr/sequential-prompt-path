
-- 1. role_permissions table
CREATE TABLE public.role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role_code text NOT NULL,
  permission_code text NOT NULL,
  is_allowed boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(role_code, permission_code)
);
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read permissions" ON public.role_permissions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage permissions" ON public.role_permissions FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 2. scanner_session_modes reference table
CREATE TABLE public.scanner_session_modes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  role_code text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.scanner_session_modes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read modes" ON public.scanner_session_modes FOR SELECT TO authenticated USING (true);

-- 3. scanner_sessions table
CREATE TABLE public.scanner_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scanned_by_user_id uuid NOT NULL,
  active_role_code text NOT NULL,
  session_mode_code text NOT NULL REFERENCES public.scanner_session_modes(code),
  session_status text NOT NULL DEFAULT 'started',
  contractor_lead_id uuid REFERENCES public.contractor_leads(id),
  contractor_id uuid REFERENCES public.contractors(id),
  business_card_import_id uuid REFERENCES public.business_card_imports(id),
  attribution_status text NOT NULL DEFAULT 'pending',
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.scanner_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own sessions" ON public.scanner_sessions FOR SELECT TO authenticated USING (scanned_by_user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can create own sessions" ON public.scanner_sessions FOR INSERT TO authenticated WITH CHECK (scanned_by_user_id = auth.uid());
CREATE POLICY "Users can update own sessions" ON public.scanner_sessions FOR UPDATE TO authenticated USING (scanned_by_user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- 4. scanner_session_attributions table
CREATE TABLE public.scanner_session_attributions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scanner_session_id uuid NOT NULL REFERENCES public.scanner_sessions(id) ON DELETE CASCADE,
  attribution_type text NOT NULL DEFAULT 'unassigned',
  attributed_user_id uuid,
  source_role_code text NOT NULL,
  confidence_score integer DEFAULT 100,
  resolution_status text NOT NULL DEFAULT 'auto_assigned',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.scanner_session_attributions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own attributions" ON public.scanner_session_attributions FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.scanner_sessions ss WHERE ss.id = scanner_session_id AND (ss.scanned_by_user_id = auth.uid() OR public.has_role(auth.uid(), 'admin')))
);
CREATE POLICY "Users can create attributions for own sessions" ON public.scanner_session_attributions FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM public.scanner_sessions ss WHERE ss.id = scanner_session_id AND ss.scanned_by_user_id = auth.uid())
);

-- 5. Add columns to contractor_leads
ALTER TABLE public.contractor_leads
  ADD COLUMN IF NOT EXISTS created_by_role_code text,
  ADD COLUMN IF NOT EXISTS scanner_session_id uuid REFERENCES public.scanner_sessions(id),
  ADD COLUMN IF NOT EXISTS attribution_type text DEFAULT 'unassigned',
  ADD COLUMN IF NOT EXISTS attributed_user_id uuid;

-- 6. Indexes
CREATE INDEX idx_scanner_sessions_user ON public.scanner_sessions(scanned_by_user_id);
CREATE INDEX idx_scanner_sessions_mode ON public.scanner_sessions(session_mode_code);
CREATE INDEX idx_scanner_sessions_status ON public.scanner_sessions(session_status);
CREATE INDEX idx_scanner_attributions_session ON public.scanner_session_attributions(scanner_session_id);
CREATE INDEX idx_role_permissions_role ON public.role_permissions(role_code);

-- 7. Seed scanner_session_modes
INSERT INTO public.scanner_session_modes (code, name, description, role_code) VALUES
  ('admin_assist', 'Administration', 'Création, import, assistance, bypass. Attribution manuelle possible.', 'admin'),
  ('field_rep_activation', 'Activation terrain', 'Activation immédiate entrepreneur en face à face.', 'representative'),
  ('affiliate_referral_capture', 'Capture affilié', 'Création prospect attribué à l''affilié pour suivi ou conversion.', 'affiliate'),
  ('contractor_self_or_team_capture', 'Mon entreprise', 'Scanner sa carte, celle d''un collègue, partenaire ou contact.', 'contractor');

-- 8. Seed role_permissions
INSERT INTO public.role_permissions (role_code, permission_code, is_allowed) VALUES
  ('admin', 'scan_business_cards', true),
  ('admin', 'access_admin_scanner_mode', true),
  ('admin', 'assign_scanner_attribution', true),
  ('admin', 'override_scanner_attribution', true),
  ('admin', 'manage_scanner_permissions', true),
  ('representative', 'scan_business_cards', true),
  ('representative', 'access_field_rep_scanner_mode', true),
  ('representative', 'create_field_leads', true),
  ('representative', 'activate_contractor_on_site', true),
  ('affiliate', 'scan_business_cards', true),
  ('affiliate', 'access_affiliate_scanner_mode', true),
  ('affiliate', 'create_affiliate_referrals', true),
  ('contractor', 'scan_business_cards', true),
  ('contractor', 'access_contractor_scanner_mode', true),
  ('contractor', 'create_contractor_contacts', true);

-- 9. Trigger for updated_at
CREATE TRIGGER set_scanner_sessions_updated_at BEFORE UPDATE ON public.scanner_sessions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_scanner_attributions_updated_at BEFORE UPDATE ON public.scanner_session_attributions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_role_permissions_updated_at BEFORE UPDATE ON public.role_permissions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
