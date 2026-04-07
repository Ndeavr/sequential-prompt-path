
-- Founder Plans
CREATE TABLE public.founder_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  price integer NOT NULL, -- in cents CAD
  value_total integer NOT NULL, -- in cents CAD
  duration_years integer NOT NULL DEFAULT 10,
  max_spots integer NOT NULL DEFAULT 30,
  spots_remaining integer NOT NULL DEFAULT 30,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'sold_out', 'closed')),
  features jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.founder_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view founder plans"
  ON public.founder_plans FOR SELECT
  USING (true);

CREATE POLICY "Only admins can modify founder plans"
  ON public.founder_plans FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Founder Spots
CREATE TABLE public.founder_spots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES public.founder_plans(id) ON DELETE CASCADE,
  reserved_by_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'reserved', 'sold')),
  reserved_until timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.founder_spots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view founder spots"
  ON public.founder_spots FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can reserve spots"
  ON public.founder_spots FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Founder Purchases
CREATE TABLE public.founder_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id uuid NOT NULL REFERENCES public.founder_plans(id),
  spot_id uuid REFERENCES public.founder_spots(id),
  amount_paid integer NOT NULL, -- in cents CAD
  payment_status text NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'completed', 'failed', 'refunded')),
  stripe_session_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.founder_purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own purchases"
  ON public.founder_purchases FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "System can create purchases"
  ON public.founder_purchases FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Territories Locked
CREATE TABLE public.territories_locked (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  city text NOT NULL,
  category text NOT NULL,
  plan_level text NOT NULL,
  exclusivity boolean NOT NULL DEFAULT false,
  purchase_id uuid REFERENCES public.founder_purchases(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(city, category, plan_level)
);

ALTER TABLE public.territories_locked ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own territory locks"
  ON public.territories_locked FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "System can create territory locks"
  ON public.territories_locked FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Function to decrement spots on purchase
CREATE OR REPLACE FUNCTION public.decrement_founder_spot()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.status = 'sold' AND (OLD.status IS DISTINCT FROM 'sold') THEN
    UPDATE public.founder_plans
    SET spots_remaining = GREATEST(0, spots_remaining - 1),
        status = CASE WHEN spots_remaining <= 1 THEN 'sold_out' ELSE status END,
        updated_at = now()
    WHERE id = NEW.plan_id;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE TRIGGER trg_decrement_founder_spot
  AFTER UPDATE ON public.founder_spots
  FOR EACH ROW
  EXECUTE FUNCTION public.decrement_founder_spot();

-- Enable realtime on founder_plans
ALTER PUBLICATION supabase_realtime ADD TABLE public.founder_plans;

-- Updated at triggers
CREATE TRIGGER set_founder_plans_updated_at
  BEFORE UPDATE ON public.founder_plans
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_founder_spots_updated_at
  BEFORE UPDATE ON public.founder_spots
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_founder_purchases_updated_at
  BEFORE UPDATE ON public.founder_purchases
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_territories_locked_updated_at
  BEFORE UPDATE ON public.territories_locked
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
