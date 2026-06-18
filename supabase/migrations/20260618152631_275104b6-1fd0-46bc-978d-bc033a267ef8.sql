
CREATE TABLE IF NOT EXISTS public.ab_test_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  test_key TEXT NOT NULL,
  bucket TEXT NOT NULL,
  visitor_id TEXT NOT NULL,
  path TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ab_test_assignments_test_bucket_idx
  ON public.ab_test_assignments (test_key, bucket, created_at DESC);
CREATE INDEX IF NOT EXISTS ab_test_assignments_visitor_idx
  ON public.ab_test_assignments (visitor_id, test_key);

GRANT INSERT ON public.ab_test_assignments TO anon, authenticated;
GRANT ALL ON public.ab_test_assignments TO service_role;

ALTER TABLE public.ab_test_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert ab test assignments"
  ON public.ab_test_assignments FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Admins can read ab test assignments"
  ON public.ab_test_assignments FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
