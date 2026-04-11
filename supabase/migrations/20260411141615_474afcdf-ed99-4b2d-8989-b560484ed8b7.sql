
-- =============================================
-- PERSISTENT USER MEMORY GRAPH V1
-- =============================================

-- 1. user_memory_entities
CREATE TABLE public.user_memory_entities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  session_memory_id text,
  entity_type text NOT NULL DEFAULT 'user',
  entity_label text,
  canonical_value_json jsonb DEFAULT '{}'::jsonb,
  confidence_score numeric DEFAULT 0.5,
  freshness_score numeric DEFAULT 1.0,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_ume_user_id ON public.user_memory_entities(user_id);
CREATE INDEX idx_ume_session ON public.user_memory_entities(session_memory_id);
CREATE INDEX idx_ume_entity_type ON public.user_memory_entities(entity_type);
CREATE INDEX idx_ume_status ON public.user_memory_entities(status);

ALTER TABLE public.user_memory_entities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own memory entities"
  ON public.user_memory_entities FOR SELECT
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can create own memory entities"
  ON public.user_memory_entities FOR INSERT
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can update own memory entities"
  ON public.user_memory_entities FOR UPDATE
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can delete own memory entities"
  ON public.user_memory_entities FOR DELETE
  USING (auth.uid() = user_id);

-- 2. user_memory_facts
CREATE TABLE public.user_memory_facts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  session_memory_id text,
  entity_id uuid REFERENCES public.user_memory_entities(id) ON DELETE SET NULL,
  fact_type text NOT NULL DEFAULT 'identity',
  fact_key text NOT NULL,
  fact_value_json jsonb DEFAULT '{}'::jsonb,
  normalized_value_json jsonb,
  confidence_score numeric DEFAULT 0.5,
  freshness_score numeric DEFAULT 1.0,
  source_priority integer DEFAULT 5,
  source_id uuid,
  is_persistent boolean DEFAULT false,
  is_confirmed boolean DEFAULT false,
  is_sensitive boolean DEFAULT false,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_umf_user_id ON public.user_memory_facts(user_id);
CREATE INDEX idx_umf_session ON public.user_memory_facts(session_memory_id);
CREATE INDEX idx_umf_fact_type ON public.user_memory_facts(fact_type);
CREATE INDEX idx_umf_fact_key ON public.user_memory_facts(fact_key);
CREATE INDEX idx_umf_entity_id ON public.user_memory_facts(entity_id);
CREATE INDEX idx_umf_updated ON public.user_memory_facts(updated_at);

ALTER TABLE public.user_memory_facts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own memory facts"
  ON public.user_memory_facts FOR SELECT
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can create own memory facts"
  ON public.user_memory_facts FOR INSERT
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can update own memory facts"
  ON public.user_memory_facts FOR UPDATE
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can delete own memory facts"
  ON public.user_memory_facts FOR DELETE
  USING (auth.uid() = user_id);

-- 3. user_memory_links
CREATE TABLE public.user_memory_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_entity_id uuid NOT NULL REFERENCES public.user_memory_entities(id) ON DELETE CASCADE,
  to_entity_id uuid NOT NULL REFERENCES public.user_memory_entities(id) ON DELETE CASCADE,
  link_type text NOT NULL DEFAULT 'related',
  confidence_score numeric DEFAULT 0.5,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_uml_from ON public.user_memory_links(from_entity_id);
CREATE INDEX idx_uml_to ON public.user_memory_links(to_entity_id);

ALTER TABLE public.user_memory_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own memory links"
  ON public.user_memory_links FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.user_memory_entities WHERE id = from_entity_id AND (user_id = auth.uid()))
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Users can create own memory links"
  ON public.user_memory_links FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.user_memory_entities WHERE id = from_entity_id AND (user_id = auth.uid() OR user_id IS NULL))
  );

CREATE POLICY "Users can delete own memory links"
  ON public.user_memory_links FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM public.user_memory_entities WHERE id = from_entity_id AND user_id = auth.uid())
  );

-- 4. user_memory_sessions
CREATE TABLE public.user_memory_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_memory_id text NOT NULL UNIQUE,
  anonymous_fingerprint text,
  device_id text,
  started_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  migrated_to_user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL
);

CREATE INDEX idx_ums_session ON public.user_memory_sessions(session_memory_id);
CREATE INDEX idx_ums_migrated ON public.user_memory_sessions(migrated_to_user_id);

ALTER TABLE public.user_memory_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can create memory sessions"
  ON public.user_memory_sessions FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can view own sessions"
  ON public.user_memory_sessions FOR SELECT
  USING (migrated_to_user_id = auth.uid() OR public.has_role(auth.uid(), 'admin') OR migrated_to_user_id IS NULL);

CREATE POLICY "Users can update own sessions"
  ON public.user_memory_sessions FOR UPDATE
  USING (migrated_to_user_id = auth.uid() OR migrated_to_user_id IS NULL OR public.has_role(auth.uid(), 'admin'));

-- 5. user_memory_sources
CREATE TABLE public.user_memory_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  source_type text NOT NULL DEFAULT 'chat',
  source_ref text,
  source_label text,
  metadata_json jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_umsrc_user ON public.user_memory_sources(user_id);

ALTER TABLE public.user_memory_sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own memory sources"
  ON public.user_memory_sources FOR SELECT
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can create own memory sources"
  ON public.user_memory_sources FOR INSERT
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- 6. user_memory_reuse_logs
CREATE TABLE public.user_memory_reuse_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  fact_id uuid REFERENCES public.user_memory_facts(id) ON DELETE SET NULL,
  reuse_context text NOT NULL,
  surface text,
  time_saved_seconds integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_umrl_user ON public.user_memory_reuse_logs(user_id);

ALTER TABLE public.user_memory_reuse_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own reuse logs"
  ON public.user_memory_reuse_logs FOR SELECT
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can create own reuse logs"
  ON public.user_memory_reuse_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 7. user_memory_corrections
CREATE TABLE public.user_memory_corrections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  fact_id uuid REFERENCES public.user_memory_facts(id) ON DELETE SET NULL,
  entity_id uuid REFERENCES public.user_memory_entities(id) ON DELETE SET NULL,
  previous_value_json jsonb,
  corrected_value_json jsonb,
  correction_reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_umc_user ON public.user_memory_corrections(user_id);

ALTER TABLE public.user_memory_corrections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own corrections"
  ON public.user_memory_corrections FOR SELECT
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can create own corrections"
  ON public.user_memory_corrections FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Trigger for updated_at on entities and facts
CREATE TRIGGER update_user_memory_entities_updated_at
  BEFORE UPDATE ON public.user_memory_entities
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER update_user_memory_facts_updated_at
  BEFORE UPDATE ON public.user_memory_facts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
