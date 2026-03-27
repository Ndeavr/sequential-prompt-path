
-- ========================================
-- UNPRONavigationOS — Navigation Tables
-- ========================================

-- Enums
DO $$ BEGIN
  CREATE TYPE public.nav_menu_type AS ENUM ('top','bottom','hamburger');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.nav_page_status AS ENUM ('draft','fallback_only','published');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.nav_event_type AS ENUM ('menu_click','bottom_nav_click','hamburger_open','hamburger_click','alex_open','deep_link_open','fallback_render','login_interstitial_render','role_mismatch_render');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 1. navigation_menu_items
CREATE TABLE IF NOT EXISTS public.navigation_menu_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  label text NOT NULL,
  label_en text,
  path text NOT NULL,
  icon_name text,
  menu_type text NOT NULL,
  audience_role text NOT NULL,
  section_name text,
  slot_index int,
  sort_order int DEFAULT 0,
  is_active boolean DEFAULT true,
  requires_auth boolean DEFAULT false,
  is_center_alex boolean DEFAULT false,
  fallback_page_key text,
  badge_rule_key text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2. navigation_role_rules
CREATE TABLE IF NOT EXISTS public.navigation_role_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role text UNIQUE NOT NULL,
  primary_cta_label text,
  primary_cta_path text,
  alex_enabled boolean DEFAULT true,
  bottom_nav_layout_json jsonb DEFAULT '[]'::jsonb,
  top_nav_layout_json jsonb DEFAULT '[]'::jsonb,
  hamburger_layout_json jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 3. navigation_context_rules
CREATE TABLE IF NOT EXISTS public.navigation_context_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role text NOT NULL,
  context_key text NOT NULL,
  source_signal text,
  condition_json jsonb DEFAULT '{}'::jsonb,
  menu_adjustment_json jsonb DEFAULT '{}'::jsonb,
  priority int DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 4. navigation_fallback_pages
CREATE TABLE IF NOT EXISTS public.navigation_fallback_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_key text UNIQUE NOT NULL,
  title text NOT NULL,
  subtitle text,
  role_target text,
  primary_cta_label text,
  primary_cta_path text,
  secondary_cta_label text,
  secondary_cta_path text,
  benefits_json jsonb DEFAULT '[]'::jsonb,
  how_it_works_json jsonb DEFAULT '[]'::jsonb,
  faq_json jsonb DEFAULT '[]'::jsonb,
  trust_points_json jsonb DEFAULT '[]'::jsonb,
  empty_state_json jsonb DEFAULT '{}'::jsonb,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 5. page_registry
