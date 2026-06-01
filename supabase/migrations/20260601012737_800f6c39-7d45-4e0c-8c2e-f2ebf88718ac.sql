
CREATE TABLE public.property_memory_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NULL,
  user_id uuid NOT NULL,
  session_id text NULL,
  event_type text NOT NULL,
  ai_summary text NULL,
  risk_level text NULL CHECK (risk_level IS NULL OR risk_level IN ('low','medium','high','critical')),
  related_documents jsonb NOT NULL DEFAULT '[]'::jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_pme_property ON public.property_memory_events(property_id);
CREATE INDEX idx_pme_user ON public.property_memory_events(user_id);
CREATE INDEX idx_pme_type ON public.property_memory_events(event_type);
CREATE INDEX idx_pme_created ON public.property_memory_events(created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.property_memory_events TO authenticated;
GRANT ALL ON public.property_memory_events TO service_role;

ALTER TABLE public.property_memory_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pme_owner_select" ON public.property_memory_events
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "pme_owner_insert" ON public.property_memory_events
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "pme_owner_update" ON public.property_memory_events
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "pme_owner_delete" ON public.property_memory_events
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);
