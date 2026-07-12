-- Add columns to contractors
ALTER TABLE public.contractors
  ADD COLUMN IF NOT EXISTS travel_radius_km int DEFAULT 15,
  ADD COLUMN IF NOT EXISTS availability_estimate text DEFAULT 'cette_semaine',
  ADD COLUMN IF NOT EXISTS compatibility jsonb DEFAULT '{"fits":[],"not_fits":[]}'::jsonb,
  ADD COLUMN IF NOT EXISTS mission text,
  ADD COLUMN IF NOT EXISTS approach text,
  ADD COLUMN IF NOT EXISTS values_text text,
  ADD COLUMN IF NOT EXISTS ai_reference_cache jsonb,
  ADD COLUMN IF NOT EXISTS service_areas text[] DEFAULT ARRAY[]::text[],
  ADD COLUMN IF NOT EXISTS services_structured text[] DEFAULT ARRAY[]::text[];

-- contractor_projects
CREATE TABLE IF NOT EXISTS public.contractor_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id uuid NOT NULL REFERENCES public.contractors(id) ON DELETE CASCADE,
  title text NOT NULL,
  city text,
  year int,
  description text,
  before_url text,
  after_url text,
  photos jsonb DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'published',
  sort_order int DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.contractor_projects TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contractor_projects TO authenticated;
GRANT ALL ON public.contractor_projects TO service_role;

ALTER TABLE public.contractor_projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public reads published projects of published contractors"
  ON public.contractor_projects FOR SELECT
  USING (
    status = 'published'
    AND EXISTS (
      SELECT 1 FROM public.contractors c
      WHERE c.id = contractor_projects.contractor_id AND c.is_published = true
    )
  );

CREATE POLICY "Contractor manages own projects"
  ON public.contractor_projects FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.contractors c
      WHERE c.id = contractor_projects.contractor_id AND c.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.contractors c
      WHERE c.id = contractor_projects.contractor_id AND c.user_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_contractor_projects_contractor ON public.contractor_projects(contractor_id);

-- contractor_verifications_display
CREATE TABLE IF NOT EXISTS public.contractor_verifications_display (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id uuid NOT NULL REFERENCES public.contractors(id) ON DELETE CASCADE,
  category_slug text NOT NULL,
  checks jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (contractor_id)
);

GRANT SELECT ON public.contractor_verifications_display TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contractor_verifications_display TO authenticated;
GRANT ALL ON public.contractor_verifications_display TO service_role;

ALTER TABLE public.contractor_verifications_display ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public reads verifications of published contractors"
  ON public.contractor_verifications_display FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.contractors c
      WHERE c.id = contractor_verifications_display.contractor_id AND c.is_published = true
    )
  );

CREATE POLICY "Contractor manages own verifications"
  ON public.contractor_verifications_display FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.contractors c
      WHERE c.id = contractor_verifications_display.contractor_id AND c.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.contractors c
      WHERE c.id = contractor_verifications_display.contractor_id AND c.user_id = auth.uid()
    )
  );

-- updated_at trigger (reuse existing function if present)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
    EXECUTE 'DROP TRIGGER IF EXISTS trg_contractor_projects_updated ON public.contractor_projects';
    EXECUTE 'CREATE TRIGGER trg_contractor_projects_updated BEFORE UPDATE ON public.contractor_projects FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column()';
    EXECUTE 'DROP TRIGGER IF EXISTS trg_contractor_verifications_display_updated ON public.contractor_verifications_display';
    EXECUTE 'CREATE TRIGGER trg_contractor_verifications_display_updated BEFORE UPDATE ON public.contractor_verifications_display FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column()';
  END IF;
END $$;