
-- ============ 1. Enum ============
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'affiliate';

-- ============ 2. Role helper (uses text cast to avoid same-txn enum issue) ============
CREATE OR REPLACE FUNCTION public.is_affiliate(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role::text = 'affiliate'
  )
$$;

-- ============ 3. Prospect assignment columns ============
ALTER TABLE public.contractors_prospects
  ADD COLUMN IF NOT EXISTS assigned_affiliate_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS owner_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_prospects_assigned_affiliate ON public.contractors_prospects(assigned_affiliate_id);
CREATE INDEX IF NOT EXISTS idx_prospects_owner_user ON public.contractors_prospects(owner_user_id);

-- Add affiliate + owner read policies on prospects
DROP POLICY IF EXISTS "affiliate_read_assigned_prospects" ON public.contractors_prospects;
CREATE POLICY "affiliate_read_assigned_prospects" ON public.contractors_prospects
  FOR SELECT TO authenticated
  USING (public.is_affiliate(auth.uid()) AND assigned_affiliate_id = auth.uid());

DROP POLICY IF EXISTS "affiliate_update_assigned_prospects" ON public.contractors_prospects;
CREATE POLICY "affiliate_update_assigned_prospects" ON public.contractors_prospects
  FOR UPDATE TO authenticated
  USING (public.is_affiliate(auth.uid()) AND assigned_affiliate_id = auth.uid())
  WITH CHECK (public.is_affiliate(auth.uid()) AND assigned_affiliate_id = auth.uid());

DROP POLICY IF EXISTS "owner_read_own_prospect" ON public.contractors_prospects;
CREATE POLICY "owner_read_own_prospect" ON public.contractors_prospects
  FOR SELECT TO authenticated
  USING (owner_user_id = auth.uid());

-- ============ 4. affiliate_profiles ============
CREATE TABLE IF NOT EXISTS public.affiliate_profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text NOT NULL,
  phone text,
  timezone text NOT NULL DEFAULT 'America/Toronto',
  active boolean NOT NULL DEFAULT true,
  commission_rate numeric(4,3) NOT NULL DEFAULT 0.20,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.affiliate_profiles TO authenticated;
GRANT ALL ON public.affiliate_profiles TO service_role;
ALTER TABLE public.affiliate_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_all_affiliate_profiles" ON public.affiliate_profiles
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "affiliate_read_own_profile" ON public.affiliate_profiles
  FOR SELECT TO authenticated USING (user_id = auth.uid());

-- ============ 5. affiliate_assignments ============
CREATE TABLE IF NOT EXISTS public.affiliate_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  prospect_id uuid NOT NULL REFERENCES public.contractors_prospects(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'to_call',
  priority integer NOT NULL DEFAULT 0,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  last_activity_at timestamptz,
  lost_reason text,
  won_at timestamptz,
  recommended_plan_slug text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (affiliate_id, prospect_id)
);

