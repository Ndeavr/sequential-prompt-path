
ALTER TABLE public.outreach_delivery_logs
  ADD COLUMN IF NOT EXISTS queue_id uuid REFERENCES public.contractor_outreach_queue(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS raw_response jsonb,
  ADD COLUMN IF NOT EXISTS is_test boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS retryable boolean;

CREATE INDEX IF NOT EXISTS idx_odl_queue_created ON public.outreach_delivery_logs (queue_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_odl_failed ON public.outreach_delivery_logs (created_at DESC) WHERE status = 'failed';

ALTER TABLE public.contractor_outreach_queue
  ADD COLUMN IF NOT EXISTS is_test boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.first_dollar_milestones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event text NOT NULL UNIQUE,
  achieved_at timestamptz NOT NULL DEFAULT now(),
  queue_id uuid REFERENCES public.contractor_outreach_queue(id) ON DELETE SET NULL,
  contractor_id uuid,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.first_dollar_milestones TO authenticated;
GRANT ALL ON public.first_dollar_milestones TO service_role;

ALTER TABLE public.first_dollar_milestones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read first dollar milestones"
  ON public.first_dollar_milestones FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service writes first dollar milestones"
  ON public.first_dollar_milestones
  TO service_role
  USING (true) WITH CHECK (true);
