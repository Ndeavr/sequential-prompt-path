
-- =============================================
-- Alex French Voice Selector & Context Engine
-- =============================================

-- 1. Voice Test Phrases
CREATE TABLE public.alex_voice_test_phrases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label TEXT NOT NULL,
  phrase_text TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.alex_voice_test_phrases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin read alex_voice_test_phrases" ON public.alex_voice_test_phrases FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin write alex_voice_test_phrases" ON public.alex_voice_test_phrases FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 2. Voice Tests (results)
CREATE TABLE public.alex_voice_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  voice_profile_id UUID NOT NULL REFERENCES public.alex_voice_profiles(id) ON DELETE CASCADE,
  test_phrase_id UUID NOT NULL REFERENCES public.alex_voice_test_phrases(id) ON DELETE CASCADE,
  audio_url TEXT,
  clarity_score INT CHECK (clarity_score BETWEEN 0 AND 10),
  french_accent_score INT CHECK (french_accent_score BETWEEN 0 AND 10),
  no_english_accent_score INT CHECK (no_english_accent_score BETWEEN 0 AND 10),
  warmth_score INT CHECK (warmth_score BETWEEN 0 AND 10),
  trust_score INT CHECK (trust_score BETWEEN 0 AND 10),
  construction_vocab_score INT CHECK (construction_vocab_score BETWEEN 0 AND 10),
  naturalness_score INT CHECK (naturalness_score BETWEEN 0 AND 10),
  admin_notes TEXT,
  tested_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.alex_voice_tests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin read alex_voice_tests" ON public.alex_voice_tests FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin write alex_voice_tests" ON public.alex_voice_tests FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 3. Voice Fallbacks
CREATE TABLE public.alex_voice_fallbacks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  primary_voice_profile_id UUID NOT NULL REFERENCES public.alex_voice_profiles(id) ON DELETE CASCADE,
  fallback_voice_profile_id UUID NOT NULL REFERENCES public.alex_voice_profiles(id) ON DELETE CASCADE,
  priority_rank INT NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(primary_voice_profile_id, fallback_voice_profile_id)
);
ALTER TABLE public.alex_voice_fallbacks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin read alex_voice_fallbacks" ON public.alex_voice_fallbacks FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin write alex_voice_fallbacks" ON public.alex_voice_fallbacks FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 4. Transcript Corrections (admin-editable dictionary)
CREATE TABLE public.alex_transcript_corrections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  raw_pattern TEXT NOT NULL,
  normalized_value TEXT NOT NULL,
  language_code TEXT NOT NULL DEFAULT 'fr-CA',
  category TEXT NOT NULL DEFAULT 'general',
  priority_rank INT NOT NULL DEFAULT 0,
  is_regex BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.alex_transcript_corrections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin read alex_transcript_corrections" ON public.alex_transcript_corrections FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin write alex_transcript_corrections" ON public.alex_transcript_corrections FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 5. Intent Rules
CREATE TABLE public.alex_intent_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  intent_code TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  keywords JSONB NOT NULL DEFAULT '[]',
  negative_keywords JSONB NOT NULL DEFAULT '[]',
  trade_target TEXT,
  priority_rank INT NOT NULL DEFAULT 0,
  requires_location BOOLEAN NOT NULL DEFAULT false,
  requires_photo BOOLEAN NOT NULL DEFAULT false,
  requires_quote BOOLEAN NOT NULL DEFAULT false,
  requires_booking_offer BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.alex_intent_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin read alex_intent_rules" ON public.alex_intent_rules FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin write alex_intent_rules" ON public.alex_intent_rules FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 6. Context Sessions
