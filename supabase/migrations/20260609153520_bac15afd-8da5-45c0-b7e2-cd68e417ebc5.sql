CREATE TABLE IF NOT EXISTS public.popular_question_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  normalized_label text NOT NULL,
  topic text,
  intent text,
  role text,
  lang text DEFAULT 'fr-CA',
  source text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT popular_question_events_label_len CHECK (char_length(normalized_label) BETWEEN 6 AND 120)
);

CREATE INDEX IF NOT EXISTS idx_popular_question_events_created_at
  ON public.popular_question_events (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_popular_question_events_label
  ON public.popular_question_events (normalized_label);

GRANT INSERT ON public.popular_question_events TO anon, authenticated;
GRANT ALL ON public.popular_question_events TO service_role;

ALTER TABLE public.popular_question_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone_can_insert_popular_question"
  ON public.popular_question_events
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (char_length(normalized_label) BETWEEN 6 AND 120);

CREATE POLICY "admins_can_read_popular_questions"
  ON public.popular_question_events
  FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TABLE IF NOT EXISTS public.popular_question_blocklist (
  normalized_label text PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

GRANT SELECT, INSERT, DELETE ON public.popular_question_blocklist TO authenticated;
GRANT ALL ON public.popular_question_blocklist TO service_role;

ALTER TABLE public.popular_question_blocklist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins_manage_blocklist"
  ON public.popular_question_blocklist
  FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE OR REPLACE VIEW public.v_popular_questions_7d
WITH (security_invoker = true)
AS
SELECT
  e.normalized_label,
  (array_agg(e.topic ORDER BY e.created_at DESC) FILTER (WHERE e.topic IS NOT NULL))[1] AS topic,
  (array_agg(e.intent ORDER BY e.created_at DESC) FILTER (WHERE e.intent IS NOT NULL))[1] AS intent,
  count(*)::int AS total_count,
  count(*) FILTER (WHERE e.created_at > now() - interval '48 hours')::int AS recent_count,
  (
    count(*) FILTER (WHERE e.created_at > now() - interval '48 hours') * 2
    + count(*) FILTER (WHERE e.created_at <= now() - interval '48 hours')
  )::int AS weighted_score,
  max(e.created_at) AS last_seen_at
FROM public.popular_question_events e
WHERE e.created_at > now() - interval '7 days'
  AND NOT EXISTS (
    SELECT 1 FROM public.popular_question_blocklist b
    WHERE b.normalized_label = e.normalized_label
  )
GROUP BY e.normalized_label
ORDER BY weighted_score DESC, last_seen_at DESC
LIMIT 20;

GRANT SELECT ON public.v_popular_questions_7d TO anon, authenticated, service_role;