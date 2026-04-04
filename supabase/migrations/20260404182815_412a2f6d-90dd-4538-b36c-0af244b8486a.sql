
-- =============================================
-- AlexMemoryMigration — 4 new tables + profiles patch
-- Service role key bypasses RLS for edge functions
-- =============================================

-- 1. PATCH profiles (non-destructive)
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS language_pref       text    NOT NULL DEFAULT 'fr',
  ADD COLUMN IF NOT EXISTS alex_persona        text    NOT NULL DEFAULT 'advisor',
  ADD COLUMN IF NOT EXISTS quiet_hours_start   int     NOT NULL DEFAULT 21,
  ADD COLUMN IF NOT EXISTS quiet_hours_end     int     NOT NULL DEFAULT 8,
  ADD COLUMN IF NOT EXISTS preferred_channel   text    NOT NULL DEFAULT 'email';

-- 2. TABLE: alex_threads
CREATE TABLE alex_threads (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid        NOT NULL,
  context_type      text        NOT NULL,
  entity_id         uuid,
  title             text,
  status            text        NOT NULL DEFAULT 'active',
  last_message_at   timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_alex_threads_user_id ON alex_threads(user_id);
CREATE INDEX idx_alex_threads_last_message ON alex_threads(last_message_at DESC);

-- 3. TABLE: alex_thread_messages (named to avoid collision with existing alex_messages)
CREATE TABLE alex_thread_messages (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id    uuid        NOT NULL REFERENCES alex_threads(id) ON DELETE CASCADE,
  role         text        NOT NULL,
  content      jsonb       NOT NULL,
  token_count  int,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_alex_thread_messages_thread_id ON alex_thread_messages(thread_id);
CREATE INDEX idx_alex_thread_messages_created ON alex_thread_messages(thread_id, created_at ASC);

-- 4. TABLE: alex_memory (new persistent memory — different from existing agent_memory)
CREATE TABLE alex_persistent_memory (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid        NOT NULL,
  memory_type         text        NOT NULL,
  key                 text        NOT NULL,
  value               jsonb       NOT NULL,
  confidence          float       NOT NULL DEFAULT 1.0,
  source_thread_id    uuid        REFERENCES alex_threads(id) ON DELETE SET NULL,
  expires_at          timestamptz,
  last_confirmed_at   timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, key)
);

CREATE INDEX idx_alex_persistent_memory_user_id ON alex_persistent_memory(user_id);
CREATE INDEX idx_alex_persistent_memory_user_type ON alex_persistent_memory(user_id, memory_type);
CREATE INDEX idx_alex_persistent_memory_expires ON alex_persistent_memory(expires_at)
  WHERE expires_at IS NOT NULL;

-- 5. TABLE: alex_outreach_queue
CREATE TABLE alex_outreach_queue (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid        NOT NULL,
  trigger_type      text        NOT NULL,
  trigger_payload   jsonb       NOT NULL,
  message_text      text,
  quick_replies     jsonb,
  priority          int         NOT NULL DEFAULT 3,
  channel           text        NOT NULL DEFAULT 'email',
  scheduled_at      timestamptz NOT NULL,
  status            text        NOT NULL DEFAULT 'pending',
  cancelled_reason  text,
  sent_at           timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_outreach_queue_user ON alex_outreach_queue(user_id);
CREATE INDEX idx_outreach_queue_sweep ON alex_outreach_queue(status, scheduled_at)
  WHERE status = 'pending';

-- =============================================
-- RLS POLICIES
-- =============================================

-- alex_threads
ALTER TABLE alex_threads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own threads"
  ON alex_threads FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins read all threads"
  ON alex_threads FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- alex_thread_messages
ALTER TABLE alex_thread_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own thread messages"
  ON alex_thread_messages FOR ALL
  USING (auth.uid() = (SELECT user_id FROM alex_threads WHERE id = thread_id))
  WITH CHECK (auth.uid() = (SELECT user_id FROM alex_threads WHERE id = thread_id));

CREATE POLICY "Admins read all thread messages"
  ON alex_thread_messages FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- alex_persistent_memory
ALTER TABLE alex_persistent_memory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own memory"
  ON alex_persistent_memory FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins read all memory"
  ON alex_persistent_memory FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- alex_outreach_queue
ALTER TABLE alex_outreach_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own outreach"
  ON alex_outreach_queue FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins manage all outreach"
  ON alex_outreach_queue FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));
