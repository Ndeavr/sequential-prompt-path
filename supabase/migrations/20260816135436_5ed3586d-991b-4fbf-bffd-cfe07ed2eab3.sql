-- 1. plans: legacy lifecycle
ALTER TABLE public.plans
  ADD COLUMN IF NOT EXISTS legacy boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS superseded_by text,
  ADD COLUMN IF NOT EXISTS appointment_model text NOT NULL DEFAULT 'included',
  ADD COLUMN IF NOT EXISTS territory_scope text;

-- 2. market_capacity: operational service x territory entity
ALTER TABLE public.market_capacity
  ADD COLUMN IF NOT EXISTS city_slug text,
  ADD COLUMN IF NOT EXISTS service_slug text,
  ADD COLUMN IF NOT EXISTS estimated_monthly_demand integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS committed_appointments integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS delivered_appointments_30d integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS active_contractors integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS max_contractors integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS remaining_positions integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS capacity_score numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS capacity_status text NOT NULL DEFAULT 'BALANCED',
  ADD COLUMN IF NOT EXISTS capacity_explanation jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS market_open boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();

UPDATE public.market_capacity
   SET city_slug = COALESCE(city_slug, lower(regexp_replace(city, '[^a-zA-Z0-9]+', '-', 'g'))),
       service_slug = COALESCE(service_slug, lower(regexp_replace(specialty, '[^a-zA-Z0-9]+', '-', 'g')))
 WHERE city_slug IS NULL OR service_slug IS NULL;

ALTER TABLE public.market_capacity
  ADD CONSTRAINT market_capacity_status_chk
  CHECK (capacity_status IN ('UNDER_SUPPLIED','BALANCED','OVER_SUPPLIED','CLOSED')) NOT VALID;

CREATE UNIQUE INDEX IF NOT EXISTS market_capacity_service_city_uidx
  ON public.market_capacity (service_slug, city_slug);
CREATE INDEX IF NOT EXISTS market_capacity_status_idx
  ON public.market_capacity (capacity_status, remaining_positions);

GRANT SELECT ON public.market_capacity TO authenticated;
GRANT ALL ON public.market_capacity TO service_role;
ALTER TABLE public.market_capacity ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "market_capacity_read_authenticated" ON public.market_capacity;
CREATE POLICY "market_capacity_read_authenticated" ON public.market_capacity
  FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "market_capacity_admin_write" ON public.market_capacity;
CREATE POLICY "market_capacity_admin_write" ON public.market_capacity
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- 3. appointment value configuration status + audit fields
ALTER TABLE public.appointment_values
  ADD COLUMN IF NOT EXISTS value_status text NOT NULL DEFAULT 'configured',
  ADD COLUMN IF NOT EXISTS override_reason text,
  ADD COLUMN IF NOT EXISTS overridden_by uuid,
  ADD COLUMN IF NOT EXISTS overridden_at timestamptz,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE public.appointment_values
  ADD CONSTRAINT appointment_values_status_chk
  CHECK (value_status IN ('configured','inferred','calculated','overridden')) NOT VALID;

-- 4. unified pricing audit log
CREATE TABLE IF NOT EXISTS public.pricing_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  actor_id uuid,
  actor_role text,
  contractor_id uuid,
  quote_id uuid,
  service_slug text,
  city_slug text,
  previous_state jsonb NOT NULL DEFAULT '{}'::jsonb,
  new_state jsonb NOT NULL DEFAULT '{}'::jsonb,
  reason text,
  calculation_version text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS pricing_audit_log_event_idx ON public.pricing_audit_log (event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS pricing_audit_log_contractor_idx ON public.pricing_audit_log (contractor_id, created_at DESC);
GRANT SELECT ON public.pricing_audit_log TO authenticated;
GRANT ALL ON public.pricing_audit_log TO service_role;
ALTER TABLE public.pricing_audit_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "pricing_audit_admin_read" ON public.pricing_audit_log;
CREATE POLICY "pricing_audit_admin_read" ON public.pricing_audit_log
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 5. contractor activation goals captured by Alex (extend if exists)
CREATE TABLE IF NOT EXISTS public.contractor_activation_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id uuid,
  user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.contractor_activation_goals
  ADD COLUMN IF NOT EXISTS services text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS cities text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS monthly_capacity integer,
  ADD COLUMN IF NOT EXISTS average_project_value integer,
  ADD COLUMN IF NOT EXISTS priority text,
  ADD COLUMN IF NOT EXISTS wants_exclusivity boolean,
  ADD COLUMN IF NOT EXISTS answered_keys text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS completed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS quote_id uuid;

GRANT SELECT, INSERT, UPDATE ON public.contractor_activation_goals TO authenticated;
GRANT ALL ON public.contractor_activation_goals TO service_role;
ALTER TABLE public.contractor_activation_goals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "goals_owner_rw" ON public.contractor_activation_goals;
CREATE POLICY "goals_owner_rw" ON public.contractor_activation_goals
  FOR ALL TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role));

-- 6. quote snapshot fields for reproducible, server-authoritative pricing
ALTER TABLE public.contractor_pricing_quotes
  ADD COLUMN IF NOT EXISTS capacity_availability jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS exclusivity_availability jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS pricing_explanation jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS calculation_version text,
  ADD COLUMN IF NOT EXISTS extra_appointment_price integer,
  ADD COLUMN IF NOT EXISTS accepted_at timestamptz,
  ADD COLUMN IF NOT EXISTS expires_at timestamptz;