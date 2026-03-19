
-- property_documents
CREATE TABLE IF NOT EXISTS public.property_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  uploaded_by uuid REFERENCES public.profiles(user_id) ON DELETE SET NULL,
  document_type text NOT NULL,
  file_path text NOT NULL,
  file_name text,
  mime_type text,
  is_private boolean DEFAULT true,
  extracted_json jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- property_recommendations
CREATE TABLE IF NOT EXISTS public.property_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  category text NOT NULL,
  priority text CHECK (priority IN ('low','medium','high','urgent')),
  title text NOT NULL,
  description text,
  recommended_timeline text,
  estimated_cost_min numeric(12,2),
  estimated_cost_max numeric(12,2),
  recommended_profession text,
  reasoning jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- contractor_scores
CREATE TABLE IF NOT EXISTS public.contractor_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id uuid NOT NULL REFERENCES public.contractors(id) ON DELETE CASCADE,
  response_speed_score numeric(5,2),
  acceptance_rate numeric(5,2),
  close_rate numeric(5,2),
  avg_review_score numeric(5,2),
  profile_completeness_score numeric(5,2),
  ranking_score numeric(5,2),
  updated_at timestamptz DEFAULT now()
);

-- broker_profiles
CREATE TABLE IF NOT EXISTS public.broker_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid UNIQUE REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  agency_name text,
  city text,
  service_areas text[] DEFAULT '{}',
  specialties text[] DEFAULT '{}',
  languages text[] DEFAULT '{}',
  years_experience integer,
  avg_price_min numeric(12,2),
  avg_price_max numeric(12,2),
  style text,
  license_number text,
  bio text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- broker_scores
CREATE TABLE IF NOT EXISTS public.broker_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  broker_id uuid NOT NULL REFERENCES public.broker_profiles(id) ON DELETE CASCADE,
  response_speed_score numeric(5,2),
  acceptance_rate numeric(5,2),
  conversion_rate numeric(5,2),
  avg_review_score numeric(5,2),
  profile_completeness_score numeric(5,2),
  ranking_score numeric(5,2),
  updated_at timestamptz DEFAULT now()
);

-- leads
CREATE TABLE IF NOT EXISTS public.leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_profile_id uuid REFERENCES public.profiles(user_id) ON DELETE SET NULL,
  property_id uuid REFERENCES public.properties(id) ON DELETE SET NULL,
  lead_type text NOT NULL CHECK (lead_type IN ('contractor','broker')),
  city text,
  intent text,
  project_category text,
  specialty_needed text,
  budget_min numeric(12,2),
  budget_max numeric(12,2),
  urgency text,
  language text,
  seriousness_score numeric(5,2),
  status text DEFAULT 'new',
  payload jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- matches
CREATE TABLE IF NOT EXISTS public.matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  match_type text NOT NULL CHECK (match_type IN ('contractor','broker')),
  contractor_id uuid REFERENCES public.contractors(id) ON DELETE CASCADE,
  broker_id uuid REFERENCES public.broker_profiles(id) ON DELETE CASCADE,
  score numeric(5,2) NOT NULL,
  rank_position integer,
  reasons jsonb DEFAULT '[]'::jsonb,
  status text DEFAULT 'suggested',
  created_at timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE public.property_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contractor_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.broker_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.broker_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_property_documents_property ON public.property_documents(property_id);
CREATE INDEX IF NOT EXISTS idx_property_recommendations_property ON public.property_recommendations(property_id);
CREATE INDEX IF NOT EXISTS idx_contractor_scores_contractor ON public.contractor_scores(contractor_id);
CREATE INDEX IF NOT EXISTS idx_broker_scores_broker ON public.broker_scores(broker_id);
CREATE INDEX IF NOT EXISTS idx_leads_owner ON public.leads(owner_profile_id);
CREATE INDEX IF NOT EXISTS idx_leads_property ON public.leads(property_id);
CREATE INDEX IF NOT EXISTS idx_matches_lead ON public.matches(lead_id);
CREATE INDEX IF NOT EXISTS idx_matches_contractor ON public.matches(contractor_id);
CREATE INDEX IF NOT EXISTS idx_matches_broker ON public.matches(broker_id);
