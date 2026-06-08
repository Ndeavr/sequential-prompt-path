
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;

-- contractor_growth_campaigns
CREATE TABLE public.contractor_growth_campaigns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contractor_id UUID NOT NULL,
  trade TEXT,
  city TEXT,
  status TEXT NOT NULL DEFAULT 'queued',
  targets_found INTEGER NOT NULL DEFAULT 0,
  emails_sent INTEGER NOT NULL DEFAULT 0,
  sms_sent INTEGER NOT NULL DEFAULT 0,
  replies INTEGER NOT NULL DEFAULT 0,
  appointments INTEGER NOT NULL DEFAULT 0,
  activations INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT growth_campaigns_status_chk CHECK (status IN ('queued','running','waiting_review','approved','sent','replied','booked','activated','failed'))
);
CREATE INDEX idx_growth_campaigns_contractor ON public.contractor_growth_campaigns(contractor_id);
CREATE INDEX idx_growth_campaigns_status ON public.contractor_growth_campaigns(status);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contractor_growth_campaigns TO authenticated;
GRANT ALL ON public.contractor_growth_campaigns TO service_role;
ALTER TABLE public.contractor_growth_campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage growth campaigns" ON public.contractor_growth_campaigns FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Contractors read own growth campaigns" ON public.contractor_growth_campaigns FOR SELECT TO authenticated
USING (contractor_id IN (SELECT id FROM public.contractors WHERE user_id = auth.uid()));
CREATE TRIGGER trg_growth_campaigns_updated_at BEFORE UPDATE ON public.contractor_growth_campaigns
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- contractor_competitors
CREATE TABLE public.contractor_competitors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contractor_id UUID NOT NULL,
  competitor_name TEXT NOT NULL,
  trade TEXT,
  city TEXT,
  website TEXT,
  phone TEXT,
  email TEXT,
  google_rating NUMERIC(3,2),
  review_count INTEGER,
  aipp_score INTEGER,
  status TEXT NOT NULL DEFAULT 'queued',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT competitors_status_chk CHECK (status IN ('queued','running','waiting_review','approved','sent','replied','booked','activated','failed'))
);
CREATE INDEX idx_competitors_contractor ON public.contractor_competitors(contractor_id);
CREATE INDEX idx_competitors_status ON public.contractor_competitors(status);
CREATE INDEX idx_competitors_city_trade ON public.contractor_competitors(city, trade);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contractor_competitors TO authenticated;
GRANT ALL ON public.contractor_competitors TO service_role;
ALTER TABLE public.contractor_competitors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage competitors" ON public.contractor_competitors FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Contractors read own competitors" ON public.contractor_competitors FOR SELECT TO authenticated
USING (contractor_id IN (SELECT id FROM public.contractors WHERE user_id = auth.uid()));

-- homeowner_intents
CREATE TABLE public.homeowner_intents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  city TEXT,
  problem TEXT,
  service TEXT,
  source TEXT,
  intent_score INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'queued',
  recommended_contractor_id UUID,
  user_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT intent_score_range_chk CHECK (intent_score BETWEEN 0 AND 100),
  CONSTRAINT homeowner_intents_status_chk CHECK (status IN ('queued','running','waiting_review','approved','sent','replied','booked','activated','failed'))
);
CREATE INDEX idx_intents_score ON public.homeowner_intents(intent_score DESC);
CREATE INDEX idx_intents_city_service ON public.homeowner_intents(city, service);
CREATE INDEX idx_intents_user ON public.homeowner_intents(user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.homeowner_intents TO authenticated;
GRANT ALL ON public.homeowner_intents TO service_role;
ALTER TABLE public.homeowner_intents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage homeowner intents" ON public.homeowner_intents FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users read own intents" ON public.homeowner_intents FOR SELECT TO authenticated
USING (user_id = auth.uid());

-- growth_tasks
CREATE TABLE public.growth_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL,
  priority INTEGER NOT NULL DEFAULT 50,
  status TEXT NOT NULL DEFAULT 'queued',
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  attempts INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT growth_tasks_status_chk CHECK (status IN ('queued','running','waiting_review','approved','sent','replied','booked','activated','failed'))
);
CREATE INDEX idx_growth_tasks_status_priority ON public.growth_tasks(status, priority DESC, created_at);
CREATE INDEX idx_growth_tasks_type ON public.growth_tasks(type);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.growth_tasks TO authenticated;
GRANT ALL ON public.growth_tasks TO service_role;
ALTER TABLE public.growth_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage growth tasks" ON public.growth_tasks FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_growth_tasks_updated_at BEFORE UPDATE ON public.growth_tasks
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger: contractor account_status becomes 'active' → queue expansion
CREATE OR REPLACE FUNCTION public.queue_expansion_on_activation()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.account_status = 'active' AND (OLD.account_status IS DISTINCT FROM 'active') THEN
    INSERT INTO public.growth_tasks (type, priority, status, payload)
    VALUES ('expansion', 80, 'queued',
      jsonb_build_object('contractor_id', NEW.id, 'trade', NEW.specialty, 'city', NEW.city));
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_contractor_activation_expansion ON public.contractors;
CREATE TRIGGER trg_contractor_activation_expansion
AFTER UPDATE OF account_status ON public.contractors
FOR EACH ROW EXECUTE FUNCTION public.queue_expansion_on_activation();

-- EAG north-star view
CREATE OR REPLACE VIEW public.v_contractor_eag_monthly
WITH (security_invoker = true) AS
SELECT c.id AS contractor_id, c.business_name,
       date_trunc('month', a.created_at) AS month,
       COUNT(a.id) AS exclusive_appointments
FROM public.contractors c
LEFT JOIN public.appointments a ON a.contractor_id = c.id
  AND a.created_at >= date_trunc('month', now()) - interval '12 months'
WHERE c.account_status = 'active'
GROUP BY c.id, c.business_name, date_trunc('month', a.created_at);

GRANT SELECT ON public.v_contractor_eag_monthly TO authenticated, service_role;
