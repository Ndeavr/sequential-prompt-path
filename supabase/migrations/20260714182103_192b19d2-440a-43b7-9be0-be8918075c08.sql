ALTER TABLE public.contractor_verification_runs
  ADD COLUMN IF NOT EXISTS visitor_id text,
  ADD COLUMN IF NOT EXISTS attached_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_cvr_visitor_id_pending
  ON public.contractor_verification_runs(visitor_id)
  WHERE user_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_cvr_user_id
  ON public.contractor_verification_runs(user_id)
  WHERE user_id IS NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'contractor_verification_runs'
      AND policyname = 'Owners can read their verification runs'
  ) THEN
    EXECUTE 'CREATE POLICY "Owners can read their verification runs"
      ON public.contractor_verification_runs
      FOR SELECT
      TO authenticated
      USING (user_id = auth.uid())';
  END IF;
END $$;

GRANT SELECT ON public.contractor_verification_runs TO authenticated;
GRANT ALL ON public.contractor_verification_runs TO service_role;