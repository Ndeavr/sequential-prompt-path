
-- 1. subscription_products
CREATE TABLE IF NOT EXISTS public.subscription_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  name text NOT NULL,
  audience_type text NOT NULL DEFAULT 'homeowner',
  active boolean DEFAULT true,
  display_order integer DEFAULT 0,
  badge_label text,
  badge_type text,
  short_description text,
  long_description text,
  cta_label text,
  cta_link text,
  popular_flag boolean DEFAULT false,
  premium_flag boolean DEFAULT false,
  icon_name text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.subscription_products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read active products" ON public.subscription_products FOR SELECT USING (active = true);
CREATE POLICY "Admins manage products" ON public.subscription_products FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- 2. subscription_prices
CREATE TABLE IF NOT EXISTS public.subscription_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES public.subscription_products(id) ON DELETE CASCADE NOT NULL,
  billing_period text NOT NULL DEFAULT 'yearly',
  amount_cad numeric NOT NULL DEFAULT 0,
  currency text DEFAULT 'CAD',
  active boolean DEFAULT true,
  stripe_price_id text,
  compare_at_amount_cad numeric,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.subscription_prices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read active prices" ON public.subscription_prices FOR SELECT USING (active = true);
CREATE POLICY "Admins manage prices" ON public.subscription_prices FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- 3. subscription_features
CREATE TABLE IF NOT EXISTS public.subscription_features (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  feature_label text NOT NULL,
  feature_description text,
  category text DEFAULT 'general',
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.subscription_features ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read features" ON public.subscription_features FOR SELECT USING (true);
CREATE POLICY "Admins manage features" ON public.subscription_features FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- 4. product_feature_values
CREATE TABLE IF NOT EXISTS public.product_feature_values (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES public.subscription_products(id) ON DELETE CASCADE NOT NULL,
  feature_id uuid REFERENCES public.subscription_features(id) ON DELETE CASCADE NOT NULL,
  value_text text,
  value_type text DEFAULT 'text',
  highlighted boolean DEFAULT false,
  tooltip_text text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(product_id, feature_id)
);
ALTER TABLE public.product_feature_values ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read feature values" ON public.product_feature_values FOR SELECT USING (true);
CREATE POLICY "Admins manage feature values" ON public.product_feature_values FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- 5. user_subscriptions
CREATE TABLE IF NOT EXISTS public.user_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  product_id uuid REFERENCES public.subscription_products(id) NOT NULL,
  price_id uuid REFERENCES public.subscription_prices(id),
  status text NOT NULL DEFAULT 'active',
  start_date timestamptz DEFAULT now(),
  renewal_date timestamptz,
  cancel_at_period_end boolean DEFAULT false,
  stripe_customer_id text,
  stripe_subscription_id text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT valid_status CHECK (status IN ('trial','active','past_due','canceled','expired'))
);
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own subscriptions" ON public.user_subscriptions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users create own subscriptions" ON public.user_subscriptions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins manage subscriptions" ON public.user_subscriptions FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Trigger for updated_at
CREATE TRIGGER set_subscription_products_updated_at BEFORE UPDATE ON public.subscription_products FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_subscription_prices_updated_at BEFORE UPDATE ON public.subscription_prices FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_subscription_features_updated_at BEFORE UPDATE ON public.subscription_features FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_product_feature_values_updated_at BEFORE UPDATE ON public.product_feature_values FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_user_subscriptions_updated_at BEFORE UPDATE ON public.user_subscriptions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- SEED: Products
INSERT INTO public.subscription_products (id, code, name, audience_type, display_order, badge_label, badge_type, short_description, long_description, cta_label, cta_link, popular_flag, premium_flag, icon_name) VALUES
  ('b0000001-0001-4000-8000-000000000001', 'homeowners_discovery', 'Découverte', 'homeowner', 1, 'Gratuit pour commencer', 'neutral', 'Les bases pour vérifier, comprendre et avancer.', 'Pour commencer sans friction', 'Commencer gratuitement', '/signup', false, false, 'Home'),
  ('b0000001-0001-4000-8000-000000000002', 'homeowners_plus', 'Plus', 'homeowner', 2, 'Le plus populaire', 'popular', 'Comparez mieux, évitez les erreurs coûteuses et centralisez votre maison.', 'Pour comparer intelligemment', 'Passer à Plus', '/signup?plan=plus', true, false, 'Sparkles'),
  ('b0000001-0001-4000-8000-000000000003', 'homeowners_signature', 'Signature', 'homeowner', 3, 'Premium', 'premium', 'Une expérience premium avec copilote maison plus stratégique.', 'Pour piloter votre maison avec plus de contrôle', 'Activer Signature', '/signup?plan=signature', false, true, 'Crown')
ON CONFLICT (id) DO NOTHING;

