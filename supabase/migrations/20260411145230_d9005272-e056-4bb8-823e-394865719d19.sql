
-- 1. alex_action_sessions
CREATE TABLE public.alex_action_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alex_session_id TEXT,
  user_id UUID,
  session_family_id TEXT,
  surface TEXT NOT NULL DEFAULT 'chat',
  channel_type TEXT NOT NULL DEFAULT 'text',
  active_task_key TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.alex_action_sessions ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_alex_action_sessions_user ON public.alex_action_sessions(user_id);
CREATE INDEX idx_alex_action_sessions_status ON public.alex_action_sessions(status);
CREATE POLICY "Users manage own action sessions" ON public.alex_action_sessions FOR ALL USING (auth.uid() = user_id OR user_id IS NULL) WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- 2. alex_action_runs
CREATE TABLE public.alex_action_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alex_action_session_id UUID REFERENCES public.alex_action_sessions(id) ON DELETE CASCADE NOT NULL,
  action_key TEXT NOT NULL,
  action_type TEXT NOT NULL,
  input_payload_json JSONB DEFAULT '{}',
  output_payload_json JSONB DEFAULT '{}',
  render_mode TEXT NOT NULL DEFAULT 'inline_card',
  confirmation_required BOOLEAN DEFAULT false,
  execution_status TEXT NOT NULL DEFAULT 'planned',
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.alex_action_runs ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_alex_action_runs_session ON public.alex_action_runs(alex_action_session_id);
CREATE POLICY "Users manage own action runs" ON public.alex_action_runs FOR ALL USING (
  EXISTS (SELECT 1 FROM public.alex_action_sessions s WHERE s.id = alex_action_session_id AND (s.user_id = auth.uid() OR s.user_id IS NULL))
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.alex_action_sessions s WHERE s.id = alex_action_session_id AND (s.user_id = auth.uid() OR s.user_id IS NULL))
);

-- 3. alex_action_intents
CREATE TABLE public.alex_action_intents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alex_action_session_id UUID REFERENCES public.alex_action_sessions(id) ON DELETE CASCADE NOT NULL,
  primary_intent TEXT NOT NULL,
  secondary_intent TEXT,
  confidence_score NUMERIC DEFAULT 0,
  extracted_entities_json JSONB DEFAULT '{}',
  missing_fields_json JSONB DEFAULT '[]',
  next_best_action TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.alex_action_intents ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_alex_action_intents_session ON public.alex_action_intents(alex_action_session_id);
CREATE POLICY "Users manage own action intents" ON public.alex_action_intents FOR ALL USING (
  EXISTS (SELECT 1 FROM public.alex_action_sessions s WHERE s.id = alex_action_session_id AND (s.user_id = auth.uid() OR s.user_id IS NULL))
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.alex_action_sessions s WHERE s.id = alex_action_session_id AND (s.user_id = auth.uid() OR s.user_id IS NULL))
);

-- 4. alex_ui_surfaces
CREATE TABLE public.alex_ui_surfaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  surface_key TEXT NOT NULL UNIQUE,
  component_key TEXT NOT NULL,
  render_mode TEXT NOT NULL DEFAULT 'inline_card',
  channel_scope TEXT NOT NULL DEFAULT 'all',
  action_scope_json JSONB DEFAULT '[]',
  context_requirements_json JSONB DEFAULT '{}',
  is_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.alex_ui_surfaces ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read UI surfaces" ON public.alex_ui_surfaces FOR SELECT USING (true);

-- 5. alex_generated_assets
CREATE TABLE public.alex_generated_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  alex_action_session_id UUID REFERENCES public.alex_action_sessions(id) ON DELETE SET NULL,
  asset_type TEXT NOT NULL,
  source_asset_id TEXT,
  generation_prompt TEXT,
  output_url TEXT,
  metadata_json JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.alex_generated_assets ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_alex_generated_assets_user ON public.alex_generated_assets(user_id);
CREATE POLICY "Users manage own generated assets" ON public.alex_generated_assets FOR ALL USING (auth.uid() = user_id OR user_id IS NULL) WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- 6. alex_form_drafts
CREATE TABLE public.alex_form_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  alex_action_session_id UUID REFERENCES public.alex_action_sessions(id) ON DELETE SET NULL,
  form_key TEXT NOT NULL,
  form_data_json JSONB DEFAULT '{}',
  completion_ratio NUMERIC DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.alex_form_drafts ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_alex_form_drafts_user ON public.alex_form_drafts(user_id);
