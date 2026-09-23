CREATE TABLE IF NOT EXISTS public.property_dossier_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES public.alex_sessions(id) ON DELETE SET NULL,
  user_id uuid,
  property_id uuid,
  category text NOT NULL,
  entry_key text NOT NULL,
  label text NOT NULL,
  detail text,
  provenance text NOT NULL DEFAULT 'declared',
  source text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT property_dossier_entries_category_chk
    CHECK (category IN ('property','project','document','contractor','quote','appointment','note')),
  CONSTRAINT property_dossier_entries_provenance_chk
    CHECK (provenance IN ('verified','declared','inferred','pending'))
);

GRANT SELECT ON public.property_dossier_entries TO authenticated;
GRANT ALL ON public.property_dossier_entries TO service_role;

ALTER TABLE public.property_dossier_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners read their dossier entries"
  ON public.property_dossier_entries
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE UNIQUE INDEX IF NOT EXISTS property_dossier_entries_session_key_uidx
  ON public.property_dossier_entries (session_id, category, entry_key)
  WHERE session_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS property_dossier_entries_user_idx
  ON public.property_dossier_entries (user_id, updated_at DESC);

CREATE TRIGGER property_dossier_entries_touch
  BEFORE UPDATE ON public.property_dossier_entries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();