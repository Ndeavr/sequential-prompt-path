
CREATE TABLE public.entrepreneur_entry_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text,
  source_page text NOT NULL DEFAULT 'fallback',
  action text NOT NULL DEFAULT 'click',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.entrepreneur_entry_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert entry logs"
  ON public.entrepreneur_entry_logs
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Admins can read entry logs"
  ON public.entrepreneur_entry_logs
  FOR SELECT
  TO authenticated
  USING (public.is_admin());
