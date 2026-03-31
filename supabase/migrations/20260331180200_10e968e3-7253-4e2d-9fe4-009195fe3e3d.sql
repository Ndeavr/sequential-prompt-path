
-- Alex Response Settings
CREATE TABLE public.alex_response_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  default_language text NOT NULL DEFAULT 'fr',
  max_response_length integer NOT NULL DEFAULT 280,
  warmth_level integer NOT NULL DEFAULT 7 CHECK (warmth_level BETWEEN 1 AND 10),
  directness_level integer NOT NULL DEFAULT 8 CHECK (directness_level BETWEEN 1 AND 10),
  rewrite_enabled boolean NOT NULL DEFAULT true,
  notebook_style_block_enabled boolean NOT NULL DEFAULT true,
  pronunciation_override_enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Alex Conversation Rules
CREATE TABLE public.alex_conversation_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_key text NOT NULL UNIQUE,
  rule_label text NOT NULL,
  rule_description text,
  is_active boolean NOT NULL DEFAULT true,
  severity text NOT NULL DEFAULT 'block' CHECK (severity IN ('block', 'warn', 'rewrite')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Alex Blocked Patterns
CREATE TABLE public.alex_blocked_patterns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pattern_type text NOT NULL DEFAULT 'phrase' CHECK (pattern_type IN ('phrase', 'regex', 'style')),
  pattern_text text NOT NULL,
  severity text NOT NULL DEFAULT 'block' CHECK (severity IN ('block', 'warn', 'rewrite')),
  replacement_strategy text DEFAULT 'regenerate' CHECK (replacement_strategy IN ('regenerate', 'rewrite', 'strip')),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Alex Response Logs
CREATE TABLE public.alex_response_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  session_id text,
  role_type text DEFAULT 'homeowner',
  raw_response text NOT NULL,
  rewritten_response text,
  blocked_patterns_detected text[] DEFAULT '{}',
  rewrite_applied boolean DEFAULT false,
  final_status text NOT NULL DEFAULT 'delivered' CHECK (final_status IN ('delivered', 'rewritten', 'blocked', 'regenerated')),
  response_time_ms integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.alex_response_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alex_conversation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alex_blocked_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alex_response_logs ENABLE ROW LEVEL SECURITY;

-- Admin-only policies
CREATE POLICY "admin_manage_response_settings" ON public.alex_response_settings
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "admin_manage_conversation_rules" ON public.alex_conversation_rules
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "admin_manage_blocked_patterns" ON public.alex_blocked_patterns
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "admin_view_response_logs" ON public.alex_response_logs
  FOR SELECT TO authenticated USING (public.is_admin());

-- Allow edge functions to insert logs (anon for edge function context)
CREATE POLICY "anon_insert_response_logs" ON public.alex_response_logs
  FOR INSERT TO anon WITH CHECK (true);

-- Seed default settings
INSERT INTO public.alex_response_settings (default_language, max_response_length, warmth_level, directness_level)
VALUES ('fr', 280, 7, 8);

-- Seed conversation rules
INSERT INTO public.alex_conversation_rules (rule_key, rule_label, rule_description, severity) VALUES
  ('no_data_dump', 'Pas de dump de données', 'Alex ne doit jamais lister des champs ou des données brutes comme un tableau', 'block'),
  ('no_academic_tone', 'Pas de ton académique', 'Alex ne parle pas comme un professeur ou un rapport technique', 'rewrite'),
  ('no_notebook_style', 'Pas de style NotebookLM', 'Interdire les résumés scolaires, lectures d''extraits, citations mot à mot', 'block'),
  ('short_sentences', 'Phrases courtes', 'Maximum 2 phrases par tour de parole pour le mode vocal', 'rewrite'),
  ('action_oriented', 'Orienté action', 'Chaque réponse doit guider vers une action concrète', 'warn'),
  ('context_first', 'Contexte utilisateur d''abord', 'Toujours relier la réponse au contexte spécifique de l''utilisateur', 'warn'),
  ('no_raw_extracts', 'Pas d''extraits bruts', 'Ne jamais copier-coller un extrait de document ou de données', 'block'),
  ('human_premium_tone', 'Ton humain premium', 'Parler comme un conseiller de confiance, pas comme une machine', 'rewrite');

-- Seed blocked patterns
INSERT INTO public.alex_blocked_patterns (pattern_type, pattern_text, severity, replacement_strategy) VALUES
  ('phrase', 'selon les données', 'block', 'rewrite'),
  ('phrase', 'voici l''extrait', 'block', 'rewrite'),
  ('phrase', 'les informations indiquent que', 'block', 'rewrite'),
  ('phrase', 'd''après le document', 'block', 'rewrite'),
  ('phrase', 'comme mentionné dans', 'block', 'rewrite'),
  ('phrase', 'le tableau suivant montre', 'block', 'strip'),
  ('phrase', 'en résumé de ce qui précède', 'block', 'rewrite'),
  ('phrase', 'sur la base des données disponibles', 'block', 'rewrite'),
  ('style', 'enumeration_list_3plus', 'rewrite', 'rewrite'),
  ('style', 'academic_paragraph', 'rewrite', 'rewrite'),
  ('regex', 'Source\s*:', 'block', 'strip'),
  ('regex', 'Référence\s*:', 'block', 'strip');

-- Trigger for updated_at
CREATE TRIGGER set_updated_at_alex_response_settings
  BEFORE UPDATE ON public.alex_response_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_updated_at_alex_conversation_rules
  BEFORE UPDATE ON public.alex_conversation_rules
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
