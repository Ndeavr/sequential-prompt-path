
-- =============================================
-- AFFILIATES TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS public.affiliates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  name text NOT NULL,
  email text,
  referral_code text NOT NULL UNIQUE,
  commission_rate numeric NOT NULL DEFAULT 10.0,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive','suspended')),
  total_clicks integer NOT NULL DEFAULT 0,
  total_conversions integer NOT NULL DEFAULT 0,
  total_revenue_cents integer NOT NULL DEFAULT 0,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.affiliates ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_affiliates_referral_code ON public.affiliates(referral_code);
CREATE INDEX idx_affiliates_user_id ON public.affiliates(user_id);

CREATE POLICY "Affiliates can view own record" ON public.affiliates FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage affiliates" ON public.affiliates FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- =============================================
-- AFFILIATE LINKS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS public.affiliate_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id uuid NOT NULL REFERENCES public.affiliates(id) ON DELETE CASCADE,
  label text,
  url text NOT NULL,
  utm_source text,
  utm_campaign text,
  utm_medium text,
  qr_code_url text,
  click_count integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.affiliate_links ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_affiliate_links_affiliate ON public.affiliate_links(affiliate_id);

CREATE POLICY "Affiliates view own links" ON public.affiliate_links FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.affiliates WHERE id = affiliate_id AND user_id = auth.uid()));
CREATE POLICY "Affiliates create own links" ON public.affiliate_links FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.affiliates WHERE id = affiliate_id AND user_id = auth.uid()));
CREATE POLICY "Admins manage links" ON public.affiliate_links FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- =============================================
-- AFFILIATE CLICKS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS public.affiliate_clicks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id uuid REFERENCES public.affiliates(id) ON DELETE SET NULL,
  link_id uuid REFERENCES public.affiliate_links(id) ON DELETE SET NULL,
  ref_code text NOT NULL,
  source text NOT NULL DEFAULT 'direct',
  device text,
  ip_hash text,
  user_agent text,
  landing_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.affiliate_clicks ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_affiliate_clicks_affiliate ON public.affiliate_clicks(affiliate_id);
CREATE INDEX idx_affiliate_clicks_ref ON public.affiliate_clicks(ref_code);
CREATE INDEX idx_affiliate_clicks_created ON public.affiliate_clicks(created_at);

-- Allow anonymous inserts for tracking (clicks happen before auth)
CREATE POLICY "Anyone can insert clicks" ON public.affiliate_clicks FOR INSERT WITH CHECK (true);
CREATE POLICY "Affiliates view own clicks" ON public.affiliate_clicks FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.affiliates WHERE id = affiliate_id AND user_id = auth.uid()));
CREATE POLICY "Admins view all clicks" ON public.affiliate_clicks FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- =============================================
-- AFFILIATE SESSIONS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS public.affiliate_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id uuid REFERENCES public.affiliates(id) ON DELETE SET NULL,
  session_token text NOT NULL UNIQUE,
  ref_code text NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','converted','expired')),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  device text,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.affiliate_sessions ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_affiliate_sessions_token ON public.affiliate_sessions(session_token);
CREATE INDEX idx_affiliate_sessions_ref ON public.affiliate_sessions(ref_code);

CREATE POLICY "Anyone can insert sessions" ON public.affiliate_sessions FOR INSERT WITH CHECK (true);
CREATE POLICY "Users view own sessions" ON public.affiliate_sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins view all sessions" ON public.affiliate_sessions FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- =============================================
-- ADD COLUMNS TO EXISTING affiliate_attributions
-- =============================================
ALTER TABLE public.affiliate_attributions
  ADD COLUMN IF NOT EXISTS confidence_score numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS confirmation_status text DEFAULT 'pending' CHECK (confirmation_status IN ('pending','confirmed','rejected')),
  ADD COLUMN IF NOT EXISTS confirmed_at timestamptz,
  ADD COLUMN IF NOT EXISTS source_type text DEFAULT 'unknown',
  ADD COLUMN IF NOT EXISTS session_id uuid;

