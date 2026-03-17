-- Dynamic Pricing Engine for Exclusive Appointments

-- Pricing rules / multiplier configuration (admin-controlled)
CREATE TABLE public.appointment_pricing_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_key text NOT NULL UNIQUE,
  rule_category text NOT NULL,
  label_fr text NOT NULL,
  description_fr text,
  base_value numeric(6,3) NOT NULL DEFAULT 1.0,
  min_value numeric(6,3) NOT NULL DEFAULT 0.5,
  max_value numeric(6,3) NOT NULL DEFAULT 3.0,
  is_active boolean NOT NULL DEFAULT true,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Insert default multiplier rules
INSERT INTO public.appointment_pricing_rules (rule_key, rule_category, label_fr, description_fr, base_value, min_value, max_value) VALUES
  ('demand_level', 'market', 'Niveau de demande', 'Demande dans la ville et le métier', 1.0, 0.7, 2.0),
  ('competition_level', 'market', 'Niveau de compétition', 'Nombre d''entrepreneurs disponibles', 1.0, 0.8, 1.5),
  ('urgency', 'project', 'Urgence', 'Niveau d''urgence du projet', 1.0, 0.9, 2.0),
  ('project_value', 'project', 'Valeur du projet', 'Estimation de la valeur totale', 1.0, 0.5, 3.0),
  ('matching_precision', 'quality', 'Précision du matching', 'Score de correspondance entrepreneur-projet', 1.0, 0.6, 1.8),
  ('complexity', 'project', 'Complexité', 'Complexité technique du projet', 1.0, 0.8, 2.0),
  ('contractor_availability', 'market', 'Disponibilité entrepreneurs', 'Ratio offre/demande actuel', 1.0, 0.7, 1.5);

-- Price calculations log (every appointment gets a price record)
CREATE TABLE public.appointment_price_calculations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid REFERENCES public.appointments(id) ON DELETE SET NULL,
  contractor_id uuid NOT NULL REFERENCES public.contractors(id) ON DELETE CASCADE,
  project_request_id uuid,
  
  -- Base price from plan tier (in cents)
  plan_tier text NOT NULL,
  base_price_cents integer NOT NULL,
  
  -- Individual multipliers applied
  demand_multiplier numeric(5,3) NOT NULL DEFAULT 1.0,
  competition_multiplier numeric(5,3) NOT NULL DEFAULT 1.0,
  urgency_multiplier numeric(5,3) NOT NULL DEFAULT 1.0,
  project_value_multiplier numeric(5,3) NOT NULL DEFAULT 1.0,
  precision_multiplier numeric(5,3) NOT NULL DEFAULT 1.0,
  complexity_multiplier numeric(5,3) NOT NULL DEFAULT 1.0,
  availability_multiplier numeric(5,3) NOT NULL DEFAULT 1.0,
  
  -- Computed result
  combined_multiplier numeric(6,3) NOT NULL DEFAULT 1.0,
  final_price_cents integer NOT NULL,
  price_floor_cents integer NOT NULL DEFAULT 500,
  price_ceiling_cents integer NOT NULL DEFAULT 100000,
  
  -- Context
  estimated_project_value_cents integer,
  match_quality_score numeric(5,2),
  city_slug text,
  trade_slug text,
  urgency_level text,
  complexity_level text,
  
  -- Surge
  is_surge boolean NOT NULL DEFAULT false,
  surge_reason text,
  
  -- Admin override
  admin_override boolean NOT NULL DEFAULT false,
  admin_override_price_cents integer,
  admin_override_by uuid,
  admin_override_reason text,
  
  -- Justification for contractor UI
  price_justification_json jsonb DEFAULT '[]',
  
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_price_calc_contractor ON public.appointment_price_calculations(contractor_id);
CREATE INDEX idx_price_calc_appointment ON public.appointment_price_calculations(appointment_id);

-- Credits for misrouted/invalid appointments
CREATE TABLE public.appointment_credits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id uuid NOT NULL REFERENCES public.contractors(id) ON DELETE CASCADE,
  appointment_id uuid REFERENCES public.appointments(id) ON DELETE SET NULL,
  price_calculation_id uuid REFERENCES public.appointment_price_calculations(id) ON DELETE SET NULL,
  
  credit_amount_cents integer NOT NULL,
  credit_reason text NOT NULL,
  credit_status text NOT NULL DEFAULT 'pending',
  
  requested_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  reviewed_by uuid,
  review_notes text,
  
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_credits_contractor ON public.appointment_credits(contractor_id);

-- Surge tracking
CREATE TABLE public.appointment_surge_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  city_slug text NOT NULL,
  trade_slug text NOT NULL,
  surge_multiplier numeric(5,3) NOT NULL DEFAULT 1.0,
  demand_count integer NOT NULL DEFAULT 0,
  supply_count integer NOT NULL DEFAULT 0,
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_surge_active ON public.appointment_surge_events(city_slug, trade_slug, is_active) WHERE is_active = true;

-- RLS
ALTER TABLE public.appointment_pricing_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointment_price_calculations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointment_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointment_surge_events ENABLE ROW LEVEL SECURITY;

-- Pricing rules: admin only write, authenticated read
CREATE POLICY "Anyone can read pricing rules"
  ON public.appointment_pricing_rules FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins manage pricing rules"
  ON public.appointment_pricing_rules FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Price calculations: contractor reads own, admin reads all
CREATE POLICY "Contractors read own price calculations"
  ON public.appointment_price_calculations FOR SELECT TO authenticated
  USING (
    contractor_id IN (SELECT id FROM public.contractors WHERE user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Admins manage price calculations"
  ON public.appointment_price_calculations FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Credits: contractor reads own, admin manages
CREATE POLICY "Contractors read own credits"
  ON public.appointment_credits FOR SELECT TO authenticated
  USING (
    contractor_id IN (SELECT id FROM public.contractors WHERE user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Contractors can request credits"
  ON public.appointment_credits FOR INSERT TO authenticated
  WITH CHECK (
    contractor_id IN (SELECT id FROM public.contractors WHERE user_id = auth.uid())
  );

CREATE POLICY "Admins manage credits"
  ON public.appointment_credits FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Surge events: public read, admin write
CREATE POLICY "Anyone can read surge events"
  ON public.appointment_surge_events FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins manage surge events"
  ON public.appointment_surge_events FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));