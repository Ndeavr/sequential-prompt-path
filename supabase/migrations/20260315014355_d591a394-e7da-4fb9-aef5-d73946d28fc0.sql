
-- Duplicate candidate states
CREATE TYPE public.duplicate_review_status AS ENUM (
  'pending',
  'confirmed_duplicate',
  'not_duplicate',
  'same_brand_separate_location',
  'needs_more_proof',
  'merged'
);

-- Entity confidence states
CREATE TYPE public.entity_confidence AS ENUM (
  'clear_unique',
  'likely_duplicate',
  'possible_duplicate',
  'ambiguous_shared_identity',
  'suspicious_low_confidence'
);

-- Duplicate candidates table
CREATE TABLE public.contractor_duplicate_candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id UUID NOT NULL REFERENCES public.contractors(id) ON DELETE CASCADE,
  candidate_contractor_id UUID NOT NULL REFERENCES public.contractors(id) ON DELETE CASCADE,
  duplicate_confidence_score NUMERIC(5,2) NOT NULL DEFAULT 0,
  entity_confidence public.entity_confidence NOT NULL DEFAULT 'possible_duplicate',
  reasons_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  matching_signals JSONB DEFAULT '{}'::jsonb,
  review_status public.duplicate_review_status NOT NULL DEFAULT 'pending',
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  merge_direction TEXT, -- 'keep_primary' or 'keep_candidate'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT no_self_duplicate CHECK (contractor_id != candidate_contractor_id),
  UNIQUE (contractor_id, candidate_contractor_id)
);

-- Index for fast lookups
CREATE INDEX idx_dup_candidates_contractor ON public.contractor_duplicate_candidates(contractor_id);
CREATE INDEX idx_dup_candidates_status ON public.contractor_duplicate_candidates(review_status);
CREATE INDEX idx_dup_candidates_score ON public.contractor_duplicate_candidates(duplicate_confidence_score DESC);

-- RLS
ALTER TABLE public.contractor_duplicate_candidates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage duplicate candidates"
  ON public.contractor_duplicate_candidates
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Suspicious profile flags table
CREATE TABLE public.contractor_entity_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id UUID NOT NULL REFERENCES public.contractors(id) ON DELETE CASCADE,
  flag_type TEXT NOT NULL, -- 'missing_identity', 'conflicting_contacts', 'repeated_failures', 'low_substance', 'shared_weak_evidence'
  severity TEXT NOT NULL DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'
  description TEXT,
  metadata_json JSONB DEFAULT '{}'::jsonb,
  is_resolved BOOLEAN NOT NULL DEFAULT false,
  resolved_by UUID REFERENCES auth.users(id),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (contractor_id, flag_type)
);

ALTER TABLE public.contractor_entity_flags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage entity flags"
  ON public.contractor_entity_flags
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_entity_flags_contractor ON public.contractor_entity_flags(contractor_id);
CREATE INDEX idx_entity_flags_unresolved ON public.contractor_entity_flags(is_resolved) WHERE is_resolved = false;

-- Updated at triggers
CREATE TRIGGER set_updated_at_dup_candidates
  BEFORE UPDATE ON public.contractor_duplicate_candidates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER set_updated_at_entity_flags
  BEFORE UPDATE ON public.contractor_entity_flags
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