-- SEED: Prices
INSERT INTO public.subscription_prices (id, product_id, billing_period, amount_cad, currency, active) VALUES
  (gen_random_uuid(), 'b0000001-0001-4000-8000-000000000001', 'yearly', 0, 'CAD', true),
  (gen_random_uuid(), 'b0000001-0001-4000-8000-000000000002', 'yearly', 49, 'CAD', true),
  (gen_random_uuid(), 'b0000001-0001-4000-8000-000000000003', 'yearly', 149, 'CAD', true)
ON CONFLICT DO NOTHING;

-- SEED: Features
INSERT INTO public.subscription_features (id, code, feature_label, category, display_order) VALUES
  ('c0000001-0001-4000-8000-000000000001', 'account', 'Compte propriétaire UNPRO', 'core', 1),
  ('c0000001-0001-4000-8000-000000000002', 'passport', 'Passeport Maison', 'core', 2),
  ('c0000001-0001-4000-8000-000000000003', 'estimate', 'Estimation préliminaire de projet', 'core', 3),
  ('c0000001-0001-4000-8000-000000000004', 'recommendations', 'Recommandations de professionnels', 'core', 4),
  ('c0000001-0001-4000-8000-000000000005', 'verification', 'Vérification entrepreneur', 'trust', 5),
  ('c0000001-0001-4000-8000-000000000006', 'analysis', 'Analyse de soumission', 'analysis', 6),
  ('c0000001-0001-4000-8000-000000000007', 'comparison', 'Comparaison de jusqu''à 3 soumissions', 'analysis', 7),
  ('c0000001-0001-4000-8000-000000000008', 'gap_detection', 'Détection d''écarts et zones floues', 'analysis', 8),
  ('c0000001-0001-4000-8000-000000000009', 'history', 'Historique projets et dépenses', 'organization', 9),
  ('c0000001-0001-4000-8000-000000000010', 'documents', 'Archivage avancé documents', 'organization', 10),
  ('c0000001-0001-4000-8000-000000000011', 'reminders', 'Rappels d''entretien', 'organization', 11),
  ('c0000001-0001-4000-8000-000000000012', 'strategic_reading', 'Lecture stratégique des options', 'premium', 12),
  ('c0000001-0001-4000-8000-000000000013', 'prioritization', 'Priorisation des travaux', 'premium', 13),
  ('c0000001-0001-4000-8000-000000000014', 'proactive_suggestions', 'Suggestions proactives', 'premium', 14),
  ('c0000001-0001-4000-8000-000000000015', 'support', 'Support', 'support', 15)
ON CONFLICT (id) DO NOTHING;

-- SEED: Feature values
-- Découverte
INSERT INTO public.product_feature_values (product_id, feature_id, value_text, value_type) VALUES
  ('b0000001-0001-4000-8000-000000000001', 'c0000001-0001-4000-8000-000000000001', 'Oui', 'boolean'),
  ('b0000001-0001-4000-8000-000000000001', 'c0000001-0001-4000-8000-000000000002', '1', 'text'),
  ('b0000001-0001-4000-8000-000000000001', 'c0000001-0001-4000-8000-000000000003', 'Oui', 'boolean'),
  ('b0000001-0001-4000-8000-000000000001', 'c0000001-0001-4000-8000-000000000004', 'Oui', 'boolean'),
  ('b0000001-0001-4000-8000-000000000001', 'c0000001-0001-4000-8000-000000000005', 'Base', 'text'),
  ('b0000001-0001-4000-8000-000000000001', 'c0000001-0001-4000-8000-000000000006', '1 / mois', 'text'),
  ('b0000001-0001-4000-8000-000000000001', 'c0000001-0001-4000-8000-000000000007', 'Non', 'boolean'),
  ('b0000001-0001-4000-8000-000000000001', 'c0000001-0001-4000-8000-000000000008', 'Non', 'boolean'),
  ('b0000001-0001-4000-8000-000000000001', 'c0000001-0001-4000-8000-000000000009', 'Non', 'boolean'),
  ('b0000001-0001-4000-8000-000000000001', 'c0000001-0001-4000-8000-000000000010', 'Non', 'boolean'),
  ('b0000001-0001-4000-8000-000000000001', 'c0000001-0001-4000-8000-000000000011', 'Non', 'boolean'),
  ('b0000001-0001-4000-8000-000000000001', 'c0000001-0001-4000-8000-000000000012', 'Non', 'boolean'),
  ('b0000001-0001-4000-8000-000000000001', 'c0000001-0001-4000-8000-000000000013', 'Non', 'boolean'),
  ('b0000001-0001-4000-8000-000000000001', 'c0000001-0001-4000-8000-000000000014', 'Non', 'boolean'),
  ('b0000001-0001-4000-8000-000000000001', 'c0000001-0001-4000-8000-000000000015', 'Standard', 'text')
