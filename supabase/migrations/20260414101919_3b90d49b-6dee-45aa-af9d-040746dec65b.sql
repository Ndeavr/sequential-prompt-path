
CREATE TABLE public.conversation_activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id TEXT NOT NULL,
  user_id UUID,
  last_user_action_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reengagement_count INT NOT NULL DEFAULT 0 CHECK (reengagement_count >= 0 AND reengagement_count <= 3),
  state TEXT NOT NULL DEFAULT 'active' CHECK (state IN ('active', 'passive')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_conv_activity_conversation ON public.conversation_activity_logs(conversation_id);
CREATE INDEX idx_conv_activity_user ON public.conversation_activity_logs(user_id);
CREATE INDEX idx_conv_activity_state ON public.conversation_activity_logs(state);

ALTER TABLE public.conversation_activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own activity logs"
  ON public.conversation_activity_logs
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Anon can manage by conversation_id"
  ON public.conversation_activity_logs
  FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);
