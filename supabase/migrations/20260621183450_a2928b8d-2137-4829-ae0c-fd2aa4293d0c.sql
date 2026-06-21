
CREATE TABLE public.content_visibility_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pattern text NOT NULL,
  match_type text NOT NULL DEFAULT 'plain' CHECK (match_type IN ('plain','regex')),
  severity text NOT NULL DEFAULT 'block' CHECK (severity IN ('block','warn')),
  category text NOT NULL DEFAULT 'llm_instruction',
  description text,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.content_visibility_rules TO authenticated;
GRANT ALL ON public.content_visibility_rules TO service_role;

ALTER TABLE public.content_visibility_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth read rules" ON public.content_visibility_rules
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "admins manage rules" ON public.content_visibility_rules
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.content_audit_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ran_at timestamptz NOT NULL DEFAULT now(),
  violations_count int NOT NULL DEFAULT 0,
  blocking_count int NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'ok' CHECK (status IN ('ok','warn','fail','error')),
  report jsonb NOT NULL DEFAULT '{}'::jsonb,
  source text NOT NULL DEFAULT 'manual',
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.content_audit_runs TO authenticated;
GRANT ALL ON public.content_audit_runs TO service_role;

ALTER TABLE public.content_audit_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins read audit runs" ON public.content_audit_runs
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.content_visibility_rules (pattern, match_type, severity, category, description) VALUES
  ('Hun Pro', 'plain', 'block', 'pronunciation', 'EN pronunciation guidance — LLM-only'),
  ('« Un Pro »', 'plain', 'block', 'pronunciation', 'FR pronunciation guidance — LLM-only'),
  ('Le #1 Professionnel', 'plain', 'block', 'pronunciation', 'Acronym expansion — LLM-only'),
  ('se prononce', 'plain', 'block', 'pronunciation', 'Pronunciation explanation — LLM-only'),
  ('Conseiller IA en intelligence résidentielle', 'plain', 'block', 'jargon', 'Internal role jargon'),
  ('Alex doit', 'plain', 'block', 'llm_instruction', 'Imperative addressed to the AI'),
  ('l''IA doit', 'plain', 'block', 'llm_instruction', 'Imperative addressed to the AI'),
  ('le système doit', 'plain', 'block', 'llm_instruction', 'System-level imperative'),
  ('prompt:', 'plain', 'block', 'prompt_leak', 'Prompt prefix leak'),
  ('instruction:', 'plain', 'block', 'prompt_leak', 'Instruction prefix leak'),
  ('chain of thought', 'plain', 'block', 'dev_note', 'Reasoning leak'),
  ('internal note', 'plain', 'block', 'dev_note', 'Developer note leak'),
  ('NotebookLM', 'plain', 'warn', 'seo_internal', 'AI engine name — internal only'),
  ('AI-readable', 'plain', 'warn', 'seo_internal', 'GEO/AEO jargon'),
  ('\bGEO\b', 'regex', 'warn', 'seo_internal', 'Generative Engine Optimization jargon'),
  ('\bAEO\b', 'regex', 'warn', 'seo_internal', 'Answer Engine Optimization jargon');

CREATE OR REPLACE FUNCTION public.touch_content_visibility_rules()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at := now(); RETURN NEW; END $$;

CREATE TRIGGER trg_touch_content_visibility_rules
BEFORE UPDATE ON public.content_visibility_rules
FOR EACH ROW EXECUTE FUNCTION public.touch_content_visibility_rules();