CREATE POLICY "Users manage own form drafts" ON public.alex_form_drafts FOR ALL USING (auth.uid() = user_id OR user_id IS NULL) WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- 7. alex_booking_intents
CREATE TABLE public.alex_booking_intents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  alex_action_session_id UUID REFERENCES public.alex_action_sessions(id) ON DELETE SET NULL,
  contractor_id UUID,
  property_id UUID,
  address_id UUID,
  appointment_type TEXT NOT NULL DEFAULT 'standard',
  appointment_size TEXT NOT NULL DEFAULT 'M',
  preferred_time_windows_json JSONB DEFAULT '[]',
  selected_slot_json JSONB,
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.alex_booking_intents ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_alex_booking_intents_user ON public.alex_booking_intents(user_id);
CREATE POLICY "Users manage own booking intents" ON public.alex_booking_intents FOR ALL USING (auth.uid() = user_id OR user_id IS NULL) WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- 8. alex_checkout_intents
CREATE TABLE public.alex_checkout_intents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  alex_action_session_id UUID REFERENCES public.alex_action_sessions(id) ON DELETE SET NULL,
  product_type TEXT NOT NULL,
  product_ref TEXT NOT NULL,
  pricing_json JSONB DEFAULT '{}',
  coupon_code TEXT,
  tax_json JSONB DEFAULT '{}',
  checkout_status TEXT NOT NULL DEFAULT 'draft',
  payment_provider_ref TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.alex_checkout_intents ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_alex_checkout_intents_user ON public.alex_checkout_intents(user_id);
CREATE POLICY "Users manage own checkout intents" ON public.alex_checkout_intents FOR ALL USING (auth.uid() = user_id OR user_id IS NULL) WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- 9. alex_contractor_shortlists
CREATE TABLE public.alex_contractor_shortlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  alex_action_session_id UUID REFERENCES public.alex_action_sessions(id) ON DELETE SET NULL,
  shortlist_name TEXT NOT NULL DEFAULT 'default',
  contractor_ids_json JSONB DEFAULT '[]',
  selected_contractor_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.alex_contractor_shortlists ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_alex_contractor_shortlists_user ON public.alex_contractor_shortlists(user_id);
CREATE POLICY "Users manage own contractor shortlists" ON public.alex_contractor_shortlists FOR ALL USING (auth.uid() = user_id OR user_id IS NULL) WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- 10. alex_task_state
CREATE TABLE public.alex_task_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alex_action_session_id UUID REFERENCES public.alex_action_sessions(id) ON DELETE CASCADE NOT NULL,
  task_key TEXT NOT NULL,
  task_label TEXT NOT NULL,
  task_status TEXT NOT NULL DEFAULT 'pending',
  task_order INT NOT NULL DEFAULT 0,
  payload_json JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.alex_task_state ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_alex_task_state_session ON public.alex_task_state(alex_action_session_id);
CREATE POLICY "Users manage own task state" ON public.alex_task_state FOR ALL USING (
  EXISTS (SELECT 1 FROM public.alex_action_sessions s WHERE s.id = alex_action_session_id AND (s.user_id = auth.uid() OR s.user_id IS NULL))
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.alex_action_sessions s WHERE s.id = alex_action_session_id AND (s.user_id = auth.uid() OR s.user_id IS NULL))
);

-- 11. alex_inline_confirmations
CREATE TABLE public.alex_inline_confirmations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alex_action_session_id UUID REFERENCES public.alex_action_sessions(id) ON DELETE CASCADE NOT NULL,
  confirmation_key TEXT NOT NULL,
  confirmation_label TEXT NOT NULL,
  confirmation_payload_json JSONB DEFAULT '{}',
  response_state TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.alex_inline_confirmations ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_alex_inline_confirmations_session ON public.alex_inline_confirmations(alex_action_session_id);
CREATE POLICY "Users manage own inline confirmations" ON public.alex_inline_confirmations FOR ALL USING (
  EXISTS (SELECT 1 FROM public.alex_action_sessions s WHERE s.id = alex_action_session_id AND (s.user_id = auth.uid() OR s.user_id IS NULL))
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.alex_action_sessions s WHERE s.id = alex_action_session_id AND (s.user_id = auth.uid() OR s.user_id IS NULL))
);

-- 12. alex_action_failures
CREATE TABLE public.alex_action_failures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alex_action_session_id UUID REFERENCES public.alex_action_sessions(id) ON DELETE SET NULL,
  action_key TEXT NOT NULL,
  failure_domain TEXT NOT NULL,
  failure_type TEXT NOT NULL,
  failure_stage TEXT NOT NULL,
  error_message TEXT,
  metadata_json JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.alex_action_failures ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_alex_action_failures_session ON public.alex_action_failures(alex_action_session_id);
CREATE POLICY "Users manage own action failures" ON public.alex_action_failures FOR ALL USING (
  EXISTS (SELECT 1 FROM public.alex_action_sessions s WHERE s.id = alex_action_session_id AND (s.user_id = auth.uid() OR s.user_id IS NULL))
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.alex_action_sessions s WHERE s.id = alex_action_session_id AND (s.user_id = auth.uid() OR s.user_id IS NULL))
);

-- Updated_at triggers
CREATE OR REPLACE FUNCTION public.trigger_set_updated_at() RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.alex_action_sessions FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.alex_action_runs FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.alex_form_drafts FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.alex_booking_intents FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.alex_checkout_intents FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.alex_contractor_shortlists FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.alex_task_state FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.alex_inline_confirmations FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();
