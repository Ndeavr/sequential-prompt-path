-- Growth calculator settings (admin-editable, single active row)
CREATE TABLE IF NOT EXISTS public.pricing_growth_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  active boolean NOT NULL DEFAULT true,
  profile_fee_cents integer NOT NULL DEFAULT 35000,
  annual_months_charged numeric NOT NULL DEFAULT 10,
  guaranteed_appointments_cap integer NOT NULL DEFAULT 5,
  entry_pack_total_cents integer NOT NULL DEFAULT 35000,
  entry_pack_duration_months integer NOT NULL DEFAULT 6,
  default_close_rate numeric NOT NULL DEFAULT 0.30,
  notes text,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.pricing_growth_settings TO anon;
GRANT SELECT ON public.pricing_growth_settings TO authenticated;
GRANT ALL ON public.pricing_growth_settings TO service_role;
ALTER TABLE public.pricing_growth_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "growth_settings_public_read" ON public.pricing_growth_settings
  FOR SELECT USING (true);
CREATE POLICY "growth_settings_admin_write" ON public.pricing_growth_settings
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.pricing_growth_settings (profile_fee_cents, annual_months_charged, notes)
SELECT 35000, 10, 'Frais de création et optimisation du profil 350 $. Annuel = 2 mois offerts.'
WHERE NOT EXISTS (SELECT 1 FROM public.pricing_growth_settings);

-- Territory / trade pricing overrides
CREATE TABLE IF NOT EXISTS public.pricing_territory_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_slug text NOT NULL,
  city_slug text NOT NULL,
  price_multiplier numeric NOT NULL DEFAULT 1.0,
  min_monthly_cents integer,
  max_guaranteed_appointments integer,
  manually_validated boolean NOT NULL DEFAULT false,
  validated_by uuid,
  validated_at timestamptz,
  notes text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (service_slug, city_slug)
);

GRANT SELECT ON public.pricing_territory_overrides TO authenticated;
GRANT ALL ON public.pricing_territory_overrides TO service_role;
ALTER TABLE public.pricing_territory_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "territory_overrides_admin_all" ON public.pricing_territory_overrides
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS idx_territory_overrides_lookup
  ON public.pricing_territory_overrides (service_slug, city_slug) WHERE active;

-- Growth inputs persisted on quotes
ALTER TABLE public.contractor_pricing_quotes
  ADD COLUMN IF NOT EXISTS annual_revenue bigint,
  ADD COLUMN IF NOT EXISTS gross_margin_percent numeric,
  ADD COLUMN IF NOT EXISTS growth_mode text,
  ADD COLUMN IF NOT EXISTS growth_value numeric,
  ADD COLUMN IF NOT EXISTS growth_amount bigint,
  ADD COLUMN IF NOT EXISTS profile_fee_cents integer,
  ADD COLUMN IF NOT EXISTS billing_interval text,
  ADD COLUMN IF NOT EXISTS annual_price_cents integer,
  ADD COLUMN IF NOT EXISTS annual_savings_cents integer,
  ADD COLUMN IF NOT EXISTS competition_level text,
  ADD COLUMN IF NOT EXISTS abandoned_at timestamptz,
  ADD COLUMN IF NOT EXISTS source text;

CREATE INDEX IF NOT EXISTS idx_quotes_source_created
  ON public.contractor_pricing_quotes (source, created_at DESC);

-- Audit triggers: any change to settings or territory pricing is logged
CREATE OR REPLACE FUNCTION public.log_pricing_settings_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.pricing_audit_log (event_type, actor_id, actor_role, previous_state, new_state, reason, calculation_version)
  VALUES (
    TG_TABLE_NAME || '_' || lower(TG_OP),
    auth.uid(),
    'admin',
    CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE to_jsonb(OLD) END,
    CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE to_jsonb(NEW) END,
    'admin_pricing_change',
    'growth_calculator_v1'
  );
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_log_growth_settings ON public.pricing_growth_settings;
CREATE TRIGGER trg_log_growth_settings
  AFTER INSERT OR UPDATE OR DELETE ON public.pricing_growth_settings
  FOR EACH ROW EXECUTE FUNCTION public.log_pricing_settings_change();

DROP TRIGGER IF EXISTS trg_log_territory_overrides ON public.pricing_territory_overrides;
CREATE TRIGGER trg_log_territory_overrides
  AFTER INSERT OR UPDATE OR DELETE ON public.pricing_territory_overrides
  FOR EACH ROW EXECUTE FUNCTION public.log_pricing_settings_change();

CREATE OR REPLACE FUNCTION public.touch_pricing_growth_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_touch_growth_settings ON public.pricing_growth_settings;
CREATE TRIGGER trg_touch_growth_settings BEFORE UPDATE ON public.pricing_growth_settings
  FOR EACH ROW EXECUTE FUNCTION public.touch_pricing_growth_updated_at();

DROP TRIGGER IF EXISTS trg_touch_territory_overrides ON public.pricing_territory_overrides;
CREATE TRIGGER trg_touch_territory_overrides BEFORE UPDATE ON public.pricing_territory_overrides
  FOR EACH ROW EXECUTE FUNCTION public.touch_pricing_growth_updated_at();