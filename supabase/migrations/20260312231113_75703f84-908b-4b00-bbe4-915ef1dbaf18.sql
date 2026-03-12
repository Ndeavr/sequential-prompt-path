
-- conversations table: persists Alex chat sessions
CREATE TABLE public.conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_type text NOT NULL DEFAULT 'alex_chat',
  channel text NOT NULL DEFAULT 'web',
  current_intent text,
  current_stage text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- conversation_messages table: stores each message with structured payload
CREATE TABLE public.conversation_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user', 'assistant', 'system', 'agent')),
  message_text text,
  structured_payload jsonb,
  intent text,
  stage text,
  ui_actions jsonb,
  agent_calls jsonb,
  memory_updates jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_conversations_user_id ON public.conversations(user_id);
CREATE INDEX idx_conversations_created_at ON public.conversations(created_at DESC);
CREATE INDEX idx_conversation_messages_conversation_id ON public.conversation_messages(conversation_id);
CREATE INDEX idx_conversation_messages_created_at ON public.conversation_messages(created_at);

-- updated_at trigger for conversations
CREATE TRIGGER set_conversations_updated_at
  BEFORE UPDATE ON public.conversations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- RLS
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_messages ENABLE ROW LEVEL SECURITY;

-- Users can only access their own conversations
CREATE POLICY "Users read own conversations"
  ON public.conversations FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users insert own conversations"
  ON public.conversations FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users update own conversations"
  ON public.conversations FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

-- Users can only access messages in their own conversations
CREATE POLICY "Users read own conversation messages"
  ON public.conversation_messages FOR SELECT TO authenticated
  USING (conversation_id IN (SELECT id FROM public.conversations WHERE user_id = auth.uid()));

CREATE POLICY "Users insert into own conversations"
  ON public.conversation_messages FOR INSERT TO authenticated
  WITH CHECK (conversation_id IN (SELECT id FROM public.conversations WHERE user_id = auth.uid()));

-- Admins can read all (via has_role)
CREATE POLICY "Admins read all conversations"
  ON public.conversations FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins read all conversation messages"
  ON public.conversation_messages FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Enable realtime for conversation_messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversation_messages;