CREATE INDEX IF NOT EXISTS idx_affiliate_attributions_user ON public.affiliate_attributions(referred_user_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_attributions_affiliate ON public.affiliate_attributions(referrer_user_id);

-- =============================================
-- AFFILIATE CONVERSIONS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS public.affiliate_conversions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id uuid REFERENCES public.affiliates(id) ON DELETE SET NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  attribution_id uuid REFERENCES public.affiliate_attributions(id) ON DELETE SET NULL,
  conversion_type text NOT NULL CHECK (conversion_type IN ('signup','profile_completed','booking','payment','plan_activated')),
  value_cents integer NOT NULL DEFAULT 0,
  commission_rate numeric NOT NULL DEFAULT 10.0,
  commission_amount_cents integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','paid','rejected')),
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.affiliate_conversions ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_affiliate_conversions_affiliate ON public.affiliate_conversions(affiliate_id);
CREATE INDEX idx_affiliate_conversions_user ON public.affiliate_conversions(user_id);
CREATE INDEX idx_affiliate_conversions_type ON public.affiliate_conversions(conversion_type);

CREATE POLICY "Affiliates view own conversions" ON public.affiliate_conversions FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.affiliates WHERE id = affiliate_id AND user_id = auth.uid()));
CREATE POLICY "Admins manage conversions" ON public.affiliate_conversions FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- =============================================
-- RPC: detect_referral_source
-- =============================================
CREATE OR REPLACE FUNCTION public.detect_referral_source(p_ref_code text DEFAULT NULL, p_session_token text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  v_affiliate record;
  v_confidence numeric := 0;
  v_source text := 'unknown';
BEGIN
  -- Try ref_code first
  IF p_ref_code IS NOT NULL AND p_ref_code != '' THEN
    SELECT a.* INTO v_affiliate FROM public.affiliates a WHERE a.referral_code = p_ref_code AND a.status = 'active';
    IF FOUND THEN
      v_confidence := 95;
      v_source := 'ref_code';
    END IF;
  END IF;

  -- Fallback: session token
  IF v_affiliate IS NULL AND p_session_token IS NOT NULL THEN
    SELECT a.* INTO v_affiliate
    FROM public.affiliate_sessions s
    JOIN public.affiliates a ON a.id = s.affiliate_id
    WHERE s.session_token = p_session_token AND s.status = 'active' AND s.expires_at > now();
    IF FOUND THEN
      v_confidence := 80;
      v_source := 'session';
    END IF;
  END IF;

  IF v_affiliate IS NULL THEN
    RETURN jsonb_build_object('detected', false, 'source', 'direct', 'confidence_score', 0);
  END IF;

  RETURN jsonb_build_object(
    'detected', true,
    'affiliate_id', v_affiliate.id,
    'affiliate_name', v_affiliate.name,
    'referral_code', v_affiliate.referral_code,
    'confidence_score', v_confidence,
    'source', v_source
  );
END;
$$;

-- =============================================
-- RPC: confirm_referral_attribution
-- =============================================
CREATE OR REPLACE FUNCTION public.confirm_referral_attribution(p_attribution_id uuid, p_confirmed boolean)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  UPDATE public.affiliate_attributions SET
    confirmation_status = CASE WHEN p_confirmed THEN 'confirmed' ELSE 'rejected' END,
    confirmed_at = now()
  WHERE id = p_attribution_id AND referred_user_id = uid::text;

  RETURN jsonb_build_object('ok', true, 'status', CASE WHEN p_confirmed THEN 'confirmed' ELSE 'rejected' END);
END;
$$;

-- =============================================
-- RPC: track_affiliate_conversion
-- =============================================
CREATE OR REPLACE FUNCTION public.track_affiliate_conversion(
  p_user_id uuid,
  p_conversion_type text,
  p_value_cents integer DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  v_attr record;
  v_affiliate record;
  v_commission integer;
BEGIN
  -- Find confirmed attribution
  SELECT * INTO v_attr FROM public.affiliate_attributions
  WHERE referred_user_id = p_user_id::text AND confirmation_status = 'confirmed'
  ORDER BY created_at DESC LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('tracked', false, 'reason', 'no_confirmed_attribution');
  END IF;

  SELECT * INTO v_affiliate FROM public.affiliates WHERE id::text = v_attr.referrer_user_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('tracked', false, 'reason', 'affiliate_not_found');
  END IF;

  v_commission := round(p_value_cents * v_affiliate.commission_rate / 100);

  INSERT INTO public.affiliate_conversions (affiliate_id, user_id, attribution_id, conversion_type, value_cents, commission_rate, commission_amount_cents)
  VALUES (v_affiliate.id, p_user_id, v_attr.id, p_conversion_type, p_value_cents, v_affiliate.commission_rate, v_commission);

  -- Update affiliate totals
  UPDATE public.affiliates SET
    total_conversions = total_conversions + 1,
    total_revenue_cents = total_revenue_cents + v_commission,
    updated_at = now()
  WHERE id = v_affiliate.id;

  RETURN jsonb_build_object('tracked', true, 'commission_cents', v_commission);
END;
$$;

-- Trigger for updated_at
CREATE TRIGGER set_affiliates_updated_at BEFORE UPDATE ON public.affiliates
  FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();
