
-- Table: contractor_conversions
CREATE TABLE IF NOT EXISTS public.contractor_conversions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id UUID NOT NULL REFERENCES public.contractor_prospects(id) ON DELETE CASCADE,
  plan_selected TEXT NOT NULL DEFAULT 'pro',
  revenue_projection INTEGER DEFAULT 0,
  conversion_source TEXT NOT NULL DEFAULT 'alex',
  campaign_id UUID REFERENCES public.outreach_campaigns(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.contractor_conversions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read contractor_conversions"
  ON public.contractor_conversions FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert contractor_conversions"
  ON public.contractor_conversions FOR INSERT TO authenticated WITH CHECK (true);

CREATE INDEX idx_contractor_conversions_contractor ON public.contractor_conversions(contractor_id);
CREATE INDEX idx_contractor_conversions_source ON public.contractor_conversions(conversion_source);
