
CREATE TABLE IF NOT EXISTS public.entrepreneur_interest_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  visitor_id TEXT,
  event_type TEXT NOT NULL,
  city TEXT,
  category TEXT,
  payload JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.entrepreneur_interest_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can insert entrepreneur_interest_events" ON public.entrepreneur_interest_events FOR INSERT WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.entrepreneur_cta_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  visitor_id TEXT,
  cta_key TEXT NOT NULL,
  page_section TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.entrepreneur_cta_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can insert entrepreneur_cta_events" ON public.entrepreneur_cta_events FOR INSERT WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.territory_interest_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  city TEXT NOT NULL,
  category TEXT,
  contact_name TEXT,
  business_name TEXT,
  phone TEXT,
  email TEXT,
  requested_exclusivity BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.territory_interest_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can insert territory_interest_requests" ON public.territory_interest_requests FOR INSERT WITH CHECK (true);
