
-- GMB Profiles: stores linked Google Business Profile data per contractor
CREATE TABLE public.contractor_gmb_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id uuid NOT NULL REFERENCES public.contractors(id) ON DELETE CASCADE,
  gmb_place_id text NOT NULL,
  gmb_name text,
  gmb_address text,
  gmb_phone text,
  gmb_website text,
  gmb_category_primary text,
  gmb_categories_secondary text[],
  gmb_rating numeric(2,1),
  gmb_review_count integer,
  gmb_description text,
  gmb_hours jsonb,
  gmb_photos_urls text[],
  gmb_qanda jsonb,
  gmb_latitude numeric(10,7),
  gmb_longitude numeric(10,7),
  match_confidence numeric(4,3) DEFAULT 0,
  match_signals jsonb DEFAULT '{}',
  linked_at timestamptz DEFAULT now(),
  linked_by uuid,
  is_confirmed boolean DEFAULT false,
  last_synced_at timestamptz,
  raw_response jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(contractor_id, gmb_place_id)
);

ALTER TABLE public.contractor_gmb_profiles ENABLE ROW LEVEL SECURITY;

-- Contractor owner can read/write their own GMB profile
CREATE POLICY "contractor_own_gmb" ON public.contractor_gmb_profiles
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.contractors c WHERE c.id = contractor_id AND c.user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.contractors c WHERE c.id = contractor_id AND c.user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  );

-- Review aggregates: stores computed review summaries per contractor
CREATE TABLE public.contractor_review_aggregates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id uuid NOT NULL REFERENCES public.contractors(id) ON DELETE CASCADE,
  data_source text NOT NULL DEFAULT 'gmb',
  total_reviews integer DEFAULT 0,
  average_rating numeric(2,1) DEFAULT 0,
  rating_1 integer DEFAULT 0,
  rating_2 integer DEFAULT 0,
  rating_3 integer DEFAULT 0,
  rating_4 integer DEFAULT 0,
  rating_5 integer DEFAULT 0,
  recent_review_date timestamptz,
  owner_response_count integer DEFAULT 0,
  owner_response_rate numeric(4,3) DEFAULT 0,
  sentiment_positive integer DEFAULT 0,
  sentiment_neutral integer DEFAULT 0,
  sentiment_negative integer DEFAULT 0,
  top_keywords text[],
  last_computed_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(contractor_id, data_source)
);

ALTER TABLE public.contractor_review_aggregates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "contractor_own_review_agg" ON public.contractor_review_aggregates
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.contractors c WHERE c.id = contractor_id AND c.user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.contractors c WHERE c.id = contractor_id AND c.user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  );

-- Triggers for updated_at
CREATE TRIGGER update_gmb_profiles_updated_at BEFORE UPDATE ON public.contractor_gmb_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_review_aggregates_updated_at BEFORE UPDATE ON public.contractor_review_aggregates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