CREATE TABLE public.alex_context_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  session_token TEXT NOT NULL,
  language_mode TEXT NOT NULL DEFAULT 'fr',
  primary_problem TEXT,
  secondary_problem TEXT,
  property_type TEXT,
  city TEXT,
  address_text TEXT,
  address_status TEXT DEFAULT 'unknown',
  urgency_level TEXT DEFAULT 'normal',
  quote_uploaded BOOLEAN DEFAULT false,
  booking_intent BOOLEAN DEFAULT false,
  contractor_validation_intent BOOLEAN DEFAULT false,
  last_recommended_trade TEXT,
  last_question_asked TEXT,
  missing_critical_fields JSONB DEFAULT '[]',
  conversation_status TEXT NOT NULL DEFAULT 'active',
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ
);
CREATE INDEX idx_alex_context_sessions_token ON public.alex_context_sessions(session_token);
CREATE INDEX idx_alex_context_sessions_user ON public.alex_context_sessions(user_id);
CREATE INDEX idx_alex_context_sessions_status ON public.alex_context_sessions(conversation_status);
ALTER TABLE public.alex_context_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin read alex_context_sessions" ON public.alex_context_sessions FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin write alex_context_sessions" ON public.alex_context_sessions FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
-- Allow edge functions (service role) to insert/update via service_role key

-- 7. Context Events
CREATE TABLE public.alex_context_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  context_session_id UUID NOT NULL REFERENCES public.alex_context_sessions(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  raw_payload JSONB,
  normalized_payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_alex_context_events_session ON public.alex_context_events(context_session_id);
ALTER TABLE public.alex_context_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin read alex_context_events" ON public.alex_context_events FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin write alex_context_events" ON public.alex_context_events FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 8. Understanding Logs
CREATE TABLE public.alex_understanding_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  context_session_id UUID REFERENCES public.alex_context_sessions(id) ON DELETE SET NULL,
  raw_transcript TEXT,
  normalized_transcript TEXT,
  detected_language TEXT,
  detected_intent TEXT,
  understanding_confidence NUMERIC(4,2),
  used_voice_profile_id UUID REFERENCES public.alex_voice_profiles(id) ON DELETE SET NULL,
  fallback_triggered BOOLEAN DEFAULT false,
  latency_stt_ms INT,
  latency_llm_ms INT,
  latency_tts_ms INT,
  total_latency_ms INT,
  response_mode TEXT DEFAULT 'voice',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_alex_understanding_logs_session ON public.alex_understanding_logs(context_session_id);
CREATE INDEX idx_alex_understanding_logs_created ON public.alex_understanding_logs(created_at);
ALTER TABLE public.alex_understanding_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin read alex_understanding_logs" ON public.alex_understanding_logs FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 9. Voice Runtime Metrics (aggregated daily)
CREATE TABLE public.alex_voice_runtime_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  voice_profile_id UUID NOT NULL REFERENCES public.alex_voice_profiles(id) ON DELETE CASCADE,
  day_bucket DATE NOT NULL,
  requests_count INT NOT NULL DEFAULT 0,
  fallback_count INT NOT NULL DEFAULT 0,
  avg_tts_latency_ms NUMERIC(8,2),
  avg_understanding_confidence NUMERIC(4,2),
  avg_context_retention_score NUMERIC(4,2),
  avg_accent_issue_flag NUMERIC(4,2) DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(voice_profile_id, day_bucket)
);
ALTER TABLE public.alex_voice_runtime_metrics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin read alex_voice_runtime_metrics" ON public.alex_voice_runtime_metrics FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- =============================================
-- SEED DATA
-- =============================================

