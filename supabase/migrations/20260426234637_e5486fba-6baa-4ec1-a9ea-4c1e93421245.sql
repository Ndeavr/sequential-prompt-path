-- ─── project_files: stores photos/quotes uploaded via Alex chat ───
CREATE TABLE IF NOT EXISTS public.project_files (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID NULL,
  storage_bucket TEXT NOT NULL DEFAULT 'property-photos',
  storage_path TEXT NOT NULL,
  mime TEXT NOT NULL,
  bytes INT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'photo' CHECK (kind IN ('photo','quote','document','other')),
  source TEXT NOT NULL DEFAULT 'alex_chat',
  filename TEXT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_project_files_user ON public.project_files(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_project_files_project ON public.project_files(project_id) WHERE project_id IS NOT NULL;

ALTER TABLE public.project_files ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "project_files owners read" ON public.project_files;
CREATE POLICY "project_files owners read"
  ON public.project_files FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "project_files owners insert" ON public.project_files;
CREATE POLICY "project_files owners insert"
  ON public.project_files FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "project_files owners update" ON public.project_files;
CREATE POLICY "project_files owners update"
  ON public.project_files FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "project_files owners delete" ON public.project_files;
CREATE POLICY "project_files owners delete"
  ON public.project_files FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- ─── Storage policies on property-photos so authenticated users can upload to userId/... ───
DROP POLICY IF EXISTS "property-photos: owners read" ON storage.objects;
CREATE POLICY "property-photos: owners read"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'property-photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "property-photos: owners insert" ON storage.objects;
CREATE POLICY "property-photos: owners insert"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'property-photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "property-photos: owners update" ON storage.objects;
CREATE POLICY "property-photos: owners update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'property-photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "property-photos: owners delete" ON storage.objects;
CREATE POLICY "property-photos: owners delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'property-photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );