
-- Solicitation Engine: queue, variants, stats, first wins

CREATE TABLE IF NOT EXISTS public.solicitation_message_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  template text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  weight numeric NOT NULL DEFAULT 1.0,
  sent_count integer NOT NULL DEFAULT 0,
  clicked_count integer NOT NULL DEFAULT 0,
  activated_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.solicitation_message_variants TO authenticated;
GRANT ALL ON public.solicitation_message_variants TO service_role;
ALTER TABLE public.solicitation_message_variants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins_read_variants" ON public.solicitation_message_variants
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE IF NOT EXISTS public.contractor_outreach_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id uuid,
  company_name text NOT NULL,
  city text,
  category text,
  phone text NOT NULL,
  email text,
  website text,
  reviews_count integer DEFAULT 0,
  score numeric DEFAULT 0,
  status text NOT NULL DEFAULT 'queued',
  message_variant text,
  tracking_slug text UNIQUE,
  sent_at timestamptz,
  delivered_at timestamptz,
  clicked_at timestamptz,
  registered_at timestamptz,
  payment_started_at timestamptz,
  activated_at timestamptz,
  recovery_sent_at timestamptz,
  last_error text,
  attempts integer NOT NULL DEFAULT 0,
  next_retry_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.contractor_outreach_queue TO authenticated;
GRANT ALL ON public.contractor_outreach_queue TO service_role;
ALTER TABLE public.contractor_outreach_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins_read_queue" ON public.contractor_outreach_queue
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS idx_outreach_queue_status ON public.contractor_outreach_queue(status);
CREATE INDEX IF NOT EXISTS idx_outreach_queue_next_retry ON public.contractor_outreach_queue(next_retry_at) WHERE next_retry_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_outreach_queue_slug ON public.contractor_outreach_queue(tracking_slug);
CREATE INDEX IF NOT EXISTS idx_outreach_queue_phone ON public.contractor_outreach_queue(phone);
CREATE UNIQUE INDEX IF NOT EXISTS uq_outreach_queue_active_phone
  ON public.contractor_outreach_queue(phone)
  WHERE status IN ('queued','sms_sent','clicked','registered','payment_started');

CREATE TABLE IF NOT EXISTS public.solicitation_daily_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stat_date date NOT NULL,
  variant text,
  category text,
  city text,
  sent integer NOT NULL DEFAULT 0,
  clicked integer NOT NULL DEFAULT 0,
  registered integer NOT NULL DEFAULT 0,
  activated integer NOT NULL DEFAULT 0,
  revenue_cents integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.solicitation_daily_stats TO authenticated;
GRANT ALL ON public.solicitation_daily_stats TO service_role;
ALTER TABLE public.solicitation_daily_stats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins_read_stats" ON public.solicitation_daily_stats
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE INDEX IF NOT EXISTS idx_solicit_stats_date ON public.solicitation_daily_stats(stat_date);

CREATE TABLE IF NOT EXISTS public.solicitation_first_wins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  queue_id uuid REFERENCES public.contractor_outreach_queue(id) ON DELETE SET NULL,
  category text,
  city text,
  company_name text,
  message_variant text,
  time_to_click_seconds integer,
  time_to_register_seconds integer,
  time_to_pay_seconds integer,
  revenue_cents integer,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.solicitation_first_wins TO authenticated;
GRANT ALL ON public.solicitation_first_wins TO service_role;
ALTER TABLE public.solicitation_first_wins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins_read_wins" ON public.solicitation_first_wins
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$
LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS trg_outreach_queue_updated ON public.contractor_outreach_queue;
CREATE TRIGGER trg_outreach_queue_updated
  BEFORE UPDATE ON public.contractor_outreach_queue
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_variants_updated ON public.solicitation_message_variants;
CREATE TRIGGER trg_variants_updated
  BEFORE UPDATE ON public.solicitation_message_variants
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed the 5 message variants
INSERT INTO public.solicitation_message_variants (code, name, template) VALUES
  ('A', 'Demand', 'Bonjour {{company}}. Nous évaluons actuellement les entrepreneurs {{category}} dans {{city}}. Votre entreprise pourrait-elle être recommandée aux propriétaires? Activation 7 jours: 1$ {{link}}'),
  ('B', 'Curiosity', 'Question rapide. Si un propriétaire demandait aujourd''hui: "Quel entrepreneur {{category}} recommandez-vous à {{city}}?" Votre entreprise apparaîtrait-elle? Vérifiez: {{link}}'),
  ('C', 'Authority', 'UNPRO analyse actuellement les entrepreneurs {{category}} dans votre secteur. Certaines entreprises seront recommandées aux propriétaires. Activation entrepreneur: 1$ {{link}}'),
  ('D', 'Opportunity', 'Bonjour. Nous recherchons quelques entrepreneurs {{category}} pour compléter notre réseau dans {{city}}. Voir si votre entreprise est admissible: {{link}}'),
  ('E', 'Direct Revenue', 'Moins de soumissions perdues. Plus de rendez-vous qualifiés. Activation entrepreneur 7 jours: 1$. {{link}}')
ON CONFLICT (code) DO NOTHING;
