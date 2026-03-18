
-- QR Sharing System: Intent-based viral growth engine
-- ===================================================

-- 1. QR Intents (config table for all share intents)
CREATE TABLE public.qr_intents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  intent_slug text UNIQUE NOT NULL,
  label_fr text NOT NULL,
  label_en text,
  subtitle_fr text,
  subtitle_en text,
  cta_fr text DEFAULT 'Commencer',
  cta_en text DEFAULT 'Get Started',
  icon_name text DEFAULT 'Sparkles',
  role_target text DEFAULT 'all', -- homeowner, contractor, all
  destination_path text NOT NULL DEFAULT '/signup',
  gradient_class text DEFAULT 'from-primary/15 to-transparent',
  badge_text text,
  copy_variants jsonb DEFAULT '[]'::jsonb,
  is_active boolean DEFAULT true,
  is_restricted boolean DEFAULT false,
  display_order integer DEFAULT 0,
  limit_total integer, -- null = unlimited
  style_preset text DEFAULT 'default', -- default, premium, exclusive
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.qr_intents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active intents" ON public.qr_intents
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage intents" ON public.qr_intents
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 2. QR User Links (unique link per user + intent + variant)
CREATE TABLE public.qr_user_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  intent_slug text NOT NULL,
  variant text DEFAULT 'a',
  short_code text UNIQUE NOT NULL DEFAULT lower(substr(md5(random()::text), 1, 8)),
  destination_url text NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.qr_user_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own links" ON public.qr_user_links
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Users can create own links" ON public.qr_user_links
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can read all links" ON public.qr_user_links
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_qr_user_links_user ON public.qr_user_links(user_id);
CREATE INDEX idx_qr_user_links_short ON public.qr_user_links(short_code);

-- 3. QR Scans (every scan event)
CREATE TABLE public.qr_scans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  link_id uuid REFERENCES public.qr_user_links(id) ON DELETE SET NULL,
  referrer_user_id uuid,
  intent_slug text NOT NULL,
  variant text,
  source text DEFAULT 'qr',
  medium text DEFAULT 'mobile_share',
  user_agent text,
  ip_hash text, -- for unique visitor counting
  session_id text,
  scanned_at timestamptz DEFAULT now()
);

ALTER TABLE public.qr_scans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert scans" ON public.qr_scans
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can read scans for their links" ON public.qr_scans
  FOR SELECT TO authenticated USING (referrer_user_id = auth.uid());

CREATE POLICY "Admins can read all scans" ON public.qr_scans
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_qr_scans_referrer ON public.qr_scans(referrer_user_id);
CREATE INDEX idx_qr_scans_intent ON public.qr_scans(intent_slug);

-- 4. QR Conversions (signup, booking, registration traced back to QR)
CREATE TABLE public.qr_conversions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scan_id uuid REFERENCES public.qr_scans(id) ON DELETE SET NULL,
  referrer_user_id uuid,
  converted_user_id uuid,
  intent_slug text NOT NULL,
  conversion_type text NOT NULL, -- signup, booking, contractor_registration, action_completed
  metadata jsonb DEFAULT '{}'::jsonb,
  converted_at timestamptz DEFAULT now()
);

ALTER TABLE public.qr_conversions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own conversions" ON public.qr_conversions
  FOR SELECT TO authenticated USING (referrer_user_id = auth.uid());

CREATE POLICY "Admins can read all conversions" ON public.qr_conversions
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "System can insert conversions" ON public.qr_conversions
  FOR INSERT WITH CHECK (true);

CREATE INDEX idx_qr_conversions_referrer ON public.qr_conversions(referrer_user_id);

-- 5. Referral Rewards
CREATE TABLE public.referral_rewards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reward_level text NOT NULL, -- starter, coffee, ambassador, visibility_boost, premium_visibility
  reward_type text NOT NULL, -- badge, points, credits, exposure
  label_fr text NOT NULL,
  description_fr text,
  is_claimed boolean DEFAULT false,
  claimed_at timestamptz,
  trigger_count integer NOT NULL, -- invites needed
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.referral_rewards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own rewards" ON public.referral_rewards
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "System can insert rewards" ON public.referral_rewards
  FOR INSERT WITH CHECK (true);

CREATE POLICY "System can update rewards" ON public.referral_rewards
  FOR UPDATE USING (true);

CREATE POLICY "Admins can manage rewards" ON public.referral_rewards
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 6. Ambassador Offers (limited lifetime offers)
CREATE TABLE public.ambassador_offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  intent_slug text NOT NULL DEFAULT 'ambassador-lifetime',
  total_slots integer NOT NULL DEFAULT 50,
  claimed_count integer NOT NULL DEFAULT 0,
  is_active boolean DEFAULT true,
  offer_label_fr text DEFAULT 'Offre Ambassadeur à vie',
  offer_description_fr text,
  benefits_json jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.ambassador_offers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active offers" ON public.ambassador_offers
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage offers" ON public.ambassador_offers
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 7. Ambassador Claims
CREATE TABLE public.ambassador_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id uuid NOT NULL REFERENCES public.ambassador_offers(id),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referrer_user_id uuid,
  intent_slug text NOT NULL DEFAULT 'ambassador-lifetime',
  variant text DEFAULT 'a',
  status text NOT NULL DEFAULT 'pending', -- pending, active, revoked
  claimed_at timestamptz DEFAULT now(),
  activated_at timestamptz,
  UNIQUE(offer_id, user_id)
);

