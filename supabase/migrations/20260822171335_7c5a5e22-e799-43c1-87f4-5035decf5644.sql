CREATE TABLE IF NOT EXISTS public.internal_agent_tokens (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  token text not null default replace(gen_random_uuid()::text,'-','') || replace(gen_random_uuid()::text,'-',''),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
GRANT ALL ON public.internal_agent_tokens TO service_role;
ALTER TABLE public.internal_agent_tokens ENABLE ROW LEVEL SECURITY;
INSERT INTO public.internal_agent_tokens (name) VALUES ('ai-revenue-agent') ON CONFLICT (name) DO NOTHING;