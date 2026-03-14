
-- Block 3: Property claims, passport sections, completion tasks

-- 1. Add claim_status to properties
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS claim_status TEXT DEFAULT 'unclaimed';
CREATE INDEX IF NOT EXISTS idx_properties_claim_status ON public.properties(claim_status);

-- 2. Property claims table
CREATE TABLE IF NOT EXISTS public.property_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  verification_method TEXT DEFAULT 'none',
  verification_code TEXT,
  verification_data JSONB,
  notes TEXT,
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_property_claims_property ON public.property_claims(property_id);
CREATE INDEX IF NOT EXISTS idx_property_claims_user ON public.property_claims(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_property_claims_unique_pending ON public.property_claims(property_id, user_id) WHERE status = 'pending';

ALTER TABLE public.property_claims ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own claims"
  ON public.property_claims FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can create claims"
  ON public.property_claims FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can update claims"
  ON public.property_claims FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 3. Property passport sections
CREATE TABLE IF NOT EXISTS public.property_passport_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  section_key TEXT NOT NULL,
  section_data JSONB DEFAULT '{}'::jsonb,
  completion_pct INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(property_id, section_key)
);

ALTER TABLE public.property_passport_sections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can manage passport sections"
  ON public.property_passport_sections FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.properties p
      WHERE p.id = property_id
      AND (p.user_id = auth.uid() OR p.claimed_by = auth.uid())
    )
  );

-- 4. Property completion tasks
CREATE TABLE IF NOT EXISTS public.property_completion_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  task_key TEXT NOT NULL,
  title_fr TEXT NOT NULL,
  description_fr TEXT,
  section_key TEXT NOT NULL,
  field_key TEXT,
  priority INTEGER DEFAULT 50,
  estimated_minutes INTEGER DEFAULT 2,
  points INTEGER DEFAULT 10,
  status TEXT NOT NULL DEFAULT 'pending',
  completed_at TIMESTAMPTZ,
  dismissed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(property_id, task_key)
);

CREATE INDEX IF NOT EXISTS idx_completion_tasks_property ON public.property_completion_tasks(property_id);
CREATE INDEX IF NOT EXISTS idx_completion_tasks_status ON public.property_completion_tasks(status);

ALTER TABLE public.property_completion_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can manage completion tasks"
  ON public.property_completion_tasks FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.properties p
      WHERE p.id = property_id
      AND (p.user_id = auth.uid() OR p.claimed_by = auth.uid())
    )
  );

-- 5. Property events / timeline
CREATE TABLE IF NOT EXISTS public.property_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  title_fr TEXT NOT NULL,
  description_fr TEXT,
  event_data JSONB,
  event_date DATE,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_property_events_property ON public.property_events(property_id);

ALTER TABLE public.property_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can manage property events"
  ON public.property_events FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.properties p
      WHERE p.id = property_id
      AND (p.user_id = auth.uid() OR p.claimed_by = auth.uid())
    )
  );

CREATE POLICY "Public can view non-private property events"
  ON public.property_events FOR SELECT TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.properties p
      WHERE p.id = property_id
      AND p.public_status IS NOT NULL AND p.public_status != 'private'
    )
  );
