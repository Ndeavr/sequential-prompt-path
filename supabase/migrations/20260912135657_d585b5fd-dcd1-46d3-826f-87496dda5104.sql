CREATE TABLE IF NOT EXISTS public.project_intake_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  idempotency_key text NOT NULL,
  user_id uuid NOT NULL,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  source text NOT NULL DEFAULT 'unknown',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT project_intake_keys_unique UNIQUE (user_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_project_intake_keys_project
  ON public.project_intake_keys (project_id);

GRANT SELECT ON public.project_intake_keys TO authenticated;
GRANT ALL ON public.project_intake_keys TO service_role;

ALTER TABLE public.project_intake_keys ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners read their intake keys" ON public.project_intake_keys;
CREATE POLICY "Owners read their intake keys"
  ON public.project_intake_keys
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Service role manages intake keys" ON public.project_intake_keys;
CREATE POLICY "Service role manages intake keys"
  ON public.project_intake_keys
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);