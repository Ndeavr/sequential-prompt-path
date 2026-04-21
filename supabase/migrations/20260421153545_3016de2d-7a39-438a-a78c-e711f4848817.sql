
-- Enums
CREATE TYPE public.aipp_analysis_status AS ENUM ('pending','running','partial','complete','failed');
CREATE TYPE public.aipp_confidence_level AS ENUM ('low','medium','high');
CREATE TYPE public.aipp_job_type AS ENUM ('full_audit','refresh_scores','website_scan','google_scan','verification_scan');
CREATE TYPE public.aipp_job_status AS ENUM ('queued','running','complete','failed');

-- Audits
CREATE TABLE public.contractor_aipp_audits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id uuid NOT NULL REFERENCES public.contractors(id) ON DELETE CASCADE,
  analysis_status public.aipp_analysis_status NOT NULL DEFAULT 'pending',
  confidence_level public.aipp_confidence_level NOT NULL DEFAULT 'low',
  overall_score numeric(5,2) NULL,
  web_score numeric(5,2) NOT NULL DEFAULT 0,
  google_score numeric(5,2) NOT NULL DEFAULT 0,
  trust_score numeric(5,2) NOT NULL DEFAULT 0,
  ai_visibility_score numeric(5,2) NOT NULL DEFAULT 0,
  conversion_score numeric(5,2) NOT NULL DEFAULT 0,
  sources_used jsonb NOT NULL DEFAULT '[]'::jsonb,
  blockers jsonb NOT NULL DEFAULT '[]'::jsonb,
  strengths jsonb NOT NULL DEFAULT '[]'::jsonb,
  recommendations jsonb NOT NULL DEFAULT '[]'::jsonb,
  raw_signals jsonb NOT NULL DEFAULT '{}'::jsonb,
  scoring_details jsonb NOT NULL DEFAULT '{}'::jsonb,
  validated_sources_count int NOT NULL DEFAULT 0,
  validated_signals_count int NOT NULL DEFAULT 0,
  total_possible_signals_count int NOT NULL DEFAULT 0,
  potential_score numeric(5,2) NULL,
  started_at timestamptz NULL,
  completed_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_real_aipp_audits_contractor ON public.contractor_aipp_audits(contractor_id);
CREATE INDEX idx_real_aipp_audits_status ON public.contractor_aipp_audits(analysis_status);
CREATE INDEX idx_real_aipp_audits_created ON public.contractor_aipp_audits(created_at DESC);

-- Signal logs
CREATE TABLE public.contractor_aipp_signal_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id uuid NOT NULL REFERENCES public.contractors(id) ON DELETE CASCADE,
  audit_id uuid NULL REFERENCES public.contractor_aipp_audits(id) ON DELETE CASCADE,
  signal_key text NOT NULL,
  signal_group text NOT NULL,
  signal_value jsonb NOT NULL DEFAULT '{}'::jsonb,
  normalized_value jsonb NOT NULL DEFAULT '{}'::jsonb,
  source text NOT NULL,
  status text NOT NULL DEFAULT 'detected',
  error_message text NULL,
  collected_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_real_aipp_signals_contractor ON public.contractor_aipp_signal_logs(contractor_id);
CREATE INDEX idx_real_aipp_signals_audit ON public.contractor_aipp_signal_logs(audit_id);
CREATE INDEX idx_real_aipp_signals_key ON public.contractor_aipp_signal_logs(signal_key);

-- Jobs
CREATE TABLE public.contractor_aipp_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id uuid NOT NULL REFERENCES public.contractors(id) ON DELETE CASCADE,
  audit_id uuid NULL REFERENCES public.contractor_aipp_audits(id) ON DELETE SET NULL,
  job_type public.aipp_job_type NOT NULL,
  status public.aipp_job_status NOT NULL DEFAULT 'queued',
  progress_percent int NOT NULL DEFAULT 0,
  step_key text NULL,
  logs jsonb NOT NULL DEFAULT '[]'::jsonb,
  error_message text NULL,
  started_at timestamptz NULL,
  completed_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_real_aipp_jobs_contractor ON public.contractor_aipp_jobs(contractor_id);
CREATE INDEX idx_real_aipp_jobs_status ON public.contractor_aipp_jobs(status);
CREATE INDEX idx_real_aipp_jobs_created ON public.contractor_aipp_jobs(created_at DESC);

-- Updated-at triggers
CREATE OR REPLACE FUNCTION public.set_aipp_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_aipp_real_audits_updated
BEFORE UPDATE ON public.contractor_aipp_audits
FOR EACH ROW EXECUTE FUNCTION public.set_aipp_updated_at();

CREATE TRIGGER trg_aipp_real_jobs_updated
BEFORE UPDATE ON public.contractor_aipp_jobs
FOR EACH ROW EXECUTE FUNCTION public.set_aipp_updated_at();

-- RLS
ALTER TABLE public.contractor_aipp_audits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contractor_aipp_signal_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contractor_aipp_jobs ENABLE ROW LEVEL SECURITY;

-- Public read for audits
CREATE POLICY "Anyone can view aipp audits"
ON public.contractor_aipp_audits FOR SELECT USING (true);

-- Signal logs: owner
CREATE POLICY "Owner can view own signal logs"
ON public.contractor_aipp_signal_logs FOR SELECT
TO authenticated
USING (contractor_id IN (SELECT id FROM public.contractors WHERE user_id = auth.uid()));

-- Jobs: owner
CREATE POLICY "Owner can view own aipp jobs"
ON public.contractor_aipp_jobs FOR SELECT
TO authenticated
USING (contractor_id IN (SELECT id FROM public.contractors WHERE user_id = auth.uid()));

-- Admin full access
CREATE POLICY "Admin full access aipp audits"
ON public.contractor_aipp_audits FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin full access aipp signal logs"
ON public.contractor_aipp_signal_logs FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin full access aipp jobs"
ON public.contractor_aipp_jobs FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
