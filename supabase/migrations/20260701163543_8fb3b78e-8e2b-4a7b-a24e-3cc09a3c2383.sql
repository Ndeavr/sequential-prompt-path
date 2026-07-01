CREATE TABLE IF NOT EXISTS public.outreach_repair_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL,
  action text NOT NULL,
  dry_run boolean NOT NULL DEFAULT true,
  before_count integer,
  after_count integer,
  error text,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.outreach_repair_actions TO authenticated;
GRANT ALL ON public.outreach_repair_actions TO service_role;

ALTER TABLE public.outreach_repair_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins read outreach_repair_actions"
  ON public.outreach_repair_actions FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "service writes outreach_repair_actions"
  ON public.outreach_repair_actions
  TO service_role
  USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_outreach_repair_actions_run ON public.outreach_repair_actions(run_id, created_at DESC);
