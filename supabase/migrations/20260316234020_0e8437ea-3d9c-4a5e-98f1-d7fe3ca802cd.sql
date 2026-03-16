
-- Track monthly design generation usage per user
CREATE TABLE public.design_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  month_key text NOT NULL, -- format: '2026-03'
  generation_count integer NOT NULL DEFAULT 0,
  is_subscribed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, month_key)
);

ALTER TABLE public.design_usage ENABLE ROW LEVEL SECURITY;

-- Users can read their own usage
CREATE POLICY "Users can read own usage"
  ON public.design_usage FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Only service role / edge functions insert/update
CREATE POLICY "Service role manages usage"
  ON public.design_usage FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- Trigger for updated_at
CREATE TRIGGER update_design_usage_updated_at
  BEFORE UPDATE ON public.design_usage
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