-- Test Phrases
INSERT INTO public.alex_voice_test_phrases (label, phrase_text, category, sort_order) VALUES
  ('Salutation', 'Bonjour, je suis Alex de UNPRO.', 'greeting', 1),
  ('Découverte maison', 'Parlez-moi de votre maison.', 'homeowner_discovery', 2),
  ('Question température', 'Est-ce qu''il fait plus froid, plus chaud, ou voyez-vous de l''humidité?', 'homeowner_discovery', 3),
  ('Chaleur entretoit', 'Il se peut que la chaleur s''échappe par l''entretoit.', 'construction_terms', 4),
  ('Recommandation', 'Je peux vous aider à trouver le bon entrepreneur.', 'homeowner_discovery', 5),
  ('Soumission', 'Voulez-vous comparer une soumission?', 'booking', 6),
  ('Rendez-vous', 'Souhaitez-vous réserver un rendez-vous?', 'booking', 7),
  ('Mot: humidité', 'humidité', 'construction_terms', 8),
  ('Mot: moisissure', 'moisissure', 'construction_terms', 9),
  ('Mot: isolation', 'isolation', 'construction_terms', 10),
  ('Mot: entretoit', 'entretoit', 'construction_terms', 11),
  ('Mot: barrage de glace', 'barrage de glace', 'construction_terms', 12);

-- Intent Rules
INSERT INTO public.alex_intent_rules (intent_code, label, keywords, negative_keywords, trade_target, priority_rank, requires_location, requires_booking_offer) VALUES
  ('cold_home', 'Maison froide', '["froid","frette","gèle","courant d''air","draft","trop froid","glacial"]', '[]', 'isolation', 1, true, true),
  ('hot_home', 'Maison chaude', '["chaud","trop chaud","chaleur","étouffant","surchauffe"]', '[]', 'ventilation', 2, true, true),
  ('humidity_issue', 'Problème d''humidité', '["humidité","humide","condensation","buée","eau"]', '[]', 'ventilation', 3, true, false),
  ('mold_issue', 'Moisissure', '["moisissure","moisi","champignon","tache noire","mold"]', '[]', 'décontamination', 4, true, false),
  ('high_energy_bill', 'Facture élevée', '["facture","énergie","hydro","cher","coût","économie","bill"]', '[]', 'efficacité_énergétique', 5, true, true),
  ('emergency_issue', 'Urgence', '["urgence","urgent","dégât","inondation","fuite","bris","cassé","emergency"]', '[]', 'urgence', 0, true, true),
  ('quote_analysis', 'Analyse soumission', '["soumission","devis","quote","prix","estimation","coût travaux"]', '[]', NULL, 6, false, false),
  ('contractor_verification', 'Vérification entrepreneur', '["entrepreneur","RBQ","licence","vérifier","fiable","recommandation"]', '[]', NULL, 7, false, false),
  ('booking_request', 'Demande rendez-vous', '["rendez-vous","rdv","appointment","disponibilité","planifier","réserver"]', '[]', NULL, 8, false, true);

-- Transcript Corrections
INSERT INTO public.alex_transcript_corrections (raw_pattern, normalized_value, language_code, category, priority_rank, is_regex) VALUES
  ('entre toit', 'entretoit', 'fr-CA', 'construction', 10, false),
  ('entré toit', 'entretoit', 'fr-CA', 'construction', 10, false),
  ('moisisssure', 'moisissure', 'fr-CA', 'construction', 9, false),
  ('ren des vous', 'rendez-vous', 'fr-CA', 'general', 8, false),
  ('un pro', 'UNPRO', 'fr-CA', 'brand', 10, false),
  ('hunpro', 'UNPRO', 'fr-CA', 'brand', 10, false),
  ('une pro', 'UNPRO', 'fr-CA', 'brand', 10, false),
  ('rénoration', 'rénovation', 'fr-CA', 'construction', 9, false),
  ('soumition', 'soumission', 'fr-CA', 'general', 9, false),
  ('terme pump', 'thermopompe', 'fr-CA', 'construction', 9, false),
  ('termo pomp', 'thermopompe', 'fr-CA', 'construction', 9, false),
  ('fournesse', 'fournaise', 'fr-CA', 'construction', 9, false),
  ('calfutrage', 'calfeutrage', 'fr-CA', 'construction', 9, false),
  ('monreal', 'Montréal', 'fr-CA', 'city', 8, false),
  ('long oeil', 'Longueuil', 'fr-CA', 'city', 8, false);
