
CREATE TABLE IF NOT EXISTS public.aipp_detected_methods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.aipp_profiles(id) ON DELETE CASCADE,
  service_name text NOT NULL,
  method text,
  material text,
  evidence_snippet text,
  source_url text,
  confidence numeric NOT NULL DEFAULT 0.5,
  confirmed_by_contractor boolean NOT NULL DEFAULT false,
  detected_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_aipp_detected_methods_profile ON public.aipp_detected_methods(profile_id);

ALTER TABLE public.aipp_detected_methods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view confident detected methods"
ON public.aipp_detected_methods FOR SELECT
USING (confidence >= 0.7 OR confirmed_by_contractor = true);

CREATE POLICY "Admins can manage detected methods"
ON public.aipp_detected_methods FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));
