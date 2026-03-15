
-- Contractor verification snapshots: latest read model for quick display
CREATE TABLE IF NOT EXISTS public.contractor_verification_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id uuid NOT NULL REFERENCES public.contractors(id) ON DELETE CASCADE,
  verification_run_id uuid REFERENCES public.contractor_verification_runs(id) ON DELETE SET NULL,
  identity_confidence_score integer DEFAULT 0,
  public_trust_score integer DEFAULT 0,
  live_risk_delta integer DEFAULT 0,
  identity_resolution_status text DEFAULT 'no_reliable_match',
  strengths jsonb DEFAULT '[]'::jsonb,
  risks jsonb DEFAULT '[]'::jsonb,
  inconsistencies jsonb DEFAULT '[]'::jsonb,
  missing_proofs jsonb DEFAULT '[]'::jsonb,
  final_recommendation text,
  snapshot_json jsonb DEFAULT '{}'::jsonb,
  is_current boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Only one current snapshot per contractor
CREATE UNIQUE INDEX IF NOT EXISTS idx_contractor_verification_snapshots_current 
  ON public.contractor_verification_snapshots(contractor_id) WHERE is_current = true;

ALTER TABLE public.contractor_verification_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage verification snapshots"
  ON public.contractor_verification_snapshots FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Contractor merge suggestions: admin review queue for public findings
CREATE TABLE IF NOT EXISTS public.contractor_merge_suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id uuid NOT NULL REFERENCES public.contractors(id) ON DELETE CASCADE,
  verification_run_id uuid REFERENCES public.contractor_verification_runs(id) ON DELETE SET NULL,
  field_name text NOT NULL,
  current_value text,
  suggested_value text,
  source text DEFAULT 'public_verification',
  confidence numeric DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  reviewed_by uuid,
  reviewed_at timestamptz,
  review_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.contractor_merge_suggestions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage merge suggestions"
  ON public.contractor_merge_suggestions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Add trigger for updated_at
CREATE TRIGGER update_contractor_verification_snapshots_updated_at
  BEFORE UPDATE ON public.contractor_verification_snapshots
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_contractor_merge_suggestions_updated_at
  BEFORE UPDATE ON public.contractor_merge_suggestions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
