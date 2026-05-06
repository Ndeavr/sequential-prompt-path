
-- ============== PARTNERS ==============
CREATE TABLE IF NOT EXISTS public.partners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
  first_name text,
  last_name text,
  email text UNIQUE NOT NULL,
  phone text,
  company text,
  partner_status text NOT NULL DEFAULT 'pending', -- pending|approved|suspended|rejected
  partner_tier text NOT NULL DEFAULT 'certified',
  referral_code text UNIQUE,
  annual_new_contractors_target integer NOT NULL DEFAULT 10,
  commission_rate_first_24_months numeric NOT NULL DEFAULT 0.30,
  commission_rate_lifetime numeric NOT NULL DEFAULT 0.10,
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_partners_user_id ON public.partners(user_id);
CREATE INDEX IF NOT EXISTS idx_partners_status ON public.partners(partner_status);

-- Auto-generate referral_code if missing
CREATE OR REPLACE FUNCTION public.generate_partner_referral_code()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.referral_code IS NULL OR NEW.referral_code = '' THEN
    NEW.referral_code := 'PRT-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_partners_code ON public.partners;
CREATE TRIGGER trg_partners_code
BEFORE INSERT ON public.partners
FOR EACH ROW EXECUTE FUNCTION public.generate_partner_referral_code();

-- updated_at
CREATE OR REPLACE FUNCTION public.touch_partners_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;
DROP TRIGGER IF EXISTS trg_partners_touch ON public.partners;
CREATE TRIGGER trg_partners_touch
BEFORE UPDATE ON public.partners
FOR EACH ROW EXECUTE FUNCTION public.touch_partners_updated_at();

-- ============== REFERRALS ==============
CREATE TABLE IF NOT EXISTS public.partner_referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  contractor_id uuid,
  business_name text,
  contact_name text,
  email text,
  phone text,
  website text,
  rbq text,
  city text,
  trade text,
  notes text,
  status text NOT NULL DEFAULT 'submitted', -- submitted|contacted|onboarding|payment_pending|active|rejected|churn|suspended
  plan text,
  monthly_revenue numeric NOT NULL DEFAULT 0,
  activated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_partner_referrals_partner ON public.partner_referrals(partner_id);
CREATE INDEX IF NOT EXISTS idx_partner_referrals_status ON public.partner_referrals(status);

DROP TRIGGER IF EXISTS trg_partner_referrals_touch ON public.partner_referrals;
CREATE TRIGGER trg_partner_referrals_touch
BEFORE UPDATE ON public.partner_referrals
FOR EACH ROW EXECUTE FUNCTION public.touch_partners_updated_at();

-- ============== COMMISSIONS ==============
CREATE TABLE IF NOT EXISTS public.partner_commissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  referral_id uuid REFERENCES public.partner_referrals(id) ON DELETE SET NULL,
  contractor_id uuid,
  amount numeric NOT NULL DEFAULT 0,
  commission_rate numeric,
  commission_period text, -- 'first_24m' | 'lifetime'
  payout_status text NOT NULL DEFAULT 'pending', -- pending|paid|cancelled
  earned_at timestamptz NOT NULL DEFAULT now(),
  paid_at timestamptz
);
CREATE INDEX IF NOT EXISTS idx_partner_commissions_partner ON public.partner_commissions(partner_id);

-- ============== EVENTS ==============
CREATE TABLE IF NOT EXISTS public.partner_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid REFERENCES public.partners(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_partner_events_partner ON public.partner_events(partner_id);

-- ============== RLS ==============
ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_events ENABLE ROW LEVEL SECURITY;

-- partners
CREATE POLICY "Partner reads own row" ON public.partners
FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Partner self-signup" ON public.partners
FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Partner updates own profile (limited)" ON public.partners
FOR UPDATE TO authenticated
USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
WITH CHECK (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin deletes partners" ON public.partners
FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- partner_referrals
CREATE POLICY "Partner reads own referrals" ON public.partner_referrals
FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.partners p WHERE p.id = partner_id AND p.user_id = auth.uid())
  OR public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Partner creates own referrals" ON public.partner_referrals
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (SELECT 1 FROM public.partners p WHERE p.id = partner_id AND p.user_id = auth.uid() AND p.partner_status = 'approved')
  OR public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Admin updates referrals" ON public.partner_referrals
FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- partner_commissions
CREATE POLICY "Partner reads own commissions" ON public.partner_commissions
FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.partners p WHERE p.id = partner_id AND p.user_id = auth.uid())
  OR public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Admin manages commissions" ON public.partner_commissions
FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- partner_events
CREATE POLICY "Partner reads own events" ON public.partner_events
FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.partners p WHERE p.id = partner_id AND p.user_id = auth.uid())
  OR public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Authenticated inserts events" ON public.partner_events
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (SELECT 1 FROM public.partners p WHERE p.id = partner_id AND p.user_id = auth.uid())
  OR public.has_role(auth.uid(), 'admin')
);
