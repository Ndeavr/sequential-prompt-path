
-- Contractor contact click tracking
CREATE TABLE public.contractor_contact_clicks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id uuid NOT NULL REFERENCES public.contractors(id) ON DELETE CASCADE,
  contact_method text NOT NULL, -- 'phone', 'email', 'website', 'location'
  user_id uuid DEFAULT NULL,
  visitor_fingerprint text DEFAULT NULL,
  referrer text DEFAULT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_contact_clicks_contractor ON public.contractor_contact_clicks(contractor_id);
CREATE INDEX idx_contact_clicks_method ON public.contractor_contact_clicks(contractor_id, contact_method);
CREATE INDEX idx_contact_clicks_date ON public.contractor_contact_clicks(created_at);

ALTER TABLE public.contractor_contact_clicks ENABLE ROW LEVEL SECURITY;

-- Anyone can insert (public profile clicks)
CREATE POLICY "Anyone can insert contact clicks"
  ON public.contractor_contact_clicks FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Contractor can see their own clicks
CREATE POLICY "Contractors can view own clicks"
  ON public.contractor_contact_clicks FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.contractors WHERE id = contractor_id AND user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  );
