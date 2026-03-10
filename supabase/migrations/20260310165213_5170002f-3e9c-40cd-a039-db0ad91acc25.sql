
-- =============================================
-- UNPRO Database Schema — 01-foundation
-- =============================================

-- ENUMS
CREATE TYPE public.app_role AS ENUM ('homeowner', 'contractor', 'admin');
CREATE TYPE public.quote_status AS ENUM ('pending', 'analyzed', 'accepted', 'rejected');
CREATE TYPE public.verification_status AS ENUM ('unverified', 'pending', 'verified', 'rejected');
CREATE TYPE public.property_condition AS ENUM ('excellent', 'good', 'fair', 'poor', 'critical');

-- TIMESTAMP TRIGGER FUNCTION
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- PROFILES
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- USER_ROLES (separate table for security)
CREATE TABLE public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- SECURITY DEFINER: has_role function (avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- PROPERTIES
CREATE TABLE public.properties (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  address TEXT NOT NULL,
  city TEXT,
  province TEXT,
  postal_code TEXT,
  property_type TEXT,
  year_built INTEGER,
  square_footage INTEGER,
  lot_size NUMERIC,
  condition public.property_condition DEFAULT 'fair',
  photo_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_properties_user_id ON public.properties(user_id);
CREATE TRIGGER update_properties_updated_at BEFORE UPDATE ON public.properties FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- CONTRACTORS
CREATE TABLE public.contractors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  business_name TEXT NOT NULL,
  specialty TEXT,
  description TEXT,
  phone TEXT,
  email TEXT,
  website TEXT,
  address TEXT,
  city TEXT,
  province TEXT,
  postal_code TEXT,
  license_number TEXT,
  insurance_info TEXT,
  years_experience INTEGER DEFAULT 0,
  verification_status public.verification_status DEFAULT 'unverified',
  aipp_score NUMERIC DEFAULT 0,
  rating NUMERIC DEFAULT 0,
  review_count INTEGER DEFAULT 0,
  logo_url TEXT,
  portfolio_urls TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.contractors ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_contractors_user_id ON public.contractors(user_id);
CREATE INDEX idx_contractors_city ON public.contractors(city);
CREATE INDEX idx_contractors_specialty ON public.contractors(specialty);
CREATE INDEX idx_contractors_verification ON public.contractors(verification_status);
CREATE TRIGGER update_contractors_updated_at BEFORE UPDATE ON public.contractors FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- QUOTES
CREATE TABLE public.quotes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE NOT NULL,
  contractor_id UUID REFERENCES public.contractors(id) ON DELETE SET NULL,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  amount NUMERIC,
  status public.quote_status DEFAULT 'pending',
  file_url TEXT,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  analyzed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_quotes_property_id ON public.quotes(property_id);
CREATE INDEX idx_quotes_contractor_id ON public.quotes(contractor_id);
CREATE INDEX idx_quotes_user_id ON public.quotes(user_id);
CREATE TRIGGER update_quotes_updated_at BEFORE UPDATE ON public.quotes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- QUOTE_ANALYSIS
CREATE TABLE public.quote_analysis (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quote_id UUID REFERENCES public.quotes(id) ON DELETE CASCADE NOT NULL UNIQUE,
  fairness_score NUMERIC,
  market_comparison JSONB,
  line_items JSONB,
  recommendations TEXT,
  ai_model TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.quote_analysis ENABLE ROW LEVEL SECURITY;

-- REVIEWS
CREATE TABLE public.reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contractor_id UUID REFERENCES public.contractors(id) ON DELETE CASCADE NOT NULL,
  user_id UUID NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title TEXT,
  content TEXT,
  is_published BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_reviews_contractor_id ON public.reviews(contractor_id);
CREATE INDEX idx_reviews_user_id ON public.reviews(user_id);
CREATE TRIGGER update_reviews_updated_at BEFORE UPDATE ON public.reviews FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- AIPP_SCORES
CREATE TABLE public.aipp_scores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  entity_type TEXT NOT NULL, -- 'property' or 'contractor'
  entity_id UUID NOT NULL,
  user_id UUID,
  overall_score NUMERIC NOT NULL DEFAULT 0,
  component_scores JSONB,
  calculated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.aipp_scores ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_aipp_scores_entity ON public.aipp_scores(entity_type, entity_id);

-- HOME_SCORES
CREATE TABLE public.home_scores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE NOT NULL,
  user_id UUID NOT NULL,
  overall_score NUMERIC NOT NULL DEFAULT 0,
  structure_score NUMERIC DEFAULT 0,
  systems_score NUMERIC DEFAULT 0,
  exterior_score NUMERIC DEFAULT 0,
  interior_score NUMERIC DEFAULT 0,
  notes TEXT,
  calculated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.home_scores ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_home_scores_property_id ON public.home_scores(property_id);

-- PROPERTY_EVENTS (knowledge graph timeline)
CREATE TABLE public.property_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE NOT NULL,
  user_id UUID NOT NULL,
  event_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  event_date DATE,
  cost NUMERIC,
  contractor_id UUID REFERENCES public.contractors(id) ON DELETE SET NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.property_events ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_property_events_property_id ON public.property_events(property_id);

-- STORAGE_DOCUMENTS (file metadata)
CREATE TABLE public.storage_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT,
  file_size INTEGER,
  bucket TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.storage_documents ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_storage_documents_user_id ON public.storage_documents(user_id);

-- =============================================
-- RLS POLICIES
-- =============================================

-- PROFILES
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- USER_ROLES
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage all roles" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- PROPERTIES
CREATE POLICY "Users can view own properties" ON public.properties FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own properties" ON public.properties FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own properties" ON public.properties FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own properties" ON public.properties FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all properties" ON public.properties FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- CONTRACTORS
CREATE POLICY "Verified contractors are publicly viewable" ON public.contractors FOR SELECT USING (verification_status = 'verified');
CREATE POLICY "Contractors can view own profile" ON public.contractors FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Contractors can insert own profile" ON public.contractors FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Contractors can update own profile" ON public.contractors FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage all contractors" ON public.contractors FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- QUOTES
CREATE POLICY "Users can view own quotes" ON public.quotes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own quotes" ON public.quotes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own quotes" ON public.quotes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own quotes" ON public.quotes FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Contractors can view assigned quotes" ON public.quotes FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.contractors c WHERE c.id = contractor_id AND c.user_id = auth.uid())
);
CREATE POLICY "Admins can view all quotes" ON public.quotes FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- QUOTE_ANALYSIS
CREATE POLICY "Users can view own quote analysis" ON public.quote_analysis FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.quotes q WHERE q.id = quote_id AND q.user_id = auth.uid())
);
CREATE POLICY "Admins can view all analyses" ON public.quote_analysis FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- REVIEWS
CREATE POLICY "Published reviews are publicly viewable" ON public.reviews FOR SELECT USING (is_published = true);
CREATE POLICY "Users can insert own reviews" ON public.reviews FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own reviews" ON public.reviews FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage all reviews" ON public.reviews FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- AIPP_SCORES
CREATE POLICY "Users can view own aipp scores" ON public.aipp_scores FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage all aipp scores" ON public.aipp_scores FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- HOME_SCORES
CREATE POLICY "Users can view own home scores" ON public.home_scores FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all home scores" ON public.home_scores FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- PROPERTY_EVENTS
CREATE POLICY "Users can manage own property events" ON public.property_events FOR ALL USING (auth.uid() = user_id);

