CREATE TABLE public.contractor_verification_searches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),

  user_id uuid REFERENCES public.profiles(id),
  session_id text,
  is_logged_in boolean DEFAULT false,

  search_query text,
  search_type text,
  normalized_phone text,

  detected_contractor_id uuid REFERENCES public.contractors(id),
  detected_business_name text,
  detected_rbq text,
  detected_neq text,

  project_type text,
  city text,

  trust_score int,
  license_fit_score int,
  verdict text,

  result_found boolean DEFAULT false,
  visual_validation_used boolean DEFAULT false,
  contract_uploaded boolean DEFAULT false,
  truck_uploaded boolean DEFAULT false,
  business_card_uploaded boolean DEFAULT false,

  source_page text,
  device_type text,
  referrer text
);

ALTER TABLE public.contractor_verification_searches ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to insert their own searches
CREATE POLICY "Users can insert own verification searches"
  ON public.contractor_verification_searches
  FOR INSERT TO authenticated
  WITH CHECK (user_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

-- Allow authenticated users to read their own searches
CREATE POLICY "Users can read own verification searches"
  ON public.contractor_verification_searches
  FOR SELECT TO authenticated
  USING (user_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

-- Allow anonymous inserts (for non-logged-in users)
CREATE POLICY "Anon can insert verification searches"
  ON public.contractor_verification_searches
  FOR INSERT TO anon
  WITH CHECK (user_id IS NULL AND is_logged_in = false);

-- Admins can read all
CREATE POLICY "Admins can read all verification searches"
  ON public.contractor_verification_searches
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));