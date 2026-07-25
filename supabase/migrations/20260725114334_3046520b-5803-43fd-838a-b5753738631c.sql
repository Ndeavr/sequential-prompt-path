-- Fix affiliate activation: upsert(onConflict:user_id) requires a UNIQUE
-- constraint, and authenticated users need INSERT/UPDATE self-scoped policies.

CREATE UNIQUE INDEX IF NOT EXISTS affiliates_user_id_unique
  ON public.affiliates(user_id)
  WHERE user_id IS NOT NULL;

DROP POLICY IF EXISTS "Users can insert own affiliate row" ON public.affiliates;
CREATE POLICY "Users can insert own affiliate row"
  ON public.affiliates
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own affiliate row" ON public.affiliates;
CREATE POLICY "Users can update own affiliate row"
  ON public.affiliates
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

GRANT SELECT, INSERT, UPDATE ON public.affiliates TO authenticated;