CREATE TABLE IF NOT EXISTS public.page_registry (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  path text UNIQUE NOT NULL,
  page_name text NOT NULL,
  page_type text,
  status text NOT NULL DEFAULT 'draft',
  is_built boolean DEFAULT false,
  is_published boolean DEFAULT false,
  has_minimum_content boolean DEFAULT false,
  fallback_page_key text,
  owner_role text,
  requires_auth boolean DEFAULT false,
  allowed_roles_json jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 6. user_navigation_preferences
CREATE TABLE IF NOT EXISTS public.user_navigation_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE NOT NULL,
  show_bottom_bar_labels boolean DEFAULT true,
  show_alex_entry boolean DEFAULT true,
  collapsed_sections_json jsonb DEFAULT '[]'::jsonb,
  last_primary_action_key text,
  preferred_home_path text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 7. smart_deep_links
CREATE TABLE IF NOT EXISTS public.smart_deep_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  intent_key text UNIQUE NOT NULL,
  label text NOT NULL,
  destination_path text NOT NULL,
  fallback_path text,
  requires_auth boolean DEFAULT false,
  role_target text,
  resume_after_login boolean DEFAULT true,
  optional_payload_json jsonb DEFAULT '{}'::jsonb,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 8. login_interstitial_content
CREATE TABLE IF NOT EXISTS public.login_interstitial_content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  intent_key text UNIQUE NOT NULL,
  title text NOT NULL,
  subtitle text,
  benefits_json jsonb DEFAULT '[]'::jsonb,
  primary_login_method text,
  secondary_actions_json jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 9. role_mismatch_content
CREATE TABLE IF NOT EXISTS public.role_mismatch_content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_role text NOT NULL,
  target_route text NOT NULL,
  title text NOT NULL,
  subtitle text,
  primary_cta_label text,
  primary_cta_path text,
  secondary_cta_label text,
  secondary_cta_path text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 10. navigation_event_logs
CREATE TABLE IF NOT EXISTS public.navigation_event_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  session_id text,
  role text,
  event_type text NOT NULL,
  menu_item_key text,
  route_path text,
  intent_key text,
  was_fallback_rendered boolean DEFAULT false,
  was_login_interstitial_rendered boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- ========================================
-- INDEXES
-- ========================================
CREATE INDEX IF NOT EXISTS idx_nav_menu_items_role_type ON public.navigation_menu_items(audience_role, menu_type, is_active);
CREATE INDEX IF NOT EXISTS idx_nav_menu_items_path ON public.navigation_menu_items(path);
CREATE INDEX IF NOT EXISTS idx_page_registry_path ON public.page_registry(path);
CREATE INDEX IF NOT EXISTS idx_page_registry_status ON public.page_registry(status, is_published, is_built);
CREATE INDEX IF NOT EXISTS idx_smart_deep_links_intent ON public.smart_deep_links(intent_key, is_active);
CREATE INDEX IF NOT EXISTS idx_nav_event_logs_user ON public.navigation_event_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_nav_event_logs_session ON public.navigation_event_logs(session_id, created_at DESC);

-- ========================================
-- UPDATED_AT TRIGGERS
-- ========================================
CREATE OR REPLACE FUNCTION public.set_updated_at_nav()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS trg_nav_menu_items_updated ON public.navigation_menu_items;
CREATE TRIGGER trg_nav_menu_items_updated BEFORE UPDATE ON public.navigation_menu_items FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_nav();

DROP TRIGGER IF EXISTS trg_nav_role_rules_updated ON public.navigation_role_rules;
CREATE TRIGGER trg_nav_role_rules_updated BEFORE UPDATE ON public.navigation_role_rules FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_nav();

DROP TRIGGER IF EXISTS trg_nav_fallback_pages_updated ON public.navigation_fallback_pages;
CREATE TRIGGER trg_nav_fallback_pages_updated BEFORE UPDATE ON public.navigation_fallback_pages FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_nav();

DROP TRIGGER IF EXISTS trg_page_registry_updated ON public.page_registry;
CREATE TRIGGER trg_page_registry_updated BEFORE UPDATE ON public.page_registry FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_nav();

DROP TRIGGER IF EXISTS trg_user_nav_prefs_updated ON public.user_navigation_preferences;
CREATE TRIGGER trg_user_nav_prefs_updated BEFORE UPDATE ON public.user_navigation_preferences FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_nav();

-- ========================================
-- RLS
-- ========================================
ALTER TABLE public.navigation_menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.navigation_role_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.navigation_context_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.navigation_fallback_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.page_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_navigation_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.smart_deep_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.login_interstitial_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_mismatch_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.navigation_event_logs ENABLE ROW LEVEL SECURITY;

-- Public read for config tables
CREATE POLICY "nav_menu_items_public_read" ON public.navigation_menu_items FOR SELECT USING (true);
CREATE POLICY "nav_role_rules_public_read" ON public.navigation_role_rules FOR SELECT USING (true);
CREATE POLICY "nav_context_rules_public_read" ON public.navigation_context_rules FOR SELECT USING (true);
CREATE POLICY "nav_fallback_pages_public_read" ON public.navigation_fallback_pages FOR SELECT USING (true);
CREATE POLICY "page_registry_public_read" ON public.page_registry FOR SELECT USING (true);
CREATE POLICY "smart_deep_links_public_read" ON public.smart_deep_links FOR SELECT USING (true);
CREATE POLICY "login_interstitial_public_read" ON public.login_interstitial_content FOR SELECT USING (true);
CREATE POLICY "role_mismatch_public_read" ON public.role_mismatch_content FOR SELECT USING (true);

-- Admin write for config tables
CREATE POLICY "nav_menu_items_admin_write" ON public.navigation_menu_items FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "nav_role_rules_admin_write" ON public.navigation_role_rules FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "nav_context_rules_admin_write" ON public.navigation_context_rules FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "nav_fallback_pages_admin_write" ON public.navigation_fallback_pages FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "page_registry_admin_write" ON public.page_registry FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "smart_deep_links_admin_write" ON public.smart_deep_links FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "login_interstitial_admin_write" ON public.login_interstitial_content FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "role_mismatch_admin_write" ON public.role_mismatch_content FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- User nav preferences - own data only
CREATE POLICY "user_nav_prefs_own" ON public.user_navigation_preferences FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Event logs - authenticated insert, admin read
CREATE POLICY "nav_event_logs_insert" ON public.navigation_event_logs FOR INSERT WITH CHECK (true);
CREATE POLICY "nav_event_logs_admin_read" ON public.navigation_event_logs FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
