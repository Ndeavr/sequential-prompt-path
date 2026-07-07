
CREATE TABLE IF NOT EXISTS public.homeowner_compat_dna (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  communication JSONB NOT NULL DEFAULT '{}'::jsonb,
  property JSONB NOT NULL DEFAULT '{}'::jsonb,
  preferences JSONB NOT NULL DEFAULT '{}'::jsonb,
  environment JSONB NOT NULL DEFAULT '{}'::jsonb,
  behavior JSONB NOT NULL DEFAULT '{}'::jsonb,
  confidence JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.homeowner_compat_dna TO authenticated;
GRANT ALL ON public.homeowner_compat_dna TO service_role;
ALTER TABLE public.homeowner_compat_dna ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='homeowner_compat_dna' AND policyname='own_compat_dna_select') THEN
    CREATE POLICY "own_compat_dna_select" ON public.homeowner_compat_dna FOR SELECT TO authenticated USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='homeowner_compat_dna' AND policyname='own_compat_dna_insert') THEN
    CREATE POLICY "own_compat_dna_insert" ON public.homeowner_compat_dna FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='homeowner_compat_dna' AND policyname='own_compat_dna_update') THEN
    CREATE POLICY "own_compat_dna_update" ON public.homeowner_compat_dna FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;
