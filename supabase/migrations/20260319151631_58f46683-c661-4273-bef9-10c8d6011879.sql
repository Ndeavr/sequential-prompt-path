
-- Drop conflicting then recreate remaining policies

-- property_recommendations
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'property_recommendations' AND policyname = 'Owners can view their property recommendations') THEN
    EXECUTE 'CREATE POLICY "Owners can view their property recommendations" ON public.property_recommendations FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.properties p WHERE p.id = property_recommendations.property_id AND p.user_id = auth.uid()))';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'property_recommendations' AND policyname = 'Admins can manage all property recommendations') THEN
    EXECUTE 'CREATE POLICY "Admins can manage all property recommendations" ON public.property_recommendations FOR ALL TO authenticated USING (public.has_role(auth.uid(), ''admin'')) WITH CHECK (public.has_role(auth.uid(), ''admin''))';
  END IF;
END $$;

-- contractor_scores
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'contractor_scores' AND policyname = 'Contractors can view their own scores') THEN
    EXECUTE 'CREATE POLICY "Contractors can view their own scores" ON public.contractor_scores FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.contractors c WHERE c.id = contractor_scores.contractor_id AND c.user_id = auth.uid()))';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'contractor_scores' AND policyname = 'Admins can manage all contractor scores') THEN
    EXECUTE 'CREATE POLICY "Admins can manage all contractor scores" ON public.contractor_scores FOR ALL TO authenticated USING (public.has_role(auth.uid(), ''admin'')) WITH CHECK (public.has_role(auth.uid(), ''admin''))';
  END IF;
END $$;

-- broker_profiles
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'broker_profiles' AND policyname = 'Brokers can manage their own profile') THEN
    EXECUTE 'CREATE POLICY "Brokers can manage their own profile" ON public.broker_profiles FOR ALL TO authenticated USING (profile_id = auth.uid()) WITH CHECK (profile_id = auth.uid())';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'broker_profiles' AND policyname = 'Public can view broker profiles') THEN
    EXECUTE 'CREATE POLICY "Public can view broker profiles" ON public.broker_profiles FOR SELECT TO authenticated USING (true)';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'broker_profiles' AND policyname = 'Admins can manage all broker profiles') THEN
    EXECUTE 'CREATE POLICY "Admins can manage all broker profiles" ON public.broker_profiles FOR ALL TO authenticated USING (public.has_role(auth.uid(), ''admin'')) WITH CHECK (public.has_role(auth.uid(), ''admin''))';
  END IF;
END $$;

-- broker_scores
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'broker_scores' AND policyname = 'Brokers can view their own scores') THEN
    EXECUTE 'CREATE POLICY "Brokers can view their own scores" ON public.broker_scores FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.broker_profiles bp WHERE bp.id = broker_scores.broker_id AND bp.profile_id = auth.uid()))';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'broker_scores' AND policyname = 'Admins can manage all broker scores') THEN
    EXECUTE 'CREATE POLICY "Admins can manage all broker scores" ON public.broker_scores FOR ALL TO authenticated USING (public.has_role(auth.uid(), ''admin'')) WITH CHECK (public.has_role(auth.uid(), ''admin''))';
  END IF;
END $$;

-- leads
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'leads' AND policyname = 'Owners can view their own leads') THEN
    EXECUTE 'CREATE POLICY "Owners can view their own leads" ON public.leads FOR SELECT TO authenticated USING (owner_profile_id = auth.uid())';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'leads' AND policyname = 'Owners can create leads') THEN
    EXECUTE 'CREATE POLICY "Owners can create leads" ON public.leads FOR INSERT TO authenticated WITH CHECK (owner_profile_id = auth.uid())';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'leads' AND policyname = 'Admins can manage all leads') THEN
    EXECUTE 'CREATE POLICY "Admins can manage all leads" ON public.leads FOR ALL TO authenticated USING (public.has_role(auth.uid(), ''admin'')) WITH CHECK (public.has_role(auth.uid(), ''admin''))';
  END IF;
END $$;

-- matches
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'matches' AND policyname = 'Users can view matches for their leads') THEN
    EXECUTE 'CREATE POLICY "Users can view matches for their leads" ON public.matches FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.leads l WHERE l.id = matches.lead_id AND l.owner_profile_id = auth.uid()))';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'matches' AND policyname = 'Contractors can view their matches') THEN
    EXECUTE 'CREATE POLICY "Contractors can view their matches" ON public.matches FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.contractors c WHERE c.id = matches.contractor_id AND c.user_id = auth.uid()))';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'matches' AND policyname = 'Brokers can view their matches') THEN
    EXECUTE 'CREATE POLICY "Brokers can view their matches" ON public.matches FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.broker_profiles bp WHERE bp.id = matches.broker_id AND bp.profile_id = auth.uid()))';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'matches' AND policyname = 'Admins can manage all matches') THEN
    EXECUTE 'CREATE POLICY "Admins can manage all matches" ON public.matches FOR ALL TO authenticated USING (public.has_role(auth.uid(), ''admin'')) WITH CHECK (public.has_role(auth.uid(), ''admin''))';
  END IF;
END $$;
