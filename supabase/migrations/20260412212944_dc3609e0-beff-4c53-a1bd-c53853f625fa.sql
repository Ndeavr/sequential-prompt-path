
-- =============================================
-- City-First Outbound Orchestration Schema
-- =============================================

-- 1. Agent City Targets
CREATE TABLE public.agent_city_targets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  city_name text NOT NULL,
  city_slug text NOT NULL UNIQUE,
  priority_score numeric NOT NULL DEFAULT 50,
  status text NOT NULL DEFAULT 'draft',
  notes text
);
ALTER TABLE public.agent_city_targets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins full access on agent_city_targets" ON public.agent_city_targets FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 2. Agent City Service Targets
CREATE TABLE public.agent_city_service_targets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  city_target_id uuid NOT NULL REFERENCES public.agent_city_targets(id) ON DELETE CASCADE,
  service_name text NOT NULL,
  specialty_slug text NOT NULL,
  combined_market_key text NOT NULL UNIQUE,
  priority_score numeric NOT NULL DEFAULT 50,
  estimated_lead_volume integer DEFAULT 0,
  estimated_contract_value numeric,
  execution_rank integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending'
);
ALTER TABLE public.agent_city_service_targets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins full access on agent_city_service_targets" ON public.agent_city_service_targets FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE INDEX idx_city_service_targets_city ON public.agent_city_service_targets(city_target_id);

-- 3. City Clusters
CREATE TABLE public.outbound_city_clusters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  city_target_id uuid NOT NULL REFERENCES public.agent_city_targets(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'draft',
  services_count integer NOT NULL DEFAULT 0,
  approved_services_count integer NOT NULL DEFAULT 0,
  active_wave_count integer NOT NULL DEFAULT 0,
  completed_wave_count integer NOT NULL DEFAULT 0
);
ALTER TABLE public.outbound_city_clusters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins full access on outbound_city_clusters" ON public.outbound_city_clusters FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 4. City Execution Waves
CREATE TABLE public.outbound_city_execution_waves (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  city_cluster_id uuid NOT NULL REFERENCES public.outbound_city_clusters(id) ON DELETE CASCADE,
  wave_number integer NOT NULL DEFAULT 1,
  label text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'planned',
  mailbox_id uuid,
  daily_send_limit integer NOT NULL DEFAULT 50,
  scheduled_start_at timestamptz,
  started_at timestamptz,
  finished_at timestamptz
);
ALTER TABLE public.outbound_city_execution_waves ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins full access on outbound_city_execution_waves" ON public.outbound_city_execution_waves FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 5. Run Stage Transitions (audit trail)
CREATE TABLE public.outbound_run_stage_transitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  run_id uuid NOT NULL,
  from_stage text,
  to_stage text NOT NULL,
  transition_status text NOT NULL DEFAULT 'success',
  message text,
  payload jsonb DEFAULT '{}'::jsonb
);
ALTER TABLE public.outbound_run_stage_transitions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins full access on outbound_run_stage_transitions" ON public.outbound_run_stage_transitions FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE INDEX idx_run_stage_transitions_run ON public.outbound_run_stage_transitions(run_id);

-- 6. Qualification Runs
CREATE TABLE public.outbound_qualification_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  candidate_count integer NOT NULL DEFAULT 0,
  qualified_count integer NOT NULL DEFAULT 0,
  rejected_count integer NOT NULL DEFAULT 0,
  started_at timestamptz,
  finished_at timestamptz,
  logs jsonb DEFAULT '{}'::jsonb
);
ALTER TABLE public.outbound_qualification_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins full access on outbound_qualification_runs" ON public.outbound_qualification_runs FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 7. Pipeline Errors
CREATE TABLE public.outbound_pipeline_errors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  run_id uuid NOT NULL,
  stage text NOT NULL,
  error_code text NOT NULL DEFAULT 'unknown',
  error_message text,
  is_blocking boolean NOT NULL DEFAULT false,
  metadata jsonb DEFAULT '{}'::jsonb
);
ALTER TABLE public.outbound_pipeline_errors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins full access on outbound_pipeline_errors" ON public.outbound_pipeline_errors FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE INDEX idx_pipeline_errors_run ON public.outbound_pipeline_errors(run_id);

-- 8. Extend outbound_autopilot_runs
ALTER TABLE public.outbound_autopilot_runs
  ADD COLUMN IF NOT EXISTS city_target_id uuid REFERENCES public.agent_city_targets(id),
  ADD COLUMN IF NOT EXISTS city_service_target_id uuid REFERENCES public.agent_city_service_targets(id),
  ADD COLUMN IF NOT EXISTS city_execution_wave_id uuid REFERENCES public.outbound_city_execution_waves(id),
  ADD COLUMN IF NOT EXISTS last_transition_at timestamptz,
  ADD COLUMN IF NOT EXISTS diagnostic_summary jsonb DEFAULT '{}'::jsonb;

-- 9. Extend outbound_scraping_runs
ALTER TABLE public.outbound_scraping_runs
  ADD COLUMN IF NOT EXISTS run_id uuid,
  ADD COLUMN IF NOT EXISTS normalized_entity_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS lead_candidate_count integer DEFAULT 0;

-- 10. Seed Laval
INSERT INTO public.agent_city_targets (city_name, city_slug, priority_score, status) VALUES
  ('Laval', 'laval', 95, 'active');

INSERT INTO public.agent_city_service_targets (city_target_id, service_name, specialty_slug, combined_market_key, priority_score, estimated_lead_volume, execution_rank, status)
SELECT ct.id, s.service_name, s.specialty_slug, s.combined_market_key, s.priority_score, s.estimated_lead_volume, s.execution_rank, 'ready'
FROM public.agent_city_targets ct
CROSS JOIN (VALUES
  ('Toiture', 'couvreur', 'toiture-laval', 90, 80, 1),
  ('Asphalte', 'asphalteur', 'asphalte-laval', 85, 60, 2),
  ('Plomberie', 'plombier', 'plomberie-laval', 80, 70, 3),
  ('Émondage', 'emondeur', 'emondage-laval', 75, 45, 4),
  ('Isolation', 'isolateur', 'isolation-laval', 70, 55, 5)
) AS s(service_name, specialty_slug, combined_market_key, priority_score, estimated_lead_volume, execution_rank)
WHERE ct.city_slug = 'laval';
