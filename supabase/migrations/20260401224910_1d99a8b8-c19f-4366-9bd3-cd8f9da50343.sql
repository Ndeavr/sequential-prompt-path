
-- Alex Context Prompts — library of contextual greetings/questions
CREATE TABLE public.alex_context_prompts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  intent_key TEXT NOT NULL,
  context_key TEXT NOT NULL DEFAULT 'default',
  object_type TEXT,
  room_type TEXT,
  issue_type TEXT,
  role_type TEXT DEFAULT 'homeowner',
  locale TEXT NOT NULL DEFAULT 'fr',
  greeting_text TEXT NOT NULL,
  primary_question TEXT NOT NULL,
  quick_replies_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  next_flow TEXT,
  priority INTEGER NOT NULL DEFAULT 50,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_alex_context_prompts_intent ON public.alex_context_prompts(intent_key, context_key, active);
CREATE INDEX idx_alex_context_prompts_room ON public.alex_context_prompts(room_type, issue_type);

ALTER TABLE public.alex_context_prompts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read context prompts" ON public.alex_context_prompts FOR SELECT USING (true);

-- Alex Prompt Logs — tracking
CREATE TABLE public.alex_prompt_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL,
  user_id UUID,
  prompt_id UUID REFERENCES public.alex_context_prompts(id),
  trigger_type TEXT NOT NULL DEFAULT 'pill',
  trigger_value TEXT,
  image_id TEXT,
  detected_context_json JSONB,
  question_shown TEXT,
  quick_reply_clicked TEXT,
  next_flow_opened TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_alex_prompt_logs_session ON public.alex_prompt_logs(session_id);
CREATE INDEX idx_alex_prompt_logs_prompt ON public.alex_prompt_logs(prompt_id);

ALTER TABLE public.alex_prompt_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can insert their own prompt logs" ON public.alex_prompt_logs FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can read their own prompt logs" ON public.alex_prompt_logs FOR SELECT USING (true);

-- Alex Detected Contexts — image analysis results
CREATE TABLE public.alex_detected_contexts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL,
  image_id TEXT,
  detected_room TEXT,
  detected_style TEXT,
  detected_issue TEXT,
  detected_objects_json JSONB DEFAULT '[]'::jsonb,
  confidence_score NUMERIC(4,2) DEFAULT 0,
  suggested_intent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_alex_detected_contexts_session ON public.alex_detected_contexts(session_id);

ALTER TABLE public.alex_detected_contexts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Insert detected contexts" ON public.alex_detected_contexts FOR INSERT WITH CHECK (true);
CREATE POLICY "Read detected contexts" ON public.alex_detected_contexts FOR SELECT USING (true);