ON CONFLICT (product_id, feature_id) DO NOTHING;

-- Plus
INSERT INTO public.product_feature_values (product_id, feature_id, value_text, value_type, highlighted) VALUES
  ('b0000001-0001-4000-8000-000000000002', 'c0000001-0001-4000-8000-000000000001', 'Oui', 'boolean', false),
  ('b0000001-0001-4000-8000-000000000002', 'c0000001-0001-4000-8000-000000000002', '1 enrichi', 'text', true),
  ('b0000001-0001-4000-8000-000000000002', 'c0000001-0001-4000-8000-000000000003', 'Oui', 'boolean', false),
  ('b0000001-0001-4000-8000-000000000002', 'c0000001-0001-4000-8000-000000000004', 'Oui', 'boolean', false),
  ('b0000001-0001-4000-8000-000000000002', 'c0000001-0001-4000-8000-000000000005', 'Détaillée', 'text', true),
  ('b0000001-0001-4000-8000-000000000002', 'c0000001-0001-4000-8000-000000000006', 'Illimité', 'text', true),
  ('b0000001-0001-4000-8000-000000000002', 'c0000001-0001-4000-8000-000000000007', 'Oui', 'boolean', true),
  ('b0000001-0001-4000-8000-000000000002', 'c0000001-0001-4000-8000-000000000008', 'Oui', 'boolean', true),
  ('b0000001-0001-4000-8000-000000000002', 'c0000001-0001-4000-8000-000000000009', 'Oui', 'boolean', true),
  ('b0000001-0001-4000-8000-000000000002', 'c0000001-0001-4000-8000-000000000010', 'Oui', 'boolean', true),
  ('b0000001-0001-4000-8000-000000000002', 'c0000001-0001-4000-8000-000000000011', 'Oui', 'boolean', true),
  ('b0000001-0001-4000-8000-000000000002', 'c0000001-0001-4000-8000-000000000012', 'Non', 'boolean', false),
  ('b0000001-0001-4000-8000-000000000002', 'c0000001-0001-4000-8000-000000000013', 'Non', 'boolean', false),
  ('b0000001-0001-4000-8000-000000000002', 'c0000001-0001-4000-8000-000000000014', 'Non', 'boolean', false),
  ('b0000001-0001-4000-8000-000000000002', 'c0000001-0001-4000-8000-000000000015', 'Prioritaire léger', 'text', true)
ON CONFLICT (product_id, feature_id) DO NOTHING;

-- Signature
INSERT INTO public.product_feature_values (product_id, feature_id, value_text, value_type, highlighted) VALUES
  ('b0000001-0001-4000-8000-000000000003', 'c0000001-0001-4000-8000-000000000001', 'Oui', 'boolean', false),
  ('b0000001-0001-4000-8000-000000000003', 'c0000001-0001-4000-8000-000000000002', '1 enrichi', 'text', true),
  ('b0000001-0001-4000-8000-000000000003', 'c0000001-0001-4000-8000-000000000003', 'Oui', 'boolean', false),
  ('b0000001-0001-4000-8000-000000000003', 'c0000001-0001-4000-8000-000000000004', 'Oui', 'boolean', false),
  ('b0000001-0001-4000-8000-000000000003', 'c0000001-0001-4000-8000-000000000005', 'Détaillée', 'text', true),
  ('b0000001-0001-4000-8000-000000000003', 'c0000001-0001-4000-8000-000000000006', 'Illimité prioritaire', 'text', true),
  ('b0000001-0001-4000-8000-000000000003', 'c0000001-0001-4000-8000-000000000007', 'Oui', 'boolean', true),
  ('b0000001-0001-4000-8000-000000000003', 'c0000001-0001-4000-8000-000000000008', 'Oui', 'boolean', true),
  ('b0000001-0001-4000-8000-000000000003', 'c0000001-0001-4000-8000-000000000009', 'Oui', 'boolean', true),
  ('b0000001-0001-4000-8000-000000000003', 'c0000001-0001-4000-8000-000000000010', 'Oui', 'boolean', true),
  ('b0000001-0001-4000-8000-000000000003', 'c0000001-0001-4000-8000-000000000011', 'Oui', 'boolean', true),
  ('b0000001-0001-4000-8000-000000000003', 'c0000001-0001-4000-8000-000000000012', 'Oui', 'boolean', true),
  ('b0000001-0001-4000-8000-000000000003', 'c0000001-0001-4000-8000-000000000013', 'Oui', 'boolean', true),
  ('b0000001-0001-4000-8000-000000000003', 'c0000001-0001-4000-8000-000000000014', 'Oui', 'boolean', true),
  ('b0000001-0001-4000-8000-000000000003', 'c0000001-0001-4000-8000-000000000015', 'Prioritaire premium', 'text', true)
ON CONFLICT (product_id, feature_id) DO NOTHING;
