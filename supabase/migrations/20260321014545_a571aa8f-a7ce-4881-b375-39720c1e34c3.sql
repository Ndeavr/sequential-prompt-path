
-- Broker waitlist table
CREATE TABLE IF NOT EXISTS public.broker_waitlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  city text NOT NULL,
  specialty text NOT NULL,
  volume text,
  status text NOT NULL DEFAULT 'pending',
  activated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.broker_waitlist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "broker_waitlist_select_self_or_admin" ON public.broker_waitlist
  FOR SELECT USING (profile_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "broker_waitlist_insert_self" ON public.broker_waitlist
  FOR INSERT WITH CHECK (profile_id = auth.uid());

CREATE INDEX idx_broker_waitlist_city_specialty ON public.broker_waitlist(city, specialty);

-- Extend broker_scores for feedback loop
ALTER TABLE public.broker_scores
  ADD COLUMN IF NOT EXISTS appointments_completed integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS on_time_rate numeric(5,2),
  ADD COLUMN IF NOT EXISTS recommendation_rate numeric(5,2);
