
-- Alex Intelligence Core Tables

CREATE TABLE public.alex_user_memory (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  memory_key TEXT NOT NULL,
  memory_value TEXT NOT NULL,
  confidence_score NUMERIC DEFAULT 0.5,
  source TEXT DEFAULT 'conversation',
  last_used_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, memory_key)
);

CREATE TABLE public.alex_conversation_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL,
  user_id UUID,
  user_message TEXT,
  alex_response TEXT,
  intent_detected TEXT,
  question_type TEXT,
  context_snapshot_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.alex_context_snapshots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL,
  context_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  sources_used JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.alex_learning_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL,
  user_id UUID,
  event_type TEXT NOT NULL,
  outcome TEXT NOT NULL,
  metadata_json JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.alex_answer_scores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id UUID,
  session_id TEXT NOT NULL,
  clarity_score NUMERIC DEFAULT 0,
  usefulness_score NUMERIC DEFAULT 0,
  progression_score NUMERIC DEFAULT 0,
  conversion_score NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.alex_inferred_prefs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  preference_key TEXT NOT NULL,
  preference_value TEXT NOT NULL,
  confidence_score NUMERIC DEFAULT 0.5,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, preference_key)
);

-- Visual Intelligence Tables

CREATE TABLE public.alex_photo_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL,
  user_id UUID,
  trigger_reason TEXT NOT NULL,
  context_type TEXT DEFAULT 'problem',
  message_text TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.alex_uploaded_images (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL,
  user_id UUID,
  image_url TEXT NOT NULL,
  image_type TEXT DEFAULT 'problem',
  storage_path TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.alex_visual_analyses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  image_id UUID REFERENCES public.alex_uploaded_images(id) ON DELETE CASCADE,
  analysis_summary TEXT,
  issue_detected TEXT,
  confidence_score NUMERIC DEFAULT 0,
  recommendation TEXT,
  analysis_status TEXT DEFAULT 'uploaded',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.alex_visual_projections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL,
  base_image_id UUID REFERENCES public.alex_uploaded_images(id) ON DELETE SET NULL,
  generated_image_url TEXT,
  style_type TEXT DEFAULT 'modern',
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.alex_photo_prompt_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL,
  user_id UUID,
  triggered BOOLEAN DEFAULT true,
  accepted BOOLEAN DEFAULT false,
  ignored BOOLEAN DEFAULT false,
  trigger_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.alex_user_memory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alex_conversation_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alex_context_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alex_learning_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alex_answer_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alex_inferred_prefs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alex_photo_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alex_uploaded_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alex_visual_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alex_visual_projections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alex_photo_prompt_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies for alex_user_memory
CREATE POLICY "Users manage own memory" ON public.alex_user_memory FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- RLS Policies for alex_conversation_log (allow insert for anonymous sessions too)
CREATE POLICY "Users view own conversations" ON public.alex_conversation_log FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);
CREATE POLICY "Anyone can insert conversation logs" ON public.alex_conversation_log FOR INSERT WITH CHECK (true);

-- RLS Policies for alex_context_snapshots
CREATE POLICY "Anyone can insert snapshots" ON public.alex_context_snapshots FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can view snapshots" ON public.alex_context_snapshots FOR SELECT USING (true);

-- RLS Policies for alex_learning_events
CREATE POLICY "Anyone can insert learning events" ON public.alex_learning_events FOR INSERT WITH CHECK (true);
CREATE POLICY "Users view own learning events" ON public.alex_learning_events FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);

-- RLS Policies for alex_answer_scores
CREATE POLICY "Anyone can insert scores" ON public.alex_answer_scores FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can view scores" ON public.alex_answer_scores FOR SELECT USING (true);

-- RLS Policies for alex_inferred_prefs
CREATE POLICY "Users manage own prefs" ON public.alex_inferred_prefs FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- RLS Policies for alex_photo_requests
CREATE POLICY "Anyone can insert photo requests" ON public.alex_photo_requests FOR INSERT WITH CHECK (true);
CREATE POLICY "Users view own photo requests" ON public.alex_photo_requests FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);

-- RLS Policies for alex_uploaded_images
CREATE POLICY "Anyone can insert images" ON public.alex_uploaded_images FOR INSERT WITH CHECK (true);
CREATE POLICY "Users view own images" ON public.alex_uploaded_images FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);

-- RLS Policies for alex_visual_analyses
CREATE POLICY "Anyone can manage analyses" ON public.alex_visual_analyses FOR ALL USING (true) WITH CHECK (true);

-- RLS Policies for alex_visual_projections
CREATE POLICY "Anyone can manage projections" ON public.alex_visual_projections FOR ALL USING (true) WITH CHECK (true);

-- RLS Policies for alex_photo_prompt_events
CREATE POLICY "Anyone can insert prompt events" ON public.alex_photo_prompt_events FOR INSERT WITH CHECK (true);
CREATE POLICY "Users view own prompt events" ON public.alex_photo_prompt_events FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);

-- Indexes
CREATE INDEX idx_alex_user_memory_user ON public.alex_user_memory(user_id);
CREATE INDEX idx_alex_conversation_log_session ON public.alex_conversation_log(session_id);
CREATE INDEX idx_alex_learning_events_session ON public.alex_learning_events(session_id);
CREATE INDEX idx_alex_uploaded_images_session ON public.alex_uploaded_images(session_id);
CREATE INDEX idx_alex_photo_requests_session ON public.alex_photo_requests(session_id);
