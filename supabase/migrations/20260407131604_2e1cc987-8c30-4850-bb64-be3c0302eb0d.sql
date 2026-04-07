
-- Table: alex_no_match_cases
CREATE TABLE IF NOT EXISTS public.alex_no_match_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alex_session_id TEXT NOT NULL,
  service TEXT NOT NULL,
  city TEXT NOT NULL,
  radius_km INTEGER NOT NULL DEFAULT 25,
  constraints_json JSONB DEFAULT '{}'::jsonb,
  detected_reason TEXT NOT NULL DEFAULT 'no_available_contractor',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.alex_no_match_cases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can insert no match cases" ON public.alex_no_match_cases FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can read no match cases" ON public.alex_no_match_cases FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Table: alex_waitlist_requests
CREATE TABLE IF NOT EXISTS public.alex_waitlist_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  alex_session_id TEXT NOT NULL,
  first_name TEXT,
  phone TEXT,
  email TEXT,
  service TEXT NOT NULL,
  city TEXT NOT NULL,
  radius_km INTEGER NOT NULL DEFAULT 25,
  flexibility_level TEXT NOT NULL DEFAULT 'moderate',
  urgency_level TEXT NOT NULL DEFAULT 'normal',
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.alex_waitlist_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can create waitlist requests" ON public.alex_waitlist_requests FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can view own waitlist" ON public.alex_waitlist_requests FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own waitlist" ON public.alex_waitlist_requests FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage all waitlist" ON public.alex_waitlist_requests FOR ALL USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

CREATE INDEX idx_waitlist_status ON public.alex_waitlist_requests(status);
CREATE INDEX idx_waitlist_service_city ON public.alex_waitlist_requests(service, city);

-- Table: alex_match_retry_queue
CREATE TABLE IF NOT EXISTS public.alex_match_retry_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  waitlist_request_id UUID NOT NULL REFERENCES public.alex_waitlist_requests(id) ON DELETE CASCADE,
  next_retry_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '30 minutes'),
  retry_count INTEGER NOT NULL DEFAULT 0,
  last_attempt_status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.alex_match_retry_queue ENABLE ROW LEVEL SECURITY;
CREATE POLICY "System can manage retry queue" ON public.alex_match_retry_queue FOR ALL USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Anyone can insert retry" ON public.alex_match_retry_queue FOR INSERT WITH CHECK (true);

CREATE INDEX idx_retry_next ON public.alex_match_retry_queue(next_retry_at) WHERE last_attempt_status != 'match_found';

-- Table: alex_match_notifications
CREATE TABLE IF NOT EXISTS public.alex_match_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  waitlist_request_id UUID NOT NULL REFERENCES public.alex_waitlist_requests(id) ON DELETE CASCADE,
  contractor_id UUID REFERENCES public.contractors(id) ON DELETE SET NULL,
  notification_status TEXT NOT NULL DEFAULT 'pending',
  sent_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.alex_match_notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage notifications" ON public.alex_match_notifications FOR ALL USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Anyone can insert notification" ON public.alex_match_notifications FOR INSERT WITH CHECK (true);

-- Trigger for updated_at on waitlist
CREATE OR REPLACE FUNCTION public.update_waitlist_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_waitlist_updated_at
BEFORE UPDATE ON public.alex_waitlist_requests
FOR EACH ROW EXECUTE FUNCTION public.update_waitlist_updated_at();
