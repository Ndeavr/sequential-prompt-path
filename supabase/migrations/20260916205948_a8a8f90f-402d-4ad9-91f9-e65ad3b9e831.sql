ALTER TABLE public.contractor_service_preferences
  ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pending_review boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_csp_contractor_stance_order
  ON public.contractor_service_preferences (contractor_id, stance, sort_order);