
-- Goal profile per contractor
CREATE TABLE IF NOT EXISTS public.contractor_goal_profiles (
  contractor_id UUID PRIMARY KEY,
  primary_goal TEXT NOT NULL,
  secondary_goals JSONB NOT NULL DEFAULT '[]'::jsonb,
  capacity_per_month INT,
  avg_contract_value NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.contractor_goal_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Contractors manage own goal profile"
ON public.contractor_goal_profiles
FOR ALL
TO authenticated
USING (
  contractor_id IN (SELECT id FROM public.contractors WHERE user_id = auth.uid())
  OR public.has_role(auth.uid(), 'admin')
)
WITH CHECK (
  contractor_id IN (SELECT id FROM public.contractors WHERE user_id = auth.uid())
  OR public.has_role(auth.uid(), 'admin')
);

CREATE TRIGGER trg_contractor_goal_profiles_updated_at
BEFORE UPDATE ON public.contractor_goal_profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Smart context overrides (admin-editable copy)
CREATE TABLE IF NOT EXISTS public.smart_context_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  field_id TEXT NOT NULL,
  lang TEXT NOT NULL DEFAULT 'fr-CA',
  payload JSONB NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (field_id, lang)
);

ALTER TABLE public.smart_context_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone reads active overrides"
ON public.smart_context_overrides
FOR SELECT
USING (active = true);

CREATE POLICY "Admins manage overrides"
ON public.smart_context_overrides
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_smart_context_overrides_updated_at
BEFORE UPDATE ON public.smart_context_overrides
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Smart context cache (AI-generated examples)
CREATE TABLE IF NOT EXISTS public.smart_context_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cache_key TEXT NOT NULL UNIQUE,
  field_id TEXT NOT NULL,
  city TEXT,
  trade TEXT,
  payload JSONB NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '24 hours'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_smart_context_cache_key ON public.smart_context_cache (cache_key);
CREATE INDEX IF NOT EXISTS idx_smart_context_cache_expires ON public.smart_context_cache (expires_at);

ALTER TABLE public.smart_context_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone reads fresh cache"
ON public.smart_context_cache
FOR SELECT
USING (expires_at > now());
