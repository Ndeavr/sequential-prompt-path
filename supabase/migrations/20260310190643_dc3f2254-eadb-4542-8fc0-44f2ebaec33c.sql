
CREATE TABLE public.property_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  type text NOT NULL,
  title text NOT NULL,
  description text,
  urgency text DEFAULT 'medium',
  contractor_category text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.property_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own property insights"
  ON public.property_insights FOR SELECT
  TO public
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own property insights"
  ON public.property_insights FOR INSERT
  TO public
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own property insights"
  ON public.property_insights FOR DELETE
  TO public
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all property insights"
  ON public.property_insights FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_property_insights_property ON public.property_insights(property_id);
CREATE INDEX idx_property_insights_user ON public.property_insights(user_id);