CREATE INDEX IF NOT EXISTS idx_assign_aff_status ON public.affiliate_assignments(affiliate_id, status);
CREATE INDEX IF NOT EXISTS idx_assign_prospect ON public.affiliate_assignments(prospect_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.affiliate_assignments TO authenticated;
GRANT ALL ON public.affiliate_assignments TO service_role;
ALTER TABLE public.affiliate_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_all_assignments" ON public.affiliate_assignments
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "affiliate_read_own_assignments" ON public.affiliate_assignments
  FOR SELECT TO authenticated USING (affiliate_id = auth.uid());

CREATE POLICY "affiliate_update_own_assignments" ON public.affiliate_assignments
  FOR UPDATE TO authenticated
  USING (affiliate_id = auth.uid()) WITH CHECK (affiliate_id = auth.uid());

-- ============ 6. affiliate_activities ============
CREATE TABLE IF NOT EXISTS public.affiliate_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  prospect_id uuid NOT NULL REFERENCES public.contractors_prospects(id) ON DELETE CASCADE,
  activity_type text NOT NULL,
  outcome text,
  note text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_activities_aff_created ON public.affiliate_activities(affiliate_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activities_prospect ON public.affiliate_activities(prospect_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.affiliate_activities TO authenticated;
GRANT ALL ON public.affiliate_activities TO service_role;
ALTER TABLE public.affiliate_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_all_activities" ON public.affiliate_activities
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "affiliate_manage_own_activities" ON public.affiliate_activities
  FOR ALL TO authenticated
  USING (affiliate_id = auth.uid()) WITH CHECK (affiliate_id = auth.uid());

-- ============ 7. affiliate_proposals (hashed tokens) ============
CREATE TABLE IF NOT EXISTS public.affiliate_proposals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  prospect_id uuid NOT NULL REFERENCES public.contractors_prospects(id) ON DELETE CASCADE,
  recommended_plan_slug text NOT NULL,
  monthly_price_cents integer NOT NULL,
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  single_use boolean NOT NULL DEFAULT true,
  used_at timestamptz,
  opened_at timestamptz,
  paid_at timestamptz,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_proposals_aff ON public.affiliate_proposals(affiliate_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_proposals_prospect ON public.affiliate_proposals(prospect_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.affiliate_proposals TO authenticated;
GRANT ALL ON public.affiliate_proposals TO service_role;
ALTER TABLE public.affiliate_proposals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_all_proposals" ON public.affiliate_proposals
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "affiliate_manage_own_proposals" ON public.affiliate_proposals
  FOR ALL TO authenticated
  USING (affiliate_id = auth.uid()) WITH CHECK (affiliate_id = auth.uid());

-- ============ 8. affiliate_activation_links (hashed tokens) ============
CREATE TABLE IF NOT EXISTS public.affiliate_activation_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  prospect_id uuid NOT NULL REFERENCES public.contractors_prospects(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  single_use boolean NOT NULL DEFAULT true,
  used_at timestamptz,
  activated_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_activation_links_aff ON public.affiliate_activation_links(affiliate_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.affiliate_activation_links TO authenticated;
GRANT ALL ON public.affiliate_activation_links TO service_role;
ALTER TABLE public.affiliate_activation_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_all_activation_links" ON public.affiliate_activation_links
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "affiliate_manage_own_activation_links" ON public.affiliate_activation_links
  FOR ALL TO authenticated
  USING (affiliate_id = auth.uid()) WITH CHECK (affiliate_id = auth.uid());

-- ============ 9. affiliate_commissions ============
CREATE TABLE IF NOT EXISTS public.affiliate_commissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  prospect_id uuid REFERENCES public.contractors_prospects(id) ON DELETE SET NULL,
  contractor_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  plan_slug text NOT NULL,
  monthly_commission_cents integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  first_payment_at timestamptz,
  last_payment_at timestamptz,
  total_paid_cents integer NOT NULL DEFAULT 0,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_commissions_aff_status ON public.affiliate_commissions(affiliate_id, status);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.affiliate_commissions TO authenticated;
GRANT ALL ON public.affiliate_commissions TO service_role;
ALTER TABLE public.affiliate_commissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_all_commissions" ON public.affiliate_commissions
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "affiliate_read_own_commissions" ON public.affiliate_commissions
  FOR SELECT TO authenticated USING (affiliate_id = auth.uid());

-- ============ 10. Extend outreach_logs ============
ALTER TABLE public.outreach_logs
  ADD COLUMN IF NOT EXISTS prospect_id uuid REFERENCES public.contractors_prospects(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS channel text NOT NULL DEFAULT 'sms',
  ADD COLUMN IF NOT EXISTS template_id text,
  ADD COLUMN IF NOT EXISTS body_snapshot text,
  ADD COLUMN IF NOT EXISTS clicked_at timestamptz,
  ADD COLUMN IF NOT EXISTS converted_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_outreach_prospect ON public.outreach_logs(prospect_id, sent_at DESC);

-- Extend outreach_logs RLS for admin + affiliate visibility
DROP POLICY IF EXISTS "admin_read_outreach_logs" ON public.outreach_logs;
CREATE POLICY "admin_read_outreach_logs" ON public.outreach_logs
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "affiliate_read_assigned_outreach" ON public.outreach_logs;
CREATE POLICY "affiliate_read_assigned_outreach" ON public.outreach_logs
  FOR SELECT TO authenticated
  USING (
    public.is_affiliate(auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.contractors_prospects p
      WHERE p.id = outreach_logs.prospect_id AND p.assigned_affiliate_id = auth.uid()
    )
  );

-- ============ 11. Public RPCs (SECURITY DEFINER, hash + expiry) ============
CREATE OR REPLACE FUNCTION public.resolve_activation_link(_token text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_hash text := encode(digest(_token, 'sha256'), 'hex');
  v_row public.affiliate_activation_links%ROWTYPE;
BEGIN
  SELECT * INTO v_row FROM public.affiliate_activation_links
  WHERE token_hash = v_hash LIMIT 1;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'reason', 'not_found'); END IF;
  IF v_row.expires_at < now() THEN RETURN jsonb_build_object('ok', false, 'reason', 'expired'); END IF;
  IF v_row.single_use AND v_row.used_at IS NOT NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'used');
  END IF;
  RETURN jsonb_build_object(
    'ok', true,
    'link_id', v_row.id,
    'prospect_id', v_row.prospect_id,
    'affiliate_id', v_row.affiliate_id
  );
END $$;

GRANT EXECUTE ON FUNCTION public.resolve_activation_link(text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.resolve_proposal_link(_token text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_hash text := encode(digest(_token, 'sha256'), 'hex');
  v_row public.affiliate_proposals%ROWTYPE;
BEGIN
  SELECT * INTO v_row FROM public.affiliate_proposals
  WHERE token_hash = v_hash LIMIT 1;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'reason', 'not_found'); END IF;
  IF v_row.expires_at < now() THEN RETURN jsonb_build_object('ok', false, 'reason', 'expired'); END IF;
  IF v_row.single_use AND v_row.used_at IS NOT NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'used');
  END IF;
  -- Mark opened_at first time only
  IF v_row.opened_at IS NULL THEN
    UPDATE public.affiliate_proposals SET opened_at = now() WHERE id = v_row.id;
  END IF;
  RETURN jsonb_build_object(
    'ok', true,
    'proposal_id', v_row.id,
    'plan_slug', v_row.recommended_plan_slug,
    'monthly_price_cents', v_row.monthly_price_cents,
    'payload', v_row.payload
  );
END $$;

GRANT EXECUTE ON FUNCTION public.resolve_proposal_link(text) TO anon, authenticated;

-- ============ 12. updated_at triggers ============
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger LANGUAGE plpgsql SET search_path = public
AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

DROP TRIGGER IF EXISTS trg_aff_profiles_updated ON public.affiliate_profiles;
CREATE TRIGGER trg_aff_profiles_updated BEFORE UPDATE ON public.affiliate_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_aff_assign_updated ON public.affiliate_assignments;
CREATE TRIGGER trg_aff_assign_updated BEFORE UPDATE ON public.affiliate_assignments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_aff_proposals_updated ON public.affiliate_proposals;
CREATE TRIGGER trg_aff_proposals_updated BEFORE UPDATE ON public.affiliate_proposals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_aff_commissions_updated ON public.affiliate_commissions;
CREATE TRIGGER trg_aff_commissions_updated BEFORE UPDATE ON public.affiliate_commissions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
