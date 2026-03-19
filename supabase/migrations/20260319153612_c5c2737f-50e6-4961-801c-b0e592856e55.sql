
-- market_capacity table for sector availability
CREATE TABLE IF NOT EXISTS public.market_capacity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  city text NOT NULL,
  specialty text NOT NULL,
  max_slots integer NOT NULL DEFAULT 3,
  active_slots integer NOT NULL DEFAULT 0,
  waiting_list_count integer NOT NULL DEFAULT 0,
  updated_at timestamptz DEFAULT now(),
  UNIQUE(city, specialty)
);

ALTER TABLE public.market_capacity ENABLE ROW LEVEL SECURITY;

-- Public read for capacity checks
CREATE POLICY "Anyone can view market capacity"
  ON public.market_capacity FOR SELECT
  TO authenticated
  USING (true);

-- Only admins can modify
CREATE POLICY "Admins can manage market capacity"
  ON public.market_capacity FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_market_capacity_city_specialty ON public.market_capacity(city, specialty);
