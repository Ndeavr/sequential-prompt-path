
-- Fix: Allow users to INSERT their own home scores
CREATE POLICY "Users can insert own home scores" ON public.home_scores
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Fix: Allow users to UPDATE their own home scores
CREATE POLICY "Users can update own home scores" ON public.home_scores
  FOR UPDATE USING (auth.uid() = user_id);

-- Fix: Allow system/user to INSERT quote analysis (via user's quote ownership)
CREATE POLICY "Users can insert own quote analysis" ON public.quote_analysis
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.quotes q WHERE q.id = quote_id AND q.user_id = auth.uid())
  );
