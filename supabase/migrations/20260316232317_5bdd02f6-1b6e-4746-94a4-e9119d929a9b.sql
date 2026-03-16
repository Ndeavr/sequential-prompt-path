-- Allow anonymous vote insertion (controlled via edge function with share token validation)
CREATE POLICY "Anyone can insert votes via edge function"
  ON public.design_votes
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Allow reading votes
CREATE POLICY "Anyone can read votes"
  ON public.design_votes
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Allow reading shares (token lookup)
CREATE POLICY "Anyone can read shares by token"
  ON public.design_shares
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Allow authenticated users to create shares for their own projects
CREATE POLICY "Users can create shares for own projects"
  ON public.design_shares
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.design_projects dp
      WHERE dp.id = project_id AND dp.user_id = auth.uid()
    )
  );

-- Allow reading versions for shared projects (public access via anon)
CREATE POLICY "Anyone can read versions of shared projects"
  ON public.design_versions
  FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM public.design_shares ds
      WHERE ds.project_id = design_versions.project_id
    )
  );

-- Allow reading project info for shared projects
CREATE POLICY "Anyone can read shared projects"
  ON public.design_projects
  FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM public.design_shares ds
      WHERE ds.project_id = design_projects.id
    )
  );

-- Allow updating votes (for changing vote type)
CREATE POLICY "Anyone can update votes"
  ON public.design_votes
  FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);