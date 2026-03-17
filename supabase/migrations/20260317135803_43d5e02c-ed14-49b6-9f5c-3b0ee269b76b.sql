
-- ═══ CONTRACTOR ENGINE TABLES ═══

-- 1. Contractor Capabilities (what they CAN do)
CREATE TABLE public.contractor_capabilities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id UUID NOT NULL REFERENCES public.contractors(id) ON DELETE CASCADE,
  capability_type TEXT NOT NULL DEFAULT 'service',
  category_slug TEXT,
  service_slug TEXT,
  material_slug TEXT,
  structure_type TEXT,
  building_type TEXT,
  confidence NUMERIC DEFAULT 1.0,
  source TEXT DEFAULT 'declared',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Contractor Exclusions (what they REFUSE)
CREATE TABLE public.contractor_exclusions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id UUID NOT NULL REFERENCES public.contractors(id) ON DELETE CASCADE,
  exclusion_type TEXT NOT NULL DEFAULT 'service',
  category_slug TEXT,
  service_slug TEXT,
  material_slug TEXT,
  structure_type TEXT,
  building_type TEXT,
  reason_fr TEXT,
  reason_en TEXT,
  source TEXT DEFAULT 'declared',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Contractor Execution Models
CREATE TABLE public.contractor_execution_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id UUID NOT NULL REFERENCES public.contractors(id) ON DELETE CASCADE,
  execution_mode TEXT NOT NULL DEFAULT 'direct',
  works_as_subcontractor BOOLEAN DEFAULT false,
  accepts_subcontractors BOOLEAN DEFAULT false,
  preferred_project_sizes TEXT[] DEFAULT '{}',
  max_distance_km INTEGER DEFAULT 50,
  availability_status TEXT DEFAULT 'available',
  notes TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Subcontract Requests
CREATE TABLE public.subcontract_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requesting_contractor_id UUID NOT NULL REFERENCES public.contractors(id) ON DELETE CASCADE,
  project_id UUID,
  appointment_id UUID REFERENCES public.appointments(id),
  scope_description TEXT NOT NULL,
  scope_slugs TEXT[] DEFAULT '{}',
  material_slugs TEXT[] DEFAULT '{}',
  structure_type TEXT,
  city_slug TEXT,
  status TEXT DEFAULT 'open',
  matched_contractor_id UUID REFERENCES public.contractors(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Contractor Relationships (partner network)
CREATE TABLE public.contractor_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id UUID NOT NULL REFERENCES public.contractors(id) ON DELETE CASCADE,
  partner_contractor_id UUID NOT NULL REFERENCES public.contractors(id) ON DELETE CASCADE,
  relationship_type TEXT DEFAULT 'partner',
  status TEXT DEFAULT 'active',
  internal_rating NUMERIC DEFAULT 0,
  success_rate NUMERIC DEFAULT 0,
  collaboration_count INTEGER DEFAULT 0,
  is_favorite BOOLEAN DEFAULT false,
  is_blocked BOOLEAN DEFAULT false,
  private_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(contractor_id, partner_contractor_id)
);

-- 6. Project Teams
CREATE TABLE public.project_teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_contractor_id UUID NOT NULL REFERENCES public.contractors(id) ON DELETE CASCADE,
  project_id UUID,
  appointment_id UUID REFERENCES public.appointments(id),
  team_name TEXT,
  status TEXT DEFAULT 'draft',
  compatibility_score NUMERIC DEFAULT 0,
  confidence_score NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 7. Project Team Members
CREATE TABLE public.project_team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.project_teams(id) ON DELETE CASCADE,
  contractor_id UUID NOT NULL REFERENCES public.contractors(id) ON DELETE CASCADE,
  role_label TEXT NOT NULL,
  scope_slugs TEXT[] DEFAULT '{}',
  status TEXT DEFAULT 'invited',
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 8. Smart Decline Logs
CREATE TABLE public.smart_decline_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id UUID NOT NULL REFERENCES public.contractors(id) ON DELETE CASCADE,
  appointment_id UUID REFERENCES public.appointments(id),
  decline_type TEXT NOT NULL DEFAULT 'simple',
  redirect_contractor_id UUID REFERENCES public.contractors(id),
  reason_code TEXT,
  reason_text TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ═══ RLS ═══
ALTER TABLE public.contractor_capabilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contractor_exclusions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contractor_execution_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subcontract_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contractor_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.smart_decline_logs ENABLE ROW LEVEL SECURITY;

-- Capabilities: owner + admin
CREATE POLICY "contractor_capabilities_own" ON public.contractor_capabilities
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.contractors c WHERE c.id = contractor_id AND c.user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  );

-- Exclusions: owner + admin
CREATE POLICY "contractor_exclusions_own" ON public.contractor_exclusions
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.contractors c WHERE c.id = contractor_id AND c.user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  );

-- Execution models: owner + admin
CREATE POLICY "contractor_execution_models_own" ON public.contractor_execution_models
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.contractors c WHERE c.id = contractor_id AND c.user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  );

-- Subcontract requests: requesting contractor + admin
CREATE POLICY "subcontract_requests_own" ON public.subcontract_requests
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.contractors c WHERE c.id = requesting_contractor_id AND c.user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  );

-- Relationships: owner + admin
CREATE POLICY "contractor_relationships_own" ON public.contractor_relationships
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.contractors c WHERE c.id = contractor_id AND c.user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  );

-- Project teams: lead contractor + admin
CREATE POLICY "project_teams_own" ON public.project_teams
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.contractors c WHERE c.id = lead_contractor_id AND c.user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  );

-- Team members: team lead + member + admin
CREATE POLICY "project_team_members_access" ON public.project_team_members
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.project_teams pt
      JOIN public.contractors c ON c.id = pt.lead_contractor_id
      WHERE pt.id = team_id AND c.user_id = auth.uid()
    )
    OR EXISTS (SELECT 1 FROM public.contractors c WHERE c.id = contractor_id AND c.user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  );

-- Smart decline logs: owner + admin
CREATE POLICY "smart_decline_logs_own" ON public.smart_decline_logs
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.contractors c WHERE c.id = contractor_id AND c.user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  );

-- Indexes
CREATE INDEX idx_contractor_capabilities_contractor ON public.contractor_capabilities(contractor_id);
CREATE INDEX idx_contractor_exclusions_contractor ON public.contractor_exclusions(contractor_id);
CREATE INDEX idx_contractor_execution_models_contractor ON public.contractor_execution_models(contractor_id);
CREATE INDEX idx_subcontract_requests_contractor ON public.subcontract_requests(requesting_contractor_id);
CREATE INDEX idx_contractor_relationships_contractor ON public.contractor_relationships(contractor_id);
CREATE INDEX idx_project_teams_lead ON public.project_teams(lead_contractor_id);
CREATE INDEX idx_project_team_members_team ON public.project_team_members(team_id);
CREATE INDEX idx_smart_decline_logs_contractor ON public.smart_decline_logs(contractor_id);
