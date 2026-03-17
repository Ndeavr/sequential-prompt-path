
-- ============================================
-- DEEP LINK EVENTS
-- ============================================
CREATE TABLE public.deep_link_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deep_link_id uuid REFERENCES public.deep_links(id) ON DELETE SET NULL,
  session_id text NOT NULL DEFAULT gen_random_uuid()::text,
  user_id uuid,
  event_type text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_deep_link_events_deep_link ON public.deep_link_events(deep_link_id);
CREATE INDEX idx_deep_link_events_type ON public.deep_link_events(event_type);
CREATE INDEX idx_deep_link_events_session ON public.deep_link_events(session_id);
ALTER TABLE public.deep_link_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can insert deep_link_events" ON public.deep_link_events FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can read deep_link_events" ON public.deep_link_events FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- ============================================
-- QUALIFIED CONVERSIONS
-- ============================================
CREATE TABLE public.qualified_conversions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deep_link_id uuid REFERENCES public.deep_links(id) ON DELETE SET NULL,
  inviter_user_id uuid,
  invited_user_id uuid,
  conversion_type text NOT NULL,
  is_qualified boolean NOT NULL DEFAULT false,
  qualified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_qualified_conversions_inviter ON public.qualified_conversions(inviter_user_id);
CREATE INDEX idx_qualified_conversions_type ON public.qualified_conversions(conversion_type);
ALTER TABLE public.qualified_conversions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own conversions" ON public.qualified_conversions FOR SELECT TO authenticated USING (inviter_user_id = auth.uid() OR invited_user_id = auth.uid());
CREATE POLICY "System can insert conversions" ON public.qualified_conversions FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can read all conversions" ON public.qualified_conversions FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- ============================================
-- REFERRAL PROGRESS
-- ============================================
CREATE TABLE public.referral_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  milestone_key text NOT NULL,
  current_count integer NOT NULL DEFAULT 0,
  target_count integer NOT NULL,
  unlocked boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, milestone_key)
);
ALTER TABLE public.referral_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own progress" ON public.referral_progress FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "System can upsert progress" ON public.referral_progress FOR INSERT WITH CHECK (true);
CREATE POLICY "System can update progress" ON public.referral_progress FOR UPDATE USING (true);

-- ============================================
-- REWARDS
-- ============================================
CREATE TABLE public.rewards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  reward_type text NOT NULL,
  reward_value text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.rewards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own rewards" ON public.rewards FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "System can insert rewards" ON public.rewards FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can read all rewards" ON public.rewards FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- ============================================
-- REWARD RULES
-- ============================================
CREATE TABLE public.reward_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  owner_role text NOT NULL DEFAULT 'homeowner',
  feature text,
  city text,
  conversion_type text NOT NULL,
  required_count integer NOT NULL,
  reward_type text NOT NULL,
  reward_value jsonb NOT NULL DEFAULT '{}'::jsonb,
  priority integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.reward_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage reward_rules" ON public.reward_rules FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Anyone can read active rules" ON public.reward_rules FOR SELECT USING (is_active = true);

-- ============================================
-- QR PLACEMENTS
-- ============================================
CREATE TABLE public.qr_placements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  placement_type text NOT NULL,
  owner_user_id uuid NOT NULL,
  campaign_id text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.qr_placements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own placements" ON public.qr_placements FOR ALL TO authenticated USING (owner_user_id = auth.uid());
CREATE POLICY "Admins can manage all placements" ON public.qr_placements FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- ============================================
-- PLACEMENT DEEP LINKS
-- ============================================
CREATE TABLE public.placement_deep_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  placement_id uuid NOT NULL REFERENCES public.qr_placements(id) ON DELETE CASCADE,
  mode text NOT NULL DEFAULT 'single',
  deep_link_id uuid REFERENCES public.deep_links(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.placement_deep_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own placement links" ON public.placement_deep_links FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.qr_placements WHERE id = placement_id AND owner_user_id = auth.uid()));
CREATE POLICY "Admins can manage all" ON public.placement_deep_links FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- ============================================
-- QR BUNDLE TEMPLATES
-- ============================================
CREATE TABLE public.qr_bundle_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  owner_role text NOT NULL DEFAULT 'homeowner',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.qr_bundle_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read active bundles" ON public.qr_bundle_templates FOR SELECT USING (is_active = true);
CREATE POLICY "Admins manage bundles" ON public.qr_bundle_templates FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- ============================================
-- QR BUNDLE CARDS
-- ============================================
CREATE TABLE public.qr_bundle_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bundle_id uuid NOT NULL REFERENCES public.qr_bundle_templates(id) ON DELETE CASCADE,
  card_order integer NOT NULL DEFAULT 0,
  feature text NOT NULL,
  sub_feature text,
  headline text NOT NULL,
  description text,
  icon text,
  gradient text,
  cta_text text NOT NULL DEFAULT 'Commencer',
  deep_link_code text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.qr_bundle_cards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read bundle cards" ON public.qr_bundle_cards FOR SELECT USING (true);
CREATE POLICY "Admins manage bundle cards" ON public.qr_bundle_cards FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- ============================================
-- PLACEMENT ASSETS
-- ============================================
CREATE TABLE public.placement_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  placement_id uuid NOT NULL REFERENCES public.qr_placements(id) ON DELETE CASCADE,
  asset_type text NOT NULL,
  file_url text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.placement_assets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own assets" ON public.placement_assets FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.qr_placements WHERE id = placement_id AND owner_user_id = auth.uid()));
CREATE POLICY "Admins manage all assets" ON public.placement_assets FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
