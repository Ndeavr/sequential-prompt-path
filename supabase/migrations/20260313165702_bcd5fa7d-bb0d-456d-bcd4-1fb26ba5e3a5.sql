
CREATE TABLE public.verification_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  input_type text NOT NULL,
  input_value text NOT NULL,
  project_description text,
  contractor_identity jsonb DEFAULT '{}'::jsonb,
  rbq_validation jsonb DEFAULT '{}'::jsonb,
  neq_validation jsonb DEFAULT '{}'::jsonb,
  license_scope jsonb DEFAULT '{}'::jsonb,
  visual_validation jsonb DEFAULT '{}'::jsonb,
  risk_signals jsonb DEFAULT '[]'::jsonb,
  trust_score integer,
  license_fit_score integer,
  verdict text,
  matched_contractor_id uuid REFERENCES public.contractors(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.verification_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own reports" ON public.verification_reports
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Users can insert own reports" ON public.verification_reports
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "Anon can insert reports" ON public.verification_reports
  FOR INSERT TO anon WITH CHECK (user_id IS NULL);

CREATE POLICY "Anon can view own session reports" ON public.verification_reports
  FOR SELECT TO anon USING (user_id IS NULL);

CREATE POLICY "Admins full access" ON public.verification_reports
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
