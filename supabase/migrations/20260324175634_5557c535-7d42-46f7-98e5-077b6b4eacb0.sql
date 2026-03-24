CREATE TABLE public.appointment_packs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id uuid REFERENCES public.contractors(id) ON DELETE CASCADE,
  pack_size integer NOT NULL,
  unit_price_cents integer NOT NULL,
  total_price_cents integer NOT NULL,
  trade_slug text,
  city_slug text,
  source text DEFAULT 'checkout',
  status text DEFAULT 'pending',
  remaining integer NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.appointment_packs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Contractors can view own packs" ON public.appointment_packs
  FOR SELECT TO authenticated
  USING (contractor_id IN (SELECT id FROM public.contractors WHERE user_id = auth.uid()));

CREATE POLICY "Contractors can insert own packs" ON public.appointment_packs
  FOR INSERT TO authenticated
  WITH CHECK (contractor_id IN (SELECT id FROM public.contractors WHERE user_id = auth.uid()));

CREATE POLICY "Admins full access on packs" ON public.appointment_packs
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));