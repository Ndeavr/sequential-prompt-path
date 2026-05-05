
-- updated_at helper
CREATE OR REPLACE FUNCTION public.tg_set_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;$$;

-- =====================================================
-- ACQ CONTRACTORS
-- =====================================================
CREATE TABLE public.acq_contractors (
  id uuid primary key default gen_random_uuid(),
  company_name text not null,
  slug text unique not null,
  email text,
  phone text,
  website text,
  city text,
  province text default 'QC',
  rbq_number text,
  neq_number text,
  logo_url text,
  description text,
  status text not null default 'draft',
  source text not null default 'manual',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
CREATE INDEX idx_acq_contractors_slug ON public.acq_contractors(slug);
CREATE INDEX idx_acq_contractors_status ON public.acq_contractors(status);
ALTER TABLE public.acq_contractors ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_acq_contractors_updated BEFORE UPDATE ON public.acq_contractors
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE POLICY "Admins manage acq_contractors" ON public.acq_contractors
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- =====================================================
-- ACQ CONTRACTOR MEDIA
-- =====================================================
CREATE TABLE public.acq_contractor_media (
  id uuid primary key default gen_random_uuid(),
  contractor_id uuid not null references public.acq_contractors(id) on delete cascade,
  media_type text not null check (media_type in ('logo','image','video')),
  url text not null,
  title text,
  source_url text,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
CREATE INDEX idx_acq_media_contractor ON public.acq_contractor_media(contractor_id);
ALTER TABLE public.acq_contractor_media ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage acq_media" ON public.acq_contractor_media
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- =====================================================
-- ACQ CONTRACTOR SERVICES
-- =====================================================
CREATE TABLE public.acq_contractor_services (
  id uuid primary key default gen_random_uuid(),
  contractor_id uuid not null references public.acq_contractors(id) on delete cascade,
  service_name text not null,
  category text,
  city text,
  is_primary boolean not null default false,
  created_at timestamptz not null default now()
);
CREATE INDEX idx_acq_services_contractor ON public.acq_contractor_services(contractor_id);
ALTER TABLE public.acq_contractor_services ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage acq_services" ON public.acq_contractor_services
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- =====================================================
-- ACQ SCORES
-- =====================================================
CREATE TABLE public.acq_contractor_scores (
  id uuid primary key default gen_random_uuid(),
  contractor_id uuid not null references public.acq_contractors(id) on delete cascade,
  aipp_score int not null,
  visibility_score int not null default 0,
  trust_score int not null default 0,
  conversion_score int not null default 0,
  content_score int not null default 0,
  availability_score int not null default 0,
  lost_revenue_estimate_monthly int,
  strengths jsonb not null default '[]'::jsonb,
  weaknesses jsonb not null default '[]'::jsonb,
  recommendations jsonb not null default '[]'::jsonb,
  score_summary text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
CREATE INDEX idx_acq_scores_contractor ON public.acq_contractor_scores(contractor_id);
ALTER TABLE public.acq_contractor_scores ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_acq_scores_updated BEFORE UPDATE ON public.acq_contractor_scores
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE POLICY "Admins manage acq_scores" ON public.acq_contractor_scores
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- =====================================================
-- ACQ OBJECTIVES
-- =====================================================
CREATE TABLE public.acq_contractor_objectives (
  id uuid primary key default gen_random_uuid(),
  contractor_id uuid not null references public.acq_contractors(id) on delete cascade,
  objective_type text,
  current_state text,
  target_state text,
  recommended_action text,
  priority int not null default 1,
  status text not null default 'open',
  created_at timestamptz not null default now()
);
CREATE INDEX idx_acq_objectives_contractor ON public.acq_contractor_objectives(contractor_id);
ALTER TABLE public.acq_contractor_objectives ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage acq_objectives" ON public.acq_contractor_objectives
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- =====================================================
-- ACQ AIPP PAGES
-- =====================================================
CREATE TABLE public.acq_aipp_pages (
  id uuid primary key default gen_random_uuid(),
  contractor_id uuid not null references public.acq_contractors(id) on delete cascade,
  public_token text unique not null,
  page_slug text unique not null,
  page_status text not null default 'published',
  viewed_at timestamptz,
  last_viewed_at timestamptz,
  view_count int not null default 0,
  created_at timestamptz not null default now()
);
CREATE INDEX idx_acq_pages_slug ON public.acq_aipp_pages(page_slug);
CREATE INDEX idx_acq_pages_token ON public.acq_aipp_pages(public_token);
ALTER TABLE public.acq_aipp_pages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public reads published acq_aipp_pages" ON public.acq_aipp_pages
  FOR SELECT TO anon, authenticated USING (page_status = 'published');
CREATE POLICY "Admins manage acq_aipp_pages" ON public.acq_aipp_pages
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- =====================================================
-- ACQ INVITES
-- =====================================================
CREATE TABLE public.acq_invites (
  id uuid primary key default gen_random_uuid(),
  contractor_id uuid not null references public.acq_contractors(id) on delete cascade,
  email text not null,
  invite_token text unique not null,
  status text not null default 'pending',
  rendered_subject text,
  rendered_body text,
  sent_at timestamptz,
  opened_at timestamptz,
  clicked_at timestamptz,
  created_at timestamptz not null default now()
);
CREATE INDEX idx_acq_invites_contractor ON public.acq_invites(contractor_id);
ALTER TABLE public.acq_invites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage acq_invites" ON public.acq_invites
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- =====================================================
-- ACQ PRICING PLANS
-- =====================================================
CREATE TABLE public.acq_pricing_plans (
  id uuid primary key default gen_random_uuid(),
  plan_code text unique not null,
  name text not null,
  monthly_price int not null,
  appointments_included int not null,
  description text,
  is_popular boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
ALTER TABLE public.acq_pricing_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public reads active acq_plans" ON public.acq_pricing_plans
  FOR SELECT TO anon, authenticated USING (active = true);
CREATE POLICY "Admins manage acq_plans" ON public.acq_pricing_plans
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.acq_pricing_plans (plan_code, name, monthly_price, appointments_included, description, is_popular) VALUES
  ('recrue', 'Recrue', 0, 0, 'Profil de base, sans rendez-vous inclus.', false),
  ('pro', 'Pro', 349, 5, '5 rendez-vous qualifiés par mois.', false),
  ('premium', 'Premium', 599, 10, '10 rendez-vous qualifiés par mois. Le plus choisi.', true),
  ('elite', 'Élite', 999, 25, '25 rendez-vous qualifiés par mois.', false),
  ('signature', 'Signature', 1799, 50, '50 rendez-vous + priorité maximum.', false);

-- =====================================================
-- ACQ COUPONS
-- =====================================================
CREATE TABLE public.acq_coupons (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  discount_type text not null check (discount_type in ('free_first_month','percent','fixed','dynamic_to_1_dollar')),
  discount_value int not null default 100,
  min_charge_amount int not null default 1,
  max_redemptions int not null default 1,
  redemptions_count int not null default 0,
  active boolean not null default true,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);
ALTER TABLE public.acq_coupons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public reads active acq_coupons" ON public.acq_coupons
  FOR SELECT TO anon, authenticated USING (active = true);
CREATE POLICY "Admins manage acq_coupons" ON public.acq_coupons
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.acq_coupons (code, discount_type, discount_value, min_charge_amount, max_redemptions, active)
VALUES ('freetoday', 'dynamic_to_1_dollar', 100, 1, 1, true);

-- =====================================================
-- ACQ COUPON REDEMPTIONS
-- =====================================================
CREATE TABLE public.acq_coupon_redemptions (
  id uuid primary key default gen_random_uuid(),
  coupon_id uuid not null references public.acq_coupons(id) on delete cascade,
  contractor_id uuid references public.acq_contractors(id) on delete set null,
  email text,
  redeemed_at timestamptz not null default now()
);
CREATE INDEX idx_acq_redemptions_coupon ON public.acq_coupon_redemptions(coupon_id);
ALTER TABLE public.acq_coupon_redemptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read acq_redemptions" ON public.acq_coupon_redemptions
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.acq_enforce_coupon_max()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE c RECORD;
BEGIN
  SELECT * INTO c FROM public.acq_coupons WHERE id = NEW.coupon_id FOR UPDATE;
  IF c IS NULL THEN RAISE EXCEPTION 'coupon_not_found'; END IF;
  IF c.active = false THEN RAISE EXCEPTION 'coupon_inactive'; END IF;
  IF c.expires_at IS NOT NULL AND c.expires_at < now() THEN RAISE EXCEPTION 'coupon_expired'; END IF;
  IF c.redemptions_count >= c.max_redemptions THEN RAISE EXCEPTION 'coupon_max_redemptions_reached'; END IF;
  UPDATE public.acq_coupons SET redemptions_count = redemptions_count + 1 WHERE id = NEW.coupon_id;
  RETURN NEW;
END;$$;

CREATE TRIGGER trg_acq_enforce_coupon BEFORE INSERT ON public.acq_coupon_redemptions
  FOR EACH ROW EXECUTE FUNCTION public.acq_enforce_coupon_max();

-- =====================================================
-- ACQ SUBSCRIPTIONS
-- =====================================================
CREATE TABLE public.acq_subscriptions (
  id uuid primary key default gen_random_uuid(),
  contractor_id uuid not null references public.acq_contractors(id) on delete cascade,
  plan_code text not null,
  status text not null default 'pending',
  stripe_customer_id text,
  stripe_subscription_id text,
  stripe_session_id text,
  coupon_code text,
  amount_due int,
  trial_started_at timestamptz,
  trial_ends_at timestamptz,
  activated_at timestamptz,
  created_at timestamptz not null default now()
);
CREATE INDEX idx_acq_subs_contractor ON public.acq_subscriptions(contractor_id);
CREATE INDEX idx_acq_subs_status ON public.acq_subscriptions(status);
ALTER TABLE public.acq_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage acq_subscriptions" ON public.acq_subscriptions
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- =====================================================
-- ACQ PAYMENT EVENTS
-- =====================================================
CREATE TABLE public.acq_payment_events (
  id uuid primary key default gen_random_uuid(),
  contractor_id uuid references public.acq_contractors(id) on delete set null,
  event_type text,
  stripe_event_id text unique,
  payload jsonb,
  created_at timestamptz not null default now()
);
ALTER TABLE public.acq_payment_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read acq_payment_events" ON public.acq_payment_events
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- =====================================================
-- PUBLIC AIPP VIEW (no PII)
-- =====================================================
CREATE OR REPLACE VIEW public.acq_aipp_public_view
WITH (security_invoker = on) AS
SELECT
  p.page_slug,
  p.public_token,
  p.view_count,
  c.id AS contractor_id,
  c.company_name,
  c.slug,
  c.website,
  c.city,
  c.province,
  c.rbq_number,
  c.neq_number,
  c.logo_url,
  c.description
FROM public.acq_aipp_pages p
JOIN public.acq_contractors c ON c.id = p.contractor_id
WHERE p.page_status = 'published';

GRANT SELECT ON public.acq_aipp_public_view TO anon, authenticated;
