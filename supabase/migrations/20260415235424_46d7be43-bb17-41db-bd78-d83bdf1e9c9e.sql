
ALTER TABLE public.alex_voice_profiles ADD COLUMN IF NOT EXISTS gender TEXT DEFAULT 'male';
ALTER TABLE public.alex_voice_profiles ADD COLUMN IF NOT EXISTS voice_provider TEXT DEFAULT 'elevenlabs';
ALTER TABLE public.alex_conversation_sessions ADD COLUMN IF NOT EXISTS silence_count INT DEFAULT 0;
ALTER TABLE public.alex_conversation_sessions ADD COLUMN IF NOT EXISTS anonymous_id TEXT;
