
-- =========================================================
-- ALTER TERRITORIES TABLE - add new columns to existing table
-- =========================================================

-- Rename existing columns to match new naming convention
ALTER TABLE public.territories RENAME COLUMN max_contractors TO max_entrepreneurs;
ALTER TABLE public.territories RENAME COLUMN signature_slots TO slots_signature;
ALTER TABLE public.territories RENAME COLUMN elite_slots TO slots_elite;
ALTER TABLE public.territories RENAME COLUMN premium_slots TO slots_premium;

-- Add new slot columns
ALTER TABLE public.territories ADD COLUMN IF NOT EXISTS slots_pro integer NOT NULL DEFAULT 2;
ALTER TABLE public.territories ADD COLUMN IF NOT EXISTS slots_recrue integer NOT NULL DEFAULT 2;

-- Add occupied counters
ALTER TABLE public.territories ADD COLUMN IF NOT EXISTS occupied_signature integer NOT NULL DEFAULT 0;
ALTER TABLE public.territories ADD COLUMN IF NOT EXISTS occupied_elite integer NOT NULL DEFAULT 0;
ALTER TABLE public.territories ADD COLUMN IF NOT EXISTS occupied_premium integer NOT NULL DEFAULT 0;
ALTER TABLE public.territories ADD COLUMN IF NOT EXISTS occupied_pro integer NOT NULL DEFAULT 0;
ALTER TABLE public.territories ADD COLUMN IF NOT EXISTS occupied_recrue integer NOT NULL DEFAULT 0;

-- Add geo/market columns
ALTER TABLE public.territories ADD COLUMN IF NOT EXISTS province_code text NOT NULL DEFAULT 'QC';
ALTER TABLE public.territories ADD COLUMN IF NOT EXISTS region_name text;
ALTER TABLE public.territories ADD COLUMN IF NOT EXISTS market_tier text NOT NULL DEFAULT 'medium';

-- Add score columns
ALTER TABLE public.territories ADD COLUMN IF NOT EXISTS demand_score numeric(8,2);
ALTER TABLE public.territories ADD COLUMN IF NOT EXISTS competition_score numeric(8,2);
ALTER TABLE public.territories ADD COLUMN IF NOT EXISTS strategic_score numeric(8,2);

-- Add status and generation columns
ALTER TABLE public.territories ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active';
ALTER TABLE public.territories ADD COLUMN IF NOT EXISTS generation_source text;

-- Add constraints
ALTER TABLE public.territories ADD CONSTRAINT territories_market_tier_chk
  CHECK (market_tier in ('mega', 'large', 'medium', 'small', 'micro'));

ALTER TABLE public.territories ADD CONSTRAINT territories_status_chk
  CHECK (status in ('active', 'inactive', 'full', 'overbooked'));

ALTER TABLE public.territories ADD CONSTRAINT territories_non_negative_chk
  CHECK (
    max_entrepreneurs >= 0 AND
    slots_signature >= 0 AND slots_elite >= 0 AND slots_premium >= 0 AND
    slots_pro >= 0 AND slots_recrue >= 0 AND
    occupied_signature >= 0 AND occupied_elite >= 0 AND occupied_premium >= 0 AND
    occupied_pro >= 0 AND occupied_recrue >= 0
  );

ALTER TABLE public.territories ADD CONSTRAINT territories_slot_sum_le_max_chk
  CHECK (
    slots_signature + slots_elite + slots_premium + slots_pro + slots_recrue
    <= max_entrepreneurs
  );

-- Add unique constraint if not exists
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'territories_city_category_unique'
  ) THEN
    ALTER TABLE public.territories ADD CONSTRAINT territories_city_category_unique
      UNIQUE(city_slug, category_slug);
  END IF;
END $$;

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_territories_city_slug ON public.territories(city_slug);
CREATE INDEX IF NOT EXISTS idx_territories_category_slug ON public.territories(category_slug);
CREATE INDEX IF NOT EXISTS idx_territories_is_active ON public.territories(is_active);
CREATE INDEX IF NOT EXISTS idx_territories_status ON public.territories(status);
CREATE INDEX IF NOT EXISTS idx_territories_market_tier ON public.territories(market_tier);
CREATE INDEX IF NOT EXISTS idx_territories_region_name ON public.territories(region_name);

-- Add updated_at trigger
DROP TRIGGER IF EXISTS trg_territories_updated_at ON public.territories;
CREATE TRIGGER trg_territories_updated_at
BEFORE UPDATE ON public.territories
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
