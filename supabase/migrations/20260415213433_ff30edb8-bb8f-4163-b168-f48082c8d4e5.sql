
-- contractor_plan_definitions
CREATE TABLE IF NOT EXISTS public.contractor_plan_definitions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  price_monthly INTEGER NOT NULL DEFAULT 0,
  appointments_included INTEGER NOT NULL DEFAULT 0,
  appointment_type TEXT NOT NULL DEFAULT 'exclusif',
  features JSONB NOT NULL DEFAULT '[]'::jsonb,
  priority_level INTEGER NOT NULL DEFAULT 1,
  territory_access TEXT NOT NULL DEFAULT 'local',
  optimization_level TEXT NOT NULL DEFAULT 'standard',
  differentiator TEXT,
  position_rank INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.contractor_plan_definitions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cpd_public_read" ON public.contractor_plan_definitions FOR SELECT USING (is_active = true);
CREATE POLICY "cpd_admin_all" ON public.contractor_plan_definitions FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- alex_knowledge_plans
CREATE TABLE IF NOT EXISTS public.alex_knowledge_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  allowed_topics TEXT[] NOT NULL DEFAULT '{}',
  forbidden_topics TEXT[] NOT NULL DEFAULT '{}',
  core_positioning TEXT NOT NULL DEFAULT '',
  response_template TEXT,
  language TEXT NOT NULL DEFAULT 'fr',
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_updated TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.alex_knowledge_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "akp_public_read" ON public.alex_knowledge_plans FOR SELECT USING (is_active = true);
CREATE POLICY "akp_admin_all" ON public.alex_knowledge_plans FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Add hallucination tracking to existing alex_response_logs
ALTER TABLE public.alex_response_logs
  ADD COLUMN IF NOT EXISTS hallucination_detected BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS hallucination_terms TEXT[],
  ADD COLUMN IF NOT EXISTS original_message TEXT;

-- alex_hallucination_flags
CREATE TABLE IF NOT EXISTS public.alex_hallucination_flags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  response_log_id UUID REFERENCES public.alex_response_logs(id) ON DELETE CASCADE,
  detected_terms TEXT[] NOT NULL DEFAULT '{}',
  severity TEXT NOT NULL DEFAULT 'low',
  auto_corrected BOOLEAN NOT NULL DEFAULT false,
  corrected_response TEXT,
  context_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.alex_hallucination_flags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ahf_admin_read" ON public.alex_hallucination_flags FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "ahf_insert" ON public.alex_hallucination_flags FOR INSERT WITH CHECK (true);
CREATE INDEX IF NOT EXISTS idx_ahf_severity ON public.alex_hallucination_flags(severity);
