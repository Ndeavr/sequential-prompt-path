
-- dna_fit_results table
CREATE TABLE IF NOT EXISTS public.dna_fit_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  contractor_id uuid NOT NULL REFERENCES public.contractors(id) ON DELETE CASCADE,
  property_id uuid NULL,
  homeowner_dna_type text NOT NULL,
  contractor_dna_type text NOT NULL,
  dna_fit_score numeric NOT NULL DEFAULT 0,
  compatibility_label text NOT NULL DEFAULT 'unknown',
  matching_traits jsonb NOT NULL DEFAULT '[]'::jsonb,
  watchout_traits jsonb NOT NULL DEFAULT '[]'::jsonb,
  explanation_fr jsonb NOT NULL DEFAULT '{}'::jsonb,
  explanation_en jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS dna_fit_results_unique_idx
ON public.dna_fit_results(user_id, contractor_id, COALESCE(property_id, '00000000-0000-0000-0000-000000000000'::uuid));

-- RLS
ALTER TABLE public.dna_fit_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own DNA fit results" ON public.dna_fit_results
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all DNA fit results" ON public.dna_fit_results
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role manages DNA fit results" ON public.dna_fit_results
  FOR ALL TO service_role USING (true);

-- dna_profile_summary view
CREATE OR REPLACE VIEW public.dna_profile_summary AS
SELECT
  'homeowner' AS actor_type,
  h.user_id::text AS actor_id,
  h.property_id,
  NULL::uuid AS contractor_id,
  h.dna_type, h.dna_label_fr, h.dna_label_en,
  h.traits, h.scores, h.confidence, h.updated_at
FROM public.homeowner_dna_profiles h
UNION ALL
SELECT
  'contractor' AS actor_type,
  c.contractor_id::text AS actor_id,
  NULL::uuid AS property_id,
  c.contractor_id,
  c.dna_type, c.dna_label_fr, c.dna_label_en,
  c.traits, c.scores, c.confidence, c.updated_at
FROM public.contractor_dna_profiles c;

-- Updated_at triggers
CREATE TRIGGER trg_homeowner_dna_updated_at
  BEFORE UPDATE ON public.homeowner_dna_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_contractor_dna_updated_at
  BEFORE UPDATE ON public.contractor_dna_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_dna_fit_results_updated_at
  BEFORE UPDATE ON public.dna_fit_results
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
