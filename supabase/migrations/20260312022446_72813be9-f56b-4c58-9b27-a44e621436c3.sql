
-- Add display_order column to alignment_questions
ALTER TABLE public.alignment_questions ADD COLUMN IF NOT EXISTS display_order integer DEFAULT 0;

-- Create ccai_answer_matrix view
CREATE OR REPLACE VIEW public.ccai_answer_matrix AS
SELECT
  paa.id,
  paa.user_id,
  paa.contractor_id,
  paa.property_id,
  aq.code AS question_code,
  aq.category,
  aq.question_fr,
  aq.question_en,
  aq.weight,
  paa.answer_code,
  paa.source,
  paa.confidence,
  paa.created_at,
  paa.updated_at
FROM public.profile_alignment_answers paa
JOIN public.alignment_questions aq ON aq.id = paa.question_id
WHERE aq.is_active = true;

-- Create get_ccai_answer_pairs function
CREATE OR REPLACE FUNCTION public.get_ccai_answer_pairs(
  p_user_id uuid,
  p_contractor_id uuid,
  p_property_id uuid DEFAULT NULL
)
RETURNS TABLE (
  question_code text,
  category text,
  weight numeric,
  homeowner_answer text,
  contractor_answer text,
  is_match boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  WITH homeowner AS (
    SELECT
      aq.code AS question_code,
      aq.category,
      aq.weight,
      paa.answer_code
    FROM public.profile_alignment_answers paa
    JOIN public.alignment_questions aq ON aq.id = paa.question_id
    WHERE paa.user_id = p_user_id
      AND (paa.property_id IS NOT DISTINCT FROM p_property_id)
  ),
  contractor AS (
    SELECT
      aq.code AS question_code,
      paa.answer_code
    FROM public.profile_alignment_answers paa
    JOIN public.alignment_questions aq ON aq.id = paa.question_id
    WHERE paa.contractor_id = p_contractor_id
  )
  SELECT
    h.question_code,
    h.category,
    h.weight,
    h.answer_code AS homeowner_answer,
    c.answer_code AS contractor_answer,
    (h.answer_code = c.answer_code) AS is_match
  FROM homeowner h
  LEFT JOIN contractor c ON c.question_code = h.question_code;
$$;
