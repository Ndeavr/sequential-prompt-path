
-- Territories table
CREATE TABLE public.territories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  city_slug text NOT NULL,
  category_slug text NOT NULL,
  city_name text NOT NULL,
  category_name text NOT NULL,
  max_contractors integer NOT NULL DEFAULT 10,
  signature_slots integer NOT NULL DEFAULT 1,
  elite_slots integer NOT NULL DEFAULT 2,
  premium_slots integer NOT NULL DEFAULT 3,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (city_slug, category_slug)
);

ALTER TABLE public.territories ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can view active territories
CREATE POLICY "Authenticated users can view active territories"
ON public.territories FOR SELECT TO authenticated
USING (is_active = true);

-- Admins can manage all territories
CREATE POLICY "Admins can manage all territories"
ON public.territories FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Territory assignments table
CREATE TABLE public.territory_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id uuid NOT NULL REFERENCES public.contractors(id) ON DELETE CASCADE,
  territory_id uuid NOT NULL REFERENCES public.territories(id) ON DELETE CASCADE,
  plan_level text NOT NULL DEFAULT 'standard',
  slot_type text NOT NULL DEFAULT 'standard',
  active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (contractor_id, territory_id)
);

ALTER TABLE public.territory_assignments ENABLE ROW LEVEL SECURITY;

-- Contractors can view own assignments
CREATE POLICY "Contractors can view own territory assignments"
ON public.territory_assignments FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.contractors c
    WHERE c.id = territory_assignments.contractor_id
    AND c.user_id = auth.uid()
  )
);

-- Admins can manage all assignments
CREATE POLICY "Admins can manage all territory assignments"
ON public.territory_assignments FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Service role can manage assignments
CREATE POLICY "Service can manage territory assignments"
ON public.territory_assignments FOR ALL TO service_role
USING (true);

-- Territory waitlist table
CREATE TABLE public.territory_waitlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id uuid NOT NULL REFERENCES public.contractors(id) ON DELETE CASCADE,
  territory_id uuid NOT NULL REFERENCES public.territories(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (contractor_id, territory_id)
);

ALTER TABLE public.territory_waitlist ENABLE ROW LEVEL SECURITY;

-- Contractors can view own waitlist entries
CREATE POLICY "Contractors can view own waitlist"
ON public.territory_waitlist FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.contractors c
    WHERE c.id = territory_waitlist.contractor_id
    AND c.user_id = auth.uid()
  )
);

-- Contractors can insert own waitlist entries
CREATE POLICY "Contractors can join waitlist"
ON public.territory_waitlist FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.contractors c
    WHERE c.id = territory_waitlist.contractor_id
    AND c.user_id = auth.uid()
  )
);

-- Contractors can delete own waitlist entries
CREATE POLICY "Contractors can leave waitlist"
ON public.territory_waitlist FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.contractors c
    WHERE c.id = territory_waitlist.contractor_id
    AND c.user_id = auth.uid()
  )
);

-- Admins can manage all waitlist
CREATE POLICY "Admins can manage all waitlist"
ON public.territory_waitlist FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Indexes
CREATE INDEX idx_territory_assignments_contractor ON public.territory_assignments(contractor_id);
CREATE INDEX idx_territory_assignments_territory ON public.territory_assignments(territory_id);
CREATE INDEX idx_territory_waitlist_territory ON public.territory_waitlist(territory_id);
CREATE INDEX idx_territories_city_category ON public.territories(city_slug, category_slug);
