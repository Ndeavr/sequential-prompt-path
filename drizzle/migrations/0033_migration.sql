ALTER TABLE public.portfolios ADD COLUMN IF NOT EXISTS total_doors integer CHECK (total_doors IS NULL OR total_doors BETWEEN 2 AND 9999);
ALTER TABLE public.portfolio_properties ADD COLUMN IF NOT EXISTS door_count integer CHECK (door_count IS NULL OR door_count >= 1);

CREATE TABLE public.portfolio_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  portfolio_id uuid NOT NULL UNIQUE REFERENCES public.portfolios(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  doors integer NOT NULL,
  price_id text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','active','past_due','failed','cancelled')),
  stripe_customer_id text,
  stripe_subscription_id text UNIQUE,
  stripe_checkout_session_id text,
  last_event_id text,
  current_period_end timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.portfolio_subscriptions TO authenticated;
GRANT ALL ON public.portfolio_subscriptions TO service_role;
ALTER TABLE public.portfolio_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner reads own portfolio subscription" ON public.portfolio_subscriptions
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE INDEX portfolio_subscriptions_user_idx ON public.portfolio_subscriptions(user_id);

CREATE TABLE public.portfolio_subscription_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  portfolio_id uuid,
  stripe_event_id text UNIQUE,
  event_type text NOT NULL,
  detail jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.portfolio_subscription_events TO service_role;
ALTER TABLE public.portfolio_subscription_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read portfolio subscription events" ON public.portfolio_subscription_events
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
GRANT SELECT ON public.portfolio_subscription_events TO authenticated;

CREATE OR REPLACE FUNCTION public.portfolio_doors_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cap integer; used integer;
BEGIN
  IF TG_TABLE_NAME = 'portfolios' THEN
    IF NEW.total_doors IS DISTINCT FROM OLD.total_doors AND EXISTS (
      SELECT 1 FROM portfolio_subscriptions s WHERE s.portfolio_id = NEW.id AND s.status IN ('active','past_due')) THEN
      RAISE EXCEPTION 'Le nombre de portes est fixé par l''abonnement en cours.';
    END IF;
    RETURN NEW;
  END IF;
  SELECT COALESCE((SELECT s.doors FROM portfolio_subscriptions s WHERE s.portfolio_id = NEW.portfolio_id AND s.status IN ('active','past_due')),
                  (SELECT p.total_doors FROM portfolios p WHERE p.id = NEW.portfolio_id)) INTO cap;
  SELECT COALESCE(SUM(door_count),0) INTO used FROM portfolio_properties
   WHERE portfolio_id = NEW.portfolio_id AND id <> NEW.id;
  IF cap IS NOT NULL AND used + COALESCE(NEW.door_count,0) > cap THEN
    RAISE EXCEPTION 'La somme des portes dépasse la capacité du portefeuille (%).', cap;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER portfolios_doors_guard BEFORE UPDATE ON public.portfolios FOR EACH ROW EXECUTE FUNCTION public.portfolio_doors_guard();
CREATE TRIGGER portfolio_properties_doors_guard BEFORE INSERT OR UPDATE ON public.portfolio_properties FOR EACH ROW EXECUTE FUNCTION public.portfolio_doors_guard();