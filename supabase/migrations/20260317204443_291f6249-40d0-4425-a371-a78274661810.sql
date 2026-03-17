
-- Contractor onboarding sessions: persists wizard progress
CREATE TABLE public.contractor_onboarding_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  current_step INTEGER NOT NULL DEFAULT 0,
  business_name TEXT,
  import_form JSONB DEFAULT '{}'::jsonb,
  business_data JSONB DEFAULT '{}'::jsonb,
  audit_sections JSONB DEFAULT '[]'::jsonb,
  aipp_score JSONB,
  objective TEXT,
  selected_plan JSONB,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.contractor_onboarding_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own onboarding sessions"
  ON public.contractor_onboarding_sessions
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Auto-update updated_at
CREATE TRIGGER update_onboarding_sessions_updated_at
  BEFORE UPDATE ON public.contractor_onboarding_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Index
CREATE INDEX idx_onboarding_sessions_user_id ON public.contractor_onboarding_sessions(user_id);
