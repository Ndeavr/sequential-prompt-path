CREATE TABLE IF NOT EXISTS public.google_project_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  detected_key_name text,
  masked_key text,
  source text,
  feature text,
  file_path text,
  usage_type text,
  risk_level text,
  status text,
  recommendation text,
  payload jsonb
);

ALTER TABLE public.google_project_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view google audit logs"
  ON public.google_project_audit_logs FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert google audit logs"
  ON public.google_project_audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update google audit logs"
  ON public.google_project_audit_logs FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));