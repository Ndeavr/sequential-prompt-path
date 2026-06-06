
-- UI Health Monitor: persistent table of accessibility findings (contrast, hidden text, etc.)
CREATE TABLE public.ui_accessibility_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  route text NOT NULL,
  component text,
  selector text,
  issue_type text NOT NULL,
  severity text NOT NULL CHECK (severity IN ('info','warn','critical')),
  contrast_ratio numeric,
  fg_color text,
  bg_color text,
  text_sample text,
  viewport text NOT NULL DEFAULT 'desktop',
  screenshot_url text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  detected_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  resolved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ui_accessibility_audit TO authenticated;
GRANT ALL ON public.ui_accessibility_audit TO service_role;

ALTER TABLE public.ui_accessibility_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read ui audit"
  ON public.ui_accessibility_audit FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins write ui audit"
  ON public.ui_accessibility_audit FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins update ui audit"
  ON public.ui_accessibility_audit FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins delete ui audit"
  ON public.ui_accessibility_audit FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_ui_audit_route ON public.ui_accessibility_audit(route);
CREATE INDEX idx_ui_audit_severity ON public.ui_accessibility_audit(severity) WHERE resolved_at IS NULL;
CREATE INDEX idx_ui_audit_detected ON public.ui_accessibility_audit(detected_at DESC);