-- STORAGE_DOCUMENTS
CREATE POLICY "Users can manage own documents" ON public.storage_documents FOR ALL USING (auth.uid() = user_id);

-- =============================================
-- AUTO-CREATE PROFILE ON SIGNUP (trigger)
-- =============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );
  -- Auto-assign default role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (
    NEW.id,
    COALESCE((NEW.raw_user_meta_data->>'role')::public.app_role, 'homeowner')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================
-- STORAGE BUCKETS
-- =============================================
INSERT INTO storage.buckets (id, name, public) VALUES ('contractor-documents', 'contractor-documents', false);
INSERT INTO storage.buckets (id, name, public) VALUES ('property-photos', 'property-photos', false);
INSERT INTO storage.buckets (id, name, public) VALUES ('inspection-reports', 'inspection-reports', false);
INSERT INTO storage.buckets (id, name, public) VALUES ('quote-files', 'quote-files', false);

-- Storage policies
CREATE POLICY "Users can upload own contractor docs" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'contractor-documents' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can view own contractor docs" ON storage.objects FOR SELECT USING (bucket_id = 'contractor-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can upload own property photos" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'property-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can view own property photos" ON storage.objects FOR SELECT USING (bucket_id = 'property-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can upload own inspection reports" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'inspection-reports' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can view own inspection reports" ON storage.objects FOR SELECT USING (bucket_id = 'inspection-reports' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can upload own quote files" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'quote-files' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can view own quote files" ON storage.objects FOR SELECT USING (bucket_id = 'quote-files' AND auth.uid()::text = (storage.foldername(name))[1]);
