
-- =============================================
-- UNPRO Domain Intelligence Engine — Schema
-- =============================================

-- 1. contractor_domains
CREATE TABLE public.contractor_domains (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id uuid NOT NULL REFERENCES public.contractors(id) ON DELETE CASCADE,
  raw_input text NOT NULL,
  normalized_domain text NOT NULL,
  root_domain text,
  full_url text,
  preferred_hostname text,
  protocol_detected text,
  submitted_path text,
  is_www boolean DEFAULT false,
  subdomain_if_any text,
  is_primary boolean DEFAULT false,
  verification_status text DEFAULT 'pending',
  live_status text DEFAULT 'unknown',
  dns_status text DEFAULT 'unknown',
  ssl_status text DEFAULT 'unknown',
  indexability_status text DEFAULT 'unknown',
  structured_data_status text DEFAULT 'unknown',
  hosting_provider text,
  hosting_confidence numeric,
  technical_score integer,
  seo_score integer,
  aiseo_score integer,
  authority_score integer,
  indexing_readiness_score integer,
  confidence_score integer,
  final_url text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  last_checked_at timestamptz
);

CREATE INDEX idx_contractor_domains_contractor ON public.contractor_domains(contractor_id);
CREATE INDEX idx_contractor_domains_domain ON public.contractor_domains(normalized_domain);

-- 2. contractor_domain_checks
CREATE TABLE public.contractor_domain_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_domain_id uuid NOT NULL REFERENCES public.contractor_domains(id) ON DELETE CASCADE,
  check_started_at timestamptz DEFAULT now(),
  check_completed_at timestamptz,
  run_status text DEFAULT 'running',
  dns_json jsonb DEFAULT '{}'::jsonb,
  hosting_json jsonb DEFAULT '{}'::jsonb,
  ssl_json jsonb DEFAULT '{}'::jsonb,
  accessibility_json jsonb DEFAULT '{}'::jsonb,
  indexability_json jsonb DEFAULT '{}'::jsonb,
  seo_json jsonb DEFAULT '{}'::jsonb,
  structured_data_json jsonb DEFAULT '{}'::jsonb,
  aiseo_json jsonb DEFAULT '{}'::jsonb,
  authority_json jsonb DEFAULT '{}'::jsonb,
  recommendations_json jsonb DEFAULT '[]'::jsonb,
  generated_homepage_seo_json jsonb DEFAULT '{}'::jsonb,
  raw_headers_json jsonb DEFAULT '{}'::jsonb,
  raw_html_excerpt text,
  final_status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_domain_checks_domain ON public.contractor_domain_checks(contractor_domain_id);

-- 3. contractor_domain_deltas
CREATE TABLE public.contractor_domain_deltas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_domain_id uuid NOT NULL REFERENCES public.contractor_domains(id) ON DELETE CASCADE,
  previous_check_id uuid REFERENCES public.contractor_domain_checks(id),
  current_check_id uuid REFERENCES public.contractor_domain_checks(id),
  technical_delta integer DEFAULT 0,
  seo_delta integer DEFAULT 0,
  aiseo_delta integer DEFAULT 0,
  authority_delta integer DEFAULT 0,
  key_improvements_json jsonb DEFAULT '[]'::jsonb,
  new_issues_json jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- 4. contractor_domain_admin_notes
CREATE TABLE public.contractor_domain_admin_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_domain_id uuid NOT NULL REFERENCES public.contractor_domains(id) ON DELETE CASCADE,
  admin_user_id uuid NOT NULL,
  note text NOT NULL,
  note_type text DEFAULT 'general',
  created_at timestamptz DEFAULT now()
);

-- 5. contractor_domain_events
CREATE TABLE public.contractor_domain_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_domain_id uuid NOT NULL REFERENCES public.contractor_domains(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  event_payload_json jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_domain_events_domain ON public.contractor_domain_events(contractor_domain_id);

-- updated_at triggers
CREATE TRIGGER set_contractor_domains_updated_at
  BEFORE UPDATE ON public.contractor_domains
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS
ALTER TABLE public.contractor_domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contractor_domain_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contractor_domain_deltas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contractor_domain_admin_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contractor_domain_events ENABLE ROW LEVEL SECURITY;

-- contractor_domains policies
CREATE POLICY "contractors_read_own_domains" ON public.contractor_domains
  FOR SELECT TO authenticated
  USING (
    contractor_id IN (SELECT id FROM public.contractors WHERE user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "contractors_insert_own_domains" ON public.contractor_domains
  FOR INSERT TO authenticated
  WITH CHECK (
    contractor_id IN (SELECT id FROM public.contractors WHERE user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "contractors_update_own_domains" ON public.contractor_domains
  FOR UPDATE TO authenticated
  USING (
    contractor_id IN (SELECT id FROM public.contractors WHERE user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "contractors_delete_own_domains" ON public.contractor_domains
  FOR DELETE TO authenticated
  USING (
    contractor_id IN (SELECT id FROM public.contractors WHERE user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  );

-- contractor_domain_checks policies
CREATE POLICY "read_own_domain_checks" ON public.contractor_domain_checks
  FOR SELECT TO authenticated
  USING (
    contractor_domain_id IN (
      SELECT cd.id FROM public.contractor_domains cd
      JOIN public.contractors c ON c.id = cd.contractor_id
      WHERE c.user_id = auth.uid()
    )
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "service_insert_domain_checks" ON public.contractor_domain_checks
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- contractor_domain_deltas policies
CREATE POLICY "read_own_domain_deltas" ON public.contractor_domain_deltas
  FOR SELECT TO authenticated
  USING (
    contractor_domain_id IN (
      SELECT cd.id FROM public.contractor_domains cd
      JOIN public.contractors c ON c.id = cd.contractor_id
      WHERE c.user_id = auth.uid()
    )
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "service_insert_domain_deltas" ON public.contractor_domain_deltas
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- contractor_domain_admin_notes policies
CREATE POLICY "admin_full_access_notes" ON public.contractor_domain_admin_notes
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- contractor_domain_events policies
CREATE POLICY "read_own_domain_events" ON public.contractor_domain_events
  FOR SELECT TO authenticated
  USING (
    contractor_domain_id IN (
      SELECT cd.id FROM public.contractor_domains cd
      JOIN public.contractors c ON c.id = cd.contractor_id
      WHERE c.user_id = auth.uid()
    )
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "service_insert_domain_events" ON public.contractor_domain_events
  FOR INSERT TO authenticated
  WITH CHECK (true);
