
-- Table: aipp_audits
CREATE TABLE public.aipp_audits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  domain TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.aipp_audits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can insert audits" ON public.aipp_audits FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can view audits" ON public.aipp_audits FOR SELECT USING (true);
CREATE POLICY "Service role can update audits" ON public.aipp_audits FOR UPDATE USING (true);

-- Table: aipp_audit_scores
CREATE TABLE public.aipp_audit_scores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  audit_id UUID NOT NULL REFERENCES public.aipp_audits(id) ON DELETE CASCADE,
  score_global NUMERIC NOT NULL DEFAULT 0,
  score_aeo NUMERIC NOT NULL DEFAULT 0,
  score_authority NUMERIC NOT NULL DEFAULT 0,
  score_conversion NUMERIC NOT NULL DEFAULT 0,
  score_local NUMERIC NOT NULL DEFAULT 0,
  score_tech NUMERIC NOT NULL DEFAULT 0,
  revenue_loss_estimate NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.aipp_audit_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view audit scores" ON public.aipp_audit_scores FOR SELECT USING (true);
CREATE POLICY "Service role can insert audit scores" ON public.aipp_audit_scores FOR INSERT WITH CHECK (true);

-- Table: aipp_audit_entities
CREATE TABLE public.aipp_audit_entities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  audit_id UUID NOT NULL REFERENCES public.aipp_audits(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL DEFAULT 'service',
  name TEXT NOT NULL,
  confidence NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.aipp_audit_entities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view audit entities" ON public.aipp_audit_entities FOR SELECT USING (true);
CREATE POLICY "Service role can insert audit entities" ON public.aipp_audit_entities FOR INSERT WITH CHECK (true);

-- Table: aipp_audit_recommendations
CREATE TABLE public.aipp_audit_recommendations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  audit_id UUID NOT NULL REFERENCES public.aipp_audits(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  priority TEXT NOT NULL DEFAULT 'medium',
  impact_score NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.aipp_audit_recommendations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view audit recommendations" ON public.aipp_audit_recommendations FOR SELECT USING (true);
CREATE POLICY "Service role can insert audit recommendations" ON public.aipp_audit_recommendations FOR INSERT WITH CHECK (true);

-- Indexes
CREATE INDEX idx_aipp_audits_user_id ON public.aipp_audits(user_id);
CREATE INDEX idx_aipp_audits_status ON public.aipp_audits(status);
CREATE INDEX idx_aipp_audit_scores_audit_id ON public.aipp_audit_scores(audit_id);
CREATE INDEX idx_aipp_audit_entities_audit_id ON public.aipp_audit_entities(audit_id);
CREATE INDEX idx_aipp_audit_recommendations_audit_id ON public.aipp_audit_recommendations(audit_id);
