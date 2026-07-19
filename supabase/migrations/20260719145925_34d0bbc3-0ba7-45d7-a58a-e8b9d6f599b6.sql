
-- 1) Extend affiliates
ALTER TABLE public.affiliates
  ADD COLUMN IF NOT EXISTS permissions jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS short_login_token text,
  ADD COLUMN IF NOT EXISTS invited_at timestamptz,
  ADD COLUMN IF NOT EXISTS activated_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_login_at timestamptz,
  ADD COLUMN IF NOT EXISTS suspended_at timestamptz,
  ADD COLUMN IF NOT EXISTS archived_at timestamptz;

UPDATE public.affiliates SET affiliate_type='affiliate' WHERE affiliate_type IS NULL;
UPDATE public.affiliates SET status='active' WHERE status IS NULL;

ALTER TABLE public.affiliates DROP CONSTRAINT IF EXISTS affiliates_affiliate_type_check;
ALTER TABLE public.affiliates ADD CONSTRAINT affiliates_affiliate_type_check
  CHECK (affiliate_type = ANY (ARRAY['affiliate','partner','ambassador','admin_affiliate','contractor','homeowner','rep','creator','other']));

ALTER TABLE public.affiliates DROP CONSTRAINT IF EXISTS affiliates_status_check;
ALTER TABLE public.affiliates ADD CONSTRAINT affiliates_status_check
  CHECK (status = ANY (ARRAY['draft','invited','active','suspended','disabled','archived','pending','inactive','training','admin']));

ALTER TABLE public.affiliates
  ALTER COLUMN affiliate_type SET DEFAULT 'affiliate';

CREATE UNIQUE INDEX IF NOT EXISTS idx_affiliates_slug_unique ON public.affiliates (slug) WHERE slug IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_affiliates_short_login_token ON public.affiliates (short_login_token) WHERE short_login_token IS NOT NULL;

-- 2) admin_impersonations
CREATE TABLE IF NOT EXISTS public.admin_impersonations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id uuid NOT NULL,
  affiliate_id uuid NOT NULL REFERENCES public.affiliates(id) ON DELETE CASCADE,
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  ip text,
  actions jsonb NOT NULL DEFAULT '[]'::jsonb,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.admin_impersonations TO authenticated;
GRANT ALL ON public.admin_impersonations TO service_role;
ALTER TABLE public.admin_impersonations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins manage impersonations" ON public.admin_impersonations;
CREATE POLICY "Admins manage impersonations" ON public.admin_impersonations
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 3) affiliate_invitations
CREATE TABLE IF NOT EXISTS public.affiliate_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id uuid NOT NULL REFERENCES public.affiliates(id) ON DELETE CASCADE,
  channel text NOT NULL CHECK (channel IN ('sms','email','both')),
  sent_to text NOT NULL,
  short_url text NOT NULL,
  status text NOT NULL DEFAULT 'sent',
  sent_by uuid,
  sent_at timestamptz NOT NULL DEFAULT now(),
  opened_at timestamptz,
  used_at timestamptz,
  expires_at timestamptz
);
GRANT SELECT, INSERT, UPDATE ON public.affiliate_invitations TO authenticated;
GRANT ALL ON public.affiliate_invitations TO service_role;
ALTER TABLE public.affiliate_invitations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins manage invitations" ON public.affiliate_invitations;
CREATE POLICY "Admins manage invitations" ON public.affiliate_invitations
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "Affiliate sees own invitations" ON public.affiliate_invitations;
CREATE POLICY "Affiliate sees own invitations" ON public.affiliate_invitations
  FOR SELECT TO authenticated
  USING (affiliate_id IN (SELECT id FROM public.affiliates WHERE user_id = auth.uid()));

-- 4) affiliate_import_batches
CREATE TABLE IF NOT EXISTS public.affiliate_import_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id uuid NOT NULL REFERENCES public.affiliates(id) ON DELETE CASCADE,
  file_name text,
  source_type text NOT NULL,
  total_rows integer NOT NULL DEFAULT 0,
  valid_rows integer NOT NULL DEFAULT 0,
  duplicate_rows integer NOT NULL DEFAULT 0,
  invalid_rows integer NOT NULL DEFAULT 0,
  imported_rows integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'uploaded',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);
GRANT SELECT, INSERT, UPDATE ON public.affiliate_import_batches TO authenticated;
GRANT ALL ON public.affiliate_import_batches TO service_role;
ALTER TABLE public.affiliate_import_batches ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Affiliate manages own batches" ON public.affiliate_import_batches;
CREATE POLICY "Affiliate manages own batches" ON public.affiliate_import_batches
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR affiliate_id IN (SELECT id FROM public.affiliates WHERE user_id = auth.uid()))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR affiliate_id IN (SELECT id FROM public.affiliates WHERE user_id = auth.uid()));

-- 5) affiliate_import_rows
CREATE TABLE IF NOT EXISTS public.affiliate_import_rows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid NOT NULL REFERENCES public.affiliate_import_batches(id) ON DELETE CASCADE,
  raw_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  normalized_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  validation_status text NOT NULL DEFAULT 'pending',
  duplicate_prospect_id uuid,
  error_messages jsonb,
  imported_prospect_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_import_rows_batch ON public.affiliate_import_rows(batch_id);
GRANT SELECT, INSERT, UPDATE ON public.affiliate_import_rows TO authenticated;
GRANT ALL ON public.affiliate_import_rows TO service_role;
ALTER TABLE public.affiliate_import_rows ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Affiliate sees own import rows" ON public.affiliate_import_rows;
CREATE POLICY "Affiliate sees own import rows" ON public.affiliate_import_rows
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR batch_id IN (SELECT id FROM public.affiliate_import_batches WHERE affiliate_id IN (SELECT id FROM public.affiliates WHERE user_id = auth.uid())))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR batch_id IN (SELECT id FROM public.affiliate_import_batches WHERE affiliate_id IN (SELECT id FROM public.affiliates WHERE user_id = auth.uid())));

-- 6) Helper
CREATE OR REPLACE FUNCTION public.is_affiliate_owner(_affiliate_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.affiliates WHERE id = _affiliate_id AND user_id = auth.uid())
$$;

-- 7) Seed Lorraine
INSERT INTO public.affiliates (
  name, slug, referral_code, first_name, last_name, affiliate_type,
  display_preference, status, primary_city, province, preferred_language,
  commission_pct, daily_quota, bio, activated_at,
  permissions, allowed_categories, territories
)
SELECT
  'Lorraine Tremblay', 'lorraine', 'LORRAINE-UNPRO', 'Lorraine', 'Tremblay', 'affiliate',
  'first_name', 'active', 'Montréal', 'QC', 'fr',
  10.0, 10, 'Fière de recommander des entrepreneurs UNPRO à mes contacts.',
  now(),
  jsonb_build_object(
    'can_add_leads', true, 'can_import_leads', true, 'can_view_assigned_leads', true,
    'can_send_personal_sms', true, 'can_send_unpro_sms', true, 'can_call_leads', true,
    'can_view_commissions', true, 'can_view_revenue', true, 'can_manage_team', false,
    'can_edit_public_page', true, 'can_export_data', true
  ),
  ARRAY['toiture','plomberie','electricite']::text[],
  ARRAY['Montréal','Laval']::text[]
WHERE NOT EXISTS (SELECT 1 FROM public.affiliates WHERE slug='lorraine');
