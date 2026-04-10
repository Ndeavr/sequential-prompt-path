
-- Generation quota limits per plan
CREATE TABLE public.generation_limits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_type TEXT NOT NULL,
  generation_type TEXT NOT NULL DEFAULT 'combined_visual',
  max_generations INTEGER,
  is_unlimited BOOLEAN NOT NULL DEFAULT false,
  reset_period TEXT NOT NULL DEFAULT 'lifetime',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(plan_type, generation_type)
);

ALTER TABLE public.generation_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read generation limits"
  ON public.generation_limits FOR SELECT
  USING (true);

-- Seed default limits
INSERT INTO public.generation_limits (plan_type, generation_type, max_generations, is_unlimited, reset_period) VALUES
  ('decouverte', 'combined_visual', 3, false, 'lifetime'),
  ('plus', 'combined_visual', 5, false, 'lifetime'),
  ('signature', 'combined_visual', NULL, true, 'lifetime');

-- User generation usage tracking
CREATE TABLE public.user_generation_usage (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  generation_type TEXT NOT NULL DEFAULT 'combined_visual',
  used_count INTEGER NOT NULL DEFAULT 0,
  last_generation_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, generation_type)
);

ALTER TABLE public.user_generation_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own usage"
  ON public.user_generation_usage FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own usage"
  ON public.user_generation_usage FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own usage"
  ON public.user_generation_usage FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Updated_at trigger
CREATE TRIGGER update_generation_limits_updated_at
  BEFORE UPDATE ON public.generation_limits
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER update_user_generation_usage_updated_at
  BEFORE UPDATE ON public.user_generation_usage
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Function to check quota
CREATE OR REPLACE FUNCTION public.check_generation_quota(
  _user_id UUID,
  _plan_type TEXT DEFAULT 'decouverte',
  _generation_type TEXT DEFAULT 'combined_visual'
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_limit RECORD;
  v_usage RECORD;
  v_remaining INTEGER;
BEGIN
  -- Get limit for plan
  SELECT * INTO v_limit FROM public.generation_limits
    WHERE plan_type = _plan_type AND generation_type = _generation_type;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'plan_not_found');
  END IF;

  -- Unlimited plan
  IF v_limit.is_unlimited THEN
    RETURN jsonb_build_object(
      'allowed', true,
      'is_unlimited', true,
      'used_count', COALESCE((SELECT used_count FROM public.user_generation_usage WHERE user_id = _user_id AND generation_type = _generation_type), 0),
      'max_generations', NULL,
      'remaining', NULL,
      'plan_type', _plan_type
    );
  END IF;

  -- Get usage
  SELECT * INTO v_usage FROM public.user_generation_usage
    WHERE user_id = _user_id AND generation_type = _generation_type;

  v_remaining := v_limit.max_generations - COALESCE(v_usage.used_count, 0);

  RETURN jsonb_build_object(
    'allowed', v_remaining > 0,
    'is_unlimited', false,
    'used_count', COALESCE(v_usage.used_count, 0),
    'max_generations', v_limit.max_generations,
    'remaining', GREATEST(v_remaining, 0),
    'plan_type', _plan_type,
    'upgrade_soft', COALESCE(v_usage.used_count, 0) >= (v_limit.max_generations - 1),
    'upgrade_aggressive', v_remaining <= 1
  );
END;
$$;

-- Function to consume a credit
CREATE OR REPLACE FUNCTION public.consume_generation_credit(
  _user_id UUID,
  _generation_type TEXT DEFAULT 'combined_visual'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_new_count INTEGER;
BEGIN
  INSERT INTO public.user_generation_usage (user_id, generation_type, used_count, last_generation_at)
  VALUES (_user_id, _generation_type, 1, now())
  ON CONFLICT (user_id, generation_type)
  DO UPDATE SET
    used_count = public.user_generation_usage.used_count + 1,
    last_generation_at = now()
  RETURNING used_count INTO v_new_count;

  RETURN jsonb_build_object('consumed', true, 'new_count', v_new_count);
END;
$$;
