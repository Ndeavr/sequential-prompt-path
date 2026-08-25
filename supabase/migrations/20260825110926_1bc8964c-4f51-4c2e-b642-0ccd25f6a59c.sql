ALTER TABLE public.affiliates
  ADD COLUMN IF NOT EXISTS work_preferences text[],
  ADD COLUMN IF NOT EXISTS preferred_channels text[],
  ADD COLUMN IF NOT EXISTS acquisition_source jsonb;

CREATE TABLE IF NOT EXISTS public.affiliate_funnel_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id uuid REFERENCES public.affiliates(id) ON DELETE SET NULL,
  session_id text NOT NULL,
  event_type text NOT NULL,
  ref_code text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_affiliate_funnel_events_affiliate ON public.affiliate_funnel_events(affiliate_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_affiliate_funnel_events_type ON public.affiliate_funnel_events(event_type, created_at DESC);

GRANT SELECT, INSERT ON public.affiliate_funnel_events TO anon;
GRANT SELECT, INSERT ON public.affiliate_funnel_events TO authenticated;
GRANT ALL ON public.affiliate_funnel_events TO service_role;

ALTER TABLE public.affiliate_funnel_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can log funnel events" ON public.affiliate_funnel_events
  FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "Affiliates read own funnel events" ON public.affiliate_funnel_events
  FOR SELECT TO authenticated
  USING ((affiliate_id IS NOT NULL AND public.is_affiliate_owner(affiliate_id)) OR public.has_role(auth.uid(), 'admin'::app_role));