
-- Import sessions tracking
CREATE TABLE public.contractor_import_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  initiated_by_user_id UUID,
  initiated_by_rep_id UUID,
  import_mode TEXT NOT NULL DEFAULT 'self_import',
  contractor_contact_name TEXT,
  contractor_business_name TEXT NOT NULL,
  contractor_phone TEXT,
  contractor_email TEXT,
  domain_url TEXT,
  google_business_url TEXT,
  rbq_number TEXT,
  neq_number TEXT,
  consent_status TEXT NOT NULL DEFAULT 'pending',
  consent_source TEXT,
  import_status TEXT NOT NULL DEFAULT 'not_started',
  completion_percent INTEGER DEFAULT 0,
  private_profile_id UUID,
  public_profile_slug TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.contractor_import_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert import sessions" ON public.contractor_import_sessions
  FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "Users can view own import sessions" ON public.contractor_import_sessions
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Users can update own import sessions" ON public.contractor_import_sessions
  FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

-- Import consents
CREATE TABLE public.contractor_import_consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  import_session_id UUID NOT NULL REFERENCES public.contractor_import_sessions(id) ON DELETE CASCADE,
  consent_type TEXT NOT NULL,
  consent_value BOOLEAN NOT NULL DEFAULT false,
  consent_text_version TEXT DEFAULT 'v1',
  captured_by TEXT NOT NULL DEFAULT 'self',
  captured_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.contractor_import_consents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can manage consents" ON public.contractor_import_consents
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- Import script events for tracking
CREATE TABLE public.contractor_import_script_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  import_session_id UUID NOT NULL REFERENCES public.contractor_import_sessions(id) ON DELETE CASCADE,
  actor_type TEXT NOT NULL DEFAULT 'system',
  actor_name TEXT,
  step_key TEXT NOT NULL,
  script_text TEXT,
  delivery_mode TEXT DEFAULT 'text',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.contractor_import_script_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can manage script events" ON public.contractor_import_script_events
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- Import followups
CREATE TABLE public.contractor_import_followups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  import_session_id UUID NOT NULL REFERENCES public.contractor_import_sessions(id) ON DELETE CASCADE,
  followup_type TEXT NOT NULL,
  destination_email TEXT,
  destination_phone TEXT,
  sent_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.contractor_import_followups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can manage followups" ON public.contractor_import_followups
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- Trigger for updated_at
CREATE TRIGGER set_updated_at_import_sessions
  BEFORE UPDATE ON public.contractor_import_sessions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
