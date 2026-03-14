
-- Block 5: Grants + Messaging tables

-- 1. Grant programs registry
CREATE TABLE IF NOT EXISTS public.grant_programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_key TEXT UNIQUE NOT NULL,
  name_fr TEXT NOT NULL,
  name_en TEXT,
  description_fr TEXT,
  description_en TEXT,
  provider TEXT NOT NULL,
  provider_type TEXT DEFAULT 'provincial',
  max_amount INTEGER,
  coverage_pct INTEGER,
  program_url TEXT,
  eligibility_rules JSONB DEFAULT '{}',
  required_fields TEXT[] DEFAULT '{}',
  applicable_property_types TEXT[] DEFAULT '{"house","condo","townhouse","duplex"}',
  applicable_regions TEXT[],
  status TEXT DEFAULT 'active',
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_grant_programs_status ON public.grant_programs(status);
ALTER TABLE public.grant_programs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view active grants"
  ON public.grant_programs FOR SELECT TO anon, authenticated
  USING (status = 'active');

CREATE POLICY "Admins can manage grants"
  ON public.grant_programs FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 2. Property grant eligibility
CREATE TABLE IF NOT EXISTS public.property_grant_eligibility (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  program_id UUID NOT NULL REFERENCES public.grant_programs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  eligibility_status TEXT NOT NULL DEFAULT 'insufficient_info',
  confidence_score INTEGER DEFAULT 0,
  estimated_amount INTEGER,
  missing_fields TEXT[] DEFAULT '{}',
  answers JSONB DEFAULT '{}',
  recommendation_fr TEXT,
  notes TEXT,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(property_id, program_id)
);

CREATE INDEX IF NOT EXISTS idx_grant_elig_property ON public.property_grant_eligibility(property_id);
CREATE INDEX IF NOT EXISTS idx_grant_elig_user ON public.property_grant_eligibility(user_id);
ALTER TABLE public.property_grant_eligibility ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can view own grant eligibility"
  ON public.property_grant_eligibility FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Owners can update own grant eligibility"
  ON public.property_grant_eligibility FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Owners can insert own grant eligibility"
  ON public.property_grant_eligibility FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can manage all eligibility"
  ON public.property_grant_eligibility FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 3. Homeowner messages
CREATE TABLE IF NOT EXISTS public.homeowner_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  property_id UUID REFERENCES public.properties(id) ON DELETE SET NULL,
  category TEXT NOT NULL,
  title_fr TEXT NOT NULL,
  body_fr TEXT NOT NULL,
  priority TEXT DEFAULT 'normal',
  channel TEXT DEFAULT 'in_app',
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  action_url TEXT,
  action_label_fr TEXT,
  metadata JSONB DEFAULT '{}',
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_messages_user ON public.homeowner_messages(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_messages_category ON public.homeowner_messages(category);
CREATE INDEX IF NOT EXISTS idx_messages_created ON public.homeowner_messages(created_at);
ALTER TABLE public.homeowner_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own messages"
  ON public.homeowner_messages FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own messages"
  ON public.homeowner_messages FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "System can insert messages"
  ON public.homeowner_messages FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Admins can manage all messages"
  ON public.homeowner_messages FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 4. Message frequency limits
CREATE TABLE IF NOT EXISTS public.message_frequency_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT UNIQUE NOT NULL,
  max_per_day INTEGER DEFAULT 1,
  max_per_week INTEGER DEFAULT 3,
  cooldown_hours INTEGER DEFAULT 24,
  is_active BOOLEAN DEFAULT true
);

ALTER TABLE public.message_frequency_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read frequency rules"
  ON public.message_frequency_rules FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "Admins can manage frequency rules"
  ON public.message_frequency_rules FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
