
CREATE TABLE public.company_future_analysis (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID,
  contractor_id UUID,
  current_score NUMERIC,
  current_visibility NUMERIC,
  current_authority NUMERIC,
  scenario_no_change JSONB NOT NULL DEFAULT '{}'::jsonb,
  scenario_growth JSONB NOT NULL DEFAULT '{}'::jsonb,
  scenario_unpro JSONB NOT NULL DEFAULT '{}'::jsonb,
  strengths JSONB NOT NULL DEFAULT '[]'::jsonb,
  weaknesses JSONB NOT NULL DEFAULT '[]'::jsonb,
  opportunities JSONB NOT NULL DEFAULT '[]'::jsonb,
  timeline_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  ab_variant_copy TEXT,
  ab_variant_order TEXT,
  ab_variant_cta TEXT,
  ab_variant_sms TEXT,
  ai_model_used TEXT,
  confidence_score NUMERIC,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_cfa_company ON public.company_future_analysis(company_id);
CREATE INDEX idx_cfa_contractor ON public.company_future_analysis(contractor_id);
CREATE INDEX idx_cfa_generated_at ON public.company_future_analysis(generated_at DESC);

GRANT SELECT ON public.company_future_analysis TO authenticated;
GRANT ALL ON public.company_future_analysis TO service_role;

ALTER TABLE public.company_future_analysis ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage all future analyses"
ON public.company_future_analysis
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Contractors view their own future analysis"
ON public.company_future_analysis
FOR SELECT
TO authenticated
USING (
  contractor_id IN (
    SELECT id FROM public.contractors WHERE user_id = auth.uid()
  )
);

CREATE OR REPLACE FUNCTION public.update_company_future_analysis_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_cfa_updated_at
BEFORE UPDATE ON public.company_future_analysis
FOR EACH ROW EXECUTE FUNCTION public.update_company_future_analysis_updated_at();
