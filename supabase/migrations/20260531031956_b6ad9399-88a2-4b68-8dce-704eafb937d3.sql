
-- Auto-flagging outbound prioritaire: badges marketing + incohérences IA

-- 1. Augmenter sniper_targets pour tracker l'auto-flag
ALTER TABLE public.sniper_targets
  ADD COLUMN IF NOT EXISTS badge_signals jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS ai_incoherence_score numeric(5,2),
  ADD COLUMN IF NOT EXISTS priority_flag text,
  ADD COLUMN IF NOT EXISTS auto_flagged_at timestamptz,
  ADD COLUMN IF NOT EXISTS auto_flag_reason text;

CREATE INDEX IF NOT EXISTS idx_sniper_targets_priority_flag
  ON public.sniper_targets(priority_flag)
  WHERE priority_flag IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_sniper_targets_auto_flagged_at
  ON public.sniper_targets(auto_flagged_at DESC)
  WHERE auto_flagged_at IS NOT NULL;

-- 2. Audit table: chaque détection auto-flag
CREATE TABLE IF NOT EXISTS public.outbound_priority_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target_id uuid REFERENCES public.sniper_targets(id) ON DELETE CASCADE,
  company_id uuid REFERENCES public.outbound_companies(id) ON DELETE CASCADE,
  flag_type text NOT NULL,
  severity text NOT NULL DEFAULT 'high',
  badge_signals jsonb NOT NULL DEFAULT '[]'::jsonb,
  ai_incoherence_signals jsonb NOT NULL DEFAULT '[]'::jsonb,
  priority_score_boost numeric(5,2) NOT NULL DEFAULT 0,
  routed_sequence_id uuid REFERENCES public.outbound_sequences(id),
  source text NOT NULL DEFAULT 'auto',
  reason text,
  resolved_at timestamptz,
  resolution text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.outbound_priority_flags TO authenticated;
GRANT ALL ON public.outbound_priority_flags TO service_role;

ALTER TABLE public.outbound_priority_flags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access outbound_priority_flags"
  ON public.outbound_priority_flags
  FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX IF NOT EXISTS idx_priority_flags_target ON public.outbound_priority_flags(target_id);
CREATE INDEX IF NOT EXISTS idx_priority_flags_type ON public.outbound_priority_flags(flag_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_priority_flags_unresolved ON public.outbound_priority_flags(created_at DESC) WHERE resolved_at IS NULL;

-- 3. Seed la séquence Badges 2026 si absente
INSERT INTO public.outbound_sequences (sequence_name, sequence_type, language, target_type, channel, goal, is_active, is_default)
SELECT 'Badges 2026 - AI Domination', 'priority', 'fr', 'contractor', 'email', 'convert_badge_to_ai_audit', true, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.outbound_sequences WHERE sequence_name = 'Badges 2026 - AI Domination'
);

-- 4. Fonction SQL helper: scan candidats à flagger (badges détectés dans notes/source_reference ou via outbound_companies)
CREATE OR REPLACE FUNCTION public.detect_badge_priority_targets(p_limit int DEFAULT 200)
RETURNS TABLE(
  target_id uuid,
  business_name text,
  badge_matches text[],
  ai_incoherence numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH sources AS (
    SELECT
      st.id AS target_id,
      st.business_name,
      LOWER(COALESCE(st.notes::text, '') || ' ' || COALESCE(st.source_reference::text, '') || ' ' || COALESCE(st.business_name, '') || ' ' || COALESCE(st.website_url, '')) AS haystack,
      st.ai_incoherence_score
    FROM public.sniper_targets st
    WHERE st.priority_flag IS NULL
      AND st.identity_status <> 'converted'
  ),
  matched AS (
    SELECT
      target_id,
      business_name,
      ai_incoherence_score,
      ARRAY_REMOVE(ARRAY[
        CASE WHEN haystack ~ 'choix\s+du\s+consommateur' THEN 'choix_consommateur' END,
        CASE WHEN haystack ~ 'best\s+of|meilleur\s+de' THEN 'best_of' END,
        CASE WHEN haystack ~ 'consumer\s+choice' THEN 'consumer_choice' END,
        CASE WHEN haystack ~ 'caa[\s-]?québec|caa[\s-]?quebec|caa[\s-]?habitation' THEN 'caa_habitation' END,
        CASE WHEN haystack ~ 'rbq\s+excellence|prix\s+rbq' THEN 'rbq_excellence' END,
        CASE WHEN haystack ~ 'three\s+best\s+rated|threebestrated' THEN 'three_best_rated' END,
        CASE WHEN haystack ~ 'homestars|home\s+stars' THEN 'homestars_badge' END,
        CASE WHEN haystack ~ 'houzz\s+(best|pro|influencer)' THEN 'houzz_badge' END,
        CASE WHEN haystack ~ 'trophée|trophee|award|certifié\s+élite' THEN 'generic_award' END
      ], NULL) AS badges
    FROM sources
  )
  SELECT target_id, business_name, badges, ai_incoherence_score
  FROM matched
  WHERE array_length(badges, 1) >= 1
  ORDER BY array_length(badges, 1) DESC, business_name
  LIMIT p_limit;
$$;

GRANT EXECUTE ON FUNCTION public.detect_badge_priority_targets(int) TO authenticated, service_role;
