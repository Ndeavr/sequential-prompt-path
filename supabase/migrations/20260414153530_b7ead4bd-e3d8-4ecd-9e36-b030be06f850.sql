
-- Table: contractor_plan_sessions
CREATE TABLE public.contractor_plan_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contractor_id UUID,
  prospect_id UUID REFERENCES public.contractors_prospects(id) ON DELETE SET NULL,
  city TEXT,
  domain TEXT,
  monthly_revenue_goal NUMERIC,
  monthly_capacity INTEGER,
  average_job_value NUMERIC,
  close_rate NUMERIC,
  growth_intent TEXT,
  biggest_pain TEXT,
  recommended_plan_id UUID REFERENCES public.plan_catalog(id) ON DELETE SET NULL,
  recommended_founders BOOLEAN DEFAULT false,
  plan_fit_score NUMERIC DEFAULT 0,
  founders_fit_score NUMERIC DEFAULT 0,
  session_status TEXT NOT NULL DEFAULT 'started',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.contractor_plan_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access contractor_plan_sessions"
  ON public.contractor_plan_sessions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Anon insert contractor_plan_sessions"
  ON public.contractor_plan_sessions FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Auth users can manage own sessions"
  ON public.contractor_plan_sessions FOR ALL TO authenticated
  USING (contractor_id = auth.uid()) WITH CHECK (contractor_id = auth.uid());

-- Table: contractor_plan_events
CREATE TABLE public.contractor_plan_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contractor_plan_session_id UUID NOT NULL REFERENCES public.contractor_plan_sessions(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  event_payload_json JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.contractor_plan_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access contractor_plan_events"
  ON public.contractor_plan_events FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Anon insert contractor_plan_events"
  ON public.contractor_plan_events FOR INSERT TO anon WITH CHECK (true);

-- Table: lead_packs
CREATE TABLE public.lead_packs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pack_name TEXT NOT NULL,
  pack_quantity INTEGER NOT NULL,
  pack_price NUMERIC NOT NULL,
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0
);

ALTER TABLE public.lead_packs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read lead_packs"
  ON public.lead_packs FOR SELECT USING (true);

CREATE POLICY "Admin manages lead_packs"
  ON public.lead_packs FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Seed lead packs
INSERT INTO public.lead_packs (pack_name, pack_quantity, pack_price, display_order) VALUES
  ('5 leads', 5, 149, 1),
  ('10 leads', 10, 269, 2),
  ('15 leads', 15, 379, 3),
  ('20 leads', 20, 469, 4);

-- Table: contractor_checkouts
CREATE TABLE public.contractor_checkouts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contractor_id UUID,
  contractor_plan_session_id UUID REFERENCES public.contractor_plan_sessions(id) ON DELETE SET NULL,
  pricing_plan_id UUID REFERENCES public.plan_catalog(id) ON DELETE SET NULL,
  selected_variant TEXT DEFAULT 'regular',
  lead_pack_id UUID REFERENCES public.lead_packs(id) ON DELETE SET NULL,
  stripe_checkout_reference TEXT,
  payment_status TEXT NOT NULL DEFAULT 'pending',
  amount_subtotal NUMERIC DEFAULT 0,
  amount_tax NUMERIC DEFAULT 0,
  amount_total NUMERIC DEFAULT 0,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.contractor_checkouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access contractor_checkouts"
  ON public.contractor_checkouts FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Auth users own checkouts"
  ON public.contractor_checkouts FOR ALL TO authenticated
  USING (contractor_id = auth.uid()) WITH CHECK (contractor_id = auth.uid());

-- Table: sales_voice_prompts
CREATE TABLE public.sales_voice_prompts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  prompt_key TEXT NOT NULL,
  language_code TEXT NOT NULL DEFAULT 'fr',
  content TEXT NOT NULL,
  version INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.sales_voice_prompts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access sales_voice_prompts"
  ON public.sales_voice_prompts FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Seed pain-point sales prompts (French)
INSERT INTO public.sales_voice_prompts (prompt_key, language_code, content) VALUES
  ('pain_shared_leads', 'fr', 'Vous aimez ça, recevoir des leads partagés avec 3-4 autres entrepreneurs? Moi non plus. Chez UNPRO, chaque rendez-vous est exclusif à vous.'),
  ('pain_wasted_quotes', 'fr', 'Êtes-vous tanné de faire des soumissions pour rien? De vous déplacer pour un client qui a déjà choisi quelqu''un d''autre?'),
  ('pain_ai_visibility', 'fr', 'Avez-vous déjà cherché votre entreprise sur ChatGPT ou Gemini? Essayez. Vous allez voir que vos concurrents avec plus de budget sont recommandés avant vous.'),
  ('pain_competitor_budget', 'fr', 'C''est le temps de prendre de l''avance sur vos concurrents qui ont des budgets publicitaires bien plus gros que le vôtre. UNPRO nivelle le terrain.'),
  ('qualify_close_rate', 'fr', 'Sur 10 soumissions que vous faites, combien vous en fermez en contrat? Ça va m''aider à calculer exactement combien de rendez-vous vous avez besoin.'),
  ('qualify_biggest_pain', 'fr', 'Qu''est-ce qui vous frustre le plus en ce moment dans votre acquisition de clients?'),
  ('recommend_plan', 'fr', 'Basé sur vos objectifs, je vous recommande le plan {{plan_name}}. Vous recevez {{appointments}} rendez-vous qualifiés par mois, et chaque client a confirmé son besoin avant de vous rencontrer.'),
  ('upsell_founders', 'fr', 'J''ai une offre spéciale pour vous. Le programme Fondateurs vous donne un prix gelé à vie, plus un bonus de {{bonus}}. C''est limité aux premiers entrepreneurs par ville.');
