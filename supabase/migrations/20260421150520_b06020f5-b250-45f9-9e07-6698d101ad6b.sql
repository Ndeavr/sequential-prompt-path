ALTER TABLE public.aipp_audit_scores
ADD COLUMN IF NOT EXISTS score_potential integer DEFAULT 0;