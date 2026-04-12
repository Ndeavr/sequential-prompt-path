
-- 1. agent_target_lists
CREATE TABLE public.agent_target_lists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  name text NOT NULL,
  source_agent text NOT NULL DEFAULT 'market_discovery',
  status text NOT NULL DEFAULT 'imported',
  item_count integer NOT NULL DEFAULT 0,
  approved_count integer NOT NULL DEFAULT 0,
  rejected_count integer NOT NULL DEFAULT 0,
  started_by uuid,
  metadata jsonb DEFAULT '{}'::jsonb
);
ALTER TABLE public.agent_target_lists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_select_agent_target_lists" ON public.agent_target_lists FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_agent_target_lists" ON public.agent_target_lists FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_agent_target_lists" ON public.agent_target_lists FOR UPDATE TO authenticated USING (true);
CREATE TRIGGER trg_agent_target_lists_updated BEFORE UPDATE ON public.agent_target_lists FOR EACH ROW EXECUTE FUNCTION public.trg_set_updated_at();

-- 2. agent_target_items
CREATE TABLE public.agent_target_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  target_list_id uuid NOT NULL REFERENCES public.agent_target_lists(id) ON DELETE CASCADE,
  raw_label text NOT NULL,
  service_name text,
  city_name text,
  region_name text,
  specialty_slug text,
  city_slug text,
  combined_market_key text,
  priority_score numeric DEFAULT 50,
  estimated_density numeric,
  estimated_lead_volume integer,
  review_status text NOT NULL DEFAULT 'pending_normalization',
  approval_status text NOT NULL DEFAULT 'pending',
  recommendation_id uuid,
  campaign_id uuid,
  notes text
);
ALTER TABLE public.agent_target_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_select_agent_target_items" ON public.agent_target_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_agent_target_items" ON public.agent_target_items FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_agent_target_items" ON public.agent_target_items FOR UPDATE TO authenticated USING (true);
CREATE TRIGGER trg_agent_target_items_updated BEFORE UPDATE ON public.agent_target_items FOR EACH ROW EXECUTE FUNCTION public.trg_set_updated_at();
CREATE INDEX idx_agent_target_items_list ON public.agent_target_items(target_list_id);
CREATE INDEX idx_agent_target_items_market_key ON public.agent_target_items(combined_market_key);

-- 3. outbound_autopilot_recommendations
CREATE TABLE public.outbound_autopilot_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  agent_target_item_id uuid REFERENCES public.agent_target_items(id) ON DELETE CASCADE,
  predicted_city text,
  predicted_specialty text,
  predicted_radius_km integer DEFAULT 25,
  predicted_keywords text[] DEFAULT '{}',
  predicted_max_leads integer DEFAULT 50,
  predicted_source_keys text[] DEFAULT '{google_maps}',
  predicted_sequence_id uuid,
  predicted_mailbox_id uuid,
  predicted_daily_send_limit integer DEFAULT 30,
  predicted_hourly_send_limit integer DEFAULT 10,
  predicted_send_window jsonb DEFAULT '{"start":"08:00","end":"17:00"}'::jsonb,
  confidence_score numeric DEFAULT 70,
  review_status text NOT NULL DEFAULT 'pending',
  explanation jsonb DEFAULT '{}'::jsonb
);
ALTER TABLE public.outbound_autopilot_recommendations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_select_autopilot_recs" ON public.outbound_autopilot_recommendations FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_autopilot_recs" ON public.outbound_autopilot_recommendations FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_autopilot_recs" ON public.outbound_autopilot_recommendations FOR UPDATE TO authenticated USING (true);

-- 4. outbound_autopilot_runs
CREATE TABLE public.outbound_autopilot_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  target_list_id uuid REFERENCES public.agent_target_lists(id),
  agent_target_item_id uuid REFERENCES public.agent_target_items(id),
  campaign_id uuid,
  scraping_run_id uuid,
  sending_run_id uuid,
  status text NOT NULL DEFAULT 'pending',
  current_stage text NOT NULL DEFAULT 'queued',
  priority_score numeric DEFAULT 50,
  started_by uuid,
  started_at timestamptz,
  finished_at timestamptz,
  logs jsonb DEFAULT '[]'::jsonb
);
ALTER TABLE public.outbound_autopilot_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_select_autopilot_runs" ON public.outbound_autopilot_runs FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_autopilot_runs" ON public.outbound_autopilot_runs FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_autopilot_runs" ON public.outbound_autopilot_runs FOR UPDATE TO authenticated USING (true);
CREATE TRIGGER trg_autopilot_runs_updated BEFORE UPDATE ON public.outbound_autopilot_runs FOR EACH ROW EXECUTE FUNCTION public.trg_set_updated_at();

-- 5. Add agent_target_item_id to outbound_campaigns
ALTER TABLE public.outbound_campaigns ADD COLUMN IF NOT EXISTS agent_target_item_id uuid;

-- 6. FK back-references
ALTER TABLE public.agent_target_items ADD CONSTRAINT fk_agent_target_items_recommendation FOREIGN KEY (recommendation_id) REFERENCES public.outbound_autopilot_recommendations(id);
ALTER TABLE public.agent_target_items ADD CONSTRAINT fk_agent_target_items_campaign FOREIGN KEY (campaign_id) REFERENCES public.outbound_campaigns(id);
