CREATE INDEX IF NOT EXISTS idx_prospects_trade ON public.contractor_prospects(trade);
CREATE INDEX IF NOT EXISTS idx_prospects_priority ON public.contractor_prospects(priority_score DESC NULLS LAST);

-- Draft profiles
CREATE TABLE IF NOT EXISTS public.contractor_profiles_draft (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id uuid REFERENCES public.contractor_prospects(id) ON DELETE CASCADE,
  business_name text NOT NULL,
  slug text UNIQUE,
  logo_url text,
  description text,
  services jsonb DEFAULT '[]'::jsonb,
  service_areas jsonb DEFAULT '[]'::jsonb,
  images jsonb DEFAULT '[]'::jsonb,
  reviews jsonb DEFAULT '[]'::jsonb,
  certifications jsonb DEFAULT '[]'::jsonb,
  rbq_verified boolean DEFAULT false,
  neq_verified boolean DEFAULT false,
  profile_status text NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_profiles_draft_prospect ON public.contractor_profiles_draft(prospect_id);
CREATE INDEX IF NOT EXISTS idx_profiles_draft_status ON public.contractor_profiles_draft(profile_status);

-- Live agent runs
CREATE TABLE IF NOT EXISTS public.live_agent_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_name text NOT NULL,
  agent_type text,
  run_status text NOT NULL DEFAULT 'running',
  input jsonb DEFAULT '{}'::jsonb,
  output jsonb DEFAULT '{}'::jsonb,
  error_message text,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  created_by uuid
);
CREATE INDEX IF NOT EXISTS idx_live_runs_name ON public.live_agent_runs(agent_name);
CREATE INDEX IF NOT EXISTS idx_live_runs_status ON public.live_agent_runs(run_status);
CREATE INDEX IF NOT EXISTS idx_live_runs_started ON public.live_agent_runs(started_at DESC);

-- Live outreach drafts
CREATE TABLE IF NOT EXISTS public.live_outreach_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id uuid REFERENCES public.contractor_prospects(id) ON DELETE CASCADE,
  channel text NOT NULL DEFAULT 'email',
  subject text,
  body text,
  draft_status text NOT NULL DEFAULT 'draft',
  approved_by_admin boolean NOT NULL DEFAULT false,
  approved_by uuid,
  approved_at timestamptz,
  sent_at timestamptz,
  opened_at timestamptz,
  clicked_at timestamptz,
  replied_at timestamptz,
  resend_message_id text,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_live_drafts_prospect ON public.live_outreach_drafts(prospect_id);
CREATE INDEX IF NOT EXISTS idx_live_drafts_status ON public.live_outreach_drafts(draft_status);
CREATE INDEX IF NOT EXISTS idx_live_drafts_approved ON public.live_outreach_drafts(approved_by_admin);

-- Settings (singleton)
CREATE TABLE IF NOT EXISTS public.live_agent_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  live_mode_enabled boolean NOT NULL DEFAULT true,
  require_admin_approval_before_email boolean NOT NULL DEFAULT true,
  daily_discovery_limit integer NOT NULL DEFAULT 50,
  priority_cities jsonb NOT NULL DEFAULT '["Laval","Montréal","Terrebonne","Longueuil","Québec","Gatineau"]'::jsonb,
  priority_trades jsonb NOT NULL DEFAULT '["couvreur","isolation","plombier","électricien","HVAC","rénovation"]'::jsonb,
  outreach_from_email text DEFAULT 'alex@unpro.ca',
  outreach_from_name text DEFAULT 'Alex — UNPRO',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.live_agent_settings (id)
SELECT gen_random_uuid()
WHERE NOT EXISTS (SELECT 1 FROM public.live_agent_settings);

-- updated_at function + triggers
CREATE OR REPLACE FUNCTION public.live_touch_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_profiles_draft_touch ON public.contractor_profiles_draft;
CREATE TRIGGER trg_profiles_draft_touch BEFORE UPDATE ON public.contractor_profiles_draft
  FOR EACH ROW EXECUTE FUNCTION public.live_touch_updated_at();

DROP TRIGGER IF EXISTS trg_live_drafts_touch ON public.live_outreach_drafts;
CREATE TRIGGER trg_live_drafts_touch BEFORE UPDATE ON public.live_outreach_drafts
  FOR EACH ROW EXECUTE FUNCTION public.live_touch_updated_at();

DROP TRIGGER IF EXISTS trg_live_settings_touch ON public.live_agent_settings;
CREATE TRIGGER trg_live_settings_touch BEFORE UPDATE ON public.live_agent_settings
  FOR EACH ROW EXECUTE FUNCTION public.live_touch_updated_at();

-- RLS
ALTER TABLE public.contractor_profiles_draft ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_agent_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_outreach_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_agent_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_all_profiles_draft" ON public.contractor_profiles_draft;
CREATE POLICY "admin_all_profiles_draft" ON public.contractor_profiles_draft FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "admin_all_live_agent_runs" ON public.live_agent_runs;
CREATE POLICY "admin_all_live_agent_runs" ON public.live_agent_runs FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "admin_all_live_outreach_drafts" ON public.live_outreach_drafts;
CREATE POLICY "admin_all_live_outreach_drafts" ON public.live_outreach_drafts FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "admin_all_live_settings" ON public.live_agent_settings;
CREATE POLICY "admin_all_live_settings" ON public.live_agent_settings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
