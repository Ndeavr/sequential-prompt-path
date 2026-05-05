CREATE TABLE IF NOT EXISTS public.user_visual_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  property_id UUID,
  preference_type TEXT,
  selected_style TEXT,
  rejected_style TEXT,
  project_type TEXT,
  source_image_url TEXT,
  generated_preview_url TEXT,
  confidence_score NUMERIC DEFAULT 0.75,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.user_visual_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own visual prefs"
  ON public.user_visual_preferences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own visual prefs"
  ON public.user_visual_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can update own visual prefs"
  ON public.user_visual_preferences FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own visual prefs"
  ON public.user_visual_preferences FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_visual_prefs_user ON public.user_visual_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_visual_prefs_property ON public.user_visual_preferences(property_id);