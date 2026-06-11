GRANT SELECT, INSERT, UPDATE, DELETE ON public.founder_score_prospects TO authenticated;
GRANT INSERT ON public.founder_score_prospects TO anon;
GRANT ALL ON public.founder_score_prospects TO service_role;

CREATE POLICY "founder_score_prospects_public_insert"
ON public.founder_score_prospects
FOR INSERT
TO anon, authenticated
WITH CHECK (true);