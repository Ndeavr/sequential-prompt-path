
CREATE TABLE public.funnel_debug_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  started_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  lead_phone text NOT NULL,
  lead_name text,
  lead_category text,
  lead_city text,
  message_sid text,
  trace jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'running',
  first_break_step text,
  first_break_reason text,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.funnel_debug_runs TO authenticated;
GRANT ALL ON public.funnel_debug_runs TO service_role;

ALTER TABLE public.funnel_debug_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins read funnel_debug_runs"
  ON public.funnel_debug_runs FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admins write funnel_debug_runs"
  ON public.funnel_debug_runs FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_funnel_debug_runs_started_at ON public.funnel_debug_runs (started_at DESC);