ALTER TABLE public.ambassador_claims ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own claims" ON public.ambassador_claims
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Users can create own claims" ON public.ambassador_claims
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can manage claims" ON public.ambassador_claims
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Seed QR Intents
INSERT INTO public.qr_intents (intent_slug, label_fr, label_en, subtitle_fr, subtitle_en, cta_fr, cta_en, icon_name, role_target, destination_path, gradient_class, badge_text, copy_variants, display_order, style_preset) VALUES
('kitchen-dream', 'Cuisine de rêve', 'Kitchen Dream', 'T''aimerais voir de quoi ta nouvelle cuisine aurait l''air ?', 'Want to see what your new kitchen could look like?', 'Commencer', 'Get Started', 'ChefHat', 'homeowner', '/design?room=kitchen', 'from-violet-500/15 via-fuchsia-500/5 to-transparent', 'Design IA', '["T''aimerais voir de quoi ta nouvelle cuisine aurait l''air ?","Avant de dépenser, vois le résultat.","Upload une photo. Transforme-la avec l''IA."]', 1, 'default'),
('bathroom-dream', 'Salle de bain de rêve', 'Bathroom Dream', 'Curieux de voir ta salle de bain avant les travaux ?', 'Curious about your bathroom before the reno?', 'Commencer', 'Get Started', 'Bath', 'homeowner', '/design?room=bathroom', 'from-cyan-500/15 via-blue-500/5 to-transparent', 'Design IA', '["Curieux de voir ta salle de bain avant les travaux ?","Upload une photo. Transforme-la avec l''IA."]', 2, 'default'),
('find-contractor', 'Trouver un entrepreneur', 'Find a Contractor', 'Plus simple qu''une chasse aux soumissions.', 'Easier than chasing quotes.', 'Chercher', 'Search', 'Search', 'homeowner', '/search', 'from-blue-500/15 via-primary/5 to-transparent', NULL, '["Plus simple qu''une chasse aux soumissions.","Décris ton projet, ajoute des photos, commence ici."]', 3, 'default'),
('emergency-help', 'Urgence', 'Emergency Help', 'Dégât urgent ? Commence ici.', 'Emergency damage? Start here.', 'Obtenir de l''aide', 'Get Help', 'AlertTriangle', 'all', '/emergency', 'from-red-500/15 via-orange-500/5 to-transparent', 'Urgent', '["Dégât urgent ? Commence ici.","Ajoute une photo, décris le problème, parle à Alex."]', 4, 'default'),
('ai-design', 'Design IA', 'AI Design', 'Upload une photo. Transforme-la avec l''IA.', 'Upload a photo. Transform it with AI.', 'Essayer', 'Try it', 'Palette', 'all', '/design', 'from-purple-500/15 via-violet-500/5 to-transparent', 'Design IA', '["Upload une photo. Transforme-la avec l''IA.","Avant de dépenser, vois le résultat."]', 5, 'default'),
('register-business', 'Inscrire son entreprise', 'Register Business', 'Sois visible quand un client sérieux cherche ton service.', 'Be visible when serious clients search.', 'Créer mon profil', 'Create Profile', 'Building2', 'contractor', '/contractor-onboarding', 'from-amber-500/15 via-orange-500/5 to-transparent', 'Pro', '["Tu devrais inscrire ton entreprise.","Reçois des rendez-vous exclusifs.","Prends ta place avant que ton secteur se remplisse."]', 6, 'default'),
('invite-contractor', 'Inviter un entrepreneur', 'Invite a Contractor', 'Tu connais un entrepreneur compétent ?', 'Know a great contractor?', 'Envoyer l''invitation', 'Send Invite', 'UserPlus', 'all', '/contractor-onboarding', 'from-emerald-500/15 via-green-500/5 to-transparent', NULL, '["Tu connais un bon entrepreneur ? Invite-le.","Les meilleurs devraient être visibles ici.","Aide un pro solide à prendre sa place."]', 7, 'default'),
('beta-ambassador', 'Ambassadeur', 'Ambassador', 'Deviens ambassadeur UNPRO et gagne des récompenses.', 'Become an UNPRO ambassador and earn rewards.', 'Rejoindre', 'Join', 'Award', 'all', '/ambassadeurs', 'from-yellow-500/15 via-amber-500/5 to-transparent', 'Ambassadeur', '["Deviens ambassadeur et gagne des récompenses."]', 8, 'default'),
('ambassador-lifetime', 'Offre Ambassadeur à vie', 'Ambassador Lifetime', 'Certains entrepreneurs ne paieront jamais d''abonnement.', 'Some contractors will never pay a subscription.', 'Réserver ma place', 'Reserve My Spot', 'Crown', 'contractor', '/unlock?intent=ambassador-lifetime', 'from-yellow-400/20 via-amber-500/10 to-transparent', 'Limité', '["T''aimerais ça pas avoir à payer de frais mensuels… jamais ?","Certains entrepreneurs ne paieront jamais d''abonnement. Tu fais peut-être partie des 50 prochains.","Il reste des places. Pas pour longtemps.","Je t''envoie ça parce que t''es bon. Regarde ça."]', 9, 'premium');

-- Seed initial ambassador offer
INSERT INTO public.ambassador_offers (intent_slug, total_slots, claimed_count, is_active, offer_label_fr, offer_description_fr, benefits_json) VALUES
('ambassador-lifetime', 50, 0, true, 'Offre Ambassadeur à vie', 'Accès à vie sans frais mensuels pour les 50 premiers entrepreneurs invités.', '[{"icon":"Shield","label_fr":"Aucun frais mensuel — à vie"},{"icon":"Star","label_fr":"Badge Ambassadeur vérifié"},{"icon":"Zap","label_fr":"Priorité dans les résultats"},{"icon":"TrendingUp","label_fr":"Visibilité premium garantie"}]');